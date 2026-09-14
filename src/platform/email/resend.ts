import "server-only";

import { Resend } from "resend";

import type {
	MailDelivery,
	Mailer,
	MailMessage,
} from "#/platform/email/mailer";
import { serverEnv } from "#/platform/env";

export const resendMailer: Mailer = {
	async send(message: MailMessage): Promise<MailDelivery> {
		const env = serverEnv();
		const result = await new Resend(env.RESEND_API_KEY).emails.send({
			from: env.EMAIL_FROM,
			to: message.to,
			subject: message.subject,
			text: message.text,
		});
		if (result.error || !result.data?.id)
			throw new Error(
				result.error?.message ?? "Resend did not return a delivery id",
			);
		return { id: result.data.id };
	},
};
