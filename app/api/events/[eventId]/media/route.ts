import { z } from "zod";
import type { EventId } from "#/audit/actor";
import { addEventMedia } from "#/media/use-cases";
import { cloudinaryImageStorage } from "#/platform/image-storage/cloudinary";
import { handleRoute } from "#/server/http/handler";
import { eventIdSchema } from "#/server/http/schemas";
import { requireOrganizer } from "#/server/middleware/resolve-actor";

export const runtime = "nodejs";

const metadataSchema = z.object({
	alt: z.string().trim().min(1),
	position: z.coerce.number().int().min(0),
});

export async function POST(
	request: Request,
	context: { params: Promise<{ eventId: string }> },
): Promise<Response> {
	return handleRoute(request, async () => {
		const eventId = eventIdSchema.parse(
			(await context.params).eventId,
		) as EventId;
		const form = await request.formData();
		const file = form.get("file");
		if (!(file instanceof File) || file.size === 0) {
			throw new z.ZodError([]);
		}
		const metadata = metadataSchema.parse({
			alt: form.get("alt"),
			position: form.get("position"),
		});
		return Response.json(
			await addEventMedia(
				await requireOrganizer(eventId),
				{
					data: new Uint8Array(await file.arrayBuffer()),
					filename: file.name,
					contentType: file.type,
					...metadata,
				},
				cloudinaryImageStorage,
			),
		);
	});
}
