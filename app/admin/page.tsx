import { redirect } from "next/navigation";
import { getOrganizerEvents, requireSession } from "#/api-client/server";
import { accessErrorCode } from "#/server/access-error";
import { AdminHomeWrapper } from "./wrapper";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
	try {
		await requireSession();
		const events = await getOrganizerEvents();
		return <AdminHomeWrapper events={events} />;
	} catch (error) {
		if (accessErrorCode(error) === "unauthorized") {
			redirect("/sign-in");
		}
		throw error;
	}
}
