import { describe, expect, test } from "vitest";

import {
	type AuthorizationAction,
	type AuthorizationRole,
	can,
} from "./authorization";

const roles: AuthorizationRole[] = ["owner", "editor", "guest", "anonymous"];
const actions: AuthorizationAction[] = [
	"delete",
	"transferOwnership",
	"invite",
	"remove",
	"editEvent",
	"editGift",
	"editGuest",
	"viewAudit",
	"cancelReservation",
];

const allowed: Record<AuthorizationRole, readonly AuthorizationAction[]> = {
	owner: actions,
	editor: ["editEvent", "editGift", "editGuest", "cancelReservation"],
	guest: ["cancelReservation"],
	anonymous: [],
};

describe("event authorization matrix", () => {
	for (const role of roles) {
		for (const action of actions) {
			test(`${role} ${allowed[role].includes(action) ? "may" : "may not"} ${action}`, () => {
				expect(can(role, action)).toBe(allowed[role].includes(action));
			});
		}
	}
});
