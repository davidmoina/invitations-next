import { describe, expect, it } from "vitest";

import {
	buildWhatsappUrl,
	DEFAULT_WHATSAPP_TEMPLATE,
	formatEventDateForMessage,
	renderWhatsappMessage,
	toWhatsappPhone,
	WHATSAPP_PLACEHOLDERS,
} from "./whatsapp";

const values = {
	nombre: "Ana",
	evento: "Nuestra boda",
	fecha: "sábado, 20 de junio de 2026, 12:00",
	lugar: "Finca El Olivar",
	enlace: "https://example.test/invitacion/ana",
};

describe("renderWhatsappMessage", () => {
	it.each([null, "   "])("uses the default template for %j", (template) => {
		expect(renderWhatsappMessage(template, values)).toBe(
			renderWhatsappMessage(DEFAULT_WHATSAPP_TEMPLATE, values),
		);
	});

	it("replaces every occurrence of every supported placeholder", () => {
		const template = `${WHATSAPP_PLACEHOLDERS.map((key) => `{${key}}`).join("|")}::{nombre}`;
		const rendered = renderWhatsappMessage(template, values);

		expect(rendered).toBe(
			`${values.nombre}|${values.evento}|${values.fecha}|${values.lugar}|${values.enlace}::${values.nombre}`,
		);
	});

	it("leaves unknown braces unchanged", () => {
		expect(renderWhatsappMessage("Hola {nombre}, {desconocido}", values)).toBe(
			"Hola Ana, {desconocido}",
		);
	});

	it("does not expand placeholders contained in replacement values", () => {
		expect(
			renderWhatsappMessage("Hola {nombre}", {
				...values,
				nombre: "{evento}",
			}),
		).toBe("Hola {evento}");
	});
});

describe("toWhatsappPhone", () => {
	it.each([
		["+34 666 66 66 66", "34666666666"],
		["0034666666666", "34666666666"],
		["666666666", "34666666666"],
		["+52 55 1234 5678", "525512345678"],
	] as const)("normalizes %s", (phone, expected) => {
		expect(toWhatsappPhone(phone)).toBe(expected);
	});

	it("rejects a phone with fewer than eight digits", () => {
		expect(toWhatsappPhone("123 456 7")).toBeNull();
	});
});

describe("buildWhatsappUrl", () => {
	it("encodes punctuation and newlines in the message", () => {
		expect(buildWhatsappUrl("666 666 666", "¡Hola!\nTu invitación")).toBe(
			"https://wa.me/34666666666?text=%C2%A1Hola!%0ATu%20invitaci%C3%B3n",
		);
	});

	it("returns null for an unusable phone", () => {
		expect(buildWhatsappUrl("123", "Hola")).toBeNull();
	});
});

describe("formatEventDateForMessage", () => {
	it("uses Madrid summer time", () => {
		expect(
			formatEventDateForMessage("2026-06-20T10:00:00.000Z", "Europe/Madrid"),
		).toBe("sábado, 20 de junio de 2026, 12:00");
	});

	it("uses Madrid winter time", () => {
		expect(
			formatEventDateForMessage("2026-01-20T10:00:00.000Z", "Europe/Madrid"),
		).toBe("martes, 20 de enero de 2026, 11:00");
	});

	it("falls back to UTC for an unknown timezone", () => {
		expect(
			formatEventDateForMessage("2026-06-20T10:00:00.000Z", "Mars/Olympus"),
		).toBe("sábado, 20 de junio de 2026, 10:00");
	});
});
