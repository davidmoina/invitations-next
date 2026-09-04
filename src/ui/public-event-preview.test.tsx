import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PublicEventPreview as PublicEventPreviewData } from "#/server/contracts/public";
import {
	formatInviterHeadline,
	GUEST_ACCESS_CONFIRMATION_MESSAGE,
	PublicEventPreview,
} from "./public-event-preview";

describe("PublicEventPreview", () => {
	afterEach(() => {
		cleanup();
	});

	const mockEvent: PublicEventPreviewData = {
		slug: "boda-henry-y-kelly",
		title: "Boda de Henry y Kelly",
		eventType: "wedding",
		honoreeNames: ["Henry", "Kelly"],
	};

	it("renders the headline naming the honorees and the subtitle", () => {
		render(<PublicEventPreview event={mockEvent} />);

		expect(
			screen.getByRole("heading", {
				level: 1,
				name: /has recibido una invitación de henry y kelly/i,
			}),
		).toBeInTheDocument();
		expect(
			screen.getByText(/introduce tus datos para continuar/i),
		).toBeInTheDocument();
	});

	it("formats honoree names correctly for single, two, multiple, or falls back to title", () => {
		expect(
			formatInviterHeadline({
				honoreeNames: ["Henry"],
				title: "Evento",
			}),
		).toBe("Has recibido una invitación de Henry");

		expect(
			formatInviterHeadline({
				honoreeNames: ["Henry", "Kelly"],
				title: "Evento",
			}),
		).toBe("Has recibido una invitación de Henry y Kelly");

		expect(
			formatInviterHeadline({
				honoreeNames: ["Henry", "Kelly", "Sofía"],
				title: "Evento",
			}),
		).toBe("Has recibido una invitación de Henry, Kelly y Sofía");

		expect(
			formatInviterHeadline({
				honoreeNames: [],
				title: "Celebración Anual",
			}),
		).toBe("Has recibido una invitación de Celebración Anual");

		expect(
			formatInviterHeadline({
				honoreeNames: ["   "],
				title: "Fiesta Sorpresa",
			}),
		).toBe("Has recibido una invitación de Fiesta Sorpresa");
	});

	it("falls back to title in the rendered heading when honoreeNames is empty", () => {
		const eventWithoutHonorees: PublicEventPreviewData = {
			...mockEvent,
			honoreeNames: [],
			title: "Gala Benéfica 2026",
		};

		render(<PublicEventPreview event={eventWithoutHonorees} />);

		expect(
			screen.getByRole("heading", {
				level: 1,
				name: /has recibido una invitación de gala benéfica 2026/i,
			}),
		).toBeInTheDocument();
	});

	it("does not render or expose date, venue, description, gifts or gallery images", () => {
		const { container } = render(<PublicEventPreview event={mockEvent} />);

		expect(screen.queryByText(/fecha/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/lugar/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/ubicación/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/regalo/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/galería/i)).not.toBeInTheDocument();
		expect(container.querySelectorAll("img")).toHaveLength(0);
	});

	it("renders the contact field and submit button", () => {
		render(<PublicEventPreview event={mockEvent} />);

		expect(
			screen.getByLabelText(/correo o número telefónico/i),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /solicitar enlace/i }),
		).toBeInTheDocument();
	});

	it("calls onRequestGuestLink callback with normalized contact on submit", async () => {
		const user = userEvent.setup();
		const onRequestGuestLink = vi.fn().mockResolvedValue({ ok: true });

		render(
			<PublicEventPreview
				event={mockEvent}
				onRequestGuestLink={onRequestGuestLink}
			/>,
		);

		const input = screen.getByLabelText(/correo o número telefónico/i);
		await user.type(input, "  sofia@example.com  ");
		await user.click(screen.getByRole("button", { name: /solicitar enlace/i }));

		await waitFor(() => {
			expect(onRequestGuestLink).toHaveBeenCalledOnce();
		});
		expect(onRequestGuestLink).toHaveBeenCalledWith({
			contact: "sofia@example.com",
		});
	});

	it("does not call callback on empty submit and displays validation error with role alert", async () => {
		const user = userEvent.setup();
		const onRequestGuestLink = vi.fn().mockResolvedValue({ ok: true });

		render(
			<PublicEventPreview
				event={mockEvent}
				onRequestGuestLink={onRequestGuestLink}
			/>,
		);

		await user.click(screen.getByRole("button", { name: /solicitar enlace/i }));

		expect(onRequestGuestLink).not.toHaveBeenCalled();
		const alert = await screen.findByRole("alert");
		expect(alert).toBeInTheDocument();
		expect(alert).toHaveTextContent(/indica tu correo o número telefónico/i);

		const input = screen.getByLabelText(/correo o número telefónico/i);
		expect(input).toHaveAttribute("aria-invalid", "true");
	});

	it("shows disabled and pending state while submission is in flight", async () => {
		const user = userEvent.setup();
		let resolveSubmission!: (val: { ok: true }) => void;
		const inFlightPromise = new Promise<{ ok: true }>((resolve) => {
			resolveSubmission = resolve;
		});
		const onRequestGuestLink = vi.fn().mockReturnValue(inFlightPromise);

		render(
			<PublicEventPreview
				event={mockEvent}
				onRequestGuestLink={onRequestGuestLink}
			/>,
		);

		await user.type(
			screen.getByLabelText(/correo o número telefónico/i),
			"invitado@test.com",
		);
		await user.click(screen.getByRole("button", { name: /solicitar enlace/i }));

		const submitButton = screen.getByRole("button", {
			name: /enviando enlace/i,
		});
		expect(submitButton).toBeDisabled();
		expect(screen.getByLabelText(/correo o número telefónico/i)).toBeDisabled();

		resolveSubmission({ ok: true });

		expect(
			await screen.findByText(GUEST_ACCESS_CONFIRMATION_MESSAGE),
		).toBeInTheDocument();
	});

	it("produces identical confirmation message and layout for both known and unknown contacts", async () => {
		const user = userEvent.setup();
		const onRequestGuestLink = vi.fn().mockResolvedValue({ ok: true });

		const { unmount } = render(
			<PublicEventPreview
				event={mockEvent}
				onRequestGuestLink={onRequestGuestLink}
			/>,
		);

		await user.type(
			screen.getByLabelText(/correo o número telefónico/i),
			"known.guest@example.com",
		);
		await user.click(screen.getByRole("button", { name: /solicitar enlace/i }));

		expect(
			await screen.findByText(GUEST_ACCESS_CONFIRMATION_MESSAGE),
		).toBeInTheDocument();
		const knownConfirmationText = screen.getByRole("main", {
			name: /acceso de invitados/i,
		}).textContent;

		unmount();

		render(
			<PublicEventPreview
				event={mockEvent}
				onRequestGuestLink={onRequestGuestLink}
			/>,
		);

		await user.type(
			screen.getByLabelText(/correo o número telefónico/i),
			"unknown.guest@example.com",
		);
		await user.click(screen.getByRole("button", { name: /solicitar enlace/i }));

		expect(
			await screen.findByText(GUEST_ACCESS_CONFIRMATION_MESSAGE),
		).toBeInTheDocument();
		const unknownConfirmationText = screen.getByRole("main", {
			name: /acceso de invitados/i,
		}).textContent;

		expect(knownConfirmationText).toBe(unknownConfirmationText);
	});

	it("still produces the identical confirmation message when onRequestGuestLink rejects", async () => {
		const user = userEvent.setup();
		const onRequestGuestLink = vi
			.fn()
			.mockRejectedValue(new Error("Network disconnect"));

		render(
			<PublicEventPreview
				event={mockEvent}
				onRequestGuestLink={onRequestGuestLink}
			/>,
		);

		await user.type(
			screen.getByLabelText(/correo o número telefónico/i),
			"+34612345678",
		);
		await user.click(screen.getByRole("button", { name: /solicitar enlace/i }));

		expect(
			await screen.findByText(GUEST_ACCESS_CONFIRMATION_MESSAGE),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { name: /enlace solicitado/i }),
		).toBeInTheDocument();
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("submits safely when onRequestGuestLink is omitted", async () => {
		const user = userEvent.setup();

		render(<PublicEventPreview event={mockEvent} />);

		await user.type(
			screen.getByLabelText(/correo o número telefónico/i),
			"invitado@test.com",
		);
		await user.click(screen.getByRole("button", { name: /solicitar enlace/i }));

		expect(
			await screen.findByText(GUEST_ACCESS_CONFIRMATION_MESSAGE),
		).toBeInTheDocument();
	});
});
