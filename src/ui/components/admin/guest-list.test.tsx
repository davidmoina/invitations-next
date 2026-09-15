import { Toast, toast } from "@heroui/react";
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
	render(
		<>
			<Toast.Provider />
			<GuestList {...props} />
		</>,
	);
	return props;
}

async function selectOption(
	user: ReturnType<typeof userEvent.setup>,
	triggerName: RegExp | string,
	optionName: RegExp | string,
) {
	const trigger = screen.getByRole("button", { name: triggerName });
	await user.click(trigger);
	const option = await screen.findByRole("option", { name: optionName });
	await user.click(option);
}

describe("GuestList", () => {
	afterEach(() => {
		cleanup();
		toast.clear();
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
		await selectOption(user, /asistencia/i, /sin respuesta/i);
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
		await selectOption(user, /asistencia/i, /sin respuesta/i);
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

	it("calls onIssueGuestLink callback with guestId, copies URL to clipboard, and displays confirmation", async () => {
		const user = userEvent.setup();
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText },
			writable: true,
			configurable: true,
		});

		const onIssueGuestLink = vi
			.fn()
			.mockResolvedValue({ url: "https://example.com/magic/guest-1" });
		renderGuestList({ onIssueGuestLink });

		const [firstCopyButton] = screen.getAllByRole("button", {
			name: /copiar enlace/i,
		});
		if (!firstCopyButton) {
			throw new Error("Missing copy button");
		}
		await user.click(firstCopyButton);

		await waitFor(() => {
			expect(onIssueGuestLink).toHaveBeenCalledWith("guest-1");
		});
		expect(writeText).toHaveBeenCalledWith("https://example.com/magic/guest-1");

		// Toast appears with role alert/status outside the table cell
		const toast = await screen.findByRole("alert");
		expect(toast).toHaveTextContent(/enlace copiado al portapapeles/i);

		// The inline alert inside the table row is gone
		expect(
			firstCopyButton
				.closest("td")
				?.querySelector("[role='status'], [role='alert']"),
		).toBeNull();
	});

	it("renders a readable error state when onIssueGuestLink rejects", async () => {
		const user = userEvent.setup();
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText },
			writable: true,
			configurable: true,
		});

		const onIssueGuestLink = vi
			.fn()
			.mockRejectedValue(new Error("Token generation failed"));
		renderGuestList({ onIssueGuestLink });

		const [firstCopyButton] = screen.getAllByRole("button", {
			name: /copiar enlace/i,
		});
		if (!firstCopyButton) {
			throw new Error("Missing copy button");
		}
		await user.click(firstCopyButton);

		const alert = await screen.findByRole("alert");
		expect(alert).toBeInTheDocument();
		expect(alert).toHaveTextContent(/no hemos podido generar el enlace/i);
	});

	it("warns the organizer in the UI copy that generating a new link invalidates previous ones", () => {
		renderGuestList();

		expect(screen.getByText(/invalida.*enlace anterior/i)).toBeInTheDocument();
	});

	it("displays guest phone alongside email when present", () => {
		const [firstGuest, secondGuest] = guests;
		if (!firstGuest || !secondGuest) {
			throw new Error("Missing fixtures");
		}
		const guestsWithPhone: AdminGuest[] = [
			{ ...firstGuest, phone: "+34 600 123 456" },
			{ ...secondGuest, phone: "+34 611 222 333" },
		];

		renderGuestList({ guests: guestsWithPhone });

		expect(screen.getByText(/\+34 600 123 456/)).toBeInTheDocument();
		expect(screen.getByText(/\+34 611 222 333/)).toBeInTheDocument();
	});

	it("opens the modal and adds a guest via onAddGuests", async () => {
		const user = userEvent.setup();
		const onAddGuests = vi.fn().mockResolvedValue(undefined);
		const onRefresh = vi.fn().mockResolvedValue(undefined);

		renderGuestList({ onAddGuests, onRefresh });

		const openButton = screen.getByRole("button", {
			name: /añadir invitado/i,
		});
		expect(openButton).toBeInTheDocument();

		await user.click(openButton);

		// Modal dialog is open
		expect(screen.getByRole("dialog")).toBeInTheDocument();

		await user.type(screen.getByLabelText(/nombre/i), "Elena Morales");
		await user.type(screen.getByLabelText(/email/i), "elena@example.com");

		// Click inside the modal to submit
		const submitButtons = screen.getAllByRole("button", {
			name: /^añadir invitado$/i,
		});
		// The submit button inside the modal form
		const submitBtn = submitButtons[submitButtons.length - 1];
		if (!submitBtn) throw new Error("Submit button not found");
		await user.click(submitBtn);

		await waitFor(() => expect(onAddGuests).toHaveBeenCalledOnce());
		expect(onAddGuests).toHaveBeenCalledWith([
			{
				displayName: "Elena Morales",
				email: "elena@example.com",
				phone: null,
			},
		]);
		expect(onRefresh).toHaveBeenCalledOnce();

		// Modal should close after successful single addition
		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
	});

	it("keeps the modal open, clears the fields and confirms when adding another", async () => {
		const user = userEvent.setup();
		const onAddGuests = vi.fn().mockResolvedValue(undefined);
		const onRefresh = vi.fn().mockResolvedValue(undefined);

		renderGuestList({ onAddGuests, onRefresh });

		await user.click(screen.getByRole("button", { name: /añadir invitado/i }));
		expect(screen.getByRole("dialog")).toBeInTheDocument();

		await user.type(screen.getByLabelText(/nombre/i), "Elena Morales");
		await user.click(
			screen.getByRole("button", { name: /guardar y añadir otro/i }),
		);

		await waitFor(() => expect(onAddGuests).toHaveBeenCalledOnce());

		expect(screen.getByRole("dialog")).toBeInTheDocument();
		expect(screen.getByLabelText(/nombre/i)).toHaveValue("");
		expect(
			screen.getByText(/«Elena Morales» añadido con éxito/i),
		).toBeInTheDocument();
	});

	it("renders WhatsApp button only for guests with phone", () => {
		const [firstGuest, secondGuest] = guests;
		if (!firstGuest || !secondGuest) throw new Error("Missing fixtures");

		const guestsList: AdminGuest[] = [
			{ ...firstGuest, phone: "+34 600 123 456" },
			{ ...secondGuest, phone: null },
		];

		renderGuestList({ guests: guestsList });

		const waButtons = screen.getAllByRole("button", { name: /whatsapp/i });
		expect(waButtons).toHaveLength(1);
	});

	it("synchronously opens a popup, issues link, and navigates popup to wa.me url on WhatsApp button press", async () => {
		const user = userEvent.setup();
		const mockPopup = { location: { href: "" }, close: vi.fn() };
		const openSpy = vi
			.spyOn(window, "open")
			.mockReturnValue(mockPopup as unknown as Window);

		const [firstGuest] = guests;
		if (!firstGuest) throw new Error("Missing fixture");
		const guestWithPhone: AdminGuest = {
			...firstGuest,
			displayName: "Ana Ruiz",
			phone: "+34 600 123 456",
		};

		const onIssueGuestLink = vi
			.fn()
			.mockResolvedValue({ url: "https://example.com/magic/guest-1" });

		const messageContext = {
			title: "Boda de Julián & Sarah",
			startsAt: "2026-10-24T15:00:00.000Z",
			timezone: "Europe/Madrid",
			venueName: "Villa La Pietra",
			whatsappMessageTemplate: null,
		};

		renderGuestList({
			guests: [guestWithPhone],
			onIssueGuestLink,
			messageContext,
		});

		const waButton = screen.getByRole("button", { name: /whatsapp/i });
		await user.click(waButton);

		expect(openSpy).toHaveBeenCalledWith("", "_blank", "noopener,noreferrer");
		await waitFor(() => {
			expect(onIssueGuestLink).toHaveBeenCalledWith("guest-1");
		});

		await waitFor(() => {
			expect(mockPopup.location.href).toContain("https://wa.me/34600123456");
		});
		expect(mockPopup.location.href).toContain(
			encodeURIComponent("https://example.com/magic/guest-1"),
		);
		expect(mockPopup.location.href).toContain(encodeURIComponent("Ana Ruiz"));
		openSpy.mockRestore();
	});

	it("shows a toast when window.open returns null (popup blocked)", async () => {
		const user = userEvent.setup();
		const openSpy = vi.spyOn(window, "open").mockReturnValue(null);

		const [firstGuest] = guests;
		if (!firstGuest) throw new Error("Missing fixture");
		const guestWithPhone: AdminGuest = {
			...firstGuest,
			phone: "+34 600 123 456",
		};

		const onIssueGuestLink = vi
			.fn()
			.mockResolvedValue({ url: "https://example.com/magic/guest-1" });

		renderGuestList({
			guests: [guestWithPhone],
			onIssueGuestLink,
		});

		const waButton = screen.getByRole("button", { name: /whatsapp/i });
		await user.click(waButton);

		const toastEl = await screen.findByRole("alert");
		expect(toastEl).toBeInTheDocument();
		expect(toastEl.textContent).toMatch(/bloque|whatsapp/i);
		openSpy.mockRestore();
	});

	it("shows a toast when wa.me url cannot be built or issuing link rejects", async () => {
		const user = userEvent.setup();
		const mockPopup = { location: { href: "" }, close: vi.fn() };
		const openSpy = vi
			.spyOn(window, "open")
			.mockReturnValue(mockPopup as unknown as Window);

		const [firstGuest] = guests;
		if (!firstGuest) throw new Error("Missing fixture");
		const guestWithPhone: AdminGuest = {
			...firstGuest,
			phone: "123", // invalid phone for whatsapp url
		};

		const onIssueGuestLink = vi
			.fn()
			.mockResolvedValue({ url: "https://example.com/magic/guest-1" });

		renderGuestList({
			guests: [guestWithPhone],
			onIssueGuestLink,
		});

		const waButton = screen.getByRole("button", { name: /whatsapp/i });
		await user.click(waButton);

		const toastEl = await screen.findByRole("alert");
		expect(toastEl).toBeInTheDocument();
		expect(mockPopup.close).toHaveBeenCalled();
		openSpy.mockRestore();
	});
});
