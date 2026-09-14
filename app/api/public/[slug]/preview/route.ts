import { z } from "zod";

import { getPublicEventPreview } from "#/platform/db/public-queries";
import { handleRoute } from "#/server/http/handler";

export const runtime = "nodejs";

const slugSchema = z.string().min(1);

export async function GET(
	request: Request,
	context: { params: Promise<{ slug: string }> },
): Promise<Response> {
	return handleRoute(request, async () => {
		const slug = slugSchema.parse((await context.params).slug);
		return Response.json(await getPublicEventPreview(slug));
	});
}
