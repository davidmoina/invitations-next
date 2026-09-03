import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AdminEventListItem } from "#/server/contracts/admin";
import { EventList } from "./event-list";

const sampleEvents: AdminEventListItem[] = [
	{
		id: "event-1",
		slug: "boda-julian-y-sarah",
		title: "Boda de Julián & Sarah",
		startsAt: "2026-10-24T15:00:00.000Z",
		status: "published",
		role: "owner",
		guestCount: 150,
		attendingCount: 95,
	},
	{
		id: "event-2",
		slug: "cumpleanos-marco",
		title: "Cumpleaños de Marco",
		startsAt: "2026-11-15T18:00:00.000Z",
		status: "draft",
		role: "editor",
		guestCount: 20,
		attendingCount: 0,
	},
	{
		id: "event-3",
		slug: "aniversario-2025",
		title: "Aniversario de Plata",
		startsAt: "2023-06-10T12:00:00.000Z",
		status: "archived",
		role: "owner",
		guestCount: 50,
		attendingCount: 45,
	},
];

/** Frozen reference instant. Every date-sensitive assertion below is stated
 *  relative to this value, so the suite cannot start failing merely because
 *  the wall clock moved past a fixture date. */
const REFERENCE_NOW = "2026-09-01T00:00:00.000Z";

describe("EventList", () => {
	afterEach(cleanup);

	it("renders empty state with CTA to new event when list is empty", () => {
		render(
			<EventList
				events={[]}
				eventHref={(id) => `/admin/${id}`}
				newEventHref="/admin/new"
				homeHref="/admin"
				onSignOut={vi.fn().mockResolvedValue(undefined)}
			/>,
		);

		expect(
			screen.getByRole("heading", {
				level: 1,
				name: /mis eventos|eventos/i,
			}),
		).toBeInTheDocument();
		expect(
			screen.getByText(/todavía no tienes ningún evento creado/i),
		).toBeInTheDocument();

		const createLinks = screen.getAllByRole("link", {
			name: /crear.*evento/i,
		});
		expect(createLinks.length).toBeGreaterThan(0);
		expect(createLinks[0]).toHaveAttribute("href", "/admin/new");
	});

	it("renders cards linking to the corresponding event route", () => {
		render(
			<EventList
				events={sampleEvents}
				eventHref={(id) => `/admin/${id}`}
				newEventHref="/admin/new"
				homeHref="/admin"
				onSignOut={vi.fn().mockResolvedValue(undefined)}
			/>,
		);

		const weddingLinks = screen.getAllByRole("link", {
			name: /boda de julián & sarah/i,
		});
		expect(weddingLinks.length).toBeGreaterThan(0);
		expect(weddingLinks[0]).toHaveAttribute("href", "/admin/event-1");

		const birthdayLinks = screen.getAllByRole("link", {
			name: /cumpleaños de marco/i,
		});
		expect(birthdayLinks.length).toBeGreaterThan(0);
		expect(birthdayLinks[0]).toHaveAttribute("href", "/admin/event-2");

		const anniversaryLinks = screen.getAllByRole("link", {
			name: /aniversario de plata/i,
		});
		expect(anniversaryLinks.length).toBeGreaterThan(0);
		expect(anniversaryLinks[0]).toHaveAttribute("href", "/admin/event-3");
	});

	it("covers status variants: published, draft, archived with theme tokens", () => {
		render(
			<EventList
				events={sampleEvents}
				eventHref={(id) => `/admin/${id}`}
				newEventHref="/admin/new"
				homeHref="/admin"
				onSignOut={vi.fn().mockResolvedValue(undefined)}
			/>,
		);

		const publishedBadge = screen.getByText("Publicado");
		expect(publishedBadge).toHaveClass("bg-success-bg", "text-success-green");

		const draftBadge = screen.getByText("Borrador");
		expect(draftBadge).toHaveClass("bg-warning-bg", "text-warning-amber");

		const archivedBadge = screen.getByText("Archivado");
		expect(archivedBadge).toHaveClass("bg-stone-200", "text-secondary");
	});

	it("covers role variants: owner and editor", () => {
		render(
			<EventList
				events={sampleEvents}
				eventHref={(id) => `/admin/${id}`}
				newEventHref="/admin/new"
				homeHref="/admin"
				onSignOut={vi.fn().mockResolvedValue(undefined)}
			/>,
		);

		const ownerBadges = screen.getAllByText("Propietario");
		expect(ownerBadges.length).toBe(2);

		const editorBadges = screen.getAllByText("Editor");
		expect(editorBadges.length).toBe(1);
	});

	it("displays attendee and guest counts including zero attending count", () => {
		render(
			<EventList
				events={sampleEvents}
				eventHref={(id) => `/admin/${id}`}
				newEventHref="/admin/new"
				homeHref="/admin"
				onSignOut={vi.fn().mockResolvedValue(undefined)}
			/>,
		);

		expect(screen.getByText("95 / 150")).toBeInTheDocument();
		expect(screen.getByText("0 / 20")).toBeInTheDocument();
	});

	it("filters events using the filter tabs: Todos, Próximos, Pasados", async () => {
		const user = userEvent.setup();

		render(
			<EventList
				events={sampleEvents}
				eventHref={(id) => `/admin/${id}`}
				newEventHref="/admin/new"
				homeHref="/admin"
				onSignOut={vi.fn().mockResolvedValue(undefined)}
				now={REFERENCE_NOW}
			/>,
		);

		const allTab = screen.getByRole("button", { name: /^todos/i });
		const upcomingTab = screen.getByRole("button", { name: /próximos/i });
		const pastTab = screen.getByRole("button", { name: /pasados/i });

		expect(allTab).toBeInTheDocument();
		expect(upcomingTab).toBeInTheDocument();
		expect(pastTab).toBeInTheDocument();

		// Switch to Pasados -> only Aniversario de Plata (archived or past)
		await user.click(pastTab);
		expect(screen.getByText("Aniversario de Plata")).toBeInTheDocument();
		expect(
			screen.queryByText("Boda de Julián & Sarah"),
		).not.toBeInTheDocument();

		// Switch to Próximos -> only upcoming / non-archived events
		await user.click(upcomingTab);
		expect(screen.getByText("Boda de Julián & Sarah")).toBeInTheDocument();
		expect(screen.getByText("Cumpleaños de Marco")).toBeInTheDocument();
		expect(screen.queryByText("Aniversario de Plata")).not.toBeInTheDocument();
	});

	it("classifies events against the injected reference time, not the wall clock", async () => {
		const user = userEvent.setup();

		// A reference instant AFTER every fixture date. Both future-dated events
		// must now read as past, which is only possible if the component honours
		// the injected value instead of calling `new Date()` itself.
		render(
			<EventList
				events={sampleEvents}
				eventHref={(id) => `/admin/${id}`}
				newEventHref="/admin/new"
				homeHref="/admin"
				onSignOut={vi.fn().mockResolvedValue(undefined)}
				now="2027-01-01T00:00:00.000Z"
			/>,
		);

		await user.click(screen.getByRole("button", { name: /próximos/i }));
		expect(
			screen.queryByText("Boda de Julián & Sarah"),
		).not.toBeInTheDocument();
		expect(screen.queryByText("Cumpleaños de Marco")).not.toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /pasados/i }));
		expect(screen.getByText("Boda de Julián & Sarah")).toBeInTheDocument();
		expect(screen.getByText("Cumpleaños de Marco")).toBeInTheDocument();
	});

	it("renders sidebar with sign-out and calls onSignOut on click", async () => {
		const user = userEvent.setup();
		const onSignOut = vi.fn().mockResolvedValue(undefined);

		render(
			<EventList
				events={sampleEvents}
				eventHref={(id) => `/admin/${id}`}
				newEventHref="/admin/new"
				homeHref="/admin"
				onSignOut={onSignOut}
			/>,
		);

		const signOutButtons = screen.getAllByRole("button", {
			name: /cerrar sesi[oó]n/i,
		});
		expect(signOutButtons.length).toBeGreaterThan(0);
		await user.click(signOutButtons[0]);
		expect(onSignOut).toHaveBeenCalledOnce();
	});
});
