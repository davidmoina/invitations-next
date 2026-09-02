import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { PublicEventDetails } from "#/server/contracts/public";
import { EventTypeDetails } from "./event-type-details";

describe("EventTypeDetails", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders baby shower details with due date", () => {
		const details: PublicEventDetails = {
			type: "baby_shower",
			dueDate: "2030-08-15",
		};
		render(<EventTypeDetails details={details} />);

		expect(screen.getByText(/fecha prevista/i)).toBeInTheDocument();
		expect(screen.getByText(/15 de agosto de 2030/i)).toBeInTheDocument();
	});

	it("renders nothing for birthday", () => {
		const details: PublicEventDetails = {
			type: "birthday",
		};
		const { container } = render(<EventTypeDetails details={details} />);
		expect(container).toBeEmptyDOMElement();
	});

	it("renders nothing for other", () => {
		const details: PublicEventDetails = {
			type: "other",
		};
		const { container } = render(<EventTypeDetails details={details} />);
		expect(container).toBeEmptyDOMElement();
	});

	it("renders nothing for wedding", () => {
		const details: PublicEventDetails = {
			type: "wedding",
		};
		const { container } = render(<EventTypeDetails details={details} />);
		expect(container).toBeEmptyDOMElement();
	});
});
