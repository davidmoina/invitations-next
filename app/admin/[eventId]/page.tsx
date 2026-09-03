import { notFound } from "next/navigation";
import { getAdminEvent, listAdminAudit } from "#/api-client/server";
import { accessErrorCode } from "#/server/access-error";
import { AdminEventWrapper } from "./wrapper";

export const dynamic = "force-dynamic";

export default async function AdminEventPage({
	params,
}: {
	params: Promise<{ eventId: string }>;
}) {
	const p = await params;
	const scope = { eventId: p.eventId };

	try {
		const [data, audit] = await Promise.all([
			getAdminEvent(scope),
			listAdminAudit(scope),
		]);
		return <AdminEventWrapper data={data} audit={audit} eventId={p.eventId} />;
	} catch (error) {
		if (accessErrorCode(error) === "not_found") notFound();
		throw error;
	}
}
