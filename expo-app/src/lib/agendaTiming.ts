import { parseEventStartIso } from './eventFormParse';

export type AgendaSplit = '15' | '30' | '60' | 'custom';

export function agendaSplitMinutes(split: AgendaSplit): number | null {
  if (split === '15') return 15;
  if (split === '30') return 30;
  if (split === '60') return 60;
  return null;
}

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseAgendaTimeOnDate(eventDate: Date, timeStr: string): Date | null {
  const iso = parseEventStartIso(toDateKey(eventDate), timeStr.trim());
  if (!iso) return null;
  const dt = new Date(iso);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function formatAgendaTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/** Minutes between the last two agenda rows with valid times, else null. */
export function inferAgendaGapMinutes(rows: { time: string }[]): number | null {
  const times = rows
    .map((r) => r.time.trim())
    .filter(Boolean)
    .map((t) => parseAgendaTimeOnDate(new Date(), t))
    .filter((d): d is Date => d != null);
  if (times.length < 2) return null;
  const prev = times[times.length - 2]!;
  const last = times[times.length - 1]!;
  const mins = Math.round((last.getTime() - prev.getTime()) / 60_000);
  return mins > 0 && mins <= 480 ? mins : null;
}

export function nextAgendaTimeLabel(
  eventDate: Date,
  rows: { time: string }[],
  split: AgendaSplit,
  fallbackTime: Date,
): string {
  const mins = agendaSplitMinutes(split) ?? inferAgendaGapMinutes(rows) ?? 30;
  const lastTime = [...rows].reverse().find((r) => r.time.trim())?.time.trim();
  if (lastTime) {
    const base = parseAgendaTimeOnDate(eventDate, lastTime);
    if (base) {
      base.setTime(base.getTime() + mins * 60_000);
      return formatAgendaTime(base);
    }
  }
  return formatAgendaTime(fallbackTime);
}

export function formatDurationBetween(start: Date, end: Date): string {
  const mins = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
  if (mins < 60) return `${mins} min`;
  const hours = mins / 60;
  if (Number.isInteger(hours)) return `${hours} hour${hours === 1 ? '' : 's'}`;
  return `${hours.toFixed(1)} hours`;
}

export type DerivedEventSchedule = {
  startsIso: string;
  endsIso: string;
  durationLabel: string;
  startTime: Date;
};

/** True when parsed agenda time is strictly before the event start anchor. */
export function isAgendaTimeBeforeAnchor(
  eventDate: Date,
  anchorStart: Date,
  timeStr: string,
): boolean {
  const t = parseAgendaTimeOnDate(eventDate, timeStr);
  if (!t) return false;
  return t.getTime() < anchorStart.getTime();
}

/** Rebuild sequential agenda times from the event start anchor and spacing split. */
export function syncAgendaTimesFromAnchor(
  eventDate: Date,
  anchorStart: Date,
  rows: { title: string; time: string }[],
  split: AgendaSplit,
): { title: string; time: string }[] {
  const blockMins = agendaSplitMinutes(split) ?? inferAgendaGapMinutes(rows) ?? 30;
  return rows.map((row, i) => ({
    title: row.title,
    time: formatAgendaTime(new Date(anchorStart.getTime() + i * blockMins * 60_000)),
  }));
}

/**
 * Derive event start/end from the master-selected start time + agenda row count.
 * End = anchor + (agenda items × block length). Optional per-row times must not precede anchor.
 */
export function deriveEventScheduleFromAgenda(
  eventDate: Date,
  agenda: { title: string; time: string }[],
  split: AgendaSplit,
  anchorStart?: Date,
): DerivedEventSchedule | null {
  const complete = agenda.filter((r) => r.title.trim() && r.time.trim());
  if (complete.length === 0) return null;

  const blockMins = agendaSplitMinutes(split) ?? inferAgendaGapMinutes(complete) ?? 30;
  const anchor =
    anchorStart ??
    parseAgendaTimeOnDate(eventDate, complete[0]!.time) ??
    null;
  if (!anchor) return null;

  const end = new Date(anchor.getTime() + complete.length * blockMins * 60_000);

  return {
    startsIso: anchor.toISOString(),
    endsIso: end.toISOString(),
    durationLabel: formatDurationBetween(anchor, end),
    startTime: anchor,
  };
}
