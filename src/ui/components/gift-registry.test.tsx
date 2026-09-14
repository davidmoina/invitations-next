import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PublicGift, ReserveGiftResult } from "#/server/contracts/public";
import { GiftRegistry } from "./gift-registry";

describe("GiftRegistry", () => {
	afterEach(() => {
		cleanup();
	});

	const mockGifts: PublicGift[] = [
		{
			id: "gift-1",
			title: "Vajilla de porcelana",
			description: "Juego de 6 platos",
			imagePublicId: null,
			url: "https://example.com/vajilla",
			status: "available",
			reservedByMe: false,
		},
		{
			id: "gift-2",
			title: "Cafetera espresso",
			description: "Para los desayunos",
			imagePublicId: null,
			url: null,
			status: "reserved",
			reservedByMe: true,
		},
		{
			id: "gift-3",
			title: "Juego de sábanas",
			description: "Algodón egipcio",
			imagePublicId: null,
			url: null,
			status: "reserved",
			reservedByMe: false,
		},
	];

	it("renders nothing if giftRegistryEnabled is false", () => {
		const onReserveGift = vi.fn();
		const onCancelReservation = vi.fn();

		const { container } = render(
			<GiftRegistry
				giftRegistryEnabled={false}
				gifts={mockGifts}
				onReserveGift={onReserveGift}
				onCancelReservation={onCancelReservation}
			/>,
		);

		expect(container.firstChild).toBeNull();
	});

	it("renders gift cards with appropriate status and actions", async () => {
		const user = userEvent.setup();
		const onReserveGift = vi.fn().mockResolvedValue({
			ok: true,
			giftId: "gift-1",
		} satisfies ReserveGiftResult);
		const onCancelReservation = vi.fn().mockResolvedValue({
			ok: true,
			giftId: "gift-2",
		} satisfies ReserveGiftResult);

		render(
			<GiftRegistry
				giftRegistryEnabled={true}
				gifts={mockGifts}
				onReserveGift={onReserveGift}
				onCancelReservation={onCancelReservation}
			/>,
		);

		// Titles
		expect(screen.getByText("Vajilla de porcelana")).toBeInTheDocument();
		expect(screen.getByText("Cafetera espresso")).toBeInTheDocument();
		expect(screen.getByText("Juego de sábanas")).toBeInTheDocument();

		// Available gift action
		const reserveBtn = screen.getByRole("button", {
			name: /reservar regalo: vajilla de porcelana/i,
		});
		expect(reserveBtn).toBeEnabled();
		await user.click(reserveBtn);

		await waitFor(() => {
			expect(onReserveGift).toHaveBeenCalledWith({ giftId: "gift-1" });
		});

		// Reserved by me action
		const cancelBtn = screen.getByRole("button", {
			name: /cancelar reserva: cafetera espresso/i,
		});
		expect(cancelBtn).toBeEnabled();
		await user.click(cancelBtn);

		await waitFor(() => {
			expect(onCancelReservation).toHaveBeenCalledWith({ giftId: "gift-2" });
		});

		// Reserved by another guest (disabled)
		expect(screen.getByText("Reservado por otro invitado")).toBeInTheDocument();
	});

	it("displays error when reservation fails because gift is already reserved", async () => {
		const user = userEvent.setup();
		const onReserveGift = vi.fn().mockResolvedValue({
			ok: false,
			error: { code: "gift_already_reserved" },
		} satisfies ReserveGiftResult);
		const onCancelReservation = vi.fn();

		render(
			<GiftRegistry
				giftRegistryEnabled={true}
				gifts={mockGifts}
				onReserveGift={onReserveGift}
				onCancelReservation={onCancelReservation}
			/>,
		);

		const reserveBtn = screen.getByRole("button", {
			name: /reservar regalo: vajilla de porcelana/i,
		});
		await user.click(reserveBtn);

		await waitFor(() => {
			expect(
				screen.getByText(/este regalo ya ha sido reservado por otro invitado/i),
			).toBeInTheDocument();
		});
	});

	it("updates the card to reserved-by-me after a successful reservation, without reload", async () => {
		const user = userEvent.setup();
		const onReserveGift = vi.fn().mockResolvedValue({
			ok: true,
			giftId: "gift-1",
		} satisfies ReserveGiftResult);

		render(
			<GiftRegistry
				giftRegistryEnabled={true}
				gifts={mockGifts}
				onReserveGift={onReserveGift}
				onCancelReservation={vi.fn()}
			/>,
		);

		await user.click(
			screen.getByRole("button", {
				name: /reservar regalo: vajilla de porcelana/i,
			}),
		);

		await waitFor(() => {
			expect(
				screen.getByRole("button", {
					name: /cancelar reserva: vajilla de porcelana/i,
				}),
			).toBeInTheDocument();
		});
		expect(
			screen.queryByRole("button", {
				name: /reservar regalo: vajilla de porcelana/i,
			}),
		).not.toBeInTheDocument();
	});

	it("updates the card to available after a successful cancellation, without reload", async () => {
		const user = userEvent.setup();
		const onCancelReservation = vi.fn().mockResolvedValue({
			ok: true,
			giftId: "gift-2",
		} satisfies ReserveGiftResult);

		render(
			<GiftRegistry
				giftRegistryEnabled={true}
				gifts={mockGifts}
				onReserveGift={vi.fn()}
				onCancelReservation={onCancelReservation}
			/>,
		);

		await user.click(
			screen.getByRole("button", {
				name: /cancelar reserva: cafetera espresso/i,
			}),
		);

		await waitFor(() => {
			expect(
				screen.getByRole("button", {
					name: /reservar regalo: cafetera espresso/i,
				}),
			).toBeInTheDocument();
		});
	});

	it("leaves the card unchanged when the reservation fails", async () => {
		const user = userEvent.setup();
		const onReserveGift = vi.fn().mockResolvedValue({
			ok: false,
			error: { code: "gift_already_reserved" },
		} satisfies ReserveGiftResult);

		render(
			<GiftRegistry
				giftRegistryEnabled={true}
				gifts={mockGifts}
				onReserveGift={onReserveGift}
				onCancelReservation={vi.fn()}
			/>,
		);

		await user.click(
			screen.getByRole("button", {
				name: /reservar regalo: vajilla de porcelana/i,
			}),
		);

		await waitFor(() => {
			expect(
				screen.getByText(/ya ha sido reservado por otro invitado/i),
			).toBeInTheDocument();
		});
		expect(
			screen.getByRole("button", {
				name: /reservar regalo: vajilla de porcelana/i,
			}),
		).toBeInTheDocument();
	});

	it("disables reserve actions once the guest holds the maximum reservations", () => {
		const atCapGifts: PublicGift[] = [
			{
				id: "held-1",
				title: "Cuna",
				description: null,
				imagePublicId: null,
				url: null,
				status: "reserved",
				reservedByMe: true,
			},
			{
				id: "held-2",
				title: "Cochecito",
				description: null,
				imagePublicId: null,
				url: null,
				status: "reserved",
				reservedByMe: true,
			},
			{
				id: "free-1",
				title: "Trona",
				description: null,
				imagePublicId: null,
				url: null,
				status: "available",
				reservedByMe: false,
			},
		];

		render(
			<GiftRegistry
				giftRegistryEnabled={true}
				gifts={atCapGifts}
				onReserveGift={vi.fn()}
				onCancelReservation={vi.fn()}
			/>,
		);

		expect(
			screen.getByText(/has reservado el máximo de 2 regalos/i),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /reservar regalo: trona/i }),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /máximo 2 regalos/i }),
		).toBeDisabled();
	});

	it("locks the remaining reserve actions after the guest reserves a second gift", async () => {
		const user = userEvent.setup();
		const onReserveGift = vi.fn().mockResolvedValue({
			ok: true,
			giftId: "free-a",
		} satisfies ReserveGiftResult);
		const gifts: PublicGift[] = [
			{
				id: "held",
				title: "Cuna",
				description: null,
				imagePublicId: null,
				url: null,
				status: "reserved",
				reservedByMe: true,
			},
			{
				id: "free-a",
				title: "Trona",
				description: null,
				imagePublicId: null,
				url: null,
				status: "available",
				reservedByMe: false,
			},
			{
				id: "free-b",
				title: "Mochila",
				description: null,
				imagePublicId: null,
				url: null,
				status: "available",
				reservedByMe: false,
			},
		];

		render(
			<GiftRegistry
				giftRegistryEnabled={true}
				gifts={gifts}
				onReserveGift={onReserveGift}
				onCancelReservation={vi.fn()}
			/>,
		);

		expect(
			screen.getByRole("button", { name: /reservar regalo: mochila/i }),
		).toBeEnabled();

		await user.click(
			screen.getByRole("button", { name: /reservar regalo: trona/i }),
		);

		await waitFor(() => {
			expect(
				screen.queryByRole("button", { name: /reservar regalo: mochila/i }),
			).not.toBeInTheDocument();
		});
		expect(
			screen.getByRole("button", { name: /máximo 2 regalos/i }),
		).toBeDisabled();
	});

	it("surfaces the server limit error on the affected gift", async () => {
		const user = userEvent.setup();
		const onReserveGift = vi.fn().mockResolvedValue({
			ok: false,
			error: { code: "gift_limit_reached", limit: 2 },
		} satisfies ReserveGiftResult);

		render(
			<GiftRegistry
				giftRegistryEnabled={true}
				gifts={mockGifts}
				onReserveGift={onReserveGift}
				onCancelReservation={vi.fn()}
			/>,
		);

		await user.click(
			screen.getByRole("button", {
				name: /reservar regalo: vajilla de porcelana/i,
			}),
		);

		await waitFor(() => {
			expect(
				screen.getByText(/solo puedes reservar 2 regalos/i),
			).toBeInTheDocument();
		});
	});

	it("guarantees no reserver identity field is rendered", () => {
		const onReserveGift = vi.fn();
		const onCancelReservation = vi.fn();

		render(
			<GiftRegistry
				giftRegistryEnabled={true}
				gifts={mockGifts}
				onReserveGift={onReserveGift}
				onCancelReservation={onCancelReservation}
			/>,
		);

		// Assert text doesn't contain any reserver property or name
		expect(screen.queryByText(/reservado por:/i)).not.toBeInTheDocument();
	});

	/** This section renders inside the guest canvas, which `design.md` caps at
	 *  `container-max-guest: 720px`. A third column would divide that width into
	 *  ~213px cards; the Stitch registry screen sizes its cards at ~320px by
	 *  putting the same grid in a 1024px container. Two columns inside 720px is
	 *  what reproduces the intended card size here. */
	it("caps the gift grid at two columns to fit the 720px guest canvas", () => {
		const { container } = render(
			<GiftRegistry
				giftRegistryEnabled={true}
				gifts={mockGifts}
				onReserveGift={vi.fn()}
				onCancelReservation={vi.fn()}
			/>,
		);

		const grid = container.querySelector(".grid");
		expect(grid).toBeInTheDocument();
		expect(grid).toHaveClass("grid-cols-1", "sm:grid-cols-2");
		expect(grid?.className).not.toMatch(/grid-cols-3/);
	});

	it("does not declare a section width the guest canvas cannot honour", () => {
		const { container } = render(
			<GiftRegistry
				giftRegistryEnabled={true}
				gifts={mockGifts}
				onReserveGift={vi.fn()}
				onCancelReservation={vi.fn()}
			/>,
		);

		// `max-w-5xl` (1024px) was dead: the parent canvas clips it to 720px.
		// A width class here must not promise more than the canvas can give.
		const section = container.querySelector("section#registry");
		expect(section).toBeInTheDocument();
		expect(section?.className).not.toMatch(/max-w-(5xl|4xl|6xl|7xl)/);
	});
});
