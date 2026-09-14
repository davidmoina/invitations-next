import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CreateEventForm } from "./create-event-form";

type CreateEventCallback = React.ComponentProps<
	typeof CreateEventForm
>["onCreateEvent"];

function renderForm(overrides: { onCreateEvent?: CreateEventCallback } = {}) {
	const onCreateEvent = vi
		.fn<CreateEventCallback>()
		.mockResolvedValue({ id: "event-1", slug: "boda-abcdef12" });
	const props = { onCreateEvent, ...overrides };
	render(<CreateEventForm {...props} />);
	return { ...props, onCreateEvent };
}

function firstPayload(mock: ReturnType<typeof vi.fn<CreateEventCallback>>) {
	const call = mock.mock.calls[0];
	if (!call) throw new Error("onCreateEvent was never called");
	return call[0];
}

describe("CreateEventForm", () => {
	afterEach(() => {
		cleanup();
	});

	it("submits every field, as an ISO instant and with empty optionals as null", async () => {
		const user = userEvent.setup();
		const { onCreateEvent } = renderForm();

		await user.type(screen.getByLabelText(/título/i), "Boda de Julián y Sarah");
		await user.selectOptions(
			screen.getByLabelText(/tipo de celebración/i),
			"wedding",
		);
		// `datetime-local` yields "2030-06-12T17:00": no seconds, no zone. The
		// validator rejects exactly that string, so the form must convert it.
		await user.type(screen.getByLabelText(/fecha y hora/i), "2030-06-12T17:00");
		await user.type(screen.getByLabelText(/lugar/i), "Finca El Olivar");
		await user.click(screen.getByRole("button", { name: /crear/i }));

		await waitFor(() => expect(onCreateEvent).toHaveBeenCalledTimes(1));
		const payload = firstPayload(onCreateEvent);
		expect(payload.title).toBe("Boda de Julián y Sarah");
		expect(payload.eventType).toBe("wedding");
		expect(payload.details).toEqual({ type: "wedding" });
		expect(payload.honoreeNames).toEqual([]);
		expect(payload.startsAt).toBe("2030-06-12T17:00:00.000Z");
		expect(payload.venueName).toBe("Finca El Olivar");
		// Untouched optional fields are absent values, which the contract
		// spells `null` — never an empty string that would overwrite later.
		expect(payload.venueAddress).toBeNull();
		expect(payload.venueMapUrl).toBeNull();
		expect(payload.description).toBeNull();
		expect(payload.rsvpDeadline).toBeNull();
	});

	it("allows adding and removing honoree names", async () => {
		const user = userEvent.setup();
		const { onCreateEvent } = renderForm();

		await user.type(screen.getByLabelText(/título/i), "Boda de Julián y Sarah");
		await user.selectOptions(
			screen.getByLabelText(/tipo de celebración/i),
			"wedding",
		);
		await user.type(screen.getByLabelText(/fecha y hora/i), "2030-06-12T17:00");

		await user.click(
			screen.getByRole("button", { name: /añadir persona homenajeada/i }),
		);
		await user.click(
			screen.getByRole("button", { name: /añadir persona homenajeada/i }),
		);
		const honoreeInputs = screen.getAllByLabelText(/persona homenajeada/i);
		await user.type(honoreeInputs[0], "Julián");
		await user.type(honoreeInputs[1], "Extra");
		await user.type(honoreeInputs[2], "Sarah");

		await user.click(
			screen.getByRole("button", { name: /eliminar homenajeado 2/i }),
		);

		await user.click(screen.getByRole("button", { name: /crear/i }));

		await waitFor(() => expect(onCreateEvent).toHaveBeenCalledTimes(1));
		const payload = firstPayload(onCreateEvent);
		expect(payload.honoreeNames).toEqual(["Julián", "Sarah"]);
	});

	it("submits baby shower with due date and baby sex", async () => {
		const user = userEvent.setup();
		const { onCreateEvent } = renderForm();

		await user.type(screen.getByLabelText(/título/i), "Baby Shower de Mateo");
		await user.selectOptions(
			screen.getByLabelText(/tipo de celebración/i),
			"baby_shower",
		);
		await user.type(screen.getByLabelText(/fecha y hora/i), "2030-06-12T17:00");
		await user.type(screen.getByLabelText(/fecha prevista/i), "2030-08-15");
		await user.selectOptions(screen.getByLabelText(/sexo del bebé/i), "boy");

		await user.click(screen.getByRole("button", { name: /crear/i }));

		await waitFor(() => expect(onCreateEvent).toHaveBeenCalledTimes(1));
		const payload = firstPayload(onCreateEvent);
		expect(payload.eventType).toBe("baby_shower");
		expect(payload.details).toEqual({
			type: "baby_shower",
			dueDate: "2030-08-15",
			babySex: "boy",
		});
	});

	it("submits baby shower with null baby sex when omitted", async () => {
		const user = userEvent.setup();
		const { onCreateEvent } = renderForm();

		await user.type(screen.getByLabelText(/título/i), "Baby Shower Sorpresa");
		await user.selectOptions(
			screen.getByLabelText(/tipo de celebración/i),
			"baby_shower",
		);
		await user.type(screen.getByLabelText(/fecha y hora/i), "2030-06-12T17:00");
		await user.type(screen.getByLabelText(/fecha prevista/i), "2030-08-15");

		await user.click(screen.getByRole("button", { name: /crear/i }));

		await waitFor(() => expect(onCreateEvent).toHaveBeenCalledTimes(1));
		const payload = firstPayload(onCreateEvent);
		expect(payload.details).toEqual({
			type: "baby_shower",
			dueDate: "2030-08-15",
			babySex: null,
		});
	});

	it("submits birthday with turning age, or null when omitted", async () => {
		const user = userEvent.setup();
		const { onCreateEvent } = renderForm();

		await user.type(screen.getByLabelText(/título/i), "Cumpleaños 30");
		await user.selectOptions(
			screen.getByLabelText(/tipo de celebración/i),
			"birthday",
		);
		await user.type(screen.getByLabelText(/fecha y hora/i), "2030-06-12T17:00");
		await user.type(screen.getByLabelText(/edad que cumple/i), "30");

		await user.click(screen.getByRole("button", { name: /crear/i }));

		await waitFor(() => expect(onCreateEvent).toHaveBeenCalledTimes(1));
		const payload = firstPayload(onCreateEvent);
		expect(payload.eventType).toBe("birthday");
		expect(payload.details).toEqual({
			type: "birthday",
			turningAge: 30,
		});
	});

	it("submits birthday with null turning age when omitted", async () => {
		const user = userEvent.setup();
		const { onCreateEvent } = renderForm();

		await user.type(screen.getByLabelText(/título/i), "Cumpleaños");
		await user.selectOptions(
			screen.getByLabelText(/tipo de celebración/i),
			"birthday",
		);
		await user.type(screen.getByLabelText(/fecha y hora/i), "2030-06-12T17:00");

		await user.click(screen.getByRole("button", { name: /crear/i }));

		await waitFor(() => expect(onCreateEvent).toHaveBeenCalledTimes(1));
		const payload = firstPayload(onCreateEvent);
		expect(payload.details).toEqual({
			type: "birthday",
			turningAge: null,
		});
	});

	it("renders event type as a select with no preselected option and blocks submit when empty", async () => {
		const user = userEvent.setup();
		const { onCreateEvent } = renderForm();

		const select = screen.getByLabelText(/tipo de celebración/i);
		expect(select.tagName).toBe("SELECT");
		expect(select).toHaveValue("");

		await user.type(screen.getByLabelText(/título/i), "Mi evento");
		await user.type(screen.getByLabelText(/fecha y hora/i), "2030-06-12T17:00");
		await user.click(screen.getByRole("button", { name: /crear/i }));

		expect(await screen.findByRole("alert")).toBeInTheDocument();
		expect(onCreateEvent).not.toHaveBeenCalled();
	});

	it("refuses an empty title without a server round-trip", async () => {
		const user = userEvent.setup();
		const { onCreateEvent } = renderForm();

		await user.type(screen.getByLabelText(/fecha y hora/i), "2030-06-12T17:00");
		await user.click(screen.getByRole("button", { name: /crear/i }));

		expect(await screen.findByRole("alert")).toBeInTheDocument();
		expect(onCreateEvent).not.toHaveBeenCalled();
	});

	it("refuses a missing date without a server round-trip", async () => {
		const user = userEvent.setup();
		const { onCreateEvent } = renderForm();

		await user.type(screen.getByLabelText(/título/i), "Baby shower");
		await user.click(screen.getByRole("button", { name: /crear/i }));

		expect(await screen.findByRole("alert")).toBeInTheDocument();
		expect(onCreateEvent).not.toHaveBeenCalled();
	});

	it("reports a failed creation without claiming success", async () => {
		const user = userEvent.setup();
		const onCreateEvent = vi
			.fn<CreateEventCallback>()
			.mockRejectedValue(new Error("boom"));
		renderForm({ onCreateEvent });

		await user.type(screen.getByLabelText(/título/i), "Baby shower");
		await user.type(screen.getByLabelText(/fecha y hora/i), "2030-06-12T17:00");
		await user.click(screen.getByRole("button", { name: /crear/i }));

		const alert = await screen.findByRole("alert");
		expect(alert).toBeInTheDocument();
		// Never echo the raw failure: it can carry internal detail.
		expect(alert.textContent).not.toContain("boom");
	});
});
