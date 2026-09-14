import { z } from "zod";
import type { EventId } from "#/audit/actor";
import { removeCollaborator } from "#/events/admin-use-cases";
import { handleRoute } from "#/server/http/handler";
import { eventIdSchema } from "#/server/http/schemas";
import { requireOrganizer } from "#/server/middleware/resolve-actor";

export const runtime = "nodejs";

const userIdSchema = z.string().min(1);

export async function DELETE(
	request: Request,
	context: { params: Promise<{ eventId: string; userId: string }> },
): Promise<Response> {
	return handleRoute(request, async () => {
		const params = await context.params;
		const eventId = eventIdSchema.parse(params.eventId) as EventId;
		const userId = userIdSchema.parse(params.userId);
		return Response.json(
			await removeCollaborator(await requireOrganizer(eventId), userId),
		);
	});
}
