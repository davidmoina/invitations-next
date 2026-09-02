import {
	cleanup,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AdminEventPageData } from "#/server/contracts/admin";
import { AdminEventShell } from "./admin-event-shell";

const data: AdminEventPageData = {
	event: {
		id: "event-1",
		slug: "boda-julian-y-sarah",
		title: "Boda de Julián & Sarah",
		eventType: "wedding",
		honoreeNames: ["Julián", "Sarah"],
		details: { type: "wedding" },
		startsAt: "2026-10-24T15:00:00.000Z",
		timezone: "UTC",
		venueName: "Villa La Pietra",
		venueAddress: null,
		venueMapUrl: null,
		description: null,
		maxCompanions: 2,
		giftRegistryEnabled: true,
		rsvpDeadline: null,
		status: "published",
		updatedAt: "2026-08-26T10:00:00.000Z",
	},
	summary: {
		guestCount: 2,
		attendingCount: 1,
		declinedCount: 0,
		pendingCount: 1,
		totalAttendees: 3,
		giftsReserved: 1,
		giftsAvailable: 0,
		messageCount: 1,
	},
	viewerRole: "owner",
	guests: [
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
	],
	gifts: [
		{
			id: "gift-1",
			title: "Cena en Florencia",
			description: null,
			imagePublicId: null,
			url: null,
			status: "reserved",
			reservedBy: { guestId: "guest-1", displayName: "Ana Ruiz" },
		},
	],
	memberships: [
		{
			userId: "user-1",
			displayName: "Julián García",
			email: "julian@example.com",
			role: "owner",
			addedAt: "2026-08-01T10:00:00.000Z",
			isCurrentUser: true,
		},
		{
			userId: "user-2",
			displayName: "Sarah Ruiz",
			email: "sarah@example.com",
			role: "editor",
			addedAt: "2026-08-02T10:00:00.000Z",
			isCurrentUser: false,
		},
	],
	messages: [
		{
			id: "message-1",
			guestId: "guest-1",
			guestDisplayName: "Ana Ruiz",
			body: "¡Enhorabuena a los dos!",
			createdAt: "2026-08-26T11:00:00.000Z",
		},
	],
	media: [],
};

const audit = [
	{
		id: 1,
		actor: { kind: "guest" as const, guestId: null, label: "Ana Ruiz" },
		action: "rsvp.submitted",
		entityType: "guest",
		entityId: "guest-1",
		summary: {},
		occurredAt: "2026-08-26T10:00:00.000Z",
	},
];

function renderShell(
	overrides: Partial<React.ComponentProps<typeof AdminEventShell>> = {},
) {
	const props = {
		data,
		audit,
		onUpdateEvent: vi.fn().mockResolvedValue(undefined),
		onInvite: vi.fn().mockResolvedValue(undefined),
		onRemove: vi.fn().mockResolvedValue(undefined),
		onTransfer: vi.fn().mockResolvedValue(undefined),
		onSignOut: vi.fn().mockResolvedValue(undefined),
		onCancelReservation: vi
			.fn()
			.mockResolvedValue({ ok: true, giftId: "gift-1" }),
		onCreateGift: vi.fn().mockResolvedValue({ id: "gift-2" }),
		onAddGuests: vi.fn().mockResolvedValue(undefined),
		onDeleteEvent: vi.fn().mockResolvedValue(undefined),
		onEditGift: vi.fn().mockResolvedValue({ id: "gift-1" }),
		onEditGuest: vi.fn().mockResolvedValue({ id: "guest-1" }),
		onRefresh: vi.fn().mockResolvedValue(undefined),
		...overrides,
	};
	render(<AdminEventShell {...props} />);
	return props;
}

describe("AdminEventShell", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders the event overview, breadcrumbs, and public invitation link", () => {
		renderShell();

		expect(
			screen.getByRole("heading", { level: 1, name: "Boda de Julián & Sarah" }),
		).toBeInTheDocument();
		expect(screen.getByText(/1 asistentes confirmados/)).toBeInTheDocument();

		const publicLink = screen.getByRole("link", {
			name: /ver invitación pública|ver invitación/i,
		});
		expect(publicLink).toBeInTheDocument();
		expect(publicLink).toHaveAttribute("href", "/e/boda-julian-y-sarah");

		expect(screen.getAllByText("Eventos").length).toBeGreaterThan(0);
	});

	it("renders KPI cards for total guests, rsvp breakdown, and registry", () => {
		renderShell();

		const metrics = within(
			screen.getByRole("region", { name: /métricas del evento/i }),
		);
		expect(metrics.getByText(/total invitados/i)).toBeInTheDocument();
		expect(metrics.getByText(/estado de rsvp/i)).toBeInTheDocument();
		expect(metrics.getByText(/mesa de regalos/i)).toBeInTheDocument();
	});

	it("calls the injected sign-out control", async () => {
		const user = userEvent.setup();
		const { onSignOut } = renderShell();

		await user.click(screen.getByRole("button", { name: /cerrar sesi[oó]n/i }));
		expect(onSignOut).toHaveBeenCalledOnce();
	});

	it("shows the guest list with each guest's answer", () => {
		renderShell();

		// Scoped to the guest list: the reserver's name also appears among the
		// gifts, and an unscoped query would match either one.
		const guests = within(screen.getByRole("region", { name: "Invitados" }));
		expect(guests.getByText("Ana Ruiz")).toBeInTheDocument();
		expect(guests.getByText(/Asistirá · 2 acompañantes/)).toBeInTheDocument();
		expect(guests.getByText("Marco Díaz")).toBeInTheDocument();
		expect(guests.getAllByText(/sin respuesta/i).length).toBeGreaterThan(0);
	});

	it("keeps deleted-guest history attributable through the audit label", () => {
		renderShell();

		expect(screen.getByText("Ana Ruiz — rsvp.submitted")).toBeInTheDocument();
	});

	it("shows the organizer-only dedications", () => {
		renderShell();

		expect(screen.getByText("¡Enhorabuena a los dos!")).toBeInTheDocument();
	});

	// The defect this closes: the shell declared five callbacks and consumed
	// none of them, so every admin action was wired to a control that did not
	// exist. One assertion per callback, each through its real control.
	it("reaches onUpdateEvent from the event form", async () => {
		const user = userEvent.setup();
		const props = renderShell();

		await user.click(screen.getByRole("button", { name: /guardar/i }));

		await waitFor(() => {
			expect(props.onUpdateEvent).toHaveBeenCalledTimes(1);
		});
	});

	it("reaches onInvite from the collaborator form", async () => {
		const user = userEvent.setup();
		const props = renderShell();

		await user.type(screen.getByLabelText(/correo/i), "nuevo@example.com");
		await user.click(screen.getByRole("button", { name: /invitar/i }));

		await waitFor(() => {
			expect(props.onInvite).toHaveBeenCalledWith("nuevo@example.com");
		});
	});

	it("reaches onRemove and onTransfer from the collaborator rows", async () => {
		const user = userEvent.setup();
		const props = renderShell();

		await user.click(screen.getByRole("button", { name: /quitar a Sarah/i }));
		await waitFor(() => {
			expect(props.onRemove).toHaveBeenCalledWith("user-2");
		});

		await user.click(
			screen.getByRole("button", { name: /transferir a Sarah/i }),
		);
		await user.click(screen.getByRole("button", { name: /confirmar/i }));
		await waitFor(() => {
			expect(props.onTransfer).toHaveBeenCalledWith("user-2");
		});
	});

	it("reaches onCancelReservation from the gift rows", async () => {
		const user = userEvent.setup();
		const props = renderShell();

		await user.click(
			screen.getByRole("button", { name: /cancelar reserva de Cena/i }),
		);

		await waitFor(() => {
			expect(props.onCancelReservation).toHaveBeenCalledWith("gift-1");
		});
	});

	it("withholds every owner-only control from an editor", () => {
		renderShell({ data: { ...data, viewerRole: "editor" } });

		expect(
			screen.queryByRole("button", { name: /invitar/i }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /quitar a Sarah/i }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /archivar evento/i }),
		).not.toBeInTheDocument();
		// An editor still edits the event and cancels reservations.
		expect(
			screen.getByRole("button", { name: /guardar/i }),
		).toBeInTheDocument();
	});

	it("reaches onDeleteEvent from the event settings danger zone", async () => {
		const user = userEvent.setup();
		const props = renderShell();

		await user.click(screen.getByRole("button", { name: /archivar evento/i }));
		await user.click(
			screen.getByRole("button", { name: /confirmar archivado/i }),
		);

		await waitFor(() => {
			expect(props.onDeleteEvent).toHaveBeenCalledTimes(1);
		});
	});

	it("reaches onEditGift from the gift rows", async () => {
		const user = userEvent.setup();
		const props = renderShell();
		const giftsRegion = within(
			screen.getByRole("region", { name: "Regalos reservados" }),
		);

		await user.click(
			giftsRegion.getByRole("button", { name: /editar cena en florencia/i }),
		);
		await user.click(
			giftsRegion.getByRole("button", { name: /guardar cambios/i }),
		);

		await waitFor(() => {
			expect(props.onEditGift).toHaveBeenCalledWith(
				expect.objectContaining({
					giftId: "gift-1",
					title: "Cena en Florencia",
				}),
			);
		});
	});

	it("reaches onEditGuest from the guest rows", async () => {
		const user = userEvent.setup();
		const props = renderShell();
		const guestsRegion = within(
			screen.getByRole("region", { name: "Invitados" }),
		);

		await user.click(
			guestsRegion.getByRole("button", { name: /editar ana ruiz/i }),
		);
		await user.click(
			guestsRegion.getByRole("button", { name: /guardar cambios/i }),
		);

		await waitFor(() => {
			expect(props.onEditGuest).toHaveBeenCalledWith(
				expect.objectContaining({
					guestId: "guest-1",
					displayName: "Ana Ruiz",
				}),
			);
		});
	});

	it("triggers onRefresh upon successful gift and guest edits", async () => {
		const user = userEvent.setup();
		const props = renderShell();
		const giftsRegion = within(
			screen.getByRole("region", { name: "Regalos reservados" }),
		);

		await user.click(
			giftsRegion.getByRole("button", { name: /editar cena en florencia/i }),
		);
		await user.click(
			giftsRegion.getByRole("button", { name: /guardar cambios/i }),
		);

		await waitFor(() => {
			expect(props.onRefresh).toHaveBeenCalledTimes(1);
		});

		const guestsRegion = within(
			screen.getByRole("region", { name: "Invitados" }),
		);

		await user.click(
			guestsRegion.getByRole("button", { name: /editar ana ruiz/i }),
		);
		await user.click(
			guestsRegion.getByRole("button", { name: /guardar cambios/i }),
		);

		await waitFor(() => {
			expect(props.onRefresh).toHaveBeenCalledTimes(2);
		});
	});
});
