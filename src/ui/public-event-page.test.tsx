import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
	PublicEventPageProps,
	RsvpResult,
} from "#/server/contracts/public";
import { GUEST_ACCESS_CONFIRMATION_MESSAGE } from "./components/guest-access-gate";
import { PublicEventPage } from "./public-event-page";

describe("PublicEventPage", () => {
	afterEach(() => {
		cleanup();
	});

	const mockProps: PublicEventPageProps = {
		event: {
			id: "evt-1",
			slug: "boda-julian-y-sarah",
			title: "Boda de Julián & Sarah",
			eventType: "wedding",
			honoreeNames: ["Julián", "Sarah"],
			details: { type: "wedding" },
			startsAt: "2026-10-24T15:00:00.000Z",
			timezone: "Europe/Madrid",
			venueName: "Villa La Pietra, Florencia",
			venueMapUrl: "https://maps.google.com/?q=Villa+La+Pietra",
			description:
				"Estamos encantados de celebrar nuestro matrimonio rodeados de las personas que más queremos.",
			maxCompanions: 2,
			giftRegistryEnabled: true,
			rsvpDeadline: "2026-10-01T23:59:59.000Z",
		},
		guest: {
			id: "gst-1",
			displayName: "Carlos y Familia",
			attending: null,
			companions: 0,
		},
		gifts: [
			{
				id: "gift-1",
				title: "Cena romántica en Florencia",
				description: "Para celebrar en nuestra luna de miel",
				imagePublicId: null,
				url: null,
				status: "available",
				reservedByMe: false,
			},
		],
		media: [
			{
				id: "media-1",
				imagePublicId: "wedding-hero",
				alt: "Foto de la pareja",
				urls: {
					thumb: "https://example.com/thumb.jpg",
					card: "https://example.com/card.jpg",
					full: "https://example.com/full.jpg",
				},
			},
		],
		onSubmitRsvp: vi.fn().mockResolvedValue({
			ok: true,
			stored: {
				attending: true,
				companions: 1,
				respondedAt: "2026-08-25T20:00:00.000Z",
			},
		} satisfies RsvpResult),
		onReserveGift: vi.fn(),
		onCancelReservation: vi.fn(),
		onSubmitMessage: vi.fn(),
		onRequestGuestLink: vi.fn().mockResolvedValue({ ok: true }),
	};

	it("renders all public sections when registry and media are enabled", () => {
		render(<PublicEventPage {...mockProps} />);

		// Hero & Titles
		expect(
			screen.getByRole("heading", {
				level: 1,
				name: "Boda de Julián & Sarah",
			}),
		).toBeInTheDocument();
		expect(
			screen.getByText(/invitación para carlos y familia/i),
		).toBeInTheDocument();

		// Event Details
		expect(
			screen.getByText(/estamos encantados de celebrar nuestro matrimonio/i),
		).toBeInTheDocument();
		expect(screen.getByText("Villa La Pietra, Florencia")).toBeInTheDocument();

		// RSVP section
		expect(screen.getByText("¿Nos acompañas?")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /^asistiré/i }),
		).toBeInTheDocument();

		// Gift Registry section
		expect(screen.getByText("Mesa de regalos")).toBeInTheDocument();
		expect(screen.getByText("Cena romántica en Florencia")).toBeInTheDocument();

		// Media Gallery
		expect(screen.getByText("Galería de fotos")).toBeInTheDocument();
		expect(screen.getByAltText("Foto de la pareja")).toBeInTheDocument();

		// Guest message form
		expect(screen.getByText("Dedicatoria")).toBeInTheDocument();
	});

	it("hides gift registry section when giftRegistryEnabled is false", () => {
		const propsWithoutRegistry: PublicEventPageProps = {
			...mockProps,
			event: {
				...mockProps.event,
				giftRegistryEnabled: false,
			},
		};

		render(<PublicEventPage {...propsWithoutRegistry} />);

		expect(screen.queryByText("Mesa de regalos")).not.toBeInTheDocument();
		expect(
			screen.queryByText("Cena romántica en Florencia"),
		).not.toBeInTheDocument();
	});

	it("renders the guest access gate for an anonymous guest and keeps RSVP flow hidden", () => {
		const anonymousProps = {
			...mockProps,
			guest: null,
			onRequestGuestLink: vi.fn(),
		};

		render(<PublicEventPage {...anonymousProps} />);

		// Guest access gate renders
		expect(
			screen.getByRole("heading", { name: /acceso al evento/i }),
		).toBeInTheDocument();
		expect(
			screen.getByLabelText(/correo o número telefónico/i),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /solicitar enlace/i }),
		).toBeInTheDocument();

		// RSVP flow is NOT rendered
		expect(screen.queryByText("¿Nos acompañas?")).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /^asistiré/i }),
		).not.toBeInTheDocument();
	});

	it("calls injected onRequestGuestLink callback with normalized data on valid input", async () => {
		const user = userEvent.setup();
		const onRequestGuestLink = vi.fn().mockResolvedValue({ ok: true });
		const anonymousProps = {
			...mockProps,
			guest: null,
			onRequestGuestLink,
		};

		render(<PublicEventPage {...anonymousProps} />);

		await user.type(
			screen.getByLabelText(/correo o número telefónico/i),
			"  elena@example.com  ",
		);
		await user.click(screen.getByRole("button", { name: /solicitar enlace/i }));

		await waitFor(() => expect(onRequestGuestLink).toHaveBeenCalledOnce());
		expect(onRequestGuestLink).toHaveBeenCalledWith({
			contact: "elena@example.com",
		});
	});

	it("keeps RSVP flow hidden and renders confirmation message after access gate submission", async () => {
		const user = userEvent.setup();
		const onRequestGuestLink = vi.fn().mockResolvedValue({ ok: true });
		const anonymousProps = {
			...mockProps,
			guest: null,
			onRequestGuestLink,
		};

		render(<PublicEventPage {...anonymousProps} />);

		await user.type(
			screen.getByLabelText(/correo o número telefónico/i),
			"sofia@example.com",
		);
		await user.click(screen.getByRole("button", { name: /solicitar enlace/i }));

		expect(
			await screen.findByText(GUEST_ACCESS_CONFIRMATION_MESSAGE),
		).toBeInTheDocument();
		// RSVP flow never reveals directly
		expect(screen.queryByText("¿Nos acompañas?")).not.toBeInTheDocument();
		expect(
			screen.queryByRole("heading", { name: /acceso al evento/i }),
		).not.toBeInTheDocument();
	});

	it("shows pending state while submission is in flight and still displays confirmation on error", async () => {
		const user = userEvent.setup();
		let rejectSubmission: (error: Error) => void = () => {};
		const failingPromise = new Promise<never>((_, reject) => {
			rejectSubmission = reject;
		});
		const onRequestGuestLink = vi.fn().mockReturnValue(failingPromise);

		const anonymousProps = {
			...mockProps,
			guest: null,
			onRequestGuestLink,
		};

		render(<PublicEventPage {...anonymousProps} />);

		await user.type(
			screen.getByLabelText(/correo o número telefónico/i),
			"elena@example.com",
		);
		await user.click(screen.getByRole("button", { name: /solicitar enlace/i }));

		// Pending state visible
		expect(screen.getByText(/enviando enlace/i)).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /enviando enlace/i }),
		).toBeDisabled();

		// Reject the request
		rejectSubmission(new Error("Network error"));

		// Confirmation message is still shown honestly and RSVP remains hidden
		expect(
			await screen.findByText(GUEST_ACCESS_CONFIRMATION_MESSAGE),
		).toBeInTheDocument();
		expect(screen.queryByText("¿Nos acompañas?")).not.toBeInTheDocument();
	});

	it("does not fabricate guest identity and always shows uniform confirmation without leaking guest list state", async () => {
		const user = userEvent.setup();
		const onRequestGuestLink = vi.fn().mockResolvedValue({ ok: true });

		const anonymousProps = {
			...mockProps,
			guest: null,
			onRequestGuestLink,
		};

		render(<PublicEventPage {...anonymousProps} />);

		await user.type(
			screen.getByLabelText(/correo o número telefónico/i),
			"stranger@example.com",
		);
		await user.click(screen.getByRole("button", { name: /solicitar enlace/i }));

		await waitFor(() => {
			expect(
				screen.getByRole("heading", { name: /enlace solicitado/i }),
			).toBeInTheDocument();
		});
		expect(screen.queryByText("¿Nos acompañas?")).not.toBeInTheDocument();
		expect(
			screen.queryByText(/invitación para stranger/i),
		).not.toBeInTheDocument();
	});

	it("renders honoree names in the hero section", () => {
		render(<PublicEventPage {...mockProps} />);
		expect(screen.getByText("Julián & Sarah")).toBeInTheDocument();
	});

	it("renders type-specific content for baby shower and omits per-type section for other", () => {
		const babyShowerProps: PublicEventPageProps = {
			...mockProps,
			event: {
				...mockProps.event,
				eventType: "baby_shower",
				details: {
					type: "baby_shower",
					dueDate: "2030-11-20",
				},
			},
		};
		const { rerender } = render(<PublicEventPage {...babyShowerProps} />);
		expect(screen.getByText(/fecha prevista/i)).toBeInTheDocument();
		expect(screen.getByText(/20 de noviembre de 2030/i)).toBeInTheDocument();

		const otherProps: PublicEventPageProps = {
			...mockProps,
			event: {
				...mockProps.event,
				eventType: "other",
				details: {
					type: "other",
				},
			},
		};
		rerender(<PublicEventPage {...otherProps} />);
		// Shared content rendered in full
		expect(screen.getByText("Villa La Pietra, Florencia")).toBeInTheDocument();
		// No per-type section
		expect(screen.queryByText(/fecha prevista/i)).not.toBeInTheDocument();
	});

	it("verifies no server or database imports leak into src/ui/**", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");

		const uiDir = path.resolve(process.cwd(), "src/ui");
		const forbidden = [
			"src/server/functions",
			"src/server/middleware",
			"src/platform",
			"drizzle-orm",
			"better-auth",
		];

		function checkDir(dir: string) {
			const entries = fs.readdirSync(dir, { withFileTypes: true });
			for (const entry of entries) {
				const fullPath = path.join(dir, entry.name);
				if (entry.isDirectory()) {
					checkDir(fullPath);
				} else if (
					/\.(ts|tsx)$/.test(entry.name) &&
					!entry.name.endsWith(".test.ts") &&
					!entry.name.endsWith(".test.tsx")
				) {
					const content = fs.readFileSync(fullPath, "utf8");
					for (const forbiddenPath of forbidden) {
						expect(content).not.toContain(forbiddenPath);
					}
				}
			}
		}

		checkDir(uiDir);
	});
});
