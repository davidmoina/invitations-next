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
