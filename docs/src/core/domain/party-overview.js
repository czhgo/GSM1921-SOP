/** Build the Party Committee's actionable overview from its real task sources. */
export function buildPartyOverviewModel({ branches = [], reviewRequests = [] } = {}) {
  const pending = reviewRequests
    .filter((row) => row && row.status === 'pending')
    .slice()
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

  // A running branch without an appointed secretary needs an organizational decision.
  // Intentionally exclude inactive branches: suspension is a recorded state, not an error.
  const exceptions = branches.filter((branch) =>
    branch && branch.id && branch.status !== 'inactive' && !branch.secretaryId,
  );

  return { pending, pendingCount: pending.length, exceptions, exceptionCount: exceptions.length };
}
