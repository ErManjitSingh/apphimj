/**
 * Live client-side preview of the Add/Edit Lead form's "Lead Score" (Step 6) — booking potential
 * from the customer + travel details entered so far. This is a PREVIEW ONLY: the backend
 * (backend/src/services/leadScoringService.js computeBookingPotential) recalculates the
 * authoritative score on every create/update, so a client can never submit a fabricated value.
 *
 * Keep this formula in sync with that backend copy — same weights, same thresholds. Distinct from
 * the app's separate `smartScore`/`temperature` (Lead Detail page), which measures a lead's
 * POST-CREATION engagement/health using signals (follow-ups, quotations, response rate) that
 * don't exist yet for a lead still being drafted here.
 */
import { HOTEL_CATEGORY_OPTIONS, CAB_TYPE_OPTIONS, MEAL_PLAN_OPTIONS } from './constants';

function optionLabel(options, value) {
  return options.find((o) => o.value === value)?.label || value;
}

export const BOOKING_POTENTIAL_MAX = {
  customer: 20,
  travel: 30,
  commercial: 25,
  intent: 15,
  requirements: 10,
};

export const BOOKING_POTENTIAL_THRESHOLDS = { cold: 0, warm: 40, hot: 70 };

export const LEAD_SCORE_CATEGORY_META = {
  cold: { label: 'Cold Lead', badgeClass: 'bg-slate-100 text-slate-600', barColor: '#94A3B8', textClass: 'text-slate-600' },
  warm: { label: 'Warm Lead', badgeClass: 'bg-amber-100 text-amber-700', barColor: '#F59E0B', textClass: 'text-amber-600' },
  hot: { label: 'Hot Lead', badgeClass: 'bg-emerald-100 text-emerald-700', barColor: '#10B981', textClass: 'text-emerald-600' },
};

/**
 * Traveller headcount (adults/children/infants) is a numeric field that can't be left blank —
 * "2/0/0" exists only so the field isn't an invalid empty number, not because it's a real
 * sellable option. Leaving it untouched is not evidence the executive actually confirmed who's
 * traveling, so it's scored as "not yet provided" unless changed.
 *
 * This is deliberately NOT applied to hotelCategory/cabType/mealPlan: those defaults (3-star /
 * sedan / MAP) are genuine pre-selected business choices — the most commonly sold options — and
 * are just as valid a "selection" as any other value in those dropdowns.
 *
 * Kept in sync with the same constant in backend/src/services/leadScoringService.js.
 */
const UNCONFIRMED_DEFAULTS = {
  adults: 2,
  children: 0,
  infants: 0,
};

export function bookingPotentialCategoryFromScore(score) {
  if (score >= BOOKING_POTENTIAL_THRESHOLDS.hot) return 'hot';
  if (score >= BOOKING_POTENTIAL_THRESHOLDS.warm) return 'warm';
  return 'cold';
}

function budgetPoints(budget) {
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
function intentPoints(priority) {
  return { high: 10, urgent: 15 }[priority] ?? 0;
}

function requirementsPoints(text) {
  const len = String(text || '').trim().length;
  if (len >= 20) return 10;
  if (len > 0) return 4;
  return 0;
}

function lastDigits(phone) {
  return String(phone || '').replace(/\D/g, '').slice(-10);
}

/**
 * `values` is the lead-wizard's live form state (register/watch shape — same field names as
 * defaultWizardValues), not the API payload. Missing/empty/still-default fields contribute 0.
 */
export function calculateLeadScore(values = {}) {
  // At submit time the wizard copies phone into whatsapp when left blank (wizardValuesToPayload),
  // so treat "same as phone" as unconfirmed here too — the preview should match what gets saved.
  const whatsappConfirmed = lastDigits(values.whatsapp) && lastDigits(values.whatsapp) !== lastDigits(values.phone);

  const customerScore =
    (String(values.phone || '').trim() ? 10 : 0) +
    (whatsappConfirmed ? 5 : 0) +
    (String(values.email || '').trim() ? 5 : 0);

  const travelersSpecified =
    Number(values.adults) !== UNCONFIRMED_DEFAULTS.adults ||
    Number(values.children) !== UNCONFIRMED_DEFAULTS.children ||
    Number(values.infants) !== UNCONFIRMED_DEFAULTS.infants;

  const travelScore =
    (String(values.destination || '').trim() ? 10 : 0) +
    (values.travelDate ? 8 : 0) +
    (values.returnDate ? 7 : 0) +
    (travelersSpecified ? 5 : 0);

  // Hotel/cab/meal-plan defaults (3-star / sedan / MAP) are real, commonly-sold selections, not
  // placeholders — any non-empty value earns points, including the default one.
  const hotelChosen = Boolean(String(values.hotelCategory || '').trim());
  const cabChosen = Boolean(String(values.cabType || '').trim());
  const mealChosen = Boolean(String(values.mealPlan || '').trim());

  const commercialScore =
    budgetPoints(values.budget) +
    (hotelChosen ? 5 : 0) +
    (cabChosen ? 5 : 0) +
    (mealChosen ? 3 : 0);

  const intentScore = intentPoints(values.priority);
  const requirementsScore = requirementsPoints(values.requirements);

  const score = Math.max(
    0,
    Math.min(100, customerScore + travelScore + commercialScore + intentScore + requirementsScore)
  );

  const budgetEarned = budgetPoints(values.budget);
  const intentEarned = intentScore;
  const requirementsEarned = requirementsScore;

  return {
    score,
    category: bookingPotentialCategoryFromScore(score),
    // Sub-item detail is purely presentational (Step 6 breakdown) — every `points`/`earned` value
    // below is read directly from the scoring above, never recomputed. Keep in sync with the
    // matching breakdown shape in backend/src/services/leadScoringService.js.
    breakdown: {
      customer: {
        label: 'Customer Details',
        score: customerScore,
        max: BOOKING_POTENTIAL_MAX.customer,
        items: [
          { key: 'phone', label: 'Phone number', points: 10, earned: Boolean(String(values.phone || '').trim()) },
          { key: 'whatsapp', label: 'WhatsApp confirmed', points: 5, earned: Boolean(whatsappConfirmed) },
          { key: 'email', label: 'Email address', points: 5, earned: Boolean(String(values.email || '').trim()) },
        ],
      },
      travel: {
        label: 'Travel Details',
        score: travelScore,
        max: BOOKING_POTENTIAL_MAX.travel,
        items: [
          { key: 'destination', label: 'Destination', points: 10, earned: Boolean(String(values.destination || '').trim()) },
          { key: 'travelDate', label: 'Tour start date', points: 8, earned: Boolean(values.travelDate) },
          { key: 'returnDate', label: 'Tour end date', points: 7, earned: Boolean(values.returnDate) },
          { key: 'travelers', label: 'Traveller details', points: 5, earned: travelersSpecified },
        ],
      },
      commercial: {
        label: 'Commercial Potential',
        score: commercialScore,
        max: BOOKING_POTENTIAL_MAX.commercial,
        items: [
          { key: 'budget', label: 'Budget', points: budgetEarned || 12, earned: budgetEarned > 0 },
          {
            key: 'hotel',
            label: hotelChosen ? `Hotel — ${optionLabel(HOTEL_CATEGORY_OPTIONS, values.hotelCategory)}` : 'Hotel preference',
            points: 5,
            earned: hotelChosen,
          },
          {
            key: 'cab',
            label: cabChosen ? `Cab — ${optionLabel(CAB_TYPE_OPTIONS, values.cabType)}` : 'Cab preference',
            points: 5,
            earned: cabChosen,
          },
          {
            key: 'meal',
            label: mealChosen ? `Meal Plan — ${optionLabel(MEAL_PLAN_OPTIONS, values.mealPlan)}` : 'Meal plan',
            points: 3,
            earned: mealChosen,
          },
        ],
      },
      intent: {
        label: 'Intent',
        score: intentScore,
        max: BOOKING_POTENTIAL_MAX.intent,
        items: [
          { key: 'intent', label: 'High/urgent buying intent', points: intentEarned || 15, earned: intentEarned > 0 },
        ],
      },
      requirements: {
        label: 'Requirements',
        score: requirementsScore,
        max: BOOKING_POTENTIAL_MAX.requirements,
        items: [
          { key: 'requirements', label: 'Specific requirements noted', points: requirementsEarned || 10, earned: requirementsEarned > 0 },
        ],
      },
    },
  };
}
