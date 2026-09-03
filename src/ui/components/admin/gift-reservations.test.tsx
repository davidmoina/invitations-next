import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AdminGift } from "#/server/contracts/admin";
import { GiftReservations } from "./gift-reservations";

const reserved: AdminGift = {
	id: "gift-1",
	title: "Cena en Florencia",
	description: null,
	imagePublicId: null,
	url: null,
	status: "reserved",
	reservedBy: { guestId: "guest-1", displayName: "Ana Ruiz" },
};

const available: AdminGift = {
	id: "gift-2",
	title: "Juego de maletas",
	description: null,
	imagePublicId: null,
	url: null,
	status: "available",
	reservedBy: null,
};

function renderGifts(
	overrides: Partial<React.ComponentProps<typeof GiftReservations>> = {},
) {
	const props = {
		gifts: [reserved, available],
		onCancelReservation: vi
			.fn()
			.mockResolvedValue({ ok: true, giftId: "gift-1" }),
		...overrides,
	};
	render(<GiftReservations {...props} />);
	return props;
}

describe("GiftReservations", () => {
	afterEach(() => {
		cleanup();
	});

	// This is the organizer-only view: the reserver's identity is present
	// here and structurally absent from the guest-facing PublicGift.
	it("shows who reserved each gift", () => {
		renderGifts();

		expect(screen.getByText("Cena en Florencia")).toBeInTheDocument();
		expect(screen.getByText(/Ana Ruiz/)).toBeInTheDocument();
	});

	it("offers no cancellation for a gift nobody reserved", () => {
		renderGifts();

		expect(
			screen.queryByRole("button", { name: /cancelar reserva de Juego/i }),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /cancelar reserva de Cena/i }),
		).toBeInTheDocument();
	});

	it("cancels a reservation", async () => {
		const user = userEvent.setup();
		const props = renderGifts();

		await user.click(
			screen.getByRole("button", { name: /cancelar reserva de Cena/i }),
		);

		await waitFor(() => {
			expect(props.onCancelReservation).toHaveBeenCalledWith("gift-1");
		});
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	// The use case reports a refused cancellation by RESOLVING with
	// `{ ok: false }`, not by throwing. Treating "did not throw" as success
	// would tell the organizer a reservation was released when it was not.
	it("reports a refused cancellation that resolved without throwing", async () => {
		const user = userEvent.setup();
		renderGifts({
			onCancelReservation: vi.fn().mockResolvedValue({
				ok: false,
				error: { code: "not_your_reservation" },
			}),
		});

		await user.click(
			screen.getByRole("button", { name: /cancelar reserva de Cena/i }),
		);

		await waitFor(() => {
			expect(screen.getByRole("alert")).toBeInTheDocument();
		});
	});

	it("reports a cancellation that threw", async () => {
		const user = userEvent.setup();
		renderGifts({
			onCancelReservation: vi.fn().mockRejectedValue(new Error("offline")),
		});

		await user.click(
			screen.getByRole("button", { name: /cancelar reserva de Cena/i }),
		);

		await waitFor(() => {
			expect(screen.getByRole("alert")).toBeInTheDocument();
		});
		expect(screen.getByRole("alert").textContent).not.toContain("offline");
	});

	it("renders edit button and opens prefilled edit form", async () => {
		const user = userEvent.setup();
		renderGifts();

		const editBtn = screen.getByRole("button", {
			name: /editar cena en florencia/i,
		});
		expect(editBtn).toBeInTheDocument();

		await user.click(editBtn);

		expect(screen.getByLabelText(/^título/i)).toHaveValue("Cena en Florencia");
		expect(
			screen.getByRole("button", { name: /guardar cambios/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /cancelar/i }),
		).toBeInTheDocument();
	});

	it("cancels editing when cancel button is clicked", async () => {
		const user = userEvent.setup();
		renderGifts();

		await user.click(
			screen.getByRole("button", { name: /editar cena en florencia/i }),
		);
		expect(screen.getByLabelText(/^título/i)).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /cancelar/i }));
		expect(screen.queryByLabelText(/^título/i)).not.toBeInTheDocument();
	});

	it("submits updated gift through onEditGift and shows pending and success states", async () => {
		const user = userEvent.setup();
		let resolveEdit!: (value: { id: string }) => void;
		const editPromise = new Promise<{ id: string }>((resolve) => {
			resolveEdit = resolve;
		});
		const onEditGift = vi.fn().mockReturnValue(editPromise);

		renderGifts({ onEditGift });

		await user.click(
			screen.getByRole("button", { name: /editar cena en florencia/i }),
		);

		await user.clear(screen.getByLabelText(/^título/i));
		await user.type(screen.getByLabelText(/^título/i), "Cena romántica");
		await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

		expect(onEditGift).toHaveBeenCalledWith(
			expect.objectContaining({
				giftId: "gift-1",
				title: "Cena romántica",
			}),
		);
		expect(screen.getByText(/guardando/i)).toBeInTheDocument();

		resolveEdit({ id: "gift-1" });

		await waitFor(() => {
			expect(screen.getByText(/regalo actualizado/i)).toBeInTheDocument();
		});
	});

	it("reports gift edit failure with error alert", async () => {
		const user = userEvent.setup();
		const onEditGift = vi
			.fn()
			.mockRejectedValue(new Error("secret db query timeout"));

		renderGifts({ onEditGift });

		await user.click(
			screen.getByRole("button", { name: /editar cena en florencia/i }),
		);
		await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

		await waitFor(() => {
			expect(screen.getByRole("alert")).toBeInTheDocument();
		});
		expect(screen.getByRole("alert").textContent).not.toContain(
			"secret db query timeout",
		);
	});

	it("does not send a fabricated position when editing a gift without position", async () => {
		const user = userEvent.setup();
		const onEditGift = vi.fn().mockResolvedValue({ id: "gift-1" });
		renderGifts({ onEditGift });

		await user.click(
			screen.getByRole("button", { name: /editar cena en florencia/i }),
		);
		await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

		await waitFor(() => {
			expect(onEditGift).toHaveBeenCalledTimes(1);
		});
		const callPayload = onEditGift.mock.calls[0]?.[0];
		expect(callPayload).not.toHaveProperty("position");
	});

	it("shows updated gift values after successful edit rather than stale props", async () => {
		const user = userEvent.setup();
		const onEditGift = vi.fn().mockResolvedValue({ id: "gift-1" });
		renderGifts({ onEditGift });

		await user.click(
			screen.getByRole("button", { name: /editar cena en florencia/i }),
		);
		await user.clear(screen.getByLabelText(/^título/i));
		await user.type(screen.getByLabelText(/^título/i), "Cena en Roma");
		await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

		await waitFor(() => {
			expect(screen.getByText("Cena en Roma")).toBeInTheDocument();
		});
		expect(screen.queryByText("Cena en Florencia")).not.toBeInTheDocument();
	});

	it("ensures refreshed authoritative props win over prior local edit value upon rerender", async () => {
		const user = userEvent.setup();
		const onEditGift = vi.fn().mockResolvedValue({ id: "gift-1" });
		const initialGifts = [reserved, available];
		const { rerender } = render(
			<GiftReservations
				gifts={initialGifts}
				onCancelReservation={vi.fn()}
				onEditGift={onEditGift}
			/>,
		);

		await user.click(
			screen.getByRole("button", { name: /editar cena en florencia/i }),
		);
		await user.clear(screen.getByLabelText(/^título/i));
		await user.type(screen.getByLabelText(/^título/i), "Cena en Roma");
		await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

		await waitFor(() => {
			expect(onEditGift).toHaveBeenCalledTimes(1);
			expect(screen.getByText("Cena en Roma")).toBeInTheDocument();
		});
		expect(screen.queryByText("Cena en Florencia")).not.toBeInTheDocument();

		const refreshedGifts: AdminGift[] = [
			{
				...reserved,
				title: "Cena en Nápoles (Autoritativo)",
			},
			available,
		];
		rerender(
			<GiftReservations
				gifts={refreshedGifts}
				onCancelReservation={vi.fn()}
				onEditGift={onEditGift}
			/>,
		);

		expect(
			screen.getByText("Cena en Nápoles (Autoritativo)"),
		).toBeInTheDocument();
		expect(screen.queryByText("Cena en Roma")).not.toBeInTheDocument();
		expect(screen.queryByText("Cena en Florencia")).not.toBeInTheDocument();
	});
});
