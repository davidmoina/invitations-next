import type { Actor, EventId } from "#/audit/actor";
import { recordEmailDeliveryFailure } from "#/platform/db/domain-mutations";
import type { Mailer } from "#/platform/email/mailer";
import { resendMailer } from "#/platform/email/resend";
import { serverEnv } from "#/platform/env";

export type GuestLinkDelivery = {
	eventId: EventId;
	email: string;
	eventSlug: string;
	token: string;
};

/**
 * Best-effort delivery runs after guest intake commits.
 *
 * The event scope arrives in the payload rather than off the actor: the
 * self-service access gate sends the same link under a system actor, which
 * carries no event of its own.
 */
export async function sendGuestLinkEmail(
	actor: Actor,
	input: GuestLinkDelivery,
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
	} catch (err) {
		console.error("Failed to send guest link email", err);
		await recordEmailDeliveryFailure(
			actor,
			`guest_link:${input.eventId}:${input.email}`,
		);
	}
}
