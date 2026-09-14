import { z } from "zod";

import { submitGuestMessage } from "#/messages/use-cases";
import { requireGuestForSlug } from "#/server/http/guest-actor";
import { handleRoute } from "#/server/http/handler";
import { parseJson } from "#/server/http/request";

export const runtime = "nodejs";

const inputSchema = z
	.object({ body: z.string().trim().min(1).max(5000) })
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
		await submitGuestMessage(
			actor,
			(await parseJson(request, inputSchema)).body,
		);
		return Response.json({ ok: true });
	});
}
