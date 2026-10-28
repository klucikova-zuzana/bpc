// SI-02: BMF fake company list (RSS feed) adapter. The real call is SCRUM-19; until then the
// source reports UNAVAILABLE so a check still completes.

export function createBmfAdapter(env) {
  return {
    source: 'BMF',
    async check() {
      return { state: 'UNAVAILABLE', details: { reason: 'Not implemented yet (SCRUM-19)' } };
    },
  };
}
