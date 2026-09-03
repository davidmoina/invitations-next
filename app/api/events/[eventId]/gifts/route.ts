import type { EventId } from "#/audit/actor";
import { createGift } from "#/gifts/use-cases";
import { handleRoute } from "#/server/http/handler";
import { parseJson } from "#/server/http/request";
import { createGiftSchema, eventIdSchema } from "#/server/http/schemas";
import { requireOrganizer } from "#/server/middleware/resolve-actor";

export const runtime = "nodejs";

export async function POST(
	request: Request,
	context: { params: Promise<{ eventId: string }> },
): Promise<Response> {
	return handleRoute(request, async () => {
		const eventId = eventIdSchema.parse(
			(await context.params).eventId,
		) as EventId;
		const input = await parseJson(request, createGiftSchema);
		return Response.json(
			await createGift(await requireOrganizer(eventId), input),
		);
	});
}
