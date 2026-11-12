export const SCHOOL_LICENCE_TIERS = Object.freeze([
  Object.freeze({
    code: 'starter',
    label: 'Starter',
    seatLimit: 150,
    termlyAmountNaira: 150000,
    sessionAmountNaira: 360000,
    multiCampus: false,
  }),
  Object.freeze({
    code: 'growth',
    label: 'Growth',
    seatLimit: 400,
    termlyAmountNaira: 350000,
    sessionAmountNaira: 840000,
    multiCampus: false,
  }),
  Object.freeze({
    code: 'professional',
    label: 'Professional',
    seatLimit: 1000,
    termlyAmountNaira: 750000,
    sessionAmountNaira: 1800000,
    multiCampus: false,
  }),
  Object.freeze({
    code: 'enterprise',
    label: 'Enterprise',
    seatLimit: null,
    termlyAmountNaira: null,
    sessionAmountNaira: 2400000,
    multiCampus: true,
  }),
]);

const tierByCode = new Map(SCHOOL_LICENCE_TIERS.map(tier => [tier.code, tier]));

function integer(value, minimum, maximum, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new RangeError(`Enter a whole number between ${minimum} and ${maximum}.`);
  }
  return number;
}

function money(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || number > 20000000) {
    throw new RangeError('Enter a valid quotation amount in naira.');
  }
  return Math.round(number * 100) / 100;
}

export function normalSchoolBillingPeriod(value) {
  const period = String(value || '').toLowerCase();
  if (period === 'annual') return 'session';
  if (period === 'termly' || period === 'session') return period;
  throw new RangeError('Choose termly or full-session billing.');
}

export function schoolLicenceQuote(input = {}) {
  const tierCode = String(input.tierCode || '').toLowerCase();
  const tier = tierByCode.get(tierCode);
  if (!tier) throw new RangeError('Choose a valid school licence tier.');

  const billingPeriod = normalSchoolBillingPeriod(input.billingPeriod);
  const campusCount = integer(input.campusCount, 1, 10, 1);
  const defaultSeats = tier.seatLimit || 1001;
  const seatLimit = integer(input.seatLimit, 1, 100000, defaultSeats);
  if (tier.seatLimit && seatLimit > tier.seatLimit) {
    throw new RangeError(`${tier.label} supports up to ${tier.seatLimit} active learners. Choose a larger tier or Enterprise.`);
  }

  const listedAmount = billingPeriod === 'termly' ? tier.termlyAmountNaira : tier.sessionAmountNaira;
  const recommendedAmountNaira = listedAmount === null ? null : listedAmount * campusCount;
  const licenceAmountNaira = money(input.amountNaira, recommendedAmountNaira);
  if (licenceAmountNaira === null) {
    throw new RangeError('Enter the agreed custom Enterprise licence amount.');
  }

  const onboardingMode = String(input.onboardingMode || 'remote').toLowerCase();
  if (!['remote', 'onsite', 'none'].includes(onboardingMode)) {
    throw new RangeError('Choose remote, onsite or no onboarding.');
  }
  const onboardingFeeNaira = onboardingMode === 'onsite'
    ? money(input.onboardingFeeNaira, null)
    : 0;
  if (onboardingMode === 'onsite' && onboardingFeeNaira === null) {
    throw new RangeError('Enter the agreed onsite onboarding fee.');
  }

  const durationDays = integer(input.durationDays, 1, 730, billingPeriod === 'session' ? 365 : 120);
  const expiresInDays = integer(input.expiresInDays, 1, 90, 14);
  const amountNaira = licenceAmountNaira + onboardingFeeNaira;
  if (amountNaira > 20000000) {
    throw new RangeError('The quotation total cannot exceed ₦20,000,000 in one Paystack transaction. Split a larger agreement into separate quotations.');
  }

  return {
    tierCode,
    tierLabel: tier.label,
    billingPeriod,
    campusCount,
    seatLimit,
    durationDays,
    expiresInDays,
    onboardingMode,
    onboardingFeeNaira,
    onboardingFeeKobo: Math.round(onboardingFeeNaira * 100),
    licenceAmountNaira,
    amountNaira,
    amountKobo: Math.round(amountNaira * 100),
    recommendedAmountNaira,
    unlimitedTeachers: true,
    unlimitedAdministrators: true,
  };
}

export function pilotConfiguration(input = {}) {
  return {
    pilotDays: integer(input.pilotDays, 1, 90, 30),
    pilotSeats: integer(input.pilotSeats, 1, 500, 50),
    campusCount: integer(input.campusCount, 1, 10, 1),
    unlimitedTeachers: true,
    unlimitedAdministrators: true,
  };
}

