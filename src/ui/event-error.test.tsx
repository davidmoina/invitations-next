import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AccessError } from "#/server/access-error";
import { EventAccessError, EventNotFound } from "./event-error";

describe("EventNotFound", () => {
	afterEach(() => {
		cleanup();
	});

	it("tells the visitor the invitation does not exist without leaking why", () => {
		render(<EventNotFound />);

		expect(
			screen.getByRole("heading", { level: 1, name: /no encontramos/i }),
		).toBeInTheDocument();
		expect(document.body.textContent).not.toMatch(/not_found|404|error/i);
	});
});

describe("EventAccessError", () => {
	afterEach(() => {
		cleanup();
	});

	it("asks an unidentified visitor to reopen their personal link", () => {
		render(<EventAccessError error={new AccessError("unauthorized")} />);

		expect(screen.getByText(/enlace personal/i)).toBeInTheDocument();
	});

	it("tells a visitor without permission that the invitation is not theirs", () => {
		render(<EventAccessError error={new AccessError("forbidden")} />);

		expect(screen.getByText(/no tienes acceso/i)).toBeInTheDocument();
	});

	// A genuine bug must never be dressed up as an access problem.
	it("falls back to a neutral failure for an unrecognized error", () => {
		render(<EventAccessError error={new Error("connection reset")} />);

		expect(screen.getByText(/algo ha ido mal/i)).toBeInTheDocument();
		expect(document.body.textContent).not.toContain("connection reset");
	});
});
