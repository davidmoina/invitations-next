import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
	GUEST_ACCESS_CONFIRMATION_MESSAGE,
	GuestAccessGate,
} from "./guest-access-gate";

describe("GuestAccessGate", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders the contact field and submit button", () => {
		render(<GuestAccessGate />);

		expect(
			screen.getByLabelText(/correo o número telefónico/i),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /solicitar enlace/i }),
		).toBeInTheDocument();
	});

	it("calls onRequestGuestLink callback with the typed contact on submit", async () => {
		const user = userEvent.setup();
		const onRequestGuestLink = vi.fn().mockResolvedValue({ ok: true });

		render(<GuestAccessGate onRequestGuestLink={onRequestGuestLink} />);

		const input = screen.getByLabelText(/correo o número telefónico/i);
		await user.type(input, "sofia@example.com");
		await user.click(screen.getByRole("button", { name: /solicitar enlace/i }));

		await waitFor(() => {
			expect(onRequestGuestLink).toHaveBeenCalledOnce();
		});
		expect(onRequestGuestLink).toHaveBeenCalledWith({
			contact: "sofia@example.com",
		});
	});

	it("produces the same rendered confirmation for known and unknown contacts", async () => {
		const user = userEvent.setup();
		const onRequestGuestLink = vi.fn().mockResolvedValue({ ok: true });

		const { unmount } = render(
			<GuestAccessGate onRequestGuestLink={onRequestGuestLink} />,
		);

		await user.type(
			screen.getByLabelText(/correo o número telefónico/i),
			"known.guest@example.com",
		);
		await user.click(screen.getByRole("button", { name: /solicitar enlace/i }));

		expect(
			await screen.findByText(GUEST_ACCESS_CONFIRMATION_MESSAGE),
		).toBeInTheDocument();
		const knownConfirmationText = screen.getByRole("region", {
			name: /acceso de invitados/i,
		}).textContent;

		unmount();

		render(<GuestAccessGate onRequestGuestLink={onRequestGuestLink} />);

		await user.type(
			screen.getByLabelText(/correo o número telefónico/i),
			"unknown.guest@example.com",
		);
		await user.click(screen.getByRole("button", { name: /solicitar enlace/i }));

		expect(
			await screen.findByText(GUEST_ACCESS_CONFIRMATION_MESSAGE),
		).toBeInTheDocument();
		const unknownConfirmationText = screen.getByRole("region", {
			name: /acceso de invitados/i,
		}).textContent;

		expect(knownConfirmationText).toBe(unknownConfirmationText);
	});

	it("still produces the confirmation message when onRequestGuestLink rejects", async () => {
		const user = userEvent.setup();
		const onRequestGuestLink = vi
			.fn()
			.mockRejectedValue(new Error("Network disconnect"));

		render(<GuestAccessGate onRequestGuestLink={onRequestGuestLink} />);

		await user.type(
			screen.getByLabelText(/correo o número telefónico/i),
			"+34612345678",
		);
		await user.click(screen.getByRole("button", { name: /solicitar enlace/i }));

		expect(
			await screen.findByText(GUEST_ACCESS_CONFIRMATION_MESSAGE),
		).toBeInTheDocument();
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("does not call callback on empty submit and shows validation error with role alert", async () => {
		const user = userEvent.setup();
		const onRequestGuestLink = vi.fn().mockResolvedValue({ ok: true });

		render(<GuestAccessGate onRequestGuestLink={onRequestGuestLink} />);

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

		render(<GuestAccessGate onRequestGuestLink={onRequestGuestLink} />);

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
});
