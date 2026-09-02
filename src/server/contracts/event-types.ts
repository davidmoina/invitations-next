/**
 * D12 exception: the first and only runtime value in the frozen contracts
 * seam is quarantined here rather than smuggled into admin.ts.
 */
export const EVENT_TYPES = [
	"wedding",
	"baby_shower",
	"birthday",
	"other",
] as const;
export const BABY_SEXES = ["boy", "girl"] as const;

export type EventType = (typeof EVENT_TYPES)[number];
export type BabySex = (typeof BABY_SEXES)[number];
