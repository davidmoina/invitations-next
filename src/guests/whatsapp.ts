import { normalizePhone } from "./rules";

export const WHATSAPP_PLACEHOLDERS = [
	"nombre",
	"evento",
	"fecha",
	"lugar",
	"enlace",
] as const;

export const DEFAULT_WHATSAPP_TEMPLATE =
	"¡Hola {nombre}! Te invitamos a {evento} el {fecha} en {lugar}. Aquí tienes tu invitación personal: {enlace}";

/** Default country calling code for local Spanish phone numbers. */
export const DEFAULT_PHONE_COUNTRY_CODE = "34";

type WhatsappPlaceholder = (typeof WHATSAPP_PLACEHOLDERS)[number];
const whatsappPlaceholderPattern = new RegExp(
	`\\{(${WHATSAPP_PLACEHOLDERS.join("|")})\\}`,
	"g",
);

export function renderWhatsappMessage(
	template: string | null,
	values: Record<WhatsappPlaceholder, string>,
): string {
	const message = template?.trim() || DEFAULT_WHATSAPP_TEMPLATE;
	return message.replace(
		whatsappPlaceholderPattern,
		(_match, placeholder: string) => values[placeholder as WhatsappPlaceholder],
	);
}

export function toWhatsappPhone(phone: string): string | null {
	const normalized = normalizePhone(phone);
	if (normalized.length < 8) return null;
	if (
		normalized.length === 9 &&
		!normalized.startsWith(DEFAULT_PHONE_COUNTRY_CODE)
	) {
		return `${DEFAULT_PHONE_COUNTRY_CODE}${normalized}`;
	}
	return normalized;
}

export function buildWhatsappUrl(
	phone: string,
	message: string,
): string | null {
	const normalized = toWhatsappPhone(phone);
	return normalized === null
		? null
		: `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

function resolveZone(timezone: string): string {
	try {
		return new Intl.DateTimeFormat("en-US", {
			timeZone: timezone.trim(),
		}).resolvedOptions().timeZone;
	} catch {
		return "UTC";
	}
}

export function formatEventDateForMessage(
	startsAtIso: string,
	timezone: string,
): string {
	return new Intl.DateTimeFormat("es-ES", {
		dateStyle: "full",
		timeStyle: "short",
		timeZone: resolveZone(timezone),
	}).format(new Date(startsAtIso));
}
