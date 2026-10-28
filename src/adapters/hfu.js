// SI-03: HFU list (ÖGK) adapter. The real call is SCRUM-67; until then the
// source reports UNAVAILABLE so a check still completes.

export function createHfuAdapter(env) {
  return {
    source: 'HFU',
    async check() {
      return { state: 'UNAVAILABLE', details: { reason: 'Not implemented yet (SCRUM-67)' } };
    },
  };
}
