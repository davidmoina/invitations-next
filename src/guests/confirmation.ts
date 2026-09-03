import type { Actor } from "#/audit/actor";
import { recordEmailDeliveryFailure } from "#/platform/db/domain-mutations";
import type { Mailer } from "#/platform/email/mailer";
import { resendMailer } from "#/platform/email/resend";
import type { RsvpResult } from "#/server/contracts/public";

/** Best-effort delivery runs after RSVP commit; it never changes confirmed feedback. */
export async function sendRsvpConfirmation(
	actor: Extract<Actor, { kind: "guest" }>,
	email: string,
	result: Extract<RsvpResult, { ok: true }>,
	mailer: Mailer = resendMailer,
): Promise<void> {
	try {
		await mailer.send({
			to: email,
			subject: "RSVP confirmation",
			text: `Attendance: ${result.stored.attending ? "yes" : "no"}; companions: ${result.stored.companions}`,
		});
	} catch {
		await recordEmailDeliveryFailure(
			actor,
			`rsvp:${actor.guestId}:${result.stored.respondedAt}`,
		);
	}
}
