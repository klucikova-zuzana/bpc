// SI-01: VIES (EU VAT check) adapter. The real call is SCRUM-66; until then the
// source reports UNAVAILABLE so a check still completes.

export function createViesAdapter(env) {
  return {
    source: 'VIES',
    async check() {
      return { state: 'UNAVAILABLE', details: { reason: 'Not implemented yet (SCRUM-66)' } };
    },
  };
}
