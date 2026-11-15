// SCRUM-96 (CR-01, Ref FR-12): one overall status per request, derived from
// the states of its checks by fixed rules. It is a status, not a business
// recommendation (FR-CHK-08), so there is no "approved" or "passed".

// The three possible values, stored in requests.summary.
//   ISSUE_FOUND  at least one check is INVALID
//   INCOMPLETE   at least one check is UNAVAILABLE, none is INVALID
//   COMPLETE     every source answered, none is INVALID
//                (NOT_FOUND and NOT_APPLICABLE count as an answer)
export const OVERALL_STATUSES = ['ISSUE_FOUND', 'INCOMPLETE', 'COMPLETE'];

/**
 * states: the result states of all checks of one request,
 * e.g. ['VALID', 'NOT_FOUND', 'UNAVAILABLE', 'VALID', 'VALID'].
 * Returns 'ISSUE_FOUND', 'INCOMPLETE' or 'COMPLETE'.
 */
export function overallStatus(states) {
  // The order matters: a problem found wins over a source that did not answer.
  if (states.includes('INVALID')) return 'ISSUE_FOUND';
  if (states.includes('UNAVAILABLE')) return 'INCOMPLETE';
  return 'COMPLETE';
}