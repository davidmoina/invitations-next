import { z } from "zod";
import type { EventId } from "#/audit/actor";
import { transferOwnership } from "#/events/use-cases";
import { handleRoute } from "#/server/http/handler";
import { parseJson } from "#/server/http/request";
import { eventIdSchema } from "#/server/http/schemas";
import { requireOrganizer } from "#/server/middleware/resolve-actor";

export const runtime = "nodejs";

const inputSchema = z.object({ nextOwnerId: z.string().min(1) }).strict();

export async function POST(
	request: Request,
	context: { params: Promise<{ eventId: string }> },
): Promise<Response> {
	return handleRoute(request, async () => {
		const eventId = eventIdSchema.parse(
			(await context.params).eventId,
		) as EventId;
		const input = await parseJson(request, inputSchema);
		return Response.json(
			await transferOwnership(
				await requireOrganizer(eventId),
				input.nextOwnerId,
			),
		);
	});
}
