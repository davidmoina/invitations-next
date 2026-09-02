import type { EventId } from "#/audit/actor";
import { deleteEvent, updateEvent } from "#/events/admin-use-cases";
import { getAdminEventPageData } from "#/platform/db/admin-queries";
import { handleRoute } from "#/server/http/handler";
import { parseJson } from "#/server/http/request";
import { eventIdSchema, updateEventSchema } from "#/server/http/schemas";
import { requireOrganizer } from "#/server/middleware/resolve-actor";

export const runtime = "nodejs";

type Context = { params: Promise<{ eventId: string }> };

async function eventId(context: Context): Promise<EventId> {
	return eventIdSchema.parse((await context.params).eventId) as EventId;
}

export async function GET(
	request: Request,
	context: Context,
): Promise<Response> {
	return handleRoute(request, async () => {
		const organizer = await requireOrganizer(await eventId(context));
		return Response.json(await getAdminEventPageData(organizer));
	});
}

export async function PATCH(
	request: Request,
	context: Context,
): Promise<Response> {
	return handleRoute(request, async () => {
		const organizer = await requireOrganizer(await eventId(context));
		const input = await parseJson(request, updateEventSchema);
		return Response.json(await updateEvent(organizer, input));
	});
}

export async function DELETE(
	request: Request,
	context: Context,
): Promise<Response> {
	return handleRoute(request, async () => {
		const organizer = await requireOrganizer(await eventId(context));
		return Response.json(await deleteEvent(organizer));
	});
}
