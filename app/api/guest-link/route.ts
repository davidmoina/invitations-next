import { hashToken } from "#/guests/tokens";
import { findEventIdBySlug, findGuestToken } from "#/platform/db/actor-queries";
import { acceptGuestLink } from "#/server/http/guest-link";
import { handleRoute } from "#/server/http/handler";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
	return handleRoute(request, () =>
		acceptGuestLink(request, {
			findEventIdBySlug,
			hashToken,
			findGuestToken,
			now: () => new Date(),
		}),
	);
}
