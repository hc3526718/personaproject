# QR check-in

**Related:** `docs/NEXT_STEPS.md` §1 & §7.1, `docs/ACCESS_MODEL.md` (staff `check_in_attendees`), `docs/SECRETS_CHECKLIST.md`.

## Token format (client demo)
`base64url(JSON payload).hex_sha256(secret + "." + base64url)`

- **Payload** (`TicketPayloadV1`): `{ v, ref, uid, eventId?, exp }` (see `src/booking/ticketToken.ts`).
- **Secret**: `EXPO_PUBLIC_TICKET_SIGNING_SECRET` must match server `TICKET_HMAC_SECRET` in production (prefer server-only signing for prod).

## Production flow
1. On paid/confirmed booking, **API** issues token (or short-lived JWT) and stores `bookings.reference`.
2. Client shows QR encoding the token (`BookingQrCode` component).
3. **Staff** scans → app sends `POST /api/checkin` with raw token string.
4. Server verifies signature / JWT, sets `bookings.checked_in_at` idempotently, returns `{ ok, alreadyCheckedIn }`.

## Staff UI
- `StaffCheckInScreen` (Events stack): paste token for demo; camera scanner can use `expo-camera` / `vision-camera` in a dev build later.
