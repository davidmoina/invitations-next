export type MailMessage = { to: string; subject: string; text: string };
export type MailDelivery = { id: string };
export interface Mailer {
	send(message: MailMessage): Promise<MailDelivery>;
}
