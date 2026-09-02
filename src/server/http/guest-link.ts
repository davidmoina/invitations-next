import { NextResponse } from "next/server";
import { z } from "zod";

import type { EventId } from "#/audit/actor";
import { guestTokenCookieName, guestTokenPattern } from "#/guests/constants";
import { parseSearch } from "#/server/http/request";

const querySchema = z.object({ slug: z.string().min(1), token: z.string() });

export type GuestLinkDependencies = {
	findEventIdBySlug(slug: string): Promise<EventId | null>;
	hashToken(token: string): Promise<string>;
	findGuestToken(tokenHash: string): Promise<{
		eventId: EventId;
		revokedAt: Date | null;
		expiresAt: Date;
	} | null>;
	now(): Date;
};

function redirectFor(request: Request, slug: string): NextResponse {
	return NextResponse.redirect(
		new URL(`/e/${encodeURIComponent(slug)}`, request.url),
	);
}

/** Validates the slug's event scope before ever accepting its guest token. */
export async function acceptGuestLink(
	request: Request,
	dependencies: GuestLinkDependencies,
): Promise<NextResponse> {
	const { slug, token } = parseSearch(request, querySchema);
	const eventId = await dependencies.findEventIdBySlug(slug);
	if (!eventId || !guestTokenPattern.test(token))
		return redirectFor(request, slug);
	const issued = await dependencies.findGuestToken(
		await dependencies.hashToken(token),
	);
	if (
		!issued ||
		issued.eventId !== eventId ||
		issued.revokedAt !== null ||
		issued.expiresAt.getTime() <= dependencies.now().getTime()
	)
		return redirectFor(request, slug);
	const response = redirectFor(request, slug);
	response.cookies.set(guestTokenCookieName, token, {
		httpOnly: true,
		secure: true,
		sameSite: "lax",
		path: "/",
	});
	return response;
}
