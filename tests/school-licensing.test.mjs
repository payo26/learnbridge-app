import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  SCHOOL_LICENCE_TIERS,
  normalSchoolBillingPeriod,
  pilotConfiguration,
  schoolLicenceQuote,
} from '../backend/school-licensing.mjs';

test('publishes the approved school licence catalogue', () => {
  assert.deepEqual(SCHOOL_LICENCE_TIERS.map(tier => ({
    code:tier.code,
    seats:tier.seatLimit,
    term:tier.termlyAmountNaira,
    session:tier.sessionAmountNaira,
  })), [
    {code:'starter',seats:150,term:150000,session:360000},
    {code:'growth',seats:400,term:350000,session:840000},
    {code:'professional',seats:1000,term:750000,session:1800000},
    {code:'enterprise',seats:null,term:null,session:2400000},
  ]);
});

test('full-session catalogue prices are twenty percent below three terms', () => {
  for (const tier of SCHOOL_LICENCE_TIERS.filter(item => item.termlyAmountNaira)) {
    assert.equal(tier.sessionAmountNaira, tier.termlyAmountNaira * 3 * 0.8);
  }
});

test('standard school quotations apply price per campus and include unlimited staff', () => {
  const quote=schoolLicenceQuote({
    tierCode:'growth',billingPeriod:'session',campusCount:2,seatLimit:400,
    onboardingMode:'remote',
  });
  assert.equal(quote.amountNaira,1680000);
  assert.equal(quote.amountKobo,168000000);
  assert.equal(quote.durationDays,365);
  assert.equal(quote.unlimitedTeachers,true);
  assert.equal(quote.unlimitedAdministrators,true);
  assert.equal(quote.onboardingFeeNaira,0);
});

test('onsite onboarding is separately added to the exact quotation total', () => {
  const quote=schoolLicenceQuote({
    tierCode:'starter',billingPeriod:'termly',campusCount:1,seatLimit:150,
    amountNaira:140000,onboardingMode:'onsite',onboardingFeeNaira:50000,
  });
  assert.equal(quote.licenceAmountNaira,140000);
  assert.equal(quote.onboardingFeeNaira,50000);
  assert.equal(quote.amountNaira,190000);
  assert.equal(quote.amountKobo,19000000);
});

test('Enterprise supports a negotiated custom amount and legacy annual input maps to session', () => {
  assert.equal(normalSchoolBillingPeriod('annual'),'session');
  const quote=schoolLicenceQuote({
    tierCode:'enterprise',billingPeriod:'annual',campusCount:4,seatLimit:2500,
    amountNaira:3000000,onboardingMode:'remote',
  });
  assert.equal(quote.billingPeriod,'session');
  assert.equal(quote.amountNaira,3000000);
  assert.equal(quote.campusCount,4);
});

test('pilot defaults are free operational limits, not a payment plan', () => {
  assert.deepEqual(pilotConfiguration(),{
    pilotDays:30,
    pilotSeats:50,
    campusCount:1,
    unlimitedTeachers:true,
    unlimitedAdministrators:true,
  });
  assert.deepEqual(pilotConfiguration({pilotDays:45,pilotSeats:75,campusCount:2}),{
    pilotDays:45,
    pilotSeats:75,
    campusCount:2,
    unlimitedTeachers:true,
    unlimitedAdministrators:true,
  });
});

test('a standard tier cannot silently exceed its learner ceiling', () => {
  assert.throws(()=>schoolLicenceQuote({tierCode:'starter',billingPeriod:'termly',seatLimit:151}),/supports up to 150/);
  assert.throws(()=>schoolLicenceQuote({tierCode:'enterprise',billingPeriod:'termly',seatLimit:1200}),/custom Enterprise licence amount/);
});

test('platform and school administrators receive the required licence controls', async () => {
  const [platformSource,schema,portalSource]=await Promise.all([
    fs.readFile(new URL('../backend/platform.mjs',import.meta.url),'utf8'),
    fs.readFile(new URL('../database/init.sql',import.meta.url),'utf8'),
    fs.readFile(new URL('../src/CommercialPortal.tsx',import.meta.url),'utf8'),
  ]);
  assert.match(platformSource,/patch\('\/admin\/schools\/:id\/licence'/i);
  assert.match(platformSource,/\['school_admin','teacher','student'\]\.includes\(role\)/);
  assert.match(platformSource,/unlimited_teachers=TRUE,unlimited_administrators=TRUE/);
  assert.match(schema,/campus_count INTEGER NOT NULL DEFAULT 1/);
  assert.match(schema,/onboarding_fee_kobo/);
  assert.match(portalSource,/Add administrator/);
  assert.match(portalSource,/Issue school quotation/);
  assert.match(portalSource,/Manage an existing school licence/);
});

