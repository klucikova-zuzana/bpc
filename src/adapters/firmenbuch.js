// SI-04: Firmenbuch (via ID Austria token) adapter. The real call is SCRUM-68; until then the
// source reports UNAVAILABLE so a check still completes.

export function createFirmenbuchAdapter(env) {
  return {
    source: 'FIRMENBUCH',
    async check() {
      return { state: 'UNAVAILABLE', details: { reason: 'Not implemented yet (SCRUM-68)' } };
    },
  };
}
