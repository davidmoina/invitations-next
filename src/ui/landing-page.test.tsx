import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { LandingPage } from "./landing-page";

describe("LandingPage", () => {
	afterEach(cleanup);

	it("renders the headline and description copy from Stitch spec", () => {
		render(<LandingPage signUpHref="/sign-up" signInHref="/sign-in" />);

		expect(
			screen.getByRole("heading", {
				level: 1,
				name: /invitaciones que celebran cada momento/i,
			}),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				/crea una experiencia digital inolvidable para bodas, cumpleaños, baby showers, galas y más/i,
			),
		).toBeInTheDocument();
	});

	it("renders navigation and hero CTAs with the injected hrefs", () => {
		render(<LandingPage signUpHref="/sign-up" signInHref="/sign-in" />);

		const signUpLinks = screen.getAllByRole("link", {
			name: /crear invitaci[oó]n|crear cuenta/i,
		});
		expect(signUpLinks.length).toBeGreaterThan(0);
		expect(signUpLinks[0]).toHaveAttribute("href", "/sign-up");

		const signInLinks = screen.getAllByRole("link", {
			name: /ir a mi cuenta|iniciar sesi[oó]n/i,
		});
		expect(signInLinks.length).toBeGreaterThan(0);
		expect(signInLinks[0]).toHaveAttribute("href", "/sign-in");
	});

	it("renders features bento grid covering editorial design, rsvp, and control", () => {
		render(<LandingPage signUpHref="/sign-up" signInHref="/sign-in" />);

		expect(
			screen.getByRole("heading", { level: 2, name: /cualquier evento/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { level: 3, name: /diseño editorial/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { level: 3, name: /rsvp inteligente/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { level: 3, name: /control total/i }),
		).toBeInTheDocument();
	});

	it("applies theme tokens for typography and background styling", () => {
		const { container } = render(
			<LandingPage signUpHref="/sign-up" signInHref="/sign-in" />,
		);

		const page = container.firstChild as HTMLElement;
		expect(page).toHaveClass("min-h-screen");

		const heading = screen.getByRole("heading", {
			level: 1,
			name: /invitaciones que celebran cada momento/i,
		});
		expect(heading).toHaveClass("font-serif", "text-primary");
	});
});
