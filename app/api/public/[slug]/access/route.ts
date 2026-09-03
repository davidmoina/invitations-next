import { after } from "next/server";
import { z } from "zod";

import { requestGuestLink } from "#/guests/use-cases";
import { findEventIdBySlug } from "#/platform/db/actor-queries";
import {
	clientIpFrom,
	createFixedWindowRateLimiter,
} from "#/server/http/rate-limit";

export const runtime = "nodejs";

const inputSchema = z.object({ contact: z.string() }).strict();
const limiter = createFixedWindowRateLimiter({
	limit: 5,
	windowMs: 60_000,
	now: Date.now,
});

function success(): Response {
	return Response.json({ ok: true });
}

/**
 * This endpoint is intentionally silent: neither lookup, validation, rate
 * limiting, nor delivery outcomes may reveal whether a guest exists.
 */
export async function POST(
	request: Request,
	context: { params: Promise<{ slug: string }> },
): Promise<Response> {
	try {
		const { slug } = await context.params;
		const input = inputSchema.safeParse(await request.json());
		if (!input.success) return success();

		const eventId = await findEventIdBySlug(slug);
		if (eventId && limiter.allow({ clientIp: clientIpFrom(request), slug })) {
			after(async () => {
				try {
					await requestGuestLink(eventId, input.data.contact);
				} catch {
					// Deferred failures must remain indistinguishable to the requester.
				}
			});
		}
	} catch {
		// Keep malformed requests and operational failures oracle-free too.
	}
	return success();
}
