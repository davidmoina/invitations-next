import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GuestIntakeForm } from "./guest-intake-form";

type AddGuestsCallback = React.ComponentProps<
	typeof GuestIntakeForm
>["onAddGuests"];

describe("GuestIntakeForm", () => {
	afterEach(cleanup);

	it("manually adds a guest and resets for another entry", async () => {
		const user = userEvent.setup();
		const onAddGuests = vi.fn<AddGuestsCallback>().mockResolvedValue(undefined);
		render(<GuestIntakeForm onAddGuests={onAddGuests} />);

		await user.type(screen.getByLabelText(/nombre/i), " Ana Ruiz ");
		await user.type(screen.getByLabelText(/email/i), "ana@example.test");
		await user.type(screen.getByLabelText(/teléfono/i), " 612345678 ");
		await user.click(screen.getByRole("button", { name: /añadir y otro/i }));

		await waitFor(() => expect(onAddGuests).toHaveBeenCalledOnce());
		expect(onAddGuests).toHaveBeenCalledWith([
			{
				displayName: "Ana Ruiz",
				email: "ana@example.test",
				phone: "612345678",
			},
		]);
		expect(screen.getByLabelText(/nombre/i)).toHaveValue("");
		expect(screen.getByLabelText(/email/i)).toHaveValue("");
		expect(screen.getByLabelText(/teléfono/i)).toHaveValue("");
	});

	it("allows a manual guest without an email or phone and refuses a blank name", async () => {
		const user = userEvent.setup();
		const onAddGuests = vi.fn<AddGuestsCallback>().mockResolvedValue(undefined);
		render(<GuestIntakeForm onAddGuests={onAddGuests} />);

		await user.click(
			screen.getByRole("button", { name: /^añadir invitado$/i }),
		);
		expect(await screen.findByRole("alert")).toBeInTheDocument();
		expect(onAddGuests).not.toHaveBeenCalled();

		await user.type(screen.getByLabelText(/nombre/i), "Marco Díaz");
		await user.click(
			screen.getByRole("button", { name: /^añadir invitado$/i }),
		);
		await waitFor(() => expect(onAddGuests).toHaveBeenCalledOnce());
		expect(onAddGuests).toHaveBeenCalledWith([
			{ displayName: "Marco Díaz", email: null, phone: null },
		]);
	});

	it("allows adding a guest with only phone and no email", async () => {
		const user = userEvent.setup();
		const onAddGuests = vi.fn<AddGuestsCallback>().mockResolvedValue(undefined);
		render(<GuestIntakeForm onAddGuests={onAddGuests} />);

		await user.type(screen.getByLabelText(/nombre/i), "Carlos Gómez");
		await user.type(screen.getByLabelText(/teléfono/i), "+34 600 123 456");
		await user.click(
			screen.getByRole("button", { name: /^añadir invitado$/i }),
		);

		await waitFor(() => expect(onAddGuests).toHaveBeenCalledOnce());
		expect(onAddGuests).toHaveBeenCalledWith([
			{
				displayName: "Carlos Gómez",
				email: null,
				phone: "+34 600 123 456",
			},
		]);
	});
});
