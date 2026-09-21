/**
 * Paid Stage tiers after the Solo / Studio / Agency pricing split.
 * Unknown, missing, and "free" must fail closed — never treat them as paid.
 */
export function isPaidPlan(plan: string | null | undefined): boolean {
  return plan === "start" || plan === "pro" || plan === "team";
}
