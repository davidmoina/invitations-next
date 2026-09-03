import { handleRoute } from "#/server/http/handler";
import { requireAuthenticatedUser } from "#/server/middleware/resolve-actor";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
	return handleRoute(request, async () =>
		Response.json(await requireAuthenticatedUser()),
	);
}
