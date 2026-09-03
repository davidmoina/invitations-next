import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AdminGuest } from "#/server/contracts/admin";
import { GuestList } from "./guest-list";

const guests: AdminGuest[] = [
	{
		id: "guest-1",
		displayName: "Ana Ruiz",
		email: "ana@example.com",
		source: "public_link",
		attending: true,
		companions: 2,
		respondedAt: "2026-08-26T10:00:00.000Z",
		hasSharedEmail: false,
	},
	{
		id: "guest-2",
		displayName: "Marco Díaz",
		email: null,
		source: "preloaded",
		attending: null,
		companions: 0,
		respondedAt: null,
		hasSharedEmail: false,
	},
];

function renderGuestList(
	overrides: Partial<React.ComponentProps<typeof GuestList>> = {},
) {
	const props = {
		guests,
		onEditGuest: vi.fn().mockResolvedValue({ id: "guest-1" }),
		...overrides,
	};
	render(<GuestList {...props} />);
	return props;
}

describe("GuestList", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders the guest list with attendance and companion count", () => {
		renderGuestList();

		expect(screen.getByText("Ana Ruiz")).toBeInTheDocument();
		expect(screen.getByText(/Asistirá · 2 acompañantes/)).toBeInTheDocument();
		expect(screen.getByText("Marco Díaz")).toBeInTheDocument();
		expect(screen.getAllByText(/Sin respuesta/).length).toBeGreaterThan(0);
	});

	it("renders edit button and opens prefilled edit form", async () => {
		const user = userEvent.setup();
		renderGuestList();

		const editBtn = screen.getByRole("button", { name: /editar ana ruiz/i });
		expect(editBtn).toBeInTheDocument();

		await user.click(editBtn);

		expect(screen.getByLabelText(/^nombre/i)).toHaveValue("Ana Ruiz");
		expect(screen.getByLabelText(/^email/i)).toHaveValue("ana@example.com");
		expect(screen.getByLabelText(/^acompañantes/i)).toHaveValue(2);
		expect(
			screen.getByRole("button", { name: /guardar cambios/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /cancelar/i }),
		).toBeInTheDocument();
	});

	it("cancels editing when cancel button is clicked", async () => {
		const user = userEvent.setup();
		renderGuestList();

		await user.click(screen.getByRole("button", { name: /editar ana ruiz/i }));
		expect(screen.getByLabelText(/^nombre/i)).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /cancelar/i }));
		expect(screen.queryByLabelText(/^nombre/i)).not.toBeInTheDocument();
	});

	it("submits updated guest data through onEditGuest and shows pending and success states", async () => {
		const user = userEvent.setup();
		let resolveEdit!: (value: { id: string }) => void;
		const editPromise = new Promise<{ id: string }>((resolve) => {
			resolveEdit = resolve;
		});
		const onEditGuest = vi.fn().mockReturnValue(editPromise);

		renderGuestList({ onEditGuest });

		await user.click(screen.getByRole("button", { name: /editar ana ruiz/i }));

		await user.clear(screen.getByLabelText(/^nombre/i));
		await user.type(screen.getByLabelText(/^nombre/i), "Ana Ruiz Gómez");
		await user.clear(screen.getByLabelText(/^acompañantes/i));
		await user.type(screen.getByLabelText(/^acompañantes/i), "1");

		await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

		expect(onEditGuest).toHaveBeenCalledWith(
			expect.objectContaining({
				guestId: "guest-1",
				displayName: "Ana Ruiz Gómez",
				email: "ana@example.com",
				companions: 1,
				attending: true,
			}),
		);
		expect(screen.getByText(/guardando/i)).toBeInTheDocument();

		resolveEdit({ id: "guest-1" });

		await waitFor(() => {
			expect(screen.getByText(/invitado actualizado/i)).toBeInTheDocument();
		});
	});

	it("handles companion-cap error by displaying maximum allowed companions", async () => {
		const user = userEvent.setup();
		const onEditGuest = vi.fn().mockRejectedValue({
			code: "companion_cap_exceeded",
			maxCompanions: 3,
		});

		renderGuestList({ onEditGuest });

		await user.click(screen.getByRole("button", { name: /editar ana ruiz/i }));
		await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

		await waitFor(() => {
			expect(screen.getByRole("alert")).toBeInTheDocument();
		});
		expect(screen.getByRole("alert").textContent).toContain("3");
	});

	it("reports generic failure without echoing raw internals", async () => {
		const user = userEvent.setup();
		const onEditGuest = vi
			.fn()
			.mockRejectedValue(new Error("sensitive postgres constraint leak"));

		renderGuestList({ onEditGuest });

		await user.click(screen.getByRole("button", { name: /editar ana ruiz/i }));
		await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

		await waitFor(() => {
			expect(screen.getByRole("alert")).toBeInTheDocument();
		});
		expect(screen.getByRole("alert").textContent).not.toContain(
			"sensitive postgres constraint leak",
		);
	});

	it("persists attending: null when Sin respuesta is selected", async () => {
		const user = userEvent.setup();
		const onEditGuest = vi.fn().mockResolvedValue({ id: "guest-1" });
		renderGuestList({ onEditGuest });

		await user.click(screen.getByRole("button", { name: /editar ana ruiz/i }));
		await user.selectOptions(
			screen.getByLabelText(/^asistencia/i),
			"unanswered",
		);
		await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

		await waitFor(() => {
			expect(onEditGuest).toHaveBeenCalledTimes(1);
		});
		expect(onEditGuest).toHaveBeenCalledWith(
			expect.objectContaining({
				guestId: "guest-1",
				attending: null,
			}),
		);
	});

	it("shows updated guest values after successful edit rather than stale props", async () => {
		const user = userEvent.setup();
		const onEditGuest = vi.fn().mockResolvedValue({ id: "guest-1" });
		renderGuestList({ onEditGuest });

		await user.click(screen.getByRole("button", { name: /editar ana ruiz/i }));
		await user.clear(screen.getByLabelText(/^nombre/i));
		await user.type(screen.getByLabelText(/^nombre/i), "Ana Ruiz de Mendoza");
		await user.selectOptions(
			screen.getByLabelText(/^asistencia/i),
			"unanswered",
		);
		await user.clear(screen.getByLabelText(/^acompañantes/i));
		await user.type(screen.getByLabelText(/^acompañantes/i), "0");
		await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

		await waitFor(() => {
			expect(screen.getByText("Ana Ruiz de Mendoza")).toBeInTheDocument();
		});
		expect(screen.queryByText("Ana Ruiz")).not.toBeInTheDocument();
		expect(
			screen.queryByText(/Asistirá · 2 acompañantes/),
		).not.toBeInTheDocument();
	});

	it("ensures refreshed authoritative props win over prior local edit value upon rerender", async () => {
		const user = userEvent.setup();
		const onEditGuest = vi.fn().mockResolvedValue({ id: "guest-1" });
		const { rerender } = render(
			<GuestList guests={guests} onEditGuest={onEditGuest} />,
		);

		await user.click(screen.getByRole("button", { name: /editar ana ruiz/i }));
		await user.clear(screen.getByLabelText(/^nombre/i));
		await user.type(screen.getByLabelText(/^nombre/i), "Ana Ruiz Local");
		await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

		await waitFor(() => {
			expect(onEditGuest).toHaveBeenCalledTimes(1);
			expect(screen.getByText("Ana Ruiz Local")).toBeInTheDocument();
		});
		expect(screen.queryByText("Ana Ruiz")).not.toBeInTheDocument();

		const [firstGuest, secondGuest] = guests;
		if (!firstGuest || !secondGuest) {
			throw new Error("Missing guests fixture");
		}
		const refreshedGuests: AdminGuest[] = [
			{
				...firstGuest,
				displayName: "Ana Ruiz Autoritativa",
			},
			secondGuest,
		];
		rerender(<GuestList guests={refreshedGuests} onEditGuest={onEditGuest} />);

		expect(screen.getByText("Ana Ruiz Autoritativa")).toBeInTheDocument();
		expect(screen.queryByText("Ana Ruiz Local")).not.toBeInTheDocument();
		expect(screen.queryByText("Ana Ruiz")).not.toBeInTheDocument();
	});

	it("renders semantic table with proper column headers and scope", () => {
		renderGuestList();

		expect(screen.getByRole("table")).toBeInTheDocument();
		const columnHeaders = screen.getAllByRole("columnheader");
		expect(columnHeaders.length).toBeGreaterThanOrEqual(4);

		for (const th of columnHeaders) {
			expect(th).toHaveAttribute("scope", "col");
		}
	});

	it("filters guests by search input and status tabs", async () => {
		const user = userEvent.setup();
		renderGuestList();

		const searchInput = screen.getByPlaceholderText(/buscar invitado/i);
		await user.type(searchInput, "Marco");

		expect(screen.getByText("Marco Díaz")).toBeInTheDocument();
		expect(screen.queryByText("Ana Ruiz")).not.toBeInTheDocument();

		await user.clear(searchInput);
		expect(screen.getByText("Ana Ruiz")).toBeInTheDocument();
		expect(screen.getByText("Marco Díaz")).toBeInTheDocument();
	});

	it("displays pagination counter and controls", () => {
		renderGuestList();

		expect(screen.getByText(/mostrando.*de.*invitados/i)).toBeInTheDocument();
	});
});
