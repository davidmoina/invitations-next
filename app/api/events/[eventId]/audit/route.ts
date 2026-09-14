import type { EventId } from "#/audit/actor";
import { listAdminAuditEntries } from "#/platform/db/admin-queries";
import { handleRoute } from "#/server/http/handler";
import { eventIdSchema } from "#/server/http/schemas";
import { requireOrganizer } from "#/server/middleware/resolve-actor";

export const runtime = "nodejs";

export async function GET(
	request: Request,
	context: { params: Promise<{ eventId: string }> },
): Promise<Response> {
	return handleRoute(request, async () => {
		const eventId = eventIdSchema.parse(
			(await context.params).eventId,
		) as EventId;
		return Response.json(
			await listAdminAuditEntries(await requireOrganizer(eventId)),
		);
	});
}
