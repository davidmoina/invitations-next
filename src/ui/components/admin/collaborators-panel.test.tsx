import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AdminMembership } from "#/server/contracts/admin";
import { CollaboratorsPanel } from "./collaborators-panel";

const owner: AdminMembership = {
	userId: "user-owner",
	displayName: "Julián García",
	email: "julian@example.com",
	role: "owner",
	addedAt: "2026-08-01T10:00:00.000Z",
	isCurrentUser: true,
};

const editor: AdminMembership = {
	userId: "user-editor",
	displayName: "Sarah Ruiz",
	email: "sarah@example.com",
	role: "editor",
	addedAt: "2026-08-02T10:00:00.000Z",
	isCurrentUser: false,
};

function renderPanel(
	overrides: Partial<React.ComponentProps<typeof CollaboratorsPanel>> = {},
) {
	const props = {
		memberships: [owner, editor],
		viewerRole: "owner" as const,
		onInvite: vi.fn().mockResolvedValue(undefined),
		onRemove: vi.fn().mockResolvedValue(undefined),
		onTransfer: vi.fn().mockResolvedValue(undefined),
		...overrides,
	};
	render(<CollaboratorsPanel {...props} />);
	return props;
}

describe("CollaboratorsPanel", () => {
	afterEach(() => {
		cleanup();
	});

	it("lists every collaborator with their role", () => {
		renderPanel();

		expect(screen.getByText("Julián García")).toBeInTheDocument();
		expect(screen.getByText("Sarah Ruiz")).toBeInTheDocument();
	});

	// The authorization matrix gives `invite`, `remove` and `transferOwnership`
	// to the owner alone. An editor must not even see the controls.
	it("hides every owner-only control from an editor", () => {
		renderPanel({ viewerRole: "editor" });

		expect(
			screen.queryByRole("button", { name: /invitar/i }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /quitar/i }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /transferir/i }),
		).not.toBeInTheDocument();
	});

	it("invites a collaborator by email and clears the field afterwards", async () => {
		const user = userEvent.setup();
		const props = renderPanel();

		await user.type(screen.getByLabelText(/correo/i), "nuevo@example.com");
		await user.click(screen.getByRole("button", { name: /invitar/i }));

		await waitFor(() => {
			expect(props.onInvite).toHaveBeenCalledWith("nuevo@example.com");
		});
		expect(screen.getByLabelText(/correo/i)).toHaveValue("");
	});

	it("reports a failed invitation instead of pretending it worked", async () => {
		const user = userEvent.setup();
		const props = renderPanel({
			onInvite: vi.fn().mockRejectedValue(new Error("already a member")),
		});

		await user.type(screen.getByLabelText(/correo/i), "dup@example.com");
		await user.click(screen.getByRole("button", { name: /invitar/i }));

		await waitFor(() => {
			expect(screen.getByRole("alert")).toBeInTheDocument();
		});
		expect(props.onInvite).toHaveBeenCalledTimes(1);
		// The message must not echo the raw failure: it can carry internals.
		expect(screen.getByRole("alert").textContent).not.toContain(
			"already a member",
		);
	});

	it("removes another collaborator", async () => {
		const user = userEvent.setup();
		const props = renderPanel();

		await user.click(screen.getByRole("button", { name: /quitar a Sarah/i }));

		await waitFor(() => {
			expect(props.onRemove).toHaveBeenCalledWith("user-editor");
		});
	});

	// Handing over ownership is irreversible from this screen: the current
	// owner is demoted to editor by the same transaction.
	it("asks for confirmation before transferring ownership", async () => {
		const user = userEvent.setup();
		const props = renderPanel();

		await user.click(
			screen.getByRole("button", { name: /transferir a Sarah/i }),
		);
		expect(props.onTransfer).not.toHaveBeenCalled();

		await user.click(screen.getByRole("button", { name: /confirmar/i }));
		await waitFor(() => {
			expect(props.onTransfer).toHaveBeenCalledWith("user-editor");
		});
	});

	it("offers no remove or transfer control on the viewer's own row", () => {
		renderPanel();

		expect(
			screen.queryByRole("button", { name: /quitar a Julián/i }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /transferir a Julián/i }),
		).not.toBeInTheDocument();
	});
});
