import crypto from 'node:crypto';
import nodemailer from 'nodemailer';

export const RESET_TOKEN_BYTES = 32;
export const RESET_TOKEN_MINUTES = 30;

function boolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

function validResetOrigin(value) {
  try {
    const url = new URL(String(value || ''));
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    return url.protocol === 'https:' || (local && url.protocol === 'http:');
  } catch {
    return false;
  }
}

export function passwordEmailConfigured(env = process.env) {
  const port = Number(env.SMTP_PORT || 0);
  const hasCredentials = Boolean(env.SMTP_USER) === Boolean(env.SMTP_PASSWORD);
  return Boolean(env.SMTP_HOST && Number.isInteger(port) && port > 0 && port <= 65535 && env.SMTP_FROM && hasCredentials);
}

export function passwordRecoveryConfigured(env = process.env) {
  return passwordEmailConfigured(env) && validResetOrigin(env.APP_ORIGIN);
}

export function createPasswordResetToken() {
  const token = crypto.randomBytes(RESET_TOKEN_BYTES).toString('base64url');
  return {
    token,
    tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
  };
}

export function buildPasswordResetUrl(appOrigin, token) {
  if (!validResetOrigin(appOrigin)) throw new Error('APP_ORIGIN must be HTTPS, except for localhost testing.');
  const base = String(appOrigin).replace(/\/+$/, '');
  return `${base}/#password-reset=${encodeURIComponent(token)}`;
}

function transporter(env = process.env) {
  if (!passwordEmailConfigured(env)) throw new Error('Password recovery email is not configured.');
  const port = Number(env.SMTP_PORT);
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure: boolean(env.SMTP_SECURE, port === 465),
    requireTLS: boolean(env.SMTP_REQUIRE_TLS, port !== 465),
    ...(env.SMTP_USER ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } } : {}),
  });
}

function sender(env = process.env) {
  return {
    from: env.SMTP_FROM,
    ...(env.SMTP_REPLY_TO ? { replyTo: env.SMTP_REPLY_TO } : {}),
  };
}

export async function sendPasswordResetEmail({ to, displayName, resetUrl }, env = process.env) {
  const name = String(displayName || 'LearnBridge user').replace(/[\r\n]+/g, ' ').slice(0, 100);
  await transporter(env).sendMail({
    ...sender(env),
    to,
    subject: 'Reset your LearnBridge password',
    text: `Hello ${name},\n\nUse the secure link below to reset your LearnBridge password. The link expires in ${RESET_TOKEN_MINUTES} minutes and can be used only once.\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email. Your password has not been changed.\n`,
  });
}

export async function sendPasswordChangedEmail({ to, displayName }, env = process.env) {
  const name = String(displayName || 'LearnBridge user').replace(/[\r\n]+/g, ' ').slice(0, 100);
  await transporter(env).sendMail({
    ...sender(env),
    to,
    subject: 'Your LearnBridge password was changed',
    text: `Hello ${name},\n\nYour LearnBridge password has just been changed. All existing sign-in sessions were closed.\n\nIf you did not make this change, contact ${env.SUPPORT_EMAIL || 'LearnBridge support'} immediately.\n`,
  });
}
