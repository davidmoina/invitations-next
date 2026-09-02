import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminShell } from "./admin-shell";

describe("AdminShell", () => {
	afterEach(cleanup);

	it("renders sidebar with navigation links and marks the active section", () => {
		render(
			<AdminShell
				currentSection="events"
				eventsHref="/admin"
				newEventHref="/admin/new"
				dashboardHref="/admin/dashboard"
			>
				<div>Event List Content</div>
			</AdminShell>,
		);

		const nav = screen.getByRole("navigation", {
			name: /navegaci[oó]n del panel/i,
		});
		expect(nav).toBeInTheDocument();

		const eventsLink = screen.getByRole("link", { name: /eventos/i });
		expect(eventsLink).toHaveAttribute("href", "/admin");
		expect(eventsLink).toHaveAttribute("aria-current", "page");

		const dashboardLink = screen.getByRole("link", {
			name: /dashboard|panel/i,
		});
		expect(dashboardLink).toHaveAttribute("href", "/admin/dashboard");
		expect(dashboardLink).not.toHaveAttribute("aria-current");

		const createLink = screen.getByRole("link", { name: /crear evento/i });
		expect(createLink).toHaveAttribute("href", "/admin/new");

		expect(screen.getByText("Event List Content")).toBeInTheDocument();
	});

	it("renders inert items as disabled or inert links when no target route is provided", () => {
		render(
			<AdminShell currentSection="events" eventsHref="/admin">
				<div>Content</div>
			</AdminShell>,
		);

		const settingsItem = screen.getByText(/configuraci[oó]n/i);
		expect(settingsItem).toBeInTheDocument();
	});

	it("handles sign out from the sidebar footer", async () => {
		const user = userEvent.setup();
		const onSignOut = vi.fn().mockResolvedValue(undefined);

		render(
			<AdminShell currentSection="events" onSignOut={onSignOut}>
				<div>Content</div>
			</AdminShell>,
		);

		const signOutBtn = screen.getByRole("button", {
			name: /cerrar sesi[oó]n/i,
		});
		expect(signOutBtn).toBeInTheDocument();

		await user.click(signOutBtn);
		expect(onSignOut).toHaveBeenCalledOnce();
	});
});
