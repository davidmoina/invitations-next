import { z } from "zod";
import type { Actor } from "#/audit/actor";
import { submitGuestMessage } from "#/messages/use-cases";
import { AccessError } from "#/server/access-error";
import { handleRoute } from "#/server/http/handler";
import { parseJson } from "#/server/http/request";
import { resolveRequestActor } from "#/server/middleware/resolve-actor";

export const runtime = "nodejs";

const inputSchema = z
	.object({ body: z.string().trim().min(1).max(5000) })
	.strict();

function guestActor(actor: Actor | null): Extract<Actor, { kind: "guest" }> {
	if (!actor) throw new AccessError("unauthorized");
	if (actor.kind !== "guest") throw new AccessError("forbidden");
	return actor;
}

export async function POST(request: Request): Promise<Response> {
	return handleRoute(request, async () => {
		await submitGuestMessage(
			guestActor(await resolveRequestActor(request)),
			(await parseJson(request, inputSchema)).body,
		);
		return Response.json({ ok: true });
	});
}
