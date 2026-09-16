import { COMPANY_BANK_ACCOUNTS, COMPANY_NAME } from '../../config/branding';

/** Himachal tour quotation template defaults */

export const QUOTE_WELCOME_TEXT = `Greetings from ${COMPANY_NAME}. Your journey surely deserves warm hospitality, comfortable stay, hassle-free transportation and proper guidance which ${COMPANY_NAME}, a reliable and growing travel organization, promises to cater at the best possible rates.

We are proud to offer packages that can't be more perfect and take you to such an enhanced experience that the only words you have for us are "True to their Commitment."

So, let our executives assist you 24/7 and create magical moments just for you.`;

export const QUOTE_POLICIES = {
  remarks: [
    'Rates are subject to change without prior notice.',
    'Accommodation will be provided in the mentioned or similar hotels based on availability.',
    'Confirmation is subject to availability and receipt of advance payment.',
    'Extra bed refers to an extra mattress.',
    'Heater charges are payable extra at the hotel.',
    'Token/advance amount is non-refundable.',
    'No refund will be provided for unused services such as accommodation, meals, transport, sightseeing, etc., due to weather conditions, health issues, strikes, roadblocks, or any unforeseen circumstances.',
    'Air conditioning (AC) will not operate in hill stations.',
    'Rates may vary during festive periods (e.g., Independence Day, Holi, Diwali, New Year, etc.).',
  ],
  terms: [
    'No refund for any unused accommodation, meals, transportation, sightseeing tours, or other services.',
    'Room allocation is subject to hotel discretion at the time of check-in, within the booked room category.',
    'No refunds shall be entertained if hotel services or amenities do not meet customer expectations; such cases will be considered individually.',
  ],
  confirmation: [
    'A token amount of 25% of the total package cost is required for booking confirmation.',
    '75% (25% + 50%) of the package cost must be paid within one month from the booking date.',
    'The remaining 25% must be paid no later than 7 days prior to the arrival date.',
  ],
  cancellation: [
    'Cancellation more than 30 days before the start date: 20% of the total package cost will be charged.',
    'Cancellation between 16 to 30 days before the start date: 35% of the total package cost will be charged.',
    'Cancellation between 10 to 15 days before the start date: 50% of the total package cost will be charged.',
    'Cancellation within 5 to 7 days of the check-in date: 100% of the booking amount will be charged.',
  ],
  amendment: [
    'Clients wishing to prepone/postpone their travel must inform us via email at least 15 days before the scheduled journey.',
    'One-time amendment is allowed without any additional charges if notified 15 days in advance. Subsequent changes will incur additional charges.',
    'In some cases, service providers (hoteliers, transporters, etc.) may impose postponement/preponement fees, which will be deducted from the advance amount paid.',
    'All amendments are subject to availability of services and applicable seasonal rates.',
    'No changes are permitted within 15 days of the travel date, except in cases like natural calamities or strikes, where special consideration will be given.',
    'Advance payments for postponed/preponed bookings are valid for 1 year from the date of payment.',
    'Bookings are transferable to friends or relatives, subject to compliance with the above terms and conditions.',
  ],
};

export const QUOTE_BANK_ACCOUNTS = COMPANY_BANK_ACCOUNTS;

export const PACKAGE_CATEGORY_LABELS = {
  luxury: 'Deluxe',
  family: 'Deluxe',
  honeymoon: 'Premium',
  group: 'Standard',
  adventure: 'Standard',
  corporate: 'Corporate',
  budget: 'Budget',
};

export function getPackageCategoryLabel(type) {
  return PACKAGE_CATEGORY_LABELS[type] || 'Deluxe';
}
