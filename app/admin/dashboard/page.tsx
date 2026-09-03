import { redirect } from "next/navigation";
import { getOrganizerEvents, requireSession } from "#/api-client/server";
import { accessErrorCode } from "#/server/access-error";
import { AdminDashboardWrapper } from "./wrapper";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
	try {
		await requireSession();
		const events = await getOrganizerEvents();
		return <AdminDashboardWrapper events={events} />;
	} catch (error) {
		if (accessErrorCode(error) === "unauthorized") {
			redirect("/sign-in");
		}
		throw error;
	}
}
