/** Parse structured fields embedded in `events.description` from the create/edit wizard. */

export function parseEventCapacity(description: string | null | undefined): number | null {
  const desc = (description ?? '').trim();
  if (!desc) return null;
  const m = desc.match(/^Capacity:\s*(\d+)/im);
  if (!m?.[1]) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function formatEventSpotsLabel(registered: number, capacity: number | null): string {
  const reg = Math.max(0, registered);
  if (capacity != null && capacity > 0) {
    return `${reg}/${capacity} spots`;
  }
  if (reg === 1) return '1 attending';
  return `${reg} attending`;
}
