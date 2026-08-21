/**
 * Display time in Europe/Paris.
 *
 * Timestamps are still *stored* as UTC ISO strings in the checkpoints: that is
 * what keeps them comparable, sortable and unambiguous across the October DST
 * change, when local wall-clock time repeats an hour. Only what a human reads —
 * log lines and the report — is converted to Paris time.
 */
const TZ = 'Europe/Paris';

const clock = new Intl.DateTimeFormat('fr-FR', {
  timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});

const stamp = new Intl.DateTimeFormat('fr-FR', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});

/** "14:05:09" — Paris wall clock, for log prefixes. */
const ts = (d = new Date()) => clock.format(d);

/** "21/08/2026 14:05:09" — Paris, for the report. */
function fmt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return stamp.format(d).replace(', ', ' ');
}

/** Whether Paris is currently on CEST or CET, so the report can say which. */
function offsetLabel(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'shortOffset' })
    .formatToParts(d).find(p => p.type === 'timeZoneName');
  return parts ? parts.value.replace('GMT', 'UTC') : 'UTC+02:00';
}

module.exports = { ts, fmt, offsetLabel, TZ };
