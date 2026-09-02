import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AdminEvent } from "#/server/contracts/admin";
import { EventSettingsForm } from "./event-settings-form";

const event: AdminEvent = {
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
};

type UpdateEventCallback = React.ComponentProps<
	typeof EventSettingsForm
>["onUpdateEvent"];

type FormProps = React.ComponentProps<typeof EventSettingsForm>;

function renderForm(overrides: Partial<FormProps> = {}) {
	const onUpdateEvent = vi
		.fn<UpdateEventCallback>()
		.mockResolvedValue(undefined);
	const props = { event, onUpdateEvent, ...overrides };
	render(<EventSettingsForm {...props} />);
	return { ...props, onUpdateEvent };
}

/** Reads the payload the form actually submitted on its first save. */
function firstPayload(mock: ReturnType<typeof vi.fn<UpdateEventCallback>>) {
	const call = mock.mock.calls[0];
	if (!call) throw new Error("onUpdateEvent was never called");
	return call[0];
}

describe("EventSettingsForm", () => {
	afterEach(() => {
		cleanup();
	});

	it("prefills every editable field from the event", () => {
		renderForm();

		expect(screen.getByLabelText(/título/i)).toHaveValue(
			"Boda de Julián & Sarah",
		);
		expect(screen.getByLabelText(/lugar/i)).toHaveValue("Villa La Pietra");
		expect(screen.getByLabelText(/acompañantes/i)).toHaveValue(2);
		expect(screen.getByLabelText(/lista de regalos/i)).toBeChecked();
	});

	it("submits the whole event payload, not just what changed", async () => {
		const user = userEvent.setup();
		const props = renderForm();

		await user.clear(screen.getByLabelText(/título/i));
		await user.type(screen.getByLabelText(/título/i), "Nuestra boda");
		await user.click(screen.getByRole("button", { name: /guardar/i }));

		await waitFor(() => {
			expect(props.onUpdateEvent).toHaveBeenCalledTimes(1);
		});
		expect(props.onUpdateEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Nuestra boda",
				eventType: "wedding",
				timezone: "UTC",
				maxCompanions: 2,
				giftRegistryEnabled: true,
				status: "published",
			}),
		);
	});

	// The server validates `startsAt` as a full ISO-8601 datetime. A
	// `datetime-local` input yields "2026-10-24T15:00" with no zone, which
	// that validator rejects, so the form must convert before submitting.
	it("sends startsAt as a full ISO-8601 datetime", async () => {
		const user = userEvent.setup();
		const props = renderForm();

		await user.click(screen.getByRole("button", { name: /guardar/i }));

		await waitFor(() => {
			expect(props.onUpdateEvent).toHaveBeenCalled();
		});
		const payload = firstPayload(props.onUpdateEvent);
		expect(payload.startsAt).toMatch(
			/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
		);
		expect(new Date(payload.startsAt).toISOString()).toBe(payload.startsAt);
	});

	// The contract types these as `string | null`. An empty text input gives
	// "", which is a different value and would overwrite a cleared field with
	// an empty string instead of clearing it.
	it("clears an emptied optional field to null rather than an empty string", async () => {
		const user = userEvent.setup();
		const props = renderForm();

		await user.clear(screen.getByLabelText(/lugar/i));
		await user.click(screen.getByRole("button", { name: /guardar/i }));

		await waitFor(() => {
			expect(props.onUpdateEvent).toHaveBeenCalled();
		});
		const payload = firstPayload(props.onUpdateEvent);
		expect(payload.venueName).toBeNull();
		expect(payload.venueAddress).toBeNull();
		expect(payload.rsvpDeadline).toBeNull();
	});

	it("confirms a saved change", async () => {
		const user = userEvent.setup();
		renderForm();

		await user.click(screen.getByRole("button", { name: /guardar/i }));

		await waitFor(() => {
			expect(screen.getByRole("status")).toBeInTheDocument();
		});
	});

	it("reports a failed save without echoing the raw failure", async () => {
		const user = userEvent.setup();
		renderForm({
			onUpdateEvent: vi
				.fn<UpdateEventCallback>()
				.mockRejectedValue(new Error("constraint blew up")),
		});

		await user.click(screen.getByRole("button", { name: /guardar/i }));

		await waitFor(() => {
			expect(screen.getByRole("alert")).toBeInTheDocument();
		});
		expect(screen.queryByRole("status")).not.toBeInTheDocument();
		expect(screen.getByRole("alert").textContent).not.toContain(
			"constraint blew up",
		);
	});

	it("withholds the archive control from an editor", () => {
		renderForm({
			viewerRole: "editor",
			onDeleteEvent: vi.fn().mockResolvedValue(undefined),
		});

		expect(
			screen.queryByRole("button", { name: /archivar evento/i }),
		).not.toBeInTheDocument();
	});

	it("shows the archive control for the owner", () => {
		renderForm({
			viewerRole: "owner",
			onDeleteEvent: vi.fn().mockResolvedValue(undefined),
		});

		expect(
			screen.getByRole("button", { name: /archivar evento/i }),
		).toBeInTheDocument();
	});

	it("requires confirmation before archiving and allows cancellation", async () => {
		const user = userEvent.setup();
		const onDeleteEvent = vi.fn().mockResolvedValue(undefined);
		renderForm({ viewerRole: "owner", onDeleteEvent });

		await user.click(screen.getByRole("button", { name: /archivar evento/i }));

		expect(
			screen.getByRole("button", { name: /confirmar archivado/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /cancelar/i }),
		).toBeInTheDocument();
		expect(onDeleteEvent).not.toHaveBeenCalled();

		await user.click(screen.getByRole("button", { name: /cancelar/i }));

		expect(
			screen.queryByRole("button", { name: /confirmar archivado/i }),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /archivar evento/i }),
		).toBeInTheDocument();
		expect(onDeleteEvent).not.toHaveBeenCalled();
	});

	it("calls onDeleteEvent on confirmation and shows pending and success states", async () => {
		const user = userEvent.setup();
		let resolveDelete!: () => void;
		const deletePromise = new Promise<void>((resolve) => {
			resolveDelete = resolve;
		});
		const onDeleteEvent = vi.fn().mockReturnValue(deletePromise);

		renderForm({ viewerRole: "owner", onDeleteEvent });

		await user.click(screen.getByRole("button", { name: /archivar evento/i }));
		await user.click(
			screen.getByRole("button", { name: /confirmar archivado/i }),
		);

		expect(onDeleteEvent).toHaveBeenCalledTimes(1);
		expect(screen.getByText(/archivando/i)).toBeInTheDocument();

		resolveDelete();

		await waitFor(() => {
			expect(screen.getByText(/archivado correctamente/i)).toBeInTheDocument();
		});
	});

	it("reports archive failure without echoing raw error details", async () => {
		const user = userEvent.setup();
		const onDeleteEvent = vi
			.fn()
			.mockRejectedValue(new Error("sensitive internal db failure"));

		renderForm({ viewerRole: "owner", onDeleteEvent });

		await user.click(screen.getByRole("button", { name: /archivar evento/i }));
		await user.click(
			screen.getByRole("button", { name: /confirmar archivado/i }),
		);

		await waitFor(() => {
			expect(screen.getByRole("alert")).toBeInTheDocument();
		});
		expect(screen.getByRole("alert").textContent).not.toContain(
			"sensitive internal db failure",
		);
	});

	it("renders event type as a select and prefills honoree names", () => {
		renderForm();

		const select = screen.getByLabelText(/tipo de celebración/i);
		expect(select.tagName).toBe("SELECT");
		expect(select).toHaveValue("wedding");

		const honoreeInputs = screen.getAllByLabelText(/persona homenajeada/i);
		expect(honoreeInputs).toHaveLength(2);
		expect(honoreeInputs[0]).toHaveValue("Julián");
		expect(honoreeInputs[1]).toHaveValue("Sarah");
	});

	it("swapping event type swaps visible detail inputs and clears previous values before submit", async () => {
		const user = userEvent.setup();
		const babyShowerEvent: AdminEvent = {
			...event,
			eventType: "baby_shower",
			details: {
				type: "baby_shower",
				dueDate: "2030-05-01",
				babySex: "girl",
			},
		};
		const props = renderForm({ event: babyShowerEvent });

		expect(screen.getByLabelText(/fecha prevista/i)).toHaveValue("2030-05-01");
		expect(screen.getByLabelText(/sexo del bebé/i)).toHaveValue("girl");

		// Change to birthday
		await user.selectOptions(
			screen.getByLabelText(/tipo de celebración/i),
			"birthday",
		);

		// Old inputs must be gone, new input must appear
		expect(screen.queryByLabelText(/fecha prevista/i)).not.toBeInTheDocument();
		expect(screen.queryByLabelText(/sexo del bebé/i)).not.toBeInTheDocument();
		const ageInput = screen.getByLabelText(/edad que cumple/i);
		expect(ageInput).toHaveValue(null);

		await user.type(ageInput, "1");
		await user.click(screen.getByRole("button", { name: /guardar/i }));

		await waitFor(() => {
			expect(props.onUpdateEvent).toHaveBeenCalledTimes(1);
		});
		expect(props.onUpdateEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				eventType: "birthday",
				details: { type: "birthday", turningAge: 1 },
			}),
		);
	});
});
