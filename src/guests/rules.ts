export type GuestIdentity = { email: string | null; name: string };

function normalize(value: string): string {
	return value
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.trim()
		.replace(/\s+/g, " ")
		.toLocaleLowerCase();
}

export function normalizeEmail(email: string): string {
	return normalize(email);
}

export function normalizeName(name: string): string {
	return normalize(name);
}

/** Only an equal normalized email and name reconciles; shared email stays distinct. */
export function reconciliationAction(
	existing: GuestIdentity,
	submitted: GuestIdentity,
): "reconcile" | "create" {
	if (
		existing.email !== null &&
		submitted.email !== null &&
		normalizeEmail(existing.email) === normalizeEmail(submitted.email) &&
		normalizeName(existing.name) === normalizeName(submitted.name)
	) {
		return "reconcile";
	}
	return "create";
}

/** A contact the guest may type to identify themselves at the access gate. */
export type Contact =
	| { kind: "email"; value: string }
	| { kind: "phone"; value: string }
	| { kind: "invalid" };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** E.164 allows at most fifteen digits; six is the shortest dialable run. */
const phoneDigitBounds = { min: 6, max: 15 } as const;

/**
 * Reduces a dialed number to comparable digits: separators and the leading
 * `+` disappear, and the international `00` prefix collapses to the bare
 * country code so `0034…` and `+34…` normalize to the same stored value.
 */
export function normalizePhone(phone: string): string {
	const digits = phone.replace(/\D/g, "");
	return digits.startsWith("00") ? digits.slice(2) : digits;
}

/**
 * Decides what the guest typed without ever reporting whether it matched a
 * row — classification is about shape alone, so it can run before any
 * database read and keep the lookup free of an enumeration oracle.
 */
export function classifyContact(contact: string): Contact {
	const trimmed = contact.trim();
	if (trimmed.includes("@")) {
		const email = normalizeEmail(trimmed);
		return emailPattern.test(email)
			? { kind: "email", value: email }
			: { kind: "invalid" };
	}
	const phone = normalizePhone(trimmed);
	return phone.length >= phoneDigitBounds.min &&
		phone.length <= phoneDigitBounds.max
		? { kind: "phone", value: phone }
		: { kind: "invalid" };
}
