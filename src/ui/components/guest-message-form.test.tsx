import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GuestMessageForm } from "./guest-message-form";

describe("GuestMessageForm", () => {
	afterEach(() => {
		cleanup();
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
});
