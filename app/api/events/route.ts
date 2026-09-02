import { createEvent, newEventActor } from "#/events/admin-use-cases";
import { getEventsForOrganizer } from "#/platform/db/admin-queries";
import { handleRoute } from "#/server/http/handler";
import { parseJson } from "#/server/http/request";
import { createEventSchema } from "#/server/http/schemas";
import { requireAuthenticatedUser } from "#/server/middleware/resolve-actor";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
	return handleRoute(request, async () => {
		const { userId } = await requireAuthenticatedUser();
		return Response.json(await getEventsForOrganizer(userId));
	});
}

export async function POST(request: Request): Promise<Response> {
	return handleRoute(request, async () => {
		const input = await parseJson(request, createEventSchema);
		const { userId } = await requireAuthenticatedUser();
		return Response.json(await createEvent(newEventActor(userId), input));
	});
}
