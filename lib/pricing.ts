export type PlanId = "month" | "year";

export const PLANS: Record<PlanId, { price: number; days: number }> = {
  month: { price: 49000, days: 30 },
  year: { price: 399000, days: 365 },
};

export const YEAR_SAVING_PERCENT = Math.round(
  (1 - PLANS.year.price / (PLANS.month.price * 12)) * 100,
);