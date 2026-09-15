import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Modal } from "./modal";

describe("Modal", () => {
	afterEach(cleanup);
	it("does not render when isOpen is false", () => {
		render(
			<Modal isOpen={false} onClose={() => {}} title="Título Modal">
				<p>Contenido oculto</p>
			</Modal>,
		);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(screen.queryByText("Título Modal")).not.toBeInTheDocument();
	});

	it("renders dialog with title, description, and children when isOpen is true", () => {
		render(
			<Modal
				isOpen={true}
				onClose={() => {}}
				title="Título Modal"
				description="Descripción explicativa"
			>
				<p>Contenido visible</p>
			</Modal>,
		);

		const dialog = screen.getByRole("dialog");
		expect(dialog).toBeInTheDocument();
		expect(dialog).toHaveAttribute("data-slot", "modal-dialog");
		expect(screen.getByText("Título Modal")).toBeInTheDocument();
		expect(screen.getByText("Descripción explicativa")).toBeInTheDocument();
		expect(screen.getByText("Contenido visible")).toBeInTheDocument();
	});

	it("calls onClose when the close button is clicked", async () => {
		const user = userEvent.setup();
		const handleClose = vi.fn();

		render(
			<Modal isOpen={true} onClose={handleClose} title="Título Modal">
				<p>Contenido</p>
			</Modal>,
		);

		const closeButton = screen.getByRole("button", { name: "Cerrar modal" });
		await user.click(closeButton);
		expect(handleClose).toHaveBeenCalledTimes(1);
	});

	it("calls onClose when pressing the Escape key", async () => {
		const user = userEvent.setup();
		const handleClose = vi.fn();

		render(
			<Modal isOpen={true} onClose={handleClose} title="Título Modal">
				<button type="button">Elemento enfocado</button>
			</Modal>,
		);

		await user.keyboard("{Escape}");
		expect(handleClose).toHaveBeenCalled();
	});
});
