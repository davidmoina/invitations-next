import type { Actor } from "#/audit/actor";
import { recordEmailDeliveryFailure } from "#/platform/db/domain-mutations";
import type { Mailer } from "#/platform/email/mailer";
import { resendMailer } from "#/platform/email/resend";
import { serverEnv } from "#/platform/env";

/** Best-effort delivery runs after guest intake commits. */
export async function sendGuestLinkEmail(
	actor: Extract<Actor, { kind: "organizer" }>,
	input: { email: string; eventSlug: string; token: string },
	mailer: Mailer = resendMailer,
): Promise<void> {
	try {
		const link = new URL(`/e/${input.eventSlug}`, serverEnv().APP_ORIGIN);
		link.searchParams.set("token", input.token);
		await mailer.send({
			to: input.email,
			subject: "Your event invitation",
			text: `Your personal event link: ${link.toString()}`,
		});
	} catch {
		await recordEmailDeliveryFailure(
			actor,
			`guest_link:${actor.eventId}:${input.email}`,
		);
	}
}
