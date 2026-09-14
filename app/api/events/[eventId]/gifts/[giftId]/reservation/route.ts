import { z } from "zod";
import type { EventId } from "#/audit/actor";
import { cancelReservation } from "#/events/admin-use-cases";
import { handleRoute } from "#/server/http/handler";
import { eventIdSchema } from "#/server/http/schemas";
import { requireOrganizer } from "#/server/middleware/resolve-actor";

export const runtime = "nodejs";

const giftIdSchema = z.string().uuid();

export async function DELETE(
	request: Request,
	context: { params: Promise<{ eventId: string; giftId: string }> },
): Promise<Response> {
	return handleRoute(request, async () => {
		const params = await context.params;
		const eventId = eventIdSchema.parse(params.eventId) as EventId;
		return Response.json(
			await cancelReservation(
				await requireOrganizer(eventId),
				giftIdSchema.parse(params.giftId),
			),
		);
	});
}
