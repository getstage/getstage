/**
 * Warms a route's data without letting a failed query take the whole screen down.
 *
 * Route loaders await their Convex queries so a view paints with data instead of a
 * loading flash. Awaiting them directly means one rejected query throws out of the
 * loader and lands on the root error boundary, which asks the user to sign in again —
 * for what is almost always a cold Convex socket or a brief network drop rather than an
 * expired session. A genuinely signed-out user never reaches a loader: the `_authed`
 * guard redirects to `/auth` before this runs.
 *
 * So settle instead of throwing: paint the route, and let the live Convex subscription
 * deliver whatever did not arrive in time. Components already handle the loading state.
 */
export async function warmRouteData(queries: Array<Promise<unknown>>): Promise<void> {
  await Promise.allSettled(queries);
}
