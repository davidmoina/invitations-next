import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { PublicEventPageData } from "#/server/contracts/public";
import { EventDetailsSection } from "./event-details-section";

const baseEvent: PublicEventPageData["event"] = {
	id: "evt-1",
	slug: "baby-shower-c422a00d",
	title: "Baby Shower David",
	eventType: "baby_shower",
	honoreeNames: ["David"],
	details: { type: "baby_shower", dueDate: "2026-11-20" },
	startsAt: "2026-09-16T00:04:00.000Z",
	timezone: "Europe/Madrid",
	venueName: "Tudela",
	venueAddress: "Navarra, España",
	venueMapUrl: "https://maps.app.goo.gl/s7hLV5nYyJgwJb4T7",
	description: "Celebración especial",
	maxCompanions: 2,
	giftRegistryEnabled: true,
	rsvpDeadline: null,
};

describe("EventDetailsSection", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders embedded map iframe with venue location query and title", () => {
		render(<EventDetailsSection event={baseEvent} />);

		const iframe = screen.getByTitle("Mapa de ubicación de Tudela");
		expect(iframe).toBeInTheDocument();
		expect(iframe.tagName).toBe("IFRAME");
		expect(iframe).toHaveAttribute(
			"src",
			expect.stringContaining("https://maps.google.com/maps?q="),
		);
		expect(iframe).toHaveAttribute("src", expect.stringContaining("Tudela"));
	});

	it("renders venue name, address, and 'Cómo llegar' directions button", () => {
		render(<EventDetailsSection event={baseEvent} />);

		expect(screen.getByText("Tudela")).toBeInTheDocument();
		expect(screen.getByText("Navarra, España")).toBeInTheDocument();

		const directionsLink = screen.getByRole("link", {
			name: /cómo llegar/i,
		});
		expect(directionsLink).toBeInTheDocument();
		expect(directionsLink).toHaveAttribute(
			"href",
			"https://maps.app.goo.gl/s7hLV5nYyJgwJb4T7",
		);
		expect(directionsLink).toHaveAttribute("target", "_blank");
	});

	it("falls back to google maps search link when venueMapUrl is absent", () => {
		const eventWithoutMapUrl: PublicEventPageData["event"] = {
			...baseEvent,
			venueMapUrl: null,
		};
		render(<EventDetailsSection event={eventWithoutMapUrl} />);

		const directionsLink = screen.getByRole("link", {
			name: /cómo llegar/i,
		});
		expect(directionsLink).toBeInTheDocument();
		expect(directionsLink).toHaveAttribute(
			"href",
			expect.stringContaining("https://www.google.com/maps/search/"),
		);
	});

	it("renders placeholder when location is not set", () => {
		const eventWithoutLocation: PublicEventPageData["event"] = {
			...baseEvent,
			venueName: null,
			venueAddress: null,
			venueMapUrl: null,
		};
		render(<EventDetailsSection event={eventWithoutLocation} />);

		expect(screen.queryByTitle(/mapa de ubicación/i)).not.toBeInTheDocument();
		expect(screen.getByText("Ubicación por confirmar")).toBeInTheDocument();
	});

	it("renders 'Añadir al calendario' link and baby shower due date inside When card", () => {
		render(<EventDetailsSection event={baseEvent} />);

		const calendarLink = screen.getByRole("link", {
			name: /añadir al calendario/i,
		});
		expect(calendarLink).toBeInTheDocument();
		expect(calendarLink).toHaveAttribute(
			"href",
			expect.stringContaining("calendar.google.com/calendar/render"),
		);

		expect(screen.getByText(/fecha prevista/i)).toBeInTheDocument();
		expect(screen.getByText(/20 de noviembre de 2026/i)).toBeInTheDocument();
	});
});
