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
import {
	createOrganizerSession,
	destroyFixture,
	type EventFixture,
} from "#/test/auth-fixture";
import { GET } from "../../app/api/events/route";

let documentCookie = "";

vi.mock("next/headers", () => ({
	cookies: async () => ({ toString: () => documentCookie }),
	headers: async () => new Headers({ cookie: documentCookie }),
}));

const databaseUrl = process.env.DATABASE_URL_TEST;
if (!databaseUrl)
	throw new Error("DATABASE_URL_TEST is required for integration tests.");
const pool = new Pool({ connectionString: databaseUrl });

let organizer: EventFixture;

beforeAll(async () => {
	organizer = await createOrganizerSession(pool);
}, 30_000);

afterEach(() => vi.unstubAllGlobals());

afterAll(async () => {
	await destroyFixture(pool, organizer);
	await pool.end();
});

describe("authenticated SSR HTTP boundary", () => {
	test("forwards SSR credentials to the real organizer handler", async () => {
		documentCookie = organizer.cookie;
		const requests: Request[] = [];
		vi.stubGlobal(
			"fetch",
			async (input: string | URL | Request, init?: RequestInit) => {
				const request = new Request(input, init);
				requests.push(request);
				return GET(request);
			},
		);
		const { getOrganizerEvents } = await import("./server");

		const events = await getOrganizerEvents();

		expect(events[0]?.id).toBe(organizer.eventId);
		expect(requests).toHaveLength(1);
		expect(requests[0]?.url).toBe(`${process.env.APP_ORIGIN}/api/events`);
		expect(requests[0]?.headers.get("cookie")).toBe(organizer.cookie);
		expect(requests[0]?.cache).toBe("no-store");
	});
});
