import { redirect } from "next/navigation";
import { requireSession } from "#/api-client";
import { accessErrorCode } from "#/server/access-error";
import { LandingPage } from "#/ui/landing-page";

export default async function Home() {
	try {
		await requireSession();
		redirect("/admin");
	} catch (error: unknown) {
		if (accessErrorCode(error) === "unauthorized") {
			return <LandingPage signUpHref="/sign-up" signInHref="/sign-in" />;
		}
		throw error;
	}
}
