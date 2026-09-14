import { z } from "zod";
import type { EventId } from "#/audit/actor";
import { editGift } from "#/gifts/use-cases";
import { handleRoute } from "#/server/http/handler";
import { parseJson } from "#/server/http/request";
import { editGiftSchema, eventIdSchema } from "#/server/http/schemas";
import { requireOrganizer } from "#/server/middleware/resolve-actor";

export const runtime = "nodejs";

const giftIdSchema = z.string().uuid();

export async function PATCH(
	request: Request,
	context: { params: Promise<{ eventId: string; giftId: string }> },
): Promise<Response> {
	return handleRoute(request, async () => {
		const params = await context.params;
		const eventId = eventIdSchema.parse(params.eventId) as EventId;
		const input = await parseJson(request, editGiftSchema);
		return Response.json(
			await editGift(
				await requireOrganizer(eventId),
				giftIdSchema.parse(params.giftId),
				input,
			),
		);
	});
}
