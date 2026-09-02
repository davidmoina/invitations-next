import { z } from "zod";

import { getPublicEventData } from "#/platform/db/public-queries";
import { cloudinaryImageStorage } from "#/platform/image-storage/cloudinary";
import { handleRoute } from "#/server/http/handler";
import { resolveRequestActor } from "#/server/middleware/resolve-actor";

export const runtime = "nodejs";

const slugSchema = z.string().min(1);
async function slug(context: {
	params: Promise<{ slug: string }>;
}): Promise<string> {
	return slugSchema.parse((await context.params).slug);
}

export async function GET(
	request: Request,
	context: { params: Promise<{ slug: string }> },
): Promise<Response> {
	return handleRoute(request, async () =>
		Response.json(
			await getPublicEventData(
				await slug(context),
				await resolveRequestActor(request),
				cloudinaryImageStorage,
			),
		),
	);
}
