const FollowUp = require('../models/FollowUp');
const Quotation = require('../models/Quotation');

function computeAgingBucket(createdAt) {
  if (!createdAt) return '0_7';
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
  if (days <= 7) return '0_7';
  if (days <= 15) return '8_15';
  if (days <= 30) return '16_30';
  return '30_plus';
}

function budgetScore(budget = 0) {
  if (budget >= 300000) return 100;
  if (budget >= 150000) return 80;
  if (budget >= 75000) return 60;
  if (budget >= 30000) return 40;
  if (budget > 0) return 25;
  return 0;
}

function travelDateScore(travelDate) {
  if (!travelDate) return 30;
  const days = Math.floor((new Date(travelDate).getTime() - Date.now()) / 86400000);
  if (days <= 0) return 20;
  if (days <= 30) return 100;
  if (days <= 60) return 80;
  if (days <= 90) return 60;
  return 40;
}

function temperatureFromScore(smartScore, lead = {}) {
  if (lead.isVip) return 'vip';
  if (smartScore >= 75 || lead.isHot) return 'hot';
  if (smartScore >= 45) return 'warm';
  return 'cold';
}

async function enrichLeadMetrics(lead) {
  const leadId = lead._id;
  const [followUps, quotations] = await Promise.all([
    FollowUp.find({ lead: leadId }).select('status').lean(),
    Quotation.find({ lead: leadId }).select('status').lean(),
  ]);

  const totalFu = followUps.length || 1;
  const completedFu = followUps.filter((f) => f.status === 'completed').length;
  const followUpScore = Math.round((completedFu / totalFu) * 100);

  const hasQuotation = quotations.length > 0;
  const sentQuote = quotations.some((q) => ['sent', 'approved', 'accepted'].includes(q.status));
  const approvedQuote = quotations.some((q) => ['approved', 'accepted'].includes(q.status));
  let quotationScore = 0;
  if (approvedQuote) quotationScore = 100;
  else if (sentQuote) quotationScore = 70;
  else if (hasQuotation) quotationScore = 40;

  const responseScore = lead.responseRate || (lead.firstContactAt ? 80 : 20);

  const smartScore = Math.min(
    100,
    Math.round(
      budgetScore(lead.budget) * 0.25 +
        travelDateScore(lead.travelDate) * 0.2 +
        responseScore * 0.15 +
        followUpScore * 0.2 +
        quotationScore * 0.2
    )
  );

  const temperature = temperatureFromScore(smartScore, lead);
  const agingBucket = computeAgingBucket(lead.createdAt);
  const isVip = lead.isVip || lead.budget >= 300000;

  return { smartScore, temperature, agingBucket, isVip };
}

function computeMetricsSync(lead = {}) {
  const smartScore = Math.min(
    100,
    Math.round(
      budgetScore(lead.budget) * 0.25 +
        travelDateScore(lead.travelDate) * 0.2 +
        20 * 0.35
    )
  );
  const temperature = temperatureFromScore(smartScore, lead);
  const agingBucket = computeAgingBucket(lead.createdAt || new Date());
  const isVip = lead.isVip || lead.budget >= 300000;
  return { smartScore, temperature, agingBucket, isVip };
}

async function applyLeadMetrics(lead) {
  const metrics = lead._id ? await enrichLeadMetrics(lead) : computeMetricsSync(lead);
  lead.smartScore = metrics.smartScore;
  lead.temperature = metrics.temperature;
  lead.agingBucket = metrics.agingBucket;
  lead.isVip = metrics.isVip;
  if (metrics.temperature === 'hot') lead.isHot = true;
  applyBookingPotential(lead);
  return lead;
}

/**
 * Add/Edit Lead form's "Lead Score" (Step 6) — booking potential from the customer + travel
 * details entered on the form. Distinct from smartScore above, which measures a lead's
 * POST-CREATION engagement/health (response-rate, follow-up completion, quotation progress —
 * signals that don't exist yet for a lead still being drafted). This measures how promising the
 * form's OWN details are, so a manager/executive gets an instant quality signal at entry time.
 *
 * Kept in sync with frontend/src/components/lead-wizard/leadScoreCalculator.js (same
 * weights/formula, mirrored there only for the live client-side preview as you type — this
 * backend copy is the single authoritative calculation, re-run on every create/update, so a
 * client can never submit a fabricated score).
 */
const BOOKING_POTENTIAL_MAX = {
  customer: 20,
  travel: 30,
  commercial: 25,
  intent: 15,
  requirements: 10,
};

const BOOKING_POTENTIAL_THRESHOLDS = { cold: 0, warm: 40, hot: 70 };

/**
 * Traveller headcount (adults/children/infants) is a numeric field that can't be left blank —
 * "2/0/0" exists only so the field isn't an invalid empty number, not because it's a real
 * sellable option. Leaving it untouched is not evidence the executive actually confirmed who's
 * traveling, so it's scored as "not yet provided" unless changed.
 *
 * This is deliberately NOT applied to hotelCategory/cabType/mealPlan: those defaults (3-star /
 * sedan / MAP) are genuine pre-selected business choices — the most commonly sold options — and
 * are just as valid a "selection" as any other value in those dropdowns. See bookingChosen()
 * below.
 */
const UNCONFIRMED_DEFAULTS = {
  adults: 2,
  children: 0,
  infants: 0,
};

function bookingPotentialCategoryFromScore(score) {
  if (score >= BOOKING_POTENTIAL_THRESHOLDS.hot) return 'hot';
  if (score >= BOOKING_POTENTIAL_THRESHOLDS.warm) return 'warm';
  return 'cold';
}

function bookingBudgetPoints(budget) {
  const b = Number(budget) || 0;
  if (b >= 150000) return 12;
  if (b >= 75000) return 10;
  if (b >= 40000) return 8;
  if (b >= 20000) return 5;
  if (b > 0) return 2;
  return 0;
}

/** 'medium' is the untouched default intent, indistinguishable from "never asked" — only an
 *  explicit high/urgent selection counts as a real buying-intent signal. */
function bookingIntentPoints(priority) {
  return { high: 10, urgent: 15 }[priority] ?? 0;
}

function bookingRequirementsPoints(text) {
  const len = String(text || '').trim().length;
  if (len >= 20) return 10;
  if (len > 0) return 4;
  return 0;
}

function lastDigits(phone) {
  return String(phone || '').replace(/\D/g, '').slice(-10);
}

/** Pure function: same lead-shaped input (create-time plain object or a saved Lead doc) -> same
 *  score every time. Missing/empty/still-default fields contribute 0 — never NaN, never negative. */
function computeBookingPotential(lead = {}) {
  // The wizard auto-copies phone into whatsapp when the executive leaves WhatsApp blank
  // (wizardValuesToPayload: whatsapp = values.whatsapp || values.phone), so a saved lead's
  // whatsapp matching its phone is not evidence WhatsApp was actually confirmed available.
  const whatsappConfirmed = lastDigits(lead.whatsapp) && lastDigits(lead.whatsapp) !== lastDigits(lead.phone);

  const customerScore =
    (String(lead.phone || '').trim() ? 10 : 0) +
    (whatsappConfirmed ? 5 : 0) +
    (String(lead.email || '').trim() ? 5 : 0);

  const travelersSpecified =
    Number(lead.adults) !== UNCONFIRMED_DEFAULTS.adults ||
    Number(lead.children) !== UNCONFIRMED_DEFAULTS.children ||
    Number(lead.infants) !== UNCONFIRMED_DEFAULTS.infants;

  const travelScore =
    (String(lead.destination || '').trim() ? 10 : 0) +
    (lead.travelDate ? 8 : 0) +
    (lead.returnDate ? 7 : 0) +
    (travelersSpecified ? 5 : 0);

  // Hotel/cab/meal-plan defaults (3-star / sedan / MAP) are real, commonly-sold selections, not
  // placeholders — any non-empty value earns points, including the default one.
  const hotelChosen = Boolean(String(lead.hotelCategory || '').trim());
  const cabChosen = Boolean(String(lead.cabType || lead.transportRequirement || '').trim());
  const mealChosen = Boolean(String(lead.mealPlan || '').trim());

  const commercialScore =
    bookingBudgetPoints(lead.budget) +
    (hotelChosen ? 5 : 0) +
    (cabChosen ? 5 : 0) +
    (mealChosen ? 3 : 0);

  const intentScore = bookingIntentPoints(lead.priority);
  const requirementsScore = bookingRequirementsPoints(lead.specialRequirements ?? lead.requirements);

  const score = Math.max(
    0,
    Math.min(100, customerScore + travelScore + commercialScore + intentScore + requirementsScore)
  );

  const budgetEarned = bookingBudgetPoints(lead.budget);
  const intentEarned = intentScore;
  const requirementsEarned = requirementsScore;

  return {
    score,
    category: bookingPotentialCategoryFromScore(score),
    // Sub-item detail is purely presentational (Add/Edit Lead Step 6 breakdown) — every
    // `points`/`earned` value below is read directly from the scoring above, never recomputed.
    breakdown: {
      customer: {
        score: customerScore,
        max: BOOKING_POTENTIAL_MAX.customer,
        items: [
          { key: 'phone', label: 'Phone number', points: 10, earned: Boolean(String(lead.phone || '').trim()) },
          { key: 'whatsapp', label: 'WhatsApp confirmed', points: 5, earned: Boolean(whatsappConfirmed) },
          { key: 'email', label: 'Email address', points: 5, earned: Boolean(String(lead.email || '').trim()) },
        ],
      },
      travel: {
        score: travelScore,
        max: BOOKING_POTENTIAL_MAX.travel,
        items: [
          { key: 'destination', label: 'Destination', points: 10, earned: Boolean(String(lead.destination || '').trim()) },
          { key: 'travelDate', label: 'Tour start date', points: 8, earned: Boolean(lead.travelDate) },
          { key: 'returnDate', label: 'Tour end date', points: 7, earned: Boolean(lead.returnDate) },
          { key: 'travelers', label: 'Traveller details', points: 5, earned: travelersSpecified },
        ],
      },
      commercial: {
        score: commercialScore,
        max: BOOKING_POTENTIAL_MAX.commercial,
        items: [
          { key: 'budget', label: 'Budget', points: budgetEarned || 12, earned: budgetEarned > 0 },
          { key: 'hotel', label: 'Hotel preference', points: 5, earned: Boolean(hotelChosen) },
          { key: 'cab', label: 'Cab preference', points: 5, earned: Boolean(cabChosen) },
          { key: 'meal', label: 'Meal plan', points: 3, earned: Boolean(mealChosen) },
        ],
      },
      intent: {
        score: intentScore,
        max: BOOKING_POTENTIAL_MAX.intent,
        items: [
          { key: 'intent', label: 'High/urgent buying intent', points: intentEarned || 15, earned: intentEarned > 0 },
        ],
      },
      requirements: {
        score: requirementsScore,
        max: BOOKING_POTENTIAL_MAX.requirements,
        items: [
          { key: 'requirements', label: 'Specific requirements noted', points: requirementsEarned || 10, earned: requirementsEarned > 0 },
        ],
      },
    },
  };
}

function applyBookingPotential(lead) {
  const { score, category } = computeBookingPotential(lead);
  lead.bookingPotentialScore = score;
  lead.bookingPotentialCategory = category;
  return lead;
}

module.exports = {
  computeAgingBucket,
  budgetScore,
  travelDateScore,
  temperatureFromScore,
  computeMetricsSync,
  enrichLeadMetrics,
  applyLeadMetrics,
  BOOKING_POTENTIAL_MAX,
  BOOKING_POTENTIAL_THRESHOLDS,
  bookingPotentialCategoryFromScore,
  computeBookingPotential,
  applyBookingPotential,
};
