import { z } from "zod";
import type { EventId } from "#/audit/actor";
import { removeEventMedia } from "#/media/use-cases";
import { cloudinaryImageStorage } from "#/platform/image-storage/cloudinary";
import { handleRoute } from "#/server/http/handler";
import { eventIdSchema } from "#/server/http/schemas";
import { requireOrganizer } from "#/server/middleware/resolve-actor";

export const runtime = "nodejs";

const mediaIdSchema = z.string().uuid();

export async function DELETE(
	request: Request,
	context: { params: Promise<{ eventId: string; mediaId: string }> },
): Promise<Response> {
	return handleRoute(request, async () => {
		const params = await context.params;
		const eventId = eventIdSchema.parse(params.eventId) as EventId;
		return Response.json(
			await removeEventMedia(
				await requireOrganizer(eventId),
				mediaIdSchema.parse(params.mediaId),
				cloudinaryImageStorage,
			),
		);
	});
}
