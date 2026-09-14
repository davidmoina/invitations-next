import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppHeader } from "./app-header";

describe("AppHeader", () => {
	afterEach(cleanup);

	it("renders title, subtitle, and home link", () => {
		render(
			<AppHeader
				title="Panel de administración"
				subtitle="Tus celebraciones organizadas"
				homeHref="/"
			/>,
		);

		expect(
			screen.getByRole("heading", {
				level: 1,
				name: "Panel de administración",
			}),
		).toBeInTheDocument();
		expect(
			screen.getByText("Tus celebraciones organizadas"),
		).toBeInTheDocument();

		const homeLink = screen.getByRole("link", { name: /inicio/i });
		expect(homeLink).toHaveAttribute("href", "/");
	});

	it("renders without subtitle when omitted", () => {
		render(<AppHeader title="Mi Evento" homeHref="/admin" />);

		expect(
			screen.getByRole("heading", { level: 1, name: "Mi Evento" }),
		).toBeInTheDocument();
	});

	it("renders and handles sign-out when onSignOut is provided", async () => {
		const user = userEvent.setup();
		const onSignOut = vi.fn().mockResolvedValue(undefined);

		render(
			<AppHeader
				title="Panel de administración"
				homeHref="/"
				onSignOut={onSignOut}
			/>,
		);

		const signOutButton = screen.getByRole("button", {
			name: /cerrar sesi[oó]n/i,
		});
		expect(signOutButton).toBeInTheDocument();
		expect(signOutButton).toHaveClass("rounded-lg", "border");

		await user.click(signOutButton);
		expect(onSignOut).toHaveBeenCalledOnce();
	});

	it("does not render a sign-out button when onSignOut is absent", () => {
		render(<AppHeader title="Panel de administración" homeHref="/" />);

		expect(
			screen.queryByRole("button", { name: /cerrar sesi[oó]n/i }),
		).not.toBeInTheDocument();
	});

	it("applies the established typography and color styling", () => {
		render(
			<AppHeader
				title="Mi Boda"
				subtitle="10 asistentes confirmados"
				homeHref="/admin"
			/>,
		);

		const heading = screen.getByRole("heading", { level: 1, name: "Mi Boda" });
		expect(heading).toHaveClass("font-serif", "text-primary");
	});

	it("renders custom actions slot alongside the sign-out control", () => {
		render(
			<AppHeader
				title="Panel de administración"
				homeHref="/"
				onSignOut={vi.fn()}
				actions={<button type="button">Crear evento</button>}
			/>,
		);

		expect(
			screen.getByRole("button", { name: "Crear evento" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /cerrar sesi[oó]n/i }),
		).toBeInTheDocument();
	});
});
