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
 * the contract and its validator expect a full ISO-8601 instant. These two
 * helpers are the conversion at that boundary.
 */
export function toLocalInput(iso: string | null): string {
	if (!iso) return "";
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";
	return date.toISOString().slice(0, 16);
}

export function toIso(localValue: string): string | null {
	if (!localValue) return null;
	const date = new Date(`${localValue}Z`);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** An emptied text field means "no value", which the contract spells `null`. */
export function orNull(value: string): string | null {
	const trimmed = value.trim();
	return trimmed === "" ? null : trimmed;
}

export const FIELD_CLASS =
	"w-full px-3 py-2 rounded-xl border border-stone-300 text-sm";
export const LABEL_CLASS = "block text-xs font-medium text-secondary mb-1";
