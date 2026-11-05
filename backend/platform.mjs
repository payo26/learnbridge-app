import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { promisify } from 'node:util';
import express from 'express';
import {
  RESET_TOKEN_MINUTES,
  buildPasswordResetUrl,
  createPasswordResetToken,
  passwordRecoveryConfigured,
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
} from './password-email.mjs';

const scrypt = promisify(crypto.scrypt);
const SESSION_COOKIE = 'lb_session';
const SESSION_SECONDS = 60 * 60 * 24 * 7;
const attempts = new Map();

function id() { return crypto.randomUUID(); }
function hash(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function normalEmail(value) { return String(value || '').trim().toLowerCase(); }
function text(value, max = 200) { return String(value || '').trim().slice(0, max); }
function integer(value, min, max) {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : null;
}
function emailValid(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254; }
function publicPolicyUrl(value) {
  try { const url = new URL(String(value || '')); return url.protocol === 'https:' || (paymentMode() !== 'live' && url.protocol === 'http:') ? url.toString() : ''; }
  catch { return ''; }
}
function fail(res, status, message, code) { return res.status(status).json({ error: message, ...(code ? { code } : {}) }); }
function slug(value) {
  const base = text(value, 80).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'school';
  return `${base}-${crypto.randomBytes(3).toString('hex')}`;
}
function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map(item => item.trim().split('='))
    .filter(parts => parts.length >= 2).map(([key, ...rest]) => [key, decodeURIComponent(rest.join('='))]));
}
function secureCookie() {
  if (process.env.COOKIE_SECURE) return process.env.COOKIE_SECURE !== 'false';
  return String(process.env.APP_ORIGIN || '').startsWith('https://');
}
function sessionCookie(token, maxAge = SESSION_SECONDS) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secureCookie() ? '; Secure' : ''}`;
}
function rateLimited(req, bucket, limit, windowMs) {
  const now = Date.now();
  if (attempts.size > 10000) for (const [attemptKey, value] of attempts) if (value.reset <= now) attempts.delete(attemptKey);
  const key = `${bucket}:${req.ip || req.socket?.remoteAddress || 'unknown'}`;
  const current = attempts.get(key);
  if (!current || current.reset <= now) {
    attempts.set(key, { count: 1, reset: now + windowMs });
    return false;
  }
  current.count += 1;
  return current.count > limit;
}
function subjectRateLimited(bucket, subject, limit, windowMs) {
  const now = Date.now();
  const key = `${bucket}:subject:${hash(String(subject || '')).slice(0, 32)}`;
  const current = attempts.get(key);
  if (!current || current.reset <= now) {
    attempts.set(key, { count: 1, reset: now + windowMs });
    return false;
  }
  current.count += 1;
  return current.count > limit;
}
export function entitlement(school) {
  if (!school) return { active: false, reason: 'NO_ACCOUNT' };
  const status = school.status;
  // Database rows use licence_end_at, while the browser-safe account object
  // returned by publicSchool uses licenceEndAt. Accept both representations so
  // /auth/me and the dashboards calculate the same entitlement.
  const licenceEndAt = school.licence_end_at ?? school.licenceEndAt;
  if (status === 'suspended') return { active: false, reason: 'SUSPENDED' };
  if (!['pilot', 'licensed'].includes(status)) return { active: false, reason: 'NO_ACTIVE_LICENCE' };
  const endTime = licenceEndAt ? new Date(licenceEndAt).getTime() : NaN;
  if (!Number.isFinite(endTime) || endTime <= Date.now()) return { active: false, reason: 'EXPIRED' };
  return { active: true, reason: status === 'pilot' ? 'PILOT' : 'LICENSED' };
}
function publicSchool(row) {
  if (!row?.school_id) return null;
  return {
    id: row.school_id,
    name: row.school_name,
    slug: row.school_slug,
    accountType: row.account_type || 'school',
    status: row.school_status,
    seatLimit: row.seat_limit,
    licenceStartAt: row.licence_start_at,
    licenceEndAt: row.licence_end_at,
    billingPeriod: row.billing_period,
  };
}
function publicUser(row) {
  const school = publicSchool(row);
  return {
    id: row.user_id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    school,
    entitlement: row.role === 'super_admin' ? { active: true, reason: 'PLATFORM_ADMIN' } : entitlement(school),
  };
}
async function passwordHash(password) {
  const salt = crypto.randomBytes(16).toString('base64url');
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${Buffer.from(derived).toString('base64url')}`;
}
async function passwordMatches(password, stored) {
  const [algorithm, salt, expectedText] = String(stored || '').split('$');
  if (algorithm !== 'scrypt' || !salt || !expectedText) return false;
  const expected = Buffer.from(expectedText, 'base64url');
  const actual = Buffer.from(await scrypt(password, salt, expected.length));
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}
async function createSession(pool, res, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  await pool.query('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW() + $3 * INTERVAL \'1 second\')', [hash(token), userId, SESSION_SECONDS]);
  res.append('Set-Cookie', sessionCookie(token));
}
async function authRow(pool, userId) {
  const result = await pool.query(`SELECT u.id AS user_id,u.email,u.display_name,u.role,u.active,
      s.id AS school_id,s.name AS school_name,s.slug AS school_slug,s.status AS school_status,
      s.account_type,s.seat_limit,s.licence_start_at,s.licence_end_at,s.billing_period
    FROM users u LEFT JOIN schools s ON s.id=u.school_id WHERE u.id=$1`, [userId]);
  return result.rows[0];
}
function requireAuth(req, res, next) {
  if (!req.auth) return fail(res, 401, 'Sign in to continue.', 'AUTH_REQUIRED');
  next();
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth) return fail(res, 401, 'Sign in to continue.', 'AUTH_REQUIRED');
    if (!roles.includes(req.auth.role)) return fail(res, 403, 'You do not have permission to perform this action.', 'FORBIDDEN');
    next();
  };
}
function schoolIsActive(req, res, next) {
  if (!req.auth?.entitlement?.active) return fail(res, 403, 'This account needs an active subscription, pilot or paid licence.', 'LICENSE_REQUIRED');
  next();
}

export async function ensurePlatformSchema(pool) {
  const schema = await fs.readFile(new URL('../database/init.sql', import.meta.url), 'utf8');
  await pool.query(schema);
  // Idempotent v7.1 migration for databases already created by v7.0.
  await pool.query(`
    ALTER TABLE schools ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'school';
    ALTER TABLE schools DROP CONSTRAINT IF EXISTS schools_account_type_check;
    ALTER TABLE schools ADD CONSTRAINT schools_account_type_check CHECK (account_type IN ('school','individual','family'));
    ALTER TABLE schools DROP CONSTRAINT IF EXISTS schools_billing_period_check;
    ALTER TABLE schools ADD CONSTRAINT schools_billing_period_check CHECK (billing_period IN ('monthly','termly','annual'));
    ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version TEXT;
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('super_admin','school_admin','account_owner','teacher','student'));
  `);
  await pool.query('DELETE FROM sessions WHERE expires_at <= NOW()');
  await pool.query(`DELETE FROM password_reset_tokens
    WHERE expires_at <= NOW() - INTERVAL '1 day'
       OR (used_at IS NOT NULL AND used_at <= NOW() - INTERVAL '1 day')`);
  const email = normalEmail(process.env.SUPER_ADMIN_EMAIL);
  const password = String(process.env.SUPER_ADMIN_PASSWORD || '');
  if (email && password) {
    if (!emailValid(email) || password.length < 12) throw new Error('SUPER_ADMIN_EMAIL must be valid and SUPER_ADMIN_PASSWORD must contain at least 12 characters.');
    const existing = await pool.query("SELECT id FROM users WHERE role='super_admin' LIMIT 1");
    if (!existing.rowCount) {
      await pool.query(`INSERT INTO users(id,email,password_hash,display_name,role)
        VALUES($1,$2,$3,$4,'super_admin')`, [id(), email, await passwordHash(password), text(process.env.SUPER_ADMIN_NAME || 'LearnBridge Administrator', 100)]);
      console.log('Initial LearnBridge platform administrator created.');
    }
  }
}

export function sessionMiddleware(pool) {
  return async (req, _res, next) => {
    try {
      const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
      if (!token) return next();
      const session = await pool.query(`SELECT user_id FROM sessions
        WHERE token_hash=$1 AND expires_at>NOW()`, [hash(token)]);
      if (!session.rowCount) return next();
      const row = await authRow(pool, session.rows[0].user_id);
      if (row?.active) req.auth = publicUser(row);
      next();
    } catch (error) { next(error); }
  };
}

export function originGuard(req, res, next) {
  if (!['POST','PUT','PATCH','DELETE'].includes(req.method)) return next();
  if (req.path === '/api/paystack/webhook') return next();
  const origin = req.get('origin');
  if (!origin) return next();
  const allowed = new Set([process.env.APP_ORIGIN, 'http://localhost:8080', 'http://127.0.0.1:8080'].filter(Boolean));
  if (!allowed.has(origin)) return fail(res, 403, 'This request did not originate from LearnBridge.', 'ORIGIN_REJECTED');
  next();
}

export function lessonAccess(req, input) {
  const preloader = preloadTokenMatches(req);
  const licensed = req.auth?.role === 'super_admin' || req.auth?.entitlement?.active;
  if (input.topicId === 't1') return { allowed: true, publicSample: true, canGenerate: Boolean(preloader || licensed), preloader };
  if (preloader) return { allowed: true, publicSample: false, canGenerate: true, preloader: true };
  if (licensed) return { allowed: true, publicSample: false, canGenerate: true };
  return { allowed: false, publicSample: false, canGenerate: false };
}

async function schoolDashboard(pool, schoolId, includePrivate) {
  const schoolResult = await pool.query(`SELECT s.*,
      COUNT(u.id) FILTER (WHERE u.role='student' AND u.active) AS seats_used
    FROM schools s LEFT JOIN users u ON u.school_id=s.id WHERE s.id=$1 GROUP BY s.id`, [schoolId]);
  const school = schoolResult.rows[0];
  if (!school) return null;
  const schoolEntitlement = entitlement({ status: school.status, licence_end_at: school.licence_end_at });
  const effectiveStatus = !schoolEntitlement.active && schoolEntitlement.reason === 'EXPIRED' ? 'expired' : school.status;
  const result = {
    school: {
      id: school.id, name: school.name, slug: school.slug, status: effectiveStatus,
      accountType: school.account_type || 'school',
      seatLimit: school.seat_limit, seatsUsed: Number(school.seats_used),
      licenceStartAt: school.licence_start_at, licenceEndAt: school.licence_end_at,
      billingPeriod: school.billing_period, entitlement: schoolEntitlement,
    },
  };
  if (!includePrivate) return result;
  const [members, invitations, quotes, payments] = await Promise.all([
    pool.query(`SELECT id,email,display_name AS "displayName",role,active,created_at AS "createdAt"
      FROM users WHERE school_id=$1 ORDER BY role,email`, [schoolId]),
    pool.query(`SELECT id,role,email,max_uses AS "maxUses",use_count AS "useCount",expires_at AS "expiresAt",created_at AS "createdAt"
      FROM invitations WHERE school_id=$1 AND expires_at>NOW() AND use_count<max_uses ORDER BY created_at DESC`, [schoolId]),
    pool.query(`SELECT id,title,amount_kobo AS "amountKobo",currency,billing_period AS "billingPeriod",
      duration_days AS "durationDays",seat_limit AS "seatLimit",status,expires_at AS "expiresAt",created_at AS "createdAt"
      FROM licence_quotes WHERE school_id=$1 ORDER BY created_at DESC`, [schoolId]),
    pool.query(`SELECT id,quote_id AS "quoteId",reference,amount_kobo AS "amountKobo",currency,status,
      paid_at AS "paidAt",created_at AS "createdAt" FROM payments WHERE school_id=$1 ORDER BY created_at DESC`, [schoolId]),
  ]);
  return { ...result, members: members.rows, invitations: invitations.rows, quotes: quotes.rows, payments: payments.rows };
}

function paystackSecret() {
  const key = String(process.env.PAYSTACK_SECRET_KEY || '').trim();
  if (paymentMode() === 'not-configured') { const error = new Error('Paystack is not configured. Add a valid PAYSTACK_SECRET_KEY and restart the API.'); error.status = 503; throw error; }
  return key;
}
export function paymentMode() {
  const key = String(process.env.PAYSTACK_SECRET_KEY || '');
  if (key.length > 20 && key.startsWith('sk_live_')) return 'live';
  if (key.length > 20 && key.startsWith('sk_test_')) return 'test';
  return 'not-configured';
}
async function paystack(path, options = {}) {
  const response = await fetch(`https://api.paystack.co${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${paystackSecret()}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.status === false) {
    const error = new Error(body.message || `Paystack request failed (${response.status}).`);
    error.status = response.status >= 400 && response.status < 500 ? 400 : 503;
    throw error;
  }
  return body.data;
}

const consumerPlanCache = { key: '', expiresAt: 0, plans: [] };
export function consumerPlanCodes() {
  return [
    { package:'individual', billingCycle:'monthly', expectedInterval:'monthly', planCode:String(process.env.PAYSTACK_INDIVIDUAL_MONTHLY_PLAN || process.env.PAYSTACK_STUDENT_MONTHLY_PLAN || '').trim() },
    { package:'individual', billingCycle:'annual', expectedInterval:'annually', planCode:String(process.env.PAYSTACK_INDIVIDUAL_ANNUAL_PLAN || process.env.PAYSTACK_STUDENT_ANNUAL_PLAN || '').trim() },
    { package:'family', billingCycle:'monthly', expectedInterval:'monthly', planCode:String(process.env.PAYSTACK_FAMILY_MONTHLY_PLAN || '').trim() },
    { package:'family', billingCycle:'annual', expectedInterval:'annually', planCode:String(process.env.PAYSTACK_FAMILY_ANNUAL_PLAN || '').trim() },
  ];
}
function configuredPlanCode(value) {
  return /^PLN_[A-Za-z0-9]+$/.test(value) && !/replace/i.test(value);
}
export function consumerPlansConfigured() {
  return paymentMode() !== 'not-configured' && consumerPlanCodes().every(item => configuredPlanCode(item.planCode));
}
async function consumerPlans() {
  const definitions = consumerPlanCodes();
  const cacheKey = `${paymentMode()}:${hash(String(process.env.PAYSTACK_SECRET_KEY || '')).slice(0,12)}:${definitions.map(item => item.planCode).join(':')}`;
  if (consumerPlanCache.key === cacheKey && consumerPlanCache.expiresAt > Date.now()) return consumerPlanCache.plans;
  const plans = await Promise.all(definitions.map(async definition => {
    if (paymentMode() === 'not-configured' || !configuredPlanCode(definition.planCode)) {
      return { ...definition, available:false, name:definition.package === 'family' ? 'Family' : 'Individual', amountKobo:null, currency:'NGN' };
    }
    try {
      const plan = await paystack(`/plan/${encodeURIComponent(definition.planCode)}`, { method:'GET' });
      const amountKobo = Number(plan?.amount);
      const currency = String(plan?.currency || '').toUpperCase();
      const valid = plan?.plan_code === definition.planCode && plan?.interval === definition.expectedInterval
        && Number.isInteger(amountKobo) && amountKobo > 0 && currency === 'NGN';
      return { ...definition, available:valid, name:text(plan?.name || `${definition.package} ${definition.billingCycle}`, 120), amountKobo:valid ? amountKobo : null, currency:currency || 'NGN' };
    } catch (error) {
      console.error(`Paystack plan validation failed for ${definition.package}/${definition.billingCycle}:`, error.message);
      return { ...definition, available:false, name:definition.package === 'family' ? 'Family' : 'Individual', amountKobo:null, currency:'NGN' };
    }
  }));
  consumerPlanCache.key = cacheKey;
  consumerPlanCache.expiresAt = Date.now() + 5 * 60 * 1000;
  consumerPlanCache.plans = plans;
  return plans;
}
async function requiredConsumerPlan(packageName, billingCycle) {
  const plan = (await consumerPlans()).find(item => item.package === packageName && item.billingCycle === billingCycle);
  if (!plan?.available) {
    const error = new Error('This subscription option is not configured. Add its Paystack plan code and restart the API.');
    error.status = 503;
    throw error;
  }
  return plan;
}
function metadataObject(value) {
  if (value && typeof value === 'object') return value;
  try { return JSON.parse(value || '{}'); } catch { return {}; }
}
async function applySchoolPayment(pool, charge) {
  const reference = text(charge?.reference, 160);
  const amount = Number(charge?.amount);
  const currency = String(charge?.currency || '').toUpperCase();
  const status = String(charge?.status || '');
  if (!reference || !Number.isInteger(amount) || status !== 'success') throw new Error('Paystack did not return a successful, valid transaction.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`SELECT p.*,q.duration_days,q.seat_limit AS quote_seat_limit,
        q.billing_period,q.status AS quote_status
      FROM payments p JOIN licence_quotes q ON q.id=p.quote_id WHERE p.reference=$1 FOR UPDATE`, [reference]);
    const payment = result.rows[0];
    if (!payment) throw new Error('The payment reference is not registered in LearnBridge.');
    if (payment.amount_kobo !== amount || payment.currency !== currency) throw new Error('The verified payment amount or currency does not match the quotation.');
    const metadata = metadataObject(charge.metadata);
    if (metadata.quote_id && metadata.quote_id !== payment.quote_id) throw new Error('The verified payment does not match the quotation.');
    if (payment.status === 'success') { await client.query('COMMIT'); return { applied: false, alreadyProcessed: true }; }
    await client.query(`UPDATE payments SET status='success',provider_transaction_id=$2,paid_at=COALESCE($3,NOW()),
      provider_data=$4,updated_at=NOW() WHERE id=$1`, [payment.id, String(charge.id || ''), charge.paid_at || charge.paidAt || null, JSON.stringify({ channel: charge.channel, gateway_response: charge.gateway_response })]);
    if (payment.quote_status !== 'paid') {
      await client.query("UPDATE licence_quotes SET status='paid',updated_at=NOW() WHERE id=$1", [payment.quote_id]);
      await client.query(`UPDATE schools SET status='licensed',
        licence_start_at=CASE WHEN licence_end_at IS NOT NULL AND licence_end_at>NOW() THEN COALESCE(licence_start_at,NOW()) ELSE NOW() END,
        licence_end_at=GREATEST(COALESCE(licence_end_at,NOW()),NOW()) + $2 * INTERVAL '1 day',
        seat_limit=$3,billing_period=$4,updated_at=NOW() WHERE id=$1`,
      [payment.school_id, payment.duration_days, payment.quote_seat_limit, payment.billing_period]);
    }
    await client.query('COMMIT');
    return { applied: payment.quote_status !== 'paid', alreadyProcessed: false };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

function providerCode(value, property) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return text(value[property], 160);
}
function chargePlanCode(charge) {
  return text(charge?.plan_code || providerCode(charge?.plan, 'plan_code') || providerCode(charge?.subscription?.plan, 'plan_code'), 160);
}
function chargeCustomerCode(charge) {
  return text(charge?.customer_code || providerCode(charge?.customer, 'customer_code') || providerCode(charge?.subscription?.customer, 'customer_code'), 160);
}
function chargeSubscriptionCode(charge) {
  return text(charge?.subscription_code || providerCode(charge?.subscription, 'subscription_code'), 160);
}
function validDate(value) {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? date : null;
}
export function addBillingCycle(value, billingCycle) {
  const source = validDate(value) || new Date();
  const result = new Date(source);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  if (billingCycle === 'annual') result.setUTCFullYear(result.getUTCFullYear() + 1);
  else result.setUTCMonth(result.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}
function consumerProviderData(charge) {
  return JSON.stringify({ channel:charge?.channel || null, gateway_response:charge?.gateway_response || null });
}

async function applyConsumerPayment(pool, charge) {
  const reference = text(charge?.reference, 160);
  const amount = Number(charge?.amount);
  const currency = String(charge?.currency || '').toUpperCase();
  const status = String(charge?.status || '');
  const transactionId = text(charge?.id, 160);
  if (!reference || !Number.isInteger(amount) || status !== 'success') throw new Error('Paystack did not return a successful, valid transaction.');
  const metadata = metadataObject(charge?.metadata);
  const planCode = chargePlanCode(charge) || text(metadata.plan_code, 160);
  const customerCode = chargeCustomerCode(charge);
  const subscriptionCode = chargeSubscriptionCode(charge);
  const paidAt = validDate(charge?.paid_at || charge?.paidAt)?.toISOString() || new Date().toISOString();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let result = await client.query(`SELECT sp.*,s.package,s.billing_cycle,s.plan_code,s.status AS subscription_status,
        s.owner_user_id,s.provider_subscription_code,s.provider_customer_code
      FROM subscription_payments sp JOIN subscriptions s ON s.id=sp.subscription_id
      WHERE sp.reference=$1 FOR UPDATE`, [reference]);
    let payment = result.rows[0];
    if (!payment) {
      if (!subscriptionCode && (!customerCode || !planCode)) throw new Error('The consumer payment cannot be matched to a LearnBridge subscription.');
      result = await client.query(`SELECT s.* FROM subscriptions s
        WHERE ($1<>'' AND s.provider_subscription_code=$1)
          OR ($2<>'' AND $3<>'' AND s.provider_customer_code=$2 AND s.plan_code=$3)
        ORDER BY s.created_at DESC LIMIT 1 FOR UPDATE`, [subscriptionCode, customerCode, planCode]);
      const subscription = result.rows[0];
      if (!subscription) throw new Error('The recurring payment does not match a LearnBridge subscription.');
      if (subscription.amount_kobo !== amount || subscription.currency !== currency) throw new Error('The recurring payment amount or currency is incorrect.');
      const inserted = await client.query(`INSERT INTO subscription_payments(id,subscription_id,school_id,payer_user_id,reference,amount_kobo,currency,status,provider_transaction_id,paid_at,provider_data)
        VALUES($1,$2,$3,$4,$5,$6,$7,'success',$8,$9,$10)
        ON CONFLICT(reference) DO NOTHING RETURNING id`, [id(), subscription.id, subscription.school_id, subscription.owner_user_id, reference, amount, currency, transactionId || null, paidAt, consumerProviderData(charge)]);
      if (!inserted.rowCount) { await client.query('COMMIT'); return { kind:'consumer', applied:false, alreadyProcessed:true }; }
      payment = { ...subscription, subscription_id:subscription.id, school_id:subscription.school_id, payer_user_id:subscription.owner_user_id, payment_status:'success', status:'success' };
    } else {
      if (payment.amount_kobo !== amount || payment.currency !== currency) throw new Error('The verified payment amount or currency does not match the subscription plan.');
      if (planCode && planCode !== payment.plan_code) throw new Error('The verified payment plan does not match the selected LearnBridge package.');
      if (metadata.subscription_id && metadata.subscription_id !== payment.subscription_id) throw new Error('The verified payment does not match the LearnBridge subscription.');
      if (metadata.account_id && metadata.account_id !== payment.school_id) throw new Error('The verified payment does not match the LearnBridge account.');
      if (payment.status === 'success') { await client.query('COMMIT'); return { kind:'consumer', applied:false, alreadyProcessed:true }; }
      await client.query(`UPDATE subscription_payments SET status='success',provider_transaction_id=$2,
        paid_at=$3,provider_data=$4,updated_at=NOW() WHERE id=$1`, [payment.id, transactionId || null, paidAt, consumerProviderData(charge)]);
    }
    const accessEnd = validDate(charge?.subscription?.next_payment_date || charge?.next_payment_date) || addBillingCycle(paidAt, payment.billing_cycle);
    await client.query(`UPDATE subscriptions SET status='active',provider_subscription_code=COALESCE(NULLIF($2,''),provider_subscription_code),
      provider_customer_code=COALESCE(NULLIF($3,''),provider_customer_code),last_payment_at=$4,
      next_payment_at=COALESCE($5,next_payment_at),provider_data=provider_data || $6::jsonb,updated_at=NOW() WHERE id=$1`,
    [payment.subscription_id, subscriptionCode, customerCode, paidAt, accessEnd.toISOString(), consumerProviderData(charge)]);
    await client.query(`UPDATE schools SET status='licensed',licence_start_at=COALESCE(licence_start_at,$2),
      licence_end_at=GREATEST(COALESCE(licence_end_at,$3),$3),billing_period=$4,updated_at=NOW() WHERE id=$1`,
    [payment.school_id, paidAt, accessEnd.toISOString(), payment.billing_cycle]);
    await client.query('COMMIT');
    return { kind:'consumer', applied:true, alreadyProcessed:false };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

async function applySuccessfulCharge(pool, charge, { ignoreUnmatched = false } = {}) {
  const reference = text(charge?.reference, 160);
  const schoolPayment = reference ? await pool.query('SELECT id FROM payments WHERE reference=$1', [reference]) : { rowCount:0 };
  if (schoolPayment.rowCount) return { kind:'school', ...await applySchoolPayment(pool, charge) };
  try { return await applyConsumerPayment(pool, charge); }
  catch (error) {
    if (ignoreUnmatched && /cannot be matched|does not match a LearnBridge subscription/i.test(error.message || '')) return { kind:'unmatched', applied:false };
    throw error;
  }
}

function subscriptionStatus(eventType, data) {
  if (eventType === 'subscription.create') return 'active';
  if (eventType === 'subscription.not_renew') return 'non-renewing';
  if (eventType === 'subscription.disable') return String(data?.status || '').toLowerCase() === 'complete' ? 'completed' : 'cancelled';
  if (eventType === 'invoice.payment_failed') return 'attention';
  if (eventType === 'invoice.update' && (data?.paid === true || data?.paid === 1 || data?.status === 'success')) return 'active';
  return '';
}
async function applySubscriptionEvent(pool, eventType, data) {
  const source = data?.subscription && typeof data.subscription === 'object' ? { ...data, ...data.subscription } : data || {};
  const code = chargeSubscriptionCode(source);
  const planCode = chargePlanCode(source) || chargePlanCode(data);
  const customerCode = chargeCustomerCode(source) || chargeCustomerCode(data);
  const customerEmail = normalEmail(source?.customer?.email || data?.customer?.email);
  const nextPayment = validDate(source?.next_payment_date || data?.next_payment_date);
  const nextStatus = subscriptionStatus(eventType, data);
  if (!code && (!customerCode || !planCode)) return { matched:false };
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`SELECT s.* FROM subscriptions s JOIN users u ON u.id=s.owner_user_id
      WHERE ($1<>'' AND s.provider_subscription_code=$1)
        OR ($2<>'' AND $3<>'' AND s.provider_customer_code=$2 AND s.plan_code=$3)
        OR ($3<>'' AND $4<>'' AND s.plan_code=$3 AND lower(u.email)=$4 AND s.status IN ('pending','active'))
      ORDER BY s.created_at DESC LIMIT 1 FOR UPDATE`, [code, customerCode, planCode, customerEmail]);
    const subscription = result.rows[0];
    if (!subscription) { await client.query('COMMIT'); return { matched:false }; }
    await client.query(`UPDATE subscriptions SET provider_subscription_code=COALESCE(NULLIF($2,''),provider_subscription_code),
      provider_customer_code=COALESCE(NULLIF($3,''),provider_customer_code),status=COALESCE(NULLIF($4,''),status),
      next_payment_at=COALESCE($5,next_payment_at),provider_data=provider_data || $6::jsonb,updated_at=NOW() WHERE id=$1`,
    [subscription.id, code, customerCode, nextStatus, nextPayment?.toISOString() || null, JSON.stringify({ last_event:eventType })]);
    if (nextPayment && ['active','non-renewing','attention'].includes(nextStatus || subscription.status)) {
      await client.query(`UPDATE schools SET licence_end_at=GREATEST(COALESCE(licence_end_at,$2),$2),updated_at=NOW() WHERE id=$1`, [subscription.school_id, nextPayment.toISOString()]);
    }
    if (['completed','cancelled'].includes(nextStatus)) {
      await client.query(`UPDATE schools SET status=CASE WHEN licence_end_at IS NULL OR licence_end_at<=NOW() THEN 'expired' ELSE status END,updated_at=NOW() WHERE id=$1`, [subscription.school_id]);
    }
    await client.query('COMMIT');
    return { matched:true };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

async function createConsumerCheckout(pool, appOrigin, auth, billingCycle) {
  const packageName = auth?.school?.accountType;
  if (!['individual','family'].includes(packageName)) throw Object.assign(new Error('This account does not use an individual or family subscription.'), { status:400 });
  if (!['monthly','annual'].includes(billingCycle)) throw Object.assign(new Error('Choose monthly or annual billing.'), { status:400 });
  const plan = await requiredConsumerPlan(packageName, billingCycle);
  const client = await pool.connect();
  let subscriptionId;
  let paymentId;
  let reference;
  try {
    await client.query('BEGIN');
    const active = await client.query(`SELECT id FROM subscriptions WHERE school_id=$1
      AND status IN ('active','non-renewing','attention') ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [auth.school.id]);
    if (active.rowCount) throw Object.assign(new Error('This account already has a current subscription. Use Manage subscription to update the payment method or cancel renewal.'), { status:409 });
    await client.query(`UPDATE subscriptions SET status='failed',updated_at=NOW()
      WHERE school_id=$1 AND status='pending'`, [auth.school.id]);
    await client.query(`UPDATE subscription_payments SET status='failed',updated_at=NOW()
      WHERE school_id=$1 AND status='pending'`, [auth.school.id]);
    subscriptionId = id();
    paymentId = id();
    reference = `LBC-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    await client.query(`INSERT INTO subscriptions(id,school_id,owner_user_id,package,billing_cycle,plan_code,amount_kobo,currency)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [subscriptionId, auth.school.id, auth.id, packageName, billingCycle, plan.planCode, plan.amountKobo, plan.currency]);
    await client.query(`INSERT INTO subscription_payments(id,subscription_id,school_id,payer_user_id,reference,amount_kobo,currency)
      VALUES($1,$2,$3,$4,$5,$6,$7)`, [paymentId, subscriptionId, auth.school.id, auth.id, reference, plan.amountKobo, plan.currency]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
  try {
    const checkout = await paystack('/transaction/initialize', {
      method:'POST',
      body:JSON.stringify({
        email:auth.email,
        amount:plan.amountKobo,
        currency:plan.currency,
        plan:plan.planCode,
        reference,
        callback_url:`${appOrigin}/?payment=consumer`,
        metadata:{ learnbridge_type:'consumer_subscription', subscription_id:subscriptionId, account_id:auth.school.id, package:packageName, billing_cycle:billingCycle, plan_code:plan.planCode },
      }),
    });
    return { authorizationUrl:checkout.authorization_url, accessCode:checkout.access_code, reference, plan:{ package:packageName, billingCycle, amountKobo:plan.amountKobo, currency:plan.currency, name:plan.name } };
  } catch (error) {
    await Promise.all([
      pool.query("UPDATE subscriptions SET status='failed',updated_at=NOW() WHERE id=$1", [subscriptionId]),
      pool.query("UPDATE subscription_payments SET status='failed',updated_at=NOW() WHERE id=$1", [paymentId]),
    ]).catch(() => {});
    throw error;
  }
}

async function consumerDashboard(pool, accountId) {
  const base = await schoolDashboard(pool, accountId, false);
  if (!base || !['individual','family'].includes(base.school.accountType)) return null;
  const [members, invitations, subscriptions, payments] = await Promise.all([
    pool.query(`SELECT id,email,display_name AS "displayName",role,active,created_at AS "createdAt"
      FROM users WHERE school_id=$1 ORDER BY role,email`, [accountId]),
    pool.query(`SELECT id,role,email,max_uses AS "maxUses",use_count AS "useCount",expires_at AS "expiresAt",created_at AS "createdAt"
      FROM invitations WHERE school_id=$1 AND expires_at>NOW() AND use_count<max_uses ORDER BY created_at DESC`, [accountId]),
    pool.query(`SELECT id,package,billing_cycle AS "billingCycle",plan_code AS "planCode",amount_kobo AS "amountKobo",currency,status,
      provider_subscription_code AS "providerSubscriptionCode",next_payment_at AS "nextPaymentAt",last_payment_at AS "lastPaymentAt",created_at AS "createdAt"
      FROM subscriptions WHERE school_id=$1 ORDER BY created_at DESC LIMIT 10`, [accountId]),
    pool.query(`SELECT id,subscription_id AS "subscriptionId",reference,amount_kobo AS "amountKobo",currency,status,paid_at AS "paidAt",created_at AS "createdAt"
      FROM subscription_payments WHERE school_id=$1 ORDER BY created_at DESC LIMIT 50`, [accountId]),
  ]);
  return { account:base.school, members:members.rows, invitations:invitations.rows, subscriptions:subscriptions.rows, payments:payments.rows };
}

async function issuePasswordReset(pool, appOrigin, email) {
  const result = await pool.query('SELECT id,email,display_name FROM users WHERE email=$1 AND active', [email]);
  const user = result.rows[0];
  if (!user) return;
  const { token, tokenHash } = createPasswordResetToken();
  const tokenId = id();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE password_reset_tokens SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL', [user.id]);
    await client.query(`INSERT INTO password_reset_tokens(id,user_id,token_hash,expires_at)
      VALUES($1,$2,$3,NOW() + $4 * INTERVAL '1 minute')`, [tokenId, user.id, tokenHash, RESET_TOKEN_MINUTES]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  try {
    await sendPasswordResetEmail({
      to: user.email,
      displayName: user.display_name,
      resetUrl: buildPasswordResetUrl(appOrigin, token),
    });
  } catch (error) {
    await pool.query('DELETE FROM password_reset_tokens WHERE id=$1', [tokenId]).catch(() => {});
    throw error;
  }
}

export function createPlatformRouter(pool) {
  const router = express.Router();
  const appOrigin = String(process.env.APP_ORIGIN || 'http://localhost:8080').replace(/\/$/, '');

  router.get('/config', (_req, res) => res.json({
    schoolLicensing: true,
    consumerSubscriptions: true,
    familyLearnerLimit: 5,
    pilotDays: 30,
    pilotSeats: 25,
    paymentProvider: 'paystack',
    paymentsConfigured: paymentMode() !== 'not-configured',
    consumerPlansConfigured:consumerPlansConfigured(),
    paymentMode: paymentMode(),
    supportEmail: process.env.SUPPORT_EMAIL || '',
    passwordRecoveryConfigured: passwordRecoveryConfigured(),
  }));

  router.get('/consumer/plans', async (_req, res, next) => {
    try {
      const plans = await consumerPlans();
      res.json({
        plans:plans.map(({ package:packageName,billingCycle,available,name,amountKobo,currency }) => ({ package:packageName,billingCycle,available,name,amountKobo,currency })),
        familyLearnerLimit:5,
        paymentsConfigured:paymentMode() !== 'not-configured',
        paymentMode:paymentMode(),
        termsUrl:publicPolicyUrl(process.env.TERMS_URL),
        privacyUrl:publicPolicyUrl(process.env.PRIVACY_URL),
        refundPolicyUrl:publicPolicyUrl(process.env.REFUND_POLICY_URL),
        termsVersion:text(process.env.TERMS_VERSION, 80),
      });
    } catch (error) { next(error); }
  });

  router.get('/auth/me', (req, res) => res.json(req.auth ? { authenticated: true, user: req.auth } : { authenticated: false }));

  router.post('/consumer/register', async (req, res, next) => {
    if (rateLimited(req, 'consumer-register', 8, 60 * 60 * 1000)) return fail(res, 429, 'Too many account registrations were attempted from this connection. Wait and retry.');
    const packageName = String(req.body?.package || '');
    const billingCycle = String(req.body?.billingCycle || '');
    const displayName = text(req.body?.displayName, 100);
    const email = normalEmail(req.body?.email);
    const password = String(req.body?.password || '');
    if (!['individual','family'].includes(packageName) || !['monthly','annual'].includes(billingCycle)) return fail(res, 400, 'Choose an individual or family package and monthly or annual billing.');
    if (displayName.length < 2 || !emailValid(email) || password.length < 12) return fail(res, 400, 'Enter your name, a valid email address and a password of at least 12 characters.');
    if (req.body?.termsAccepted !== true) return fail(res, 400, 'Accept the Terms of Service and Privacy Notice to create an account.');
    if (paymentMode() === 'live' && (!publicPolicyUrl(process.env.TERMS_URL) || !publicPolicyUrl(process.env.PRIVACY_URL) || !text(process.env.TERMS_VERSION, 80))) return fail(res, 503, 'Consumer registration is paused until the Terms of Service, Privacy Notice and terms version are configured.');
    try { await requiredConsumerPlan(packageName, billingCycle); }
    catch (error) { return fail(res, error.status || 503, error.message); }
    const client = await pool.connect();
    const accountId = id();
    const userId = id();
    try {
      await client.query('BEGIN');
      await client.query(`INSERT INTO schools(id,name,slug,account_type,status,seat_limit)
        VALUES($1,$2,$3,$4,'pending',$5)`, [accountId, packageName === 'family' ? `${displayName}'s family` : displayName, slug(`${displayName}-${packageName}`), packageName, packageName === 'family' ? 5 : 1]);
      await client.query(`INSERT INTO users(id,school_id,email,password_hash,display_name,role,terms_accepted_at,terms_version)
        VALUES($1,$2,$3,$4,$5,'account_owner',NOW(),$6)`, [userId, accountId, email, await passwordHash(password), displayName, text(process.env.TERMS_VERSION || 'test-draft', 80)]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') return fail(res, 409, 'An account already exists for this email address. Sign in to continue.');
      return next(error);
    } finally { client.release(); }
    try {
      await createSession(pool, res, userId);
      const auth = publicUser(await authRow(pool, userId));
      try {
        const checkout = await createConsumerCheckout(pool, appOrigin, auth, billingCycle);
        res.status(201).json({ authenticated:true, user:auth, checkout });
      } catch (error) {
        res.status(201).json({ authenticated:true, user:auth, checkout:null, checkoutError:error.status ? error.message : 'The account was created, but checkout could not be opened. Sign in and retry from your account dashboard.' });
      }
    } catch (error) { next(error); }
  });

  router.post('/auth/login', async (req, res, next) => {
    try {
      if (rateLimited(req, 'login', 10, 15 * 60 * 1000)) return fail(res, 429, 'Too many sign-in attempts. Wait 15 minutes and retry.');
      const email = normalEmail(req.body?.email);
      const password = String(req.body?.password || '');
      const result = await pool.query('SELECT id,password_hash,active FROM users WHERE email=$1', [email]);
      const user = result.rows[0];
      if (!user?.active || !await passwordMatches(password, user.password_hash)) return fail(res, 401, 'The email address or password is incorrect.', 'INVALID_LOGIN');
      await createSession(pool, res, user.id);
      res.json({ authenticated: true, user: publicUser(await authRow(pool, user.id)) });
    } catch (error) { next(error); }
  });

  router.post('/auth/forgot-password', async (req, res) => {
    const email = normalEmail(req.body?.email);
    if (!emailValid(email)) return fail(res, 400, 'Enter a valid email address.');
    if (!passwordRecoveryConfigured()) return fail(res, 503, 'Password recovery email is not configured. Contact LearnBridge support.');
    if (rateLimited(req, 'password-reset-request', 8, 60 * 60 * 1000)
      || subjectRateLimited('password-reset-request', email, 3, 60 * 60 * 1000)) {
      return fail(res, 429, 'Too many password-reset requests. Wait one hour and retry.');
    }
    res.json({
      ok: true,
      message: 'If an active account uses that email address, a password-reset link will be sent shortly.',
    });
    setImmediate(() => {
      issuePasswordReset(pool, appOrigin, email)
        .catch(error => console.error('Password-reset delivery failed:', error?.message || 'Unknown email error'));
    });
  });

  router.post('/auth/reset-password', async (req, res, next) => {
    if (rateLimited(req, 'password-reset-submit', 10, 60 * 60 * 1000)) return fail(res, 429, 'Too many password-reset attempts. Wait one hour and retry.');
    const token = String(req.body?.token || '');
    const newPassword = String(req.body?.newPassword || '');
    if (token.length < 32 || token.length > 200) return fail(res, 400, 'This password-reset link is invalid or has expired.');
    if (newPassword.length < 12 || newPassword.length > 200) return fail(res, 400, 'The new password must contain between 12 and 200 characters.');
    const tokenHash = hash(token);
    const client = await pool.connect();
    let user;
    try {
      await client.query('BEGIN');
      const result = await client.query(`SELECT t.id,t.user_id,u.email,u.display_name,u.active
        FROM password_reset_tokens t JOIN users u ON u.id=t.user_id
        WHERE t.token_hash=$1 AND t.used_at IS NULL AND t.expires_at>NOW() FOR UPDATE`, [tokenHash]);
      user = result.rows[0];
      if (!user?.active) {
        await client.query('ROLLBACK');
        return fail(res, 400, 'This password-reset link is invalid or has expired.');
      }
      await client.query('UPDATE users SET password_hash=$2,updated_at=NOW() WHERE id=$1', [user.user_id, await passwordHash(newPassword)]);
      await client.query('UPDATE password_reset_tokens SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL', [user.user_id]);
      await client.query('DELETE FROM sessions WHERE user_id=$1', [user.user_id]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      return next(error);
    } finally {
      client.release();
    }
    res.append('Set-Cookie', sessionCookie('', 0));
    res.json({ ok: true, message: 'Your password has been reset. Sign in with your new password.' });
    setImmediate(() => {
      sendPasswordChangedEmail({ to:user.email, displayName:user.display_name })
        .catch(error => console.error('Password-change notification failed:', error?.message || 'Unknown email error'));
    });
  });

  router.post('/auth/logout', async (req, res, next) => {
    try {
      const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
      if (token) await pool.query('DELETE FROM sessions WHERE token_hash=$1', [hash(token)]);
      res.append('Set-Cookie', sessionCookie('', 0));
      res.json({ ok: true });
    } catch (error) { next(error); }
  });

  router.post('/auth/change-password', requireAuth, async (req, res, next) => {
    try {
      if (rateLimited(req, 'password', 8, 60 * 60 * 1000)) return fail(res, 429, 'Too many password-change attempts. Wait and retry.');
      const currentPassword = String(req.body?.currentPassword || '');
      const newPassword = String(req.body?.newPassword || '');
      if (newPassword.length < 12) return fail(res, 400, 'The new password must contain at least 12 characters.');
      const result = await pool.query('SELECT password_hash FROM users WHERE id=$1', [req.auth.id]);
      if (!await passwordMatches(currentPassword, result.rows[0]?.password_hash)) return fail(res, 403, 'The current password is incorrect.');
      await pool.query('UPDATE users SET password_hash=$2,updated_at=NOW() WHERE id=$1', [req.auth.id, await passwordHash(newPassword)]);
      await pool.query('DELETE FROM sessions WHERE user_id=$1', [req.auth.id]);
      res.append('Set-Cookie', sessionCookie('', 0));
      res.json({ ok: true, message: 'Password changed. Sign in again with the new password.' });
    } catch (error) { next(error); }
  });

  router.get('/invitations/:code', async (req, res, next) => {
    try {
      const result = await pool.query(`SELECT i.role,i.email,i.expires_at,i.max_uses,i.use_count,s.name AS school_name,s.account_type
        FROM invitations i JOIN schools s ON s.id=i.school_id WHERE i.code_hash=$1`, [hash(req.params.code)]);
      const invite = result.rows[0];
      if (!invite || invite.use_count >= invite.max_uses || new Date(invite.expires_at).getTime() <= Date.now()) return fail(res, 404, 'This invitation is invalid or has expired.');
      res.json({ role: invite.role, email: invite.email || '', schoolName: invite.school_name, accountName:invite.school_name, accountType:invite.account_type || 'school', expiresAt: invite.expires_at });
    } catch (error) { next(error); }
  });

  router.post('/auth/accept-invitation', async (req, res, next) => {
    if (rateLimited(req, 'join', 12, 60 * 60 * 1000)) return fail(res, 429, 'Too many registration attempts. Wait and retry.');
    const code = String(req.body?.code || '');
    const email = normalEmail(req.body?.email);
    const displayName = text(req.body?.displayName, 100);
    const password = String(req.body?.password || '');
    if (!code || !emailValid(email) || displayName.length < 2 || password.length < 10) return fail(res, 400, 'Enter your name, a valid email address and a password of at least 10 characters.');
    const client = await pool.connect();
    let userId;
    try {
      await client.query('BEGIN');
      const result = await client.query(`SELECT i.*,s.seat_limit,s.status,s.licence_end_at,s.account_type
        FROM invitations i JOIN schools s ON s.id=i.school_id WHERE i.code_hash=$1 FOR UPDATE`, [hash(code)]);
      const invite = result.rows[0];
      if (!invite || invite.use_count >= invite.max_uses || new Date(invite.expires_at).getTime() <= Date.now()) throw Object.assign(new Error('This invitation is invalid or has expired.'), { status: 404 });
      if (invite.email && normalEmail(invite.email) !== email) throw Object.assign(new Error('Use the email address to which this invitation was issued.'), { status: 403 });
      if (invite.account_type === 'family' && (!['pilot','licensed'].includes(invite.status) || !invite.licence_end_at || new Date(invite.licence_end_at).getTime() <= Date.now())) {
        throw Object.assign(new Error('The family subscription is not currently active.'), { status:403 });
      }
      if (invite.role === 'student') {
        const seats = await client.query("SELECT COUNT(*)::int AS used FROM users WHERE school_id=$1 AND role='student' AND active", [invite.school_id]);
        if (seats.rows[0].used >= invite.seat_limit) throw Object.assign(new Error('This school has used all available learner seats.'), { status: 409 });
      }
      userId = id();
      await client.query(`INSERT INTO users(id,school_id,email,password_hash,display_name,role)
        VALUES($1,$2,$3,$4,$5,$6)`, [userId, invite.school_id, email, await passwordHash(password), displayName, invite.role]);
      await client.query('UPDATE invitations SET use_count=use_count+1 WHERE id=$1', [invite.id]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') return fail(res, 409, 'An account already exists for this email address.');
      if (error.status) return fail(res, error.status, error.message);
      return next(error);
    } finally { client.release(); }
    try {
      await createSession(pool, res, userId);
      res.status(201).json({ authenticated: true, user: publicUser(await authRow(pool, userId)) });
    } catch (error) { next(error); }
  });

  router.post('/pilot-requests', async (req, res, next) => {
    try {
      if (rateLimited(req, 'pilot', 5, 24 * 60 * 60 * 1000)) return fail(res, 429, 'Too many pilot requests were sent from this connection. Try again tomorrow.');
      const schoolName = text(req.body?.schoolName, 140);
      const adminName = text(req.body?.adminName, 100);
      const adminEmail = normalEmail(req.body?.adminEmail);
      const phone = text(req.body?.phone, 40);
      const estimatedLearners = integer(req.body?.estimatedLearners, 1, 100000);
      const message = text(req.body?.message, 1000);
      if (schoolName.length < 3 || adminName.length < 2 || !emailValid(adminEmail) || phone.length < 7 || !estimatedLearners) return fail(res, 400, 'Complete every required school and contact field.');
      const duplicate = await pool.query("SELECT id FROM pilot_requests WHERE lower(admin_email)=$1 AND status='pending'", [adminEmail]);
      if (duplicate.rowCount) return fail(res, 409, 'A pilot request for this email address is already awaiting review.');
      await pool.query(`INSERT INTO pilot_requests(id,school_name,admin_name,admin_email,phone,estimated_learners,message)
        VALUES($1,$2,$3,$4,$5,$6,$7)`, [id(), schoolName, adminName, adminEmail, phone, estimatedLearners, message]);
      res.status(201).json({ ok: true, message: 'Your 30-day pilot request has been submitted for review.' });
    } catch (error) { next(error); }
  });

  router.get('/school/dashboard', requireAuth, async (req, res, next) => {
    try {
      if (!req.auth.school) return fail(res, 400, 'This account is not linked to a school.');
      res.json(await schoolDashboard(pool, req.auth.school.id, req.auth.role === 'school_admin'));
    } catch (error) { next(error); }
  });

  router.get('/consumer/dashboard', requireRole('account_owner'), async (req, res, next) => {
    try {
      const dashboard = await consumerDashboard(pool, req.auth.school?.id);
      if (!dashboard) return fail(res, 400, 'This is not an individual or family account.');
      res.json(dashboard);
    } catch (error) { next(error); }
  });

  router.post('/consumer/subscription/initialize', requireRole('account_owner'), async (req, res, next) => {
    try {
      const checkout = await createConsumerCheckout(pool, appOrigin, req.auth, String(req.body?.billingCycle || ''));
      res.json(checkout);
    } catch (error) {
      if (error.status) return fail(res, error.status, error.message);
      next(error);
    }
  });

  router.post('/consumer/subscription/manage', requireRole('account_owner'), async (req, res, next) => {
    try {
      const result = await pool.query(`SELECT provider_subscription_code FROM subscriptions
        WHERE school_id=$1 AND provider_subscription_code IS NOT NULL
        AND status IN ('active','non-renewing','attention') ORDER BY created_at DESC LIMIT 1`, [req.auth.school.id]);
      const code = result.rows[0]?.provider_subscription_code;
      if (!code) return fail(res, 404, 'No manageable Paystack subscription is available yet. Verify the first payment or start a new subscription.');
      const data = await paystack(`/subscription/${encodeURIComponent(code)}/manage/link`, { method:'GET' });
      if (!data?.link) throw new Error('Paystack did not return a subscription management link.');
      res.json({ url:data.link });
    } catch (error) {
      if (error.status) return fail(res, error.status, error.message);
      next(error);
    }
  });

  router.post('/consumer/invitations', requireRole('account_owner'), schoolIsActive, async (req, res, next) => {
    try {
      if (req.auth.school?.accountType !== 'family') return fail(res, 403, 'Learner profiles are available only on the family package.');
      const email = normalEmail(req.body?.email);
      const days = integer(req.body?.expiresInDays ?? 14, 1, 30);
      if (!emailValid(email) || !days) return fail(res, 400, 'Enter the learner’s valid email address.');
      const capacity = await pool.query(`SELECT
        COUNT(DISTINCT u.id) FILTER (WHERE u.role='student' AND u.active)::int AS learners,
        COALESCE((SELECT SUM(max_uses-use_count)::int FROM invitations WHERE school_id=$1 AND role='student' AND expires_at>NOW() AND use_count<max_uses),0) AS pending
        FROM users u WHERE u.school_id=$1`, [req.auth.school.id]);
      if (Number(capacity.rows[0].learners) + Number(capacity.rows[0].pending) >= 5) return fail(res, 409, 'This family already has five active learner profiles or pending learner invitations.');
      const existing = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
      if (existing.rowCount) return fail(res, 409, 'An account already exists for this email address.');
      const code = crypto.randomBytes(24).toString('base64url');
      const invitationId = id();
      await pool.query(`INSERT INTO invitations(id,school_id,role,email,code_hash,max_uses,expires_at,created_by)
        VALUES($1,$2,'student',$3,$4,1,NOW() + $5 * INTERVAL '1 day',$6)`, [invitationId, req.auth.school.id, email, hash(code), days, req.auth.id]);
      res.status(201).json({ id:invitationId, invitationUrl:`${appOrigin}/?join=${encodeURIComponent(code)}`, email, expiresInDays:days });
    } catch (error) { next(error); }
  });

  router.patch('/consumer/members/:id', requireRole('account_owner'), async (req, res, next) => {
    try {
      if (req.auth.school?.accountType !== 'family') return fail(res, 403, 'Learner profiles are available only on the family package.');
      const active = req.body?.active;
      if (typeof active !== 'boolean') return fail(res, 400, 'Choose whether this learner profile should be active.');
      const result = await pool.query("SELECT * FROM users WHERE id=$1 AND school_id=$2 AND role='student'", [req.params.id, req.auth.school.id]);
      const member = result.rows[0];
      if (!member) return fail(res, 404, 'Family learner profile not found.');
      if (active) {
        const used = await pool.query("SELECT COUNT(*)::int AS count FROM users WHERE school_id=$1 AND role='student' AND active", [req.auth.school.id]);
        if (used.rows[0].count >= 5) return fail(res, 409, 'All five family learner profiles are currently in use.');
      }
      await pool.query('UPDATE users SET active=$2,updated_at=NOW() WHERE id=$1', [member.id, active]);
      if (!active) await pool.query('DELETE FROM sessions WHERE user_id=$1', [member.id]);
      res.json({ ok:true });
    } catch (error) { next(error); }
  });

  router.post('/school/invitations', requireRole('school_admin'), schoolIsActive, async (req, res, next) => {
    try {
      const role = String(req.body?.role || '');
      const email = normalEmail(req.body?.email);
      const maxUses = integer(req.body?.maxUses ?? 1, 1, 100);
      const days = integer(req.body?.expiresInDays ?? 14, 1, 30);
      if (!['teacher','student'].includes(role) || (email && !emailValid(email)) || !maxUses || !days) return fail(res, 400, 'Choose teacher or student, and enter valid invitation details.');
      if (email && maxUses !== 1) return fail(res, 400, 'Email-specific invitations can only be used once.');
      const code = crypto.randomBytes(24).toString('base64url');
      const invitationId = id();
      await pool.query(`INSERT INTO invitations(id,school_id,role,email,code_hash,max_uses,expires_at,created_by)
        VALUES($1,$2,$3,$4,$5,$6,NOW() + $7 * INTERVAL '1 day',$8)`,
      [invitationId, req.auth.school.id, role, email || null, hash(code), maxUses, days, req.auth.id]);
      res.status(201).json({ id: invitationId, code, invitationUrl: `${appOrigin}/?join=${encodeURIComponent(code)}`, role, email: email || '', maxUses, expiresInDays: days });
    } catch (error) { next(error); }
  });

  router.patch('/school/members/:id', requireRole('school_admin'), async (req, res, next) => {
    try {
      const active = req.body?.active;
      if (typeof active !== 'boolean') return fail(res, 400, 'Choose whether this account should be active.');
      if (req.params.id === req.auth.id) return fail(res, 400, 'You cannot deactivate your own administrator account.');
      const memberResult = await pool.query('SELECT * FROM users WHERE id=$1 AND school_id=$2', [req.params.id, req.auth.school.id]);
      const member = memberResult.rows[0];
      if (!member) return fail(res, 404, 'School member not found.');
      if (active && member.role === 'student') {
        const used = await pool.query("SELECT COUNT(*)::int AS count FROM users WHERE school_id=$1 AND role='student' AND active", [req.auth.school.id]);
        if (used.rows[0].count >= req.auth.school.seatLimit) return fail(res, 409, 'All learner seats are currently in use.');
      }
      await pool.query('UPDATE users SET active=$2,updated_at=NOW() WHERE id=$1', [member.id, active]);
      if (!active) await pool.query('DELETE FROM sessions WHERE user_id=$1', [member.id]);
      res.json({ ok: true });
    } catch (error) { next(error); }
  });

  router.get('/admin/overview', requireRole('super_admin'), async (_req, res, next) => {
    try {
      const [schools, consumers, pilots, schoolRevenue, consumerRevenue] = await Promise.all([
        pool.query(`SELECT s.id,s.name,s.slug,
          CASE WHEN s.status IN ('pilot','licensed') AND s.licence_end_at<=NOW() THEN 'expired' ELSE s.status END AS status,
          s.seat_limit AS "seatLimit",s.licence_end_at AS "licenceEndAt",
          COUNT(u.id) FILTER (WHERE u.role='student' AND u.active)::int AS "seatsUsed"
          FROM schools s LEFT JOIN users u ON u.school_id=s.id WHERE s.account_type='school' GROUP BY s.id ORDER BY s.created_at DESC`),
        pool.query(`SELECT s.id,s.name,s.account_type AS "accountType",s.status,s.licence_end_at AS "licenceEndAt",
          u.email AS "ownerEmail",u.display_name AS "ownerName",
          COUNT(m.id) FILTER (WHERE m.role='student' AND m.active)::int AS "learnersUsed"
          FROM schools s JOIN users u ON u.school_id=s.id AND u.role='account_owner'
          LEFT JOIN users m ON m.school_id=s.id
          WHERE s.account_type IN ('individual','family') GROUP BY s.id,u.id ORDER BY s.created_at DESC`),
        pool.query("SELECT COUNT(*)::int AS count FROM pilot_requests WHERE status='pending'"),
        pool.query("SELECT COALESCE(SUM(amount_kobo),0)::bigint AS amount FROM payments WHERE status='success'"),
        pool.query("SELECT COALESCE(SUM(amount_kobo),0)::bigint AS amount FROM subscription_payments WHERE status='success'"),
      ]);
      res.json({ schools: schools.rows, consumers:consumers.rows, pendingPilots: pilots.rows[0].count,
        schoolRevenueKobo:Number(schoolRevenue.rows[0].amount),consumerRevenueKobo:Number(consumerRevenue.rows[0].amount),
        revenueKobo:Number(schoolRevenue.rows[0].amount) + Number(consumerRevenue.rows[0].amount), paymentMode: paymentMode() });
    } catch (error) { next(error); }
  });

  router.get('/admin/pilot-requests', requireRole('super_admin'), async (_req, res, next) => {
    try {
      const result = await pool.query(`SELECT id,school_name AS "schoolName",admin_name AS "adminName",admin_email AS "adminEmail",
        phone,estimated_learners AS "estimatedLearners",message,status,school_id AS "schoolId",created_at AS "createdAt"
        FROM pilot_requests ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END,created_at DESC`);
      res.json({ requests: result.rows });
    } catch (error) { next(error); }
  });

  router.post('/admin/pilot-requests/:id/approve', requireRole('super_admin'), async (req, res, next) => {
    const client = await pool.connect();
    let code;
    let schoolId;
    let adminEmail;
    try {
      await client.query('BEGIN');
      const result = await client.query("SELECT * FROM pilot_requests WHERE id=$1 FOR UPDATE", [req.params.id]);
      const request = result.rows[0];
      if (!request) throw Object.assign(new Error('Pilot request not found.'), { status: 404 });
      if (request.status !== 'pending') throw Object.assign(new Error('This pilot request has already been reviewed.'), { status: 409 });
      schoolId = id();
      adminEmail = request.admin_email;
      await client.query(`INSERT INTO schools(id,name,slug,status,seat_limit,licence_start_at,licence_end_at)
        VALUES($1,$2,$3,'pilot',25,NOW(),NOW() + INTERVAL '30 days')`, [schoolId, request.school_name, slug(request.school_name)]);
      code = crypto.randomBytes(24).toString('base64url');
      await client.query(`INSERT INTO invitations(id,school_id,role,email,code_hash,max_uses,expires_at,created_by)
        VALUES($1,$2,'school_admin',$3,$4,1,NOW() + INTERVAL '14 days',$5)`, [id(), schoolId, adminEmail, hash(code), req.auth.id]);
      await client.query(`UPDATE pilot_requests SET status='approved',school_id=$2,reviewed_by=$3,reviewed_at=NOW() WHERE id=$1`, [request.id, schoolId, req.auth.id]);
      await client.query('COMMIT');
      res.json({ ok: true, schoolId, adminEmail, invitationUrl: `${appOrigin}/?join=${encodeURIComponent(code)}`, pilotSeats: 25, pilotDays: 30 });
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.status) return fail(res, error.status, error.message);
      next(error);
    } finally { client.release(); }
  });

  router.post('/admin/pilot-requests/:id/reject', requireRole('super_admin'), async (req, res, next) => {
    try {
      const result = await pool.query(`UPDATE pilot_requests SET status='rejected',reviewed_by=$2,reviewed_at=NOW()
        WHERE id=$1 AND status='pending' RETURNING id`, [req.params.id, req.auth.id]);
      if (!result.rowCount) return fail(res, 404, 'A pending pilot request was not found.');
      res.json({ ok: true });
    } catch (error) { next(error); }
  });

  router.post('/admin/quotes', requireRole('super_admin'), async (req, res, next) => {
    try {
      const schoolId = text(req.body?.schoolId, 80);
      const billingPeriod = String(req.body?.billingPeriod || '');
      const amountNaira = Number(req.body?.amountNaira);
      const amountKobo = Math.round(amountNaira * 100);
      const seatLimit = integer(req.body?.seatLimit, 1, 100000);
      const durationDays = integer(req.body?.durationDays ?? (billingPeriod === 'annual' ? 365 : 120), 1, 730);
      const expiresInDays = integer(req.body?.expiresInDays ?? 14, 1, 90);
      const title = text(req.body?.title || `LearnBridge ${billingPeriod} school licence`, 160);
      if (!schoolId || !['termly','annual'].includes(billingPeriod) || !Number.isInteger(amountKobo) || amountKobo < 100 || !seatLimit || !durationDays || !expiresInDays || !title) return fail(res, 400, 'Enter a valid school, amount, learner-seat count and billing period.');
      const school = await pool.query("SELECT id FROM schools WHERE id=$1 AND account_type='school'", [schoolId]);
      if (!school.rowCount) return fail(res, 404, 'School not found.');
      const seats = await pool.query("SELECT COUNT(*)::int AS used FROM users WHERE school_id=$1 AND role='student' AND active", [schoolId]);
      if (seatLimit < seats.rows[0].used) return fail(res, 409, `This school already has ${seats.rows[0].used} active learners. Deactivate accounts or quote at least that many seats.`);
      const quoteId = id();
      await pool.query(`INSERT INTO licence_quotes(id,school_id,title,amount_kobo,billing_period,duration_days,seat_limit,status,expires_at,created_by)
        VALUES($1,$2,$3,$4,$5,$6,$7,'sent',NOW() + $8 * INTERVAL '1 day',$9)`,
      [quoteId, schoolId, title, amountKobo, billingPeriod, durationDays, seatLimit, expiresInDays, req.auth.id]);
      res.status(201).json({ id: quoteId, amountKobo, currency: 'NGN', billingPeriod, durationDays, seatLimit });
    } catch (error) { next(error); }
  });

  router.post('/admin/schools/:id/admin-invitation', requireRole('super_admin'), async (req, res, next) => {
    try {
      const email = normalEmail(req.body?.email);
      if (!emailValid(email)) return fail(res, 400, 'Enter a valid school administrator email address.');
      const school = await pool.query("SELECT id,name FROM schools WHERE id=$1 AND account_type='school'", [req.params.id]);
      if (!school.rowCount) return fail(res, 404, 'School not found.');
      const code = crypto.randomBytes(24).toString('base64url');
      await pool.query(`INSERT INTO invitations(id,school_id,role,email,code_hash,max_uses,expires_at,created_by)
        VALUES($1,$2,'school_admin',$3,$4,1,NOW() + INTERVAL '14 days',$5)`, [id(), req.params.id, email, hash(code), req.auth.id]);
      res.status(201).json({ schoolName: school.rows[0].name, email, invitationUrl: `${appOrigin}/?join=${encodeURIComponent(code)}` });
    } catch (error) { next(error); }
  });

  router.post('/billing/initialize', requireRole('school_admin'), async (req, res, next) => {
    let paymentId;
    let reference;
    try {
      const client = await pool.connect();
      let quote;
      try {
        await client.query('BEGIN');
        const result = await client.query(`SELECT * FROM licence_quotes WHERE id=$1 AND school_id=$2 FOR UPDATE`, [req.body?.quoteId, req.auth.school.id]);
        quote = result.rows[0];
        if (!quote) throw Object.assign(new Error('Quotation not found.'), { status: 404 });
        if (quote.status !== 'sent' || new Date(quote.expires_at).getTime() <= Date.now()) throw Object.assign(new Error('This quotation is no longer available for payment.'), { status: 409 });
        reference = `LB-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
        paymentId = id();
        await client.query("UPDATE payments SET status='failed',updated_at=NOW() WHERE quote_id=$1 AND status='pending'", [quote.id]);
        await client.query(`INSERT INTO payments(id,quote_id,school_id,payer_user_id,reference,amount_kobo,currency)
          VALUES($1,$2,$3,$4,$5,$6,$7)`, [paymentId, quote.id, quote.school_id, req.auth.id, reference, quote.amount_kobo, quote.currency]);
        await client.query('COMMIT');
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
      const result = await paystack('/transaction/initialize', {
        method: 'POST',
        body: JSON.stringify({
          email: req.auth.email,
          amount: quote.amount_kobo,
          currency: quote.currency,
          reference,
          callback_url: `${appOrigin}/?payment=callback`,
          metadata: { quote_id: quote.id, school_id: quote.school_id, payment_id: paymentId },
        }),
      });
      res.json({ authorizationUrl: result.authorization_url, accessCode: result.access_code, reference });
    } catch (error) {
      if (paymentId) await pool.query("UPDATE payments SET status='failed',updated_at=NOW() WHERE id=$1", [paymentId]).catch(() => {});
      if (error.status) return fail(res, error.status, error.message);
      next(error);
    }
  });

  router.post('/billing/verify', requireRole('school_admin','account_owner','super_admin'), async (req, res, next) => {
    try {
      const reference = text(req.body?.reference, 160);
      if (!reference) return fail(res, 400, 'Payment reference is required.');
      const registered = await pool.query(`SELECT school_id,'school' AS kind FROM payments WHERE reference=$1
        UNION ALL SELECT school_id,'consumer' AS kind FROM subscription_payments WHERE reference=$1`, [reference]);
      if (!registered.rowCount) return fail(res, 404, 'Payment reference not found.');
      if (req.auth.role !== 'super_admin' && registered.rows[0].school_id !== req.auth.school.id) return fail(res, 403, 'This payment does not belong to your account.');
      const charge = await paystack(`/transaction/verify/${encodeURIComponent(reference)}`, { method: 'GET' });
      const result = await applySuccessfulCharge(pool, charge);
      const dashboard = req.auth.role === 'school_admin' ? await schoolDashboard(pool, req.auth.school.id, true)
        : req.auth.role === 'account_owner' ? await consumerDashboard(pool, req.auth.school.id) : undefined;
      res.json({ ok: true, reference, ...result, dashboard });
    } catch (error) {
      if (error.status) return fail(res, error.status, error.message);
      next(error);
    }
  });

  router.post('/paystack/webhook', async (req, res) => {
    const secret = String(process.env.PAYSTACK_SECRET_KEY || '');
    if (!secret || !Buffer.isBuffer(req.rawBody)) return res.sendStatus(503);
    const received = String(req.get('x-paystack-signature') || '');
    const expected = crypto.createHmac('sha512', secret).update(req.rawBody).digest('hex');
    const valid = received.length === expected.length && crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
    if (!valid) return res.sendStatus(401);
    const eventHash = hash(req.rawBody);
    const inserted = await pool.query(`INSERT INTO webhook_events(event_hash,event_type) VALUES($1,$2)
      ON CONFLICT(event_hash) DO NOTHING RETURNING event_hash`, [eventHash, text(req.body?.event, 80)]);
    if (!inserted.rowCount) return res.sendStatus(200);
    try {
      const eventType = String(req.body?.event || '');
      if (eventType === 'charge.success') await applySuccessfulCharge(pool, req.body.data, { ignoreUnmatched:true });
      if (['subscription.create','subscription.not_renew','subscription.disable','invoice.payment_failed','invoice.update'].includes(eventType)) {
        await applySubscriptionEvent(pool, eventType, req.body.data);
      }
      await pool.query('UPDATE webhook_events SET processed_at=NOW() WHERE event_hash=$1', [eventHash]);
      res.sendStatus(200);
    } catch (error) {
      console.error('Paystack webhook processing failed:', error.message);
      await pool.query('DELETE FROM webhook_events WHERE event_hash=$1', [eventHash]).catch(() => {});
      res.sendStatus(500);
    }
  });

  return router;
}

export function platformErrorHandler(error, _req, res, _next) {
  console.error(error);
  if (res.headersSent) return;
  fail(res, error.status || 500, error.status ? error.message : 'The request could not be completed. Please retry.');
}

export function requirePreloadAccess(req, res, next) {
  if (req.auth?.role === 'super_admin') return next();
  if (preloadTokenMatches(req)) return next();
  return fail(res, 401, 'A platform administrator or valid preload token is required.');
}

function preloadTokenMatches(req) {
  const configured = String(process.env.PRELOAD_TOKEN || '');
  const provided = String(req.get('x-preload-token') || '');
  return Boolean(configured && provided.length === configured.length && crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(configured)));
}
