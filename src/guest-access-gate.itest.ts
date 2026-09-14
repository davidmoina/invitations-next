import { Pool } from "@neondatabase/serverless";
import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	test,
	vi,
} from "vitest";

const deferredCallbacks = vi.hoisted(
	() => [] as Array<() => void | Promise<void>>,
);

vi.mock("next/server", async (importOriginal) => ({
	...(await importOriginal<typeof import("next/server")>()),
	after: (callback: () => void | Promise<void>) => {
		deferredCallbacks.push(callback);
	},
}));

async function flushDeferredCallbacks(): Promise<void> {
	await Promise.all(deferredCallbacks.splice(0).map((callback) => callback()));
}

import { hashToken } from "#/guests/tokens";
import {
	createOrganizerSession,
	destroyFixture,
	type EventFixture,
	newGuestToken,
} from "#/test/auth-fixture";
import { callParameterizedJsonRoute } from "#/test/route-handler";
import { POST as issueGuestLink } from "../app/api/events/[eventId]/guests/[guestId]/link/route";
import { GET as acceptGuestLink } from "../app/api/guest-link/route";
import { POST as requestGuestLink } from "../app/api/public/[slug]/access/route";

const url = process.env.DATABASE_URL_TEST;
if (!url)
	throw new Error("DATABASE_URL_TEST is required for integration tests.");
const pool = new Pool({ connectionString: url });
let fixture: EventFixture;

beforeAll(async () => {
	fixture = await createOrganizerSession(pool);
}, 30_000);

afterAll(async () => {
	await destroyFixture(pool, fixture);
	await pool.end();
});

afterEach(() => {
	deferredCallbacks.length = 0;
});

async function preloadGuest(input: {
	displayName: string;
	email?: string | null;
	phone?: string | null;
	phoneNormalized?: string | null;
}): Promise<string> {
	const result = await pool.query(
		`insert into guests (
			event_id, display_name, name_normalized, email, email_normalized,
			phone, phone_normalized, source
		) values ($1, $2, $3, $4, $5, $6, $7, 'preloaded') returning id`,
		[
			fixture.eventId,
			input.displayName,
			input.displayName.toLowerCase(),
			input.email ?? null,
			input.email?.toLowerCase() ?? null,
			input.phone ?? null,
			input.phoneNormalized ?? null,
		],
	);
	return (result.rows[0] as { id: string }).id;
}

async function access(contact: string, ip: string): Promise<Response> {
	return callParameterizedJsonRoute(requestGuestLink, {
		path: `/api/public/${fixture.slug}/access`,
		method: "POST",
		headers: { "x-forwarded-for": ip },
		body: { contact },
		params: { slug: fixture.slug },
	});
}

describe("guest access gate", () => {
	test("responds before a matching contact's delivery finishes", async () => {
		await preloadGuest({
			displayName: "Email Guest",
			email: "guest-email@example.test",
		});
		const delivery = await import("#/guests/delivery");
		let resolveDelivery: (() => void) | undefined;
		const send = vi.spyOn(delivery, "sendGuestLinkEmail").mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					resolveDelivery = resolve;
				}),
		);
		try {
			const response = await access("guest-email@example.test", "203.0.113.1");
			expect(response.status).toBe(200);
			expect(await response.text()).toBe('{"ok":true}');
			expect(response.headers.get("set-cookie")).toBeNull();
			expect(send).not.toHaveBeenCalled();

			const deferred = flushDeferredCallbacks();
			await vi.waitFor(() => {
				expect(send).toHaveBeenCalledWith(
					expect.any(Object),
					expect.objectContaining({
						eventId: fixture.eventId,
						email: "guest-email@example.test",
						eventSlug: fixture.slug,
					}),
				);
			});
			resolveDelivery?.();
			await deferred;
		} finally {
			send.mockRestore();
		}
	});

	test("emails the stored address when a matching phone is submitted", async () => {
		await preloadGuest({
			displayName: "Phone Guest",
			email: "phone-owner@example.test",
			phone: "+34 600 123 456",
			phoneNormalized: "34600123456",
		});
		const delivery = await import("#/guests/delivery");
		const send = vi
			.spyOn(delivery, "sendGuestLinkEmail")
			.mockResolvedValue(undefined);
		try {
			const response = await access("+34 600 123 456", "203.0.113.2");
			expect(await response.text()).toBe('{"ok":true}');
			await flushDeferredCallbacks();
			expect(send).toHaveBeenCalledWith(
				expect.any(Object),
				expect.objectContaining({ email: "phone-owner@example.test" }),
			);
		} finally {
			send.mockRestore();
		}
	});

	test("keeps no-email matches and misses byte-identical and cookie-free", async () => {
		await preloadGuest({
			displayName: "No Email Guest",
			phone: "+34 600 654 321",
			phoneNormalized: "34600654321",
		});
		const delivery = await import("#/guests/delivery");
		const send = vi
			.spyOn(delivery, "sendGuestLinkEmail")
			.mockResolvedValue(undefined);
		try {
			const withoutEmail = await access("+34 600 654 321", "203.0.113.3");
			const noMatch = await access("nobody@example.test", "203.0.113.4");
			const unknownSlug = await callParameterizedJsonRoute(requestGuestLink, {
				path: "/api/public/missing/access",
				method: "POST",
				headers: { "x-forwarded-for": "203.0.113.5" },
				body: { contact: "nobody@example.test" },
				params: { slug: "missing" },
			});
			const responses = [withoutEmail, noMatch, unknownSlug];
			expect(responses.map((response) => response.status)).toEqual([
				200, 200, 200,
			]);
			const bodies = await Promise.all(
				responses.map((response) => response.text()),
			);
			expect(new Set(bodies)).toEqual(new Set(['{"ok":true}']));
			for (const response of responses)
				expect(response.headers.get("set-cookie")).toBeNull();
			await flushDeferredCallbacks();
			expect(send).not.toHaveBeenCalled();
		} finally {
			send.mockRestore();
		}
	});

	test("re-issuing a guest link revokes its predecessor and authenticates the returned URL", async () => {
		const guestId = await preloadGuest({ displayName: "Reissue Guest" });
		const previousToken = newGuestToken();
		await pool.query(
			"insert into guest_tokens (guest_id, event_id, token_hash, expires_at) values ($1, $2, $3, $4)",
			[
				guestId,
				fixture.eventId,
				await hashToken(previousToken),
				new Date("2035-01-01T00:00:00.000Z"),
			],
		);

		const response = await callParameterizedJsonRoute(issueGuestLink, {
			path: `/api/events/${fixture.eventId}/guests/${guestId}/link`,
			method: "POST",
			headers: { cookie: fixture.cookie },
			body: {},
			params: { eventId: fixture.eventId, guestId },
		});
		expect(response.status).toBe(200);
		const { url: issuedUrl } = (await response.json()) as { url: string };
		const issued = new URL(issuedUrl);
		const token = issued.searchParams.get("token");
		expect(issued.pathname).toBe(`/e/${fixture.slug}`);
		expect(token).toBeTruthy();

		const oldToken = await pool.query(
			"select revoked_at from guest_tokens where token_hash = $1",
			[await hashToken(previousToken)],
		);
		expect(oldToken.rows[0]?.revoked_at).not.toBeNull();
		const accepted = await acceptGuestLink(
			new Request(
				`https://app.test/api/guest-link?slug=${fixture.slug}&token=${token}`,
			),
		);
		expect(accepted.status).toBe(302);
		expect(accepted.headers.get("set-cookie")).toContain("__Host-guest_token=");
	});

	test("refuses a link re-issue to a user who is not an event member", async () => {
		const guestId = await preloadGuest({ displayName: "Protected Guest" });
		const outsider = await createOrganizerSession(pool);
		try {
			const response = await callParameterizedJsonRoute(issueGuestLink, {
				path: `/api/events/${fixture.eventId}/guests/${guestId}/link`,
				method: "POST",
				headers: { cookie: outsider.cookie },
				body: {},
				params: { eventId: fixture.eventId, guestId },
			});
			expect(response.status).toBe(401);
		} finally {
			await destroyFixture(pool, outsider);
		}
	});
});
