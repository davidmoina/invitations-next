import { z } from "zod";

import type { EventId } from "#/audit/actor";
import { issueGuestLinkFor } from "#/guests/use-cases";
import { handleRoute } from "#/server/http/handler";
import { eventIdSchema } from "#/server/http/schemas";
import { requireOrganizer } from "#/server/middleware/resolve-actor";

export const runtime = "nodejs";

const guestIdSchema = z.string().uuid();

export async function POST(
	request: Request,
	context: { params: Promise<{ eventId: string; guestId: string }> },
): Promise<Response> {
	return handleRoute(request, async () => {
		const params = await context.params;
		const eventId = eventIdSchema.parse(params.eventId) as EventId;
		return Response.json(
			await issueGuestLinkFor(
				await requireOrganizer(eventId),
				guestIdSchema.parse(params.guestId),
			),
		);
	});
}
