import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AdminEventListItem } from "#/server/contracts/admin";
import { MultiEventDashboard } from "./multi-event-dashboard";

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
		attendingCount: 5,
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

describe("MultiEventDashboard", () => {
	afterEach(cleanup);

	it("renders global metrics computed across all events", () => {
		render(
			<MultiEventDashboard
				events={sampleEvents}
				eventHref={(id) => `/admin/${id}`}
				newEventHref="/admin/new"
				eventsHref="/admin"
				onSignOut={vi.fn().mockResolvedValue(undefined)}
			/>,
		);

		expect(
			screen.getByRole("heading", {
				level: 1,
				name: /dashboard|resumen general/i,
			}),
		).toBeInTheDocument();

		// Total Guests: 150 + 20 + 50 = 220
		expect(screen.getByText("220")).toBeInTheDocument();
		// Total Confirmed: 95 + 5 + 45 = 145
		expect(screen.getByText(/145/)).toBeInTheDocument();

		// Active Events: 1 published, 1 draft, 1 archived
		expect(screen.getByText("Boda de Julián & Sarah")).toBeInTheDocument();
	});

	it("renders empty state when organizer has no events", () => {
		render(
			<MultiEventDashboard
				events={[]}
				eventHref={(id) => `/admin/${id}`}
				newEventHref="/admin/new"
				eventsHref="/admin"
				onSignOut={vi.fn().mockResolvedValue(undefined)}
			/>,
		);

		expect(screen.getAllByText("0").length).toBeGreaterThan(0);
		expect(
			screen.getByText(/todavía no tienes ningún evento/i),
		).toBeInTheDocument();
	});
});
