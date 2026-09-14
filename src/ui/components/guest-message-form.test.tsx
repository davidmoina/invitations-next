import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GuestMessageForm } from "./guest-message-form";

describe("GuestMessageForm", () => {
	afterEach(() => {
		cleanup();
		localStorage.clear();
	});

	it("allows typing and submitting a dedication to the hosts", async () => {
		const user = userEvent.setup();
		const onSubmitMessage = vi.fn().mockResolvedValue({ ok: true });

		render(<GuestMessageForm onSubmitMessage={onSubmitMessage} />);

		const input = screen.getByPlaceholderText(
			/escribe unas palabras para los anfitriones/i,
		);
		const submitBtn = screen.getByRole("button", { name: /enviar mensaje/i });

		// Button disabled when empty
		expect(submitBtn).toBeDisabled();

		await user.type(input, "¡Muchas felicidades, les deseamos lo mejor!");
		expect(submitBtn).toBeEnabled();

		await user.click(submitBtn);

		await waitFor(() => {
			expect(onSubmitMessage).toHaveBeenCalledWith({
				body: "¡Muchas felicidades, les deseamos lo mejor!",
			});
		});

		expect(screen.getByText(/¡gracias por tus palabras!/i)).toBeInTheDocument();
	});

	it("shows error feedback when message submission fails", async () => {
		const user = userEvent.setup();
		const onSubmitMessage = vi.fn().mockResolvedValue({ ok: false });

		render(<GuestMessageForm onSubmitMessage={onSubmitMessage} />);

		const input = screen.getByPlaceholderText(
			/escribe unas palabras para los anfitriones/i,
		);
		await user.type(input, "Mensaje de prueba");

		await user.click(screen.getByRole("button", { name: /enviar mensaje/i }));

		await waitFor(() => {
			expect(
				screen.getByText(/no se pudo enviar el mensaje/i),
			).toBeInTheDocument();
		});

		expect(
			screen.queryByText(/¡gracias por tus palabras!/i),
		).not.toBeInTheDocument();
	});

	it("remembers a submitted dedication under storageKey and hides the form", async () => {
		const user = userEvent.setup();
		const onSubmitMessage = vi.fn().mockResolvedValue({ ok: true });

		render(
			<GuestMessageForm
				onSubmitMessage={onSubmitMessage}
				storageKey="guest-message:event-1:guest-1"
			/>,
		);

		await user.type(
			screen.getByPlaceholderText(
				/escribe unas palabras para los anfitriones/i,
			),
			"Gracias por invitarnos a este día tan especial",
		);
		await user.click(screen.getByRole("button", { name: /enviar mensaje/i }));

		await waitFor(() => {
			expect(
				screen.getByText(/gracias por invitarnos a este día tan especial/i),
			).toBeInTheDocument();
		});
		expect(
			screen.queryByPlaceholderText(
				/escribe unas palabras para los anfitriones/i,
			),
		).not.toBeInTheDocument();

		const stored = JSON.parse(
			localStorage.getItem("guest-message:event-1:guest-1") ?? "{}",
		) as { body?: string };
		expect(stored.body).toBe("Gracias por invitarnos a este día tan especial");
	});

	it("restores a previously submitted dedication from storage on mount", () => {
		localStorage.setItem(
			"guest-message:event-1:guest-1",
			JSON.stringify({
				body: "Mensaje ya enviado antes",
				at: "2026-09-01T00:00:00.000Z",
			}),
		);

		render(
			<GuestMessageForm
				onSubmitMessage={vi.fn()}
				storageKey="guest-message:event-1:guest-1"
			/>,
		);

		expect(screen.getByText(/mensaje ya enviado antes/i)).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /enviar mensaje/i }),
		).not.toBeInTheDocument();
	});

	it("ignores a corrupted storage entry and still renders the form", () => {
		localStorage.setItem("guest-message:event-1:guest-1", "not json");

		render(
			<GuestMessageForm
				onSubmitMessage={vi.fn()}
				storageKey="guest-message:event-1:guest-1"
			/>,
		);

		expect(
			screen.getByPlaceholderText(
				/escribe unas palabras para los anfitriones/i,
			),
		).toBeInTheDocument();
	});
});
