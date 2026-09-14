import { z } from "zod";

import { sendRsvpConfirmation } from "#/guests/confirmation";
import { submitRsvp } from "#/guests/use-cases";
import { findGuestEmail } from "#/platform/db/actor-queries";
import { requireGuestForSlug } from "#/server/http/guest-actor";
import { handleRoute } from "#/server/http/handler";
import { parseJson } from "#/server/http/request";

export const runtime = "nodejs";

const inputSchema = z
	.object({ attending: z.boolean(), companions: z.number().int().min(0) })
	.strict();
const slugSchema = z.string().min(1);

export async function POST(
	request: Request,
	context: { params: Promise<{ slug: string }> },
): Promise<Response> {
	return handleRoute(request, async () => {
		const actor = await requireGuestForSlug(
			request,
			slugSchema.parse((await context.params).slug),
		);
		const result = await submitRsvp(
			actor,
			await parseJson(request, inputSchema),
		);
		if (result.ok) {
			const email = await findGuestEmail(actor.eventId, actor.guestId);
			if (email) await sendRsvpConfirmation(actor, email, result);
		}
		return Response.json(result);
	});
}
