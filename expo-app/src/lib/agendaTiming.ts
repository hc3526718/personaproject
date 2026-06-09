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

/** Derive event start/end from first and last agenda block (+ one spacing interval at the end). */
export function deriveEventScheduleFromAgenda(
  eventDate: Date,
  agenda: { title: string; time: string }[],
  split: AgendaSplit,
): DerivedEventSchedule | null {
  const complete = agenda.filter((r) => r.title.trim() && r.time.trim());
  if (complete.length === 0) return null;
  const first = parseAgendaTimeOnDate(eventDate, complete[0]!.time);
  const lastStart = parseAgendaTimeOnDate(eventDate, complete[complete.length - 1]!.time);
  if (!first || !lastStart) return null;
  const blockMins = agendaSplitMinutes(split) ?? inferAgendaGapMinutes(complete) ?? 30;
  const end = new Date(lastStart.getTime() + blockMins * 60_000);
  return {
    startsIso: first.toISOString(),
    endsIso: end.toISOString(),
    durationLabel: formatDurationBetween(first, end),
    startTime: first,
  };
}
