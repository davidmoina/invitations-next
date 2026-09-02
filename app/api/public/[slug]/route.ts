import { NextResponse } from "next/server";
import { z } from "zod";

import { guestTokenCookieName } from "#/guests/constants";
import { findEventIdBySlug } from "#/platform/db/actor-queries";
import { getPublicEventData } from "#/platform/db/public-queries";
import { cloudinaryImageStorage } from "#/platform/image-storage/cloudinary";
import { handleRoute } from "#/server/http/handler";
import { registerGuestForEvent } from "#/server/http/public-registration";
import { parseJson } from "#/server/http/request";
import { resolveRequestActor } from "#/server/middleware/resolve-actor";

export const runtime = "nodejs";

const slugSchema = z.string().min(1);
const registerSchema = z
	.object({
		displayName: z.string().trim().min(1),
		email: z
			.union([z.string().email(), z.literal(""), z.null()])
			.transform((value) =>
				typeof value === "string" && value ? value.trim().toLowerCase() : null,
			),
	})
	.strict();

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

export async function POST(
	request: Request,
	context: { params: Promise<{ slug: string }> },
): Promise<Response> {
	return handleRoute(request, async () => {
		const eventSlug = await slug(context);
		const eventId = await findEventIdBySlug(eventSlug);
		if (!eventId) return Response.json({ code: "not_found" }, { status: 404 });
		const input = await parseJson(request, registerSchema);
		const token = await registerGuestForEvent(eventId, input);
		const response = NextResponse.json({ ok: true });
		response.cookies.set(guestTokenCookieName, token, {
			httpOnly: true,
			secure: true,
			sameSite: "lax",
			path: "/",
		});
		return response;
	});
}
