import { z } from "zod";

import { cancelReservation, reserveGift } from "#/gifts/use-cases";
import { requireGuestForSlug } from "#/server/http/guest-actor";
import { handleRoute } from "#/server/http/handler";

export const runtime = "nodejs";

const giftIdSchema = z.string().uuid();
const slugSchema = z.string().min(1);
type Context = { params: Promise<{ slug: string; giftId: string }> };

async function guestActor(request: Request, context: Context) {
	const params = await context.params;
	return requireGuestForSlug(request, slugSchema.parse(params.slug));
}

export async function POST(
	request: Request,
	context: Context,
): Promise<Response> {
	return handleRoute(request, async () => {
		const params = await context.params;
		return Response.json(
			await reserveGift(
				await guestActor(request, context),
				giftIdSchema.parse(params.giftId),
			),
		);
	});
}

export async function DELETE(
	request: Request,
	context: Context,
): Promise<Response> {
	return handleRoute(request, async () => {
		const params = await context.params;
		return Response.json(
			await cancelReservation(
				await guestActor(request, context),
				giftIdSchema.parse(params.giftId),
			),
		);
	});
}
