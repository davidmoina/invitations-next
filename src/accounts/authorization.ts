export type AuthorizationRole = "owner" | "editor" | "guest" | "anonymous";

export type AuthorizationAction =
	| "delete"
	| "transferOwnership"
	| "invite"
	| "remove"
	| "editEvent"
	| "editGift"
	| "editGuest"
	| "viewAudit"
	| "cancelReservation";

const permissions: Record<
	AuthorizationRole,
	ReadonlySet<AuthorizationAction>
> = {
	owner: new Set([
		"delete",
		"transferOwnership",
		"invite",
		"remove",
		"editEvent",
		"editGift",
		"editGuest",
		"viewAudit",
		"cancelReservation",
	]),
	editor: new Set(["editEvent", "editGift", "editGuest", "cancelReservation"]),
	guest: new Set(["cancelReservation"]),
	anonymous: new Set(),
};

/** Exact event role matrix traced to the event-collaboration scenarios. */
export function can(
	role: AuthorizationRole,
	action: AuthorizationAction,
): boolean {
	return permissions[role].has(action);
}
