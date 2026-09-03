/**
 * Public-URL slugs for events.
 *
 * `events.slug` is NOT NULL UNIQUE and is the only handle `/e/$slug` has, but
 * neither the spec nor the design says where it comes from. The rule chosen
 * here: a readable stem from the title plus a discriminator taken from the
 * event's own id. Because the id is already unique, the slug is unique by
 * construction — no read-then-write window, no retry loop, and no second
 * database round trip on the creation path.
 */

const MAX_STEM_LENGTH = 60;
const DISCRIMINATOR_LENGTH = 8;

/** Used when a title carries no characters a URL can keep (emoji, punctuation). */
const FALLBACK_STEM = "event";

/** Lowercase, unaccented, hyphen-separated form of a title. */
export function slugStem(title: string): string {
	const stem = title
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLocaleLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

	if (stem === "") return FALLBACK_STEM;
	// Capping can land mid-separator; trimming again keeps the slug well-formed.
	return stem.slice(0, MAX_STEM_LENGTH).replace(/-+$/, "");
}

/** The stored slug for a new event, derived from its title and pre-generated id. */
export function eventSlug(title: string, eventId: string): string {
	const discriminator = eventId
		.replace(/-/g, "")
		.slice(0, DISCRIMINATOR_LENGTH);
	return `${slugStem(title)}-${discriminator}`;
}
