// SI-05: GISA (via ID Austria token) adapter. The real call is SCRUM-44; until then the
// source reports UNAVAILABLE so a check still completes.

export function createGisaAdapter(env) {
  return {
    source: 'GISA',
    async check() {
      return { state: 'UNAVAILABLE', details: { reason: 'Not implemented yet (SCRUM-44)' } };
    },
  };
}
