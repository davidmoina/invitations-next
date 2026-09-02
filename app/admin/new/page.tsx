import { redirect } from "next/navigation";
import { requireSession } from "#/api-client";
import { accessErrorCode } from "#/server/access-error";
import { NewEventWrapper } from "./wrapper";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
	try {
		await requireSession();
		return <NewEventWrapper />;
	} catch (error) {
		if (accessErrorCode(error) === "unauthorized") {
			redirect("/sign-in");
		}
		throw error;
	}
}
