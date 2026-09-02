import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { RsvpResult } from "#/server/contracts/public";
import { RsvpForm } from "./rsvp-form";

describe("RsvpForm", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders attendance choices and allows submitting attendance", async () => {
		const user = userEvent.setup();
		const onSubmitRsvp = vi.fn().mockResolvedValue({
			ok: true,
			stored: {
				attending: true,
				companions: 0,
				respondedAt: "2026-08-25T20:00:00.000Z",
			},
		} satisfies RsvpResult);

		render(
			<RsvpForm
				maxCompanions={2}
				rsvpDeadline={null}
				guest={null}
				onSubmitRsvp={onSubmitRsvp}
			/>,
		);

		expect(
			screen.getByRole("button", { name: /^asistiré/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /^no podré asistir/i }),
		).toBeInTheDocument();

		// Select attending
		await user.click(screen.getByRole("button", { name: /^asistiré/i }));

		// Submit form
		await user.click(
			screen.getByRole("button", { name: /confirmar respuesta/i }),
		);

		await waitFor(() => {
			expect(onSubmitRsvp).toHaveBeenCalledWith({
				attending: true,
				companions: 0,
			});
		});

		// Success confirmation must be visible
		expect(screen.getByText(/¡gracias por confirmar!/i)).toBeInTheDocument();
	});

	it("allows selecting companions up to maxCompanions when attending", async () => {
		const user = userEvent.setup();
		const onSubmitRsvp = vi.fn().mockResolvedValue({
			ok: true,
			stored: {
				attending: true,
				companions: 2,
				respondedAt: "2026-08-25T20:00:00.000Z",
			},
		} satisfies RsvpResult);

		render(
			<RsvpForm
				maxCompanions={3}
				rsvpDeadline={null}
				guest={null}
				onSubmitRsvp={onSubmitRsvp}
			/>,
		);

		await user.click(screen.getByRole("button", { name: /^asistiré/i }));

		// Increment companions
		const plusButton = screen.getByRole("button", {
			name: /incrementar acompañantes/i,
		});
		await user.click(plusButton);
		await user.click(plusButton);

		expect(screen.getByText("2")).toBeInTheDocument();

		// Submit
		await user.click(
			screen.getByRole("button", { name: /confirmar respuesta/i }),
		);

		await waitFor(() => {
			expect(onSubmitRsvp).toHaveBeenCalledWith({
				attending: true,
				companions: 2,
			});
		});

		expect(screen.getByText(/¡gracias por confirmar!/i)).toBeInTheDocument();
	});

	it("renders success only when RsvpResult.ok === true (never on failure)", async () => {
		const user = userEvent.setup();
		const onSubmitRsvp = vi.fn().mockResolvedValue({
			ok: false,
			error: {
				code: "companion_cap_exceeded",
				maxCompanions: 1,
			},
		} satisfies RsvpResult);

		render(
			<RsvpForm
				maxCompanions={2}
				rsvpDeadline={null}
				guest={null}
				onSubmitRsvp={onSubmitRsvp}
			/>,
		);

		await user.click(screen.getByRole("button", { name: /^asistiré/i }));
		await user.click(
			screen.getByRole("button", { name: /confirmar respuesta/i }),
		);

		await waitFor(() => {
			expect(onSubmitRsvp).toHaveBeenCalled();
		});

		// Must show error message
		expect(
			screen.getByText(/número máximo de acompañantes superado/i),
		).toBeInTheDocument();

		// Must NOT show success message
		expect(
			screen.queryByText(/¡gracias por confirmar!/i),
		).not.toBeInTheDocument();
	});

	it("shows closed message when rsvpDeadline has passed", () => {
		const onSubmitRsvp = vi.fn();
		const pastDeadline = "2020-01-01T00:00:00.000Z";

		render(
			<RsvpForm
				maxCompanions={2}
				rsvpDeadline={pastDeadline}
				guest={null}
				onSubmitRsvp={onSubmitRsvp}
			/>,
		);

		expect(screen.getByText(/confirmaciones cerradas/i)).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /confirmar respuesta/i }),
		).not.toBeInTheDocument();
	});

	it("pre-populates previous response if guest is provided", () => {
		const onSubmitRsvp = vi.fn();

		render(
			<RsvpForm
				maxCompanions={2}
				rsvpDeadline={null}
				guest={{
					id: "guest-1",
					displayName: "Laura Gómez",
					attending: true,
					companions: 1,
				}}
				onSubmitRsvp={onSubmitRsvp}
			/>,
		);

		expect(screen.getByText("Laura Gómez")).toBeInTheDocument();
		expect(screen.getByText("1")).toBeInTheDocument();
	});
});
