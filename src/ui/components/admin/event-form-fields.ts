/**
 * Shared conversions and styling for the organizer-facing event forms.
 *
 * Both the create and the settings form sit on the same browser/contract
 * boundary, so they need the same two conversions. Keeping one copy means a
 * fix to either one cannot land in only half the admin surface.
 */

import type { BabySex, EventType } from "#/server/contracts/event-types";

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
	wedding: "Boda",
	baby_shower: "Baby shower",
	birthday: "Cumpleaños",
	other: "Otro",
};

export const BABY_SEX_LABELS: Record<BabySex, string> = {
	boy: "Niño",
	girl: "Niña",
};

/**
 * `datetime-local` speaks "2026-10-24T15:00" — no seconds, no zone — while
 * the contract and its validator expect a full ISO-8601 instant. The
 * organizer types the wall-clock time of the event's own timezone (the
 * "Zona horaria" field), which is also what the public invitation renders,
 * so both conversions must go through that zone rather than UTC.
 */
export function toLocalInput(iso: string | null, timezone: string): string {
	if (!iso) return "";
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";
	return new Date(wallClockAsUtc(date, resolveZone(timezone)))
		.toISOString()
		.slice(0, 16);
}

export function toIso(localValue: string, timezone: string): string | null {
	if (!localValue) return null;
	const typed = new Date(`${localValue}Z`);
	if (Number.isNaN(typed.getTime())) return null;
	const zone = resolveZone(timezone);
	// The zone offset depends on the instant itself (DST), so refine once:
	// the first guess is only wrong across a transition.
	const wall = typed.getTime();
	let instant = wall - zoneOffset(wall, zone);
	instant = wall - zoneOffset(instant, zone);
	return new Date(instant).toISOString();
}

/** Milliseconds the zone is ahead of UTC at the given instant. */
function zoneOffset(instant: number, zone: string): number {
	return wallClockAsUtc(new Date(instant), zone) - instant;
}

/** The zone's wall-clock reading of `date`, re-encoded as if it were UTC. */
function wallClockAsUtc(date: Date, zone: string): number {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: zone,
		hourCycle: "h23",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	}).formatToParts(date);
	const read = (type: Intl.DateTimeFormatPartTypes) =>
		Number(parts.find((part) => part.type === type)?.value);
	return Date.UTC(
		read("year"),
		read("month") - 1,
		read("day"),
		read("hour"),
		read("minute"),
		read("second"),
	);
}

/** An unknown or blank zone degrades to UTC instead of throwing mid-render. */
function resolveZone(timezone: string): string {
	try {
		return new Intl.DateTimeFormat("en-US", {
			timeZone: timezone.trim(),
		}).resolvedOptions().timeZone;
	} catch {
		return "UTC";
	}
}

/** An emptied text field means "no value", which the contract spells `null`. */
export function orNull(value: string): string | null {
	const trimmed = value.trim();
	return trimmed === "" ? null : trimmed;
}

export const FIELD_CLASS =
	"w-full px-3 py-2 rounded-xl border border-stone-300 text-sm";
export const LABEL_CLASS = "block text-xs font-medium text-secondary mb-1";
