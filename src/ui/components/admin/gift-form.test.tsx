import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GiftForm } from "./gift-form";

type CreateGiftCallback = React.ComponentProps<typeof GiftForm>["onCreateGift"];

describe("GiftForm", () => {
	afterEach(cleanup);

	it("submits a normalized gift payload", async () => {
		const user = userEvent.setup();
		const onCreateGift = vi.fn<CreateGiftCallback>().mockResolvedValue({
			id: "gift-1",
		});
		render(<GiftForm onCreateGift={onCreateGift} />);

		await user.type(screen.getByLabelText(/título/i), " Cena en Florencia ");
		await user.type(
			screen.getByLabelText(/descripción/i),
			" Una cena para dos ",
		);
		await user.type(
			screen.getByLabelText(/enlace/i),
			"https://example.test/gifts/dinner",
		);
		await user.type(screen.getByLabelText(/imagen/i), "gifts/florence-dinner");
		await user.clear(screen.getByLabelText(/posición/i));
		await user.type(screen.getByLabelText(/posición/i), "3");
		await user.click(screen.getByRole("button", { name: /añadir regalo/i }));

		await waitFor(() => expect(onCreateGift).toHaveBeenCalledOnce());
		expect(onCreateGift).toHaveBeenCalledWith({
			title: "Cena en Florencia",
			description: "Una cena para dos",
			url: "https://example.test/gifts/dinner",
			imagePublicId: "gifts/florence-dinner",
			position: 3,
		});
	});

	it("rejects an empty title without calling the server", async () => {
		const user = userEvent.setup();
		const onCreateGift = vi.fn<CreateGiftCallback>();
		render(<GiftForm onCreateGift={onCreateGift} />);

		await user.click(screen.getByRole("button", { name: /añadir regalo/i }));

		expect(await screen.findByRole("alert")).toBeInTheDocument();
		expect(onCreateGift).not.toHaveBeenCalled();
	});
});
