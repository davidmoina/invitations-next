import { describe, expect, test } from "vitest";

import {
	type ApiRequest,
	createApiClient,
	type RequestOptions,
} from "./shared";

describe("API client", () => {
	test("uses plain eventId arguments and disables caching for authenticated reads", async () => {
		const calls: Array<{ path: string; options: RequestOptions | undefined }> =
			[];
		const request: ApiRequest = async <T>(
			path: string,
			options?: RequestOptions,
		) => {
			calls.push({ path, options });
			return [] as T;
		};
		const client = createApiClient(request);

		await client.getAdminEvent({ eventId: "event-1" });
		await client.getOrganizerEvents();
		await client.deleteEvent({ eventId: "event-1" });

		expect(calls).toEqual([
			{ path: "/api/events/event-1", options: { cache: "no-store" } },
			{ path: "/api/events", options: { cache: "no-store" } },
			{ path: "/api/events/event-1", options: { method: "DELETE" } },
		]);
	});

	test("owns Better Auth sign-out instead of leaving a direct UI fetch", async () => {
		const calls: Array<{ path: string; options: RequestOptions | undefined }> =
			[];
		const request: ApiRequest = async <T>(
			path: string,
			options?: RequestOptions,
		) => {
			calls.push({ path, options });
			return {} as T;
		};
		const client = createApiClient(request);

		await expect(client.signOut()).resolves.toEqual({ ok: true });
		expect(calls[0]?.path).toBe("/api/auth/sign-out");
		expect(calls[0]?.options?.method).toBe("POST");
	});
});
