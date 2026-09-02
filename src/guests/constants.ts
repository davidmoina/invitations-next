export const guestTokenPattern = /^[A-Za-z0-9_-]{43}$/;
export const guestTokenCookieName = "__Host-guest_token";

const guestTokenLifetimeMs = 30 * 24 * 60 * 60 * 1000;

/** Guest links are valid through the event start plus thirty calendar days. */
export function guestTokenExpiresAt(eventStartsAt: Date): Date {
	return new Date(eventStartsAt.getTime() + guestTokenLifetimeMs);
}
