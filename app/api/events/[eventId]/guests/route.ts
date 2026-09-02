import type { EventId } from "#/audit/actor";
import { sendGuestLinkEmail } from "#/guests/delivery";
import { addGuests } from "#/guests/use-cases";
import { getEventSlug } from "#/platform/db/domain-mutations";
import { AccessError } from "#/server/access-error";
import { handleRoute } from "#/server/http/handler";
import { parseJson } from "#/server/http/request";
import { eventIdSchema, guestsSchema } from "#/server/http/schemas";
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
		const organizer = await requireOrganizer(eventId);
		const { guests: input } = await parseJson(request, guestsSchema);
		const [guests, eventSlug] = await Promise.all([
			addGuests(organizer, input),
			getEventSlug(organizer.eventId),
		]);
		if (!eventSlug) throw new AccessError("not_found");
		await Promise.all(
			guests.flatMap((guest) =>
				guest.email
					? [
							sendGuestLinkEmail(organizer, {
								email: guest.email,
								eventSlug,
								token: guest.token,
							}),
						]
					: [],
			),
		);
		return Response.json(guests);
	});
}
