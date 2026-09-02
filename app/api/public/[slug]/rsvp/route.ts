import { z } from "zod";
import type { Actor } from "#/audit/actor";
import { sendRsvpConfirmation } from "#/guests/confirmation";
import { submitRsvp } from "#/guests/use-cases";
import { findGuestEmail } from "#/platform/db/actor-queries";
import { AccessError } from "#/server/access-error";
import { handleRoute } from "#/server/http/handler";
import { parseJson } from "#/server/http/request";
import { resolveRequestActor } from "#/server/middleware/resolve-actor";

export const runtime = "nodejs";

const inputSchema = z
	.object({ attending: z.boolean(), companions: z.number().int().min(0) })
	.strict();

function guestActor(actor: Actor | null): Extract<Actor, { kind: "guest" }> {
	if (!actor) throw new AccessError("unauthorized");
	if (actor.kind !== "guest") throw new AccessError("forbidden");
	return actor;
}

export async function POST(request: Request): Promise<Response> {
	return handleRoute(request, async () => {
		const actor = guestActor(await resolveRequestActor(request));
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
