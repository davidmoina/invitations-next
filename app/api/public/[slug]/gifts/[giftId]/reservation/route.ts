import { z } from "zod";
import { cancelReservation, reserveGift } from "#/gifts/use-cases";
import { requireGuest } from "#/server/http/guest-actor";
import { handleRoute } from "#/server/http/handler";
import { resolveRequestActor } from "#/server/middleware/resolve-actor";

export const runtime = "nodejs";

const giftIdSchema = z.string().uuid();

function giftId(context: {
	params: Promise<{ giftId: string }>;
}): Promise<string> {
	return context.params.then((params) => giftIdSchema.parse(params.giftId));
}

export async function POST(
	request: Request,
	context: { params: Promise<{ giftId: string }> },
): Promise<Response> {
	return handleRoute(request, async () =>
		Response.json(
			await reserveGift(
				requireGuest(await resolveRequestActor(request)),
				await giftId(context),
			),
		),
	);
}

export async function DELETE(
	request: Request,
	context: { params: Promise<{ giftId: string }> },
): Promise<Response> {
	return handleRoute(request, async () =>
		Response.json(
			await cancelReservation(
				requireGuest(await resolveRequestActor(request)),
				await giftId(context),
			),
		),
	);
}
