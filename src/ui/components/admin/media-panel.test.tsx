import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AdminMedia } from "#/server/contracts/admin";
import { MediaPanel } from "./media-panel";

const mockMedia: AdminMedia[] = [
	{
		id: "media-1",
		imagePublicId: "photo-1",
		alt: "Foto principal de los novios",
		position: 0,
		isCover: true,
		urls: {
			thumb: "https://example.com/thumb-1.jpg",
			card: "https://example.com/card-1.jpg",
			full: "https://example.com/full-1.jpg",
		},
	},
	{
		id: "media-2",
		imagePublicId: "photo-2",
		alt: "Foto de la ceremonia",
		position: 1,
		isCover: false,
		urls: {
			thumb: "https://example.com/thumb-2.jpg",
			card: "https://example.com/card-2.jpg",
			full: "https://example.com/full-2.jpg",
		},
	},
];

describe("MediaPanel", () => {
	afterEach(cleanup);

	it("renders empty state when there are no images", () => {
		render(<MediaPanel media={[]} />);

		expect(screen.getByRole("heading", { name: /fotos/i })).toBeInTheDocument();
		expect(screen.getByText(/todavía no hay fotos/i)).toBeInTheDocument();
	});

	it("renders images with badges and actions", () => {
		render(<MediaPanel media={mockMedia} />);

		expect(
			screen.getByAltText("Foto principal de los novios"),
		).toBeInTheDocument();
		expect(screen.getByAltText("Foto de la ceremonia")).toBeInTheDocument();

		// Cover image has Portada badge
		expect(screen.getByText("Portada")).toBeInTheDocument();

		// Buttons for actions
		const coverButtons = screen.getAllByRole("button", {
			name: /usar como portada/i,
		});
		// The current cover button should be disabled
		expect(coverButtons[0]).toBeDisabled();
		// Non-cover button should be enabled
		expect(coverButtons[1]).not.toBeDisabled();

		const deleteButtons = screen.getAllByRole("button", {
			name: /eliminar/i,
		});
		expect(deleteButtons).toHaveLength(2);
	});

	it("submits a new image with file and alt text", async () => {
		const user = userEvent.setup();
		const onAddMedia = vi.fn().mockResolvedValue({
			id: "media-3",
			imagePublicId: "photo-3",
			alt: "Foto del brindis",
			position: 2,
			isCover: false,
			urls: {
				thumb: "https://example.com/thumb-3.jpg",
				card: "https://example.com/card-3.jpg",
				full: "https://example.com/full-3.jpg",
			},
		});

		render(<MediaPanel media={mockMedia} onAddMedia={onAddMedia} />);

		const file = new File(["test image bytes"], "brindis.jpg", {
			type: "image/jpeg",
		});
		const fileInput = screen.getByLabelText(/imagen/i);
		const altInput = screen.getByLabelText(/texto alternativo/i);

		await user.upload(fileInput, file);
		await user.type(altInput, "Foto del brindis");
		await user.click(screen.getByRole("button", { name: /subir imagen/i }));

		await waitFor(() => expect(onAddMedia).toHaveBeenCalledOnce());
		expect(onAddMedia).toHaveBeenCalledWith({
			file,
			alt: "Foto del brindis",
			position: 2,
		});
		expect(await screen.findByAltText("Foto del brindis")).toBeInTheDocument();
	});

	it("rejects submission when no file is selected", async () => {
		const user = userEvent.setup();
		const onAddMedia = vi.fn();

		render(<MediaPanel media={mockMedia} onAddMedia={onAddMedia} />);

		await user.click(screen.getByRole("button", { name: /subir imagen/i }));

		expect(await screen.findByRole("alert")).toBeInTheDocument();
		expect(onAddMedia).not.toHaveBeenCalled();
	});

	it("displays error message when upload fails", async () => {
		const user = userEvent.setup();
		const onAddMedia = vi.fn().mockRejectedValue(new Error("Upload failed"));

		render(<MediaPanel media={mockMedia} onAddMedia={onAddMedia} />);

		const file = new File(["fake"], "error.jpg", { type: "image/jpeg" });
		await user.upload(screen.getByLabelText(/imagen/i), file);
		await user.click(screen.getByRole("button", { name: /subir imagen/i }));

		expect(await screen.findByRole("alert")).toBeInTheDocument();
	});

	it("calls onSetCoverMedia when clicking 'Usar como portada'", async () => {
		const user = userEvent.setup();
		const onSetCoverMedia = vi.fn().mockResolvedValue({
			media: [
				{ ...mockMedia[0], isCover: false },
				{ ...mockMedia[1], isCover: true },
			],
		});

		render(<MediaPanel media={mockMedia} onSetCoverMedia={onSetCoverMedia} />);

		const coverButtons = screen.getAllByRole("button", {
			name: /usar como portada/i,
		});
		await user.click(coverButtons[1]);

		expect(onSetCoverMedia).toHaveBeenCalledWith("media-2");
		await waitFor(() => expect(screen.getAllByText("Portada")).toHaveLength(1));
		expect(
			screen.getByAltText("Foto de la ceremonia").parentElement?.parentElement,
		).toHaveTextContent("Portada");
	});

	it("calls onRemoveMedia when clicking 'Eliminar'", async () => {
		const user = userEvent.setup();
		const onRemoveMedia = vi.fn().mockResolvedValue({ mediaId: "media-2" });

		render(<MediaPanel media={mockMedia} onRemoveMedia={onRemoveMedia} />);

		const deleteButtons = screen.getAllByRole("button", {
			name: /eliminar/i,
		});
		await user.click(deleteButtons[1]);

		expect(onRemoveMedia).toHaveBeenCalledWith("media-2");
		await waitFor(() =>
			expect(
				screen.queryByAltText("Foto de la ceremonia"),
			).not.toBeInTheDocument(),
		);
	});

	it("rejects submission when alt text is empty", async () => {
		const user = userEvent.setup();
		const onAddMedia = vi.fn();

		render(<MediaPanel media={mockMedia} onAddMedia={onAddMedia} />);

		const file = new File(["test image bytes"], "brindis.jpg", {
			type: "image/jpeg",
		});
		await user.upload(screen.getByLabelText(/imagen/i), file);
		await user.click(screen.getByRole("button", { name: /subir imagen/i }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Añade un texto alternativo a la imagen.",
		);
		expect(onAddMedia).not.toHaveBeenCalled();
	});

	it("accepts a dropped image file into the dropzone", async () => {
		const user = userEvent.setup();
		const onAddMedia = vi.fn().mockResolvedValue({
			id: "media-4",
			imagePublicId: "photo-4",
			alt: "Foto del baile",
			position: 2,
			isCover: false,
			urls: {
				thumb: "https://example.com/thumb-4.jpg",
				card: "https://example.com/card-4.jpg",
				full: "https://example.com/full-4.jpg",
			},
		});

		render(<MediaPanel media={mockMedia} onAddMedia={onAddMedia} />);

		const dropzone = screen.getByText(/arrastra una foto aquí/i).closest("div");
		expect(dropzone).toBeInTheDocument();
		if (!dropzone) throw new Error("Dropzone not found");

		const file = new File(["dance image bytes"], "baile.png", {
			type: "image/png",
		});

		// Trigger drag and drop
		const dataTransfer = {
			files: [file],
			types: ["Files"],
		};
		await user.pointer({ target: dropzone });
		// Dispatch drop event
		const dropEvent = new Event("drop", { bubbles: true });
		Object.defineProperty(dropEvent, "dataTransfer", { value: dataTransfer });
		dropzone.dispatchEvent(dropEvent);

		// The file name should now appear in the preview card
		expect(await screen.findByText("baile.png")).toBeInTheDocument();

		await user.type(
			screen.getByLabelText(/texto alternativo/i),
			"Foto del baile",
		);
		await user.click(screen.getByRole("button", { name: /subir imagen/i }));

		await waitFor(() => expect(onAddMedia).toHaveBeenCalledOnce());
		expect(onAddMedia).toHaveBeenCalledWith({
			file,
			alt: "Foto del baile",
			position: 2,
		});
	});

	it("rejects non-image files dropped into the dropzone", async () => {
		render(<MediaPanel media={mockMedia} />);

		const dropzone = screen.getByText(/arrastra una foto aquí/i).closest("div");
		if (!dropzone) throw new Error("Dropzone not found");
		const textFile = new File(["not an image"], "documento.pdf", {
			type: "application/pdf",
		});

		const dropEvent = new Event("drop", { bubbles: true });
		Object.defineProperty(dropEvent, "dataTransfer", {
			value: { files: [textFile] },
		});
		dropzone.dispatchEvent(dropEvent);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			/selecciona un archivo de imagen/i,
		);
	});

	it("allows removing the selected file before upload", async () => {
		const user = userEvent.setup();
		render(<MediaPanel media={mockMedia} />);

		const file = new File(["bytes"], "preview.jpg", { type: "image/jpeg" });
		await user.upload(screen.getByLabelText(/imagen/i), file);

		expect(screen.getByText("preview.jpg")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /quitar/i }));

		expect(screen.queryByText("preview.jpg")).not.toBeInTheDocument();
		expect(screen.getByText(/arrastra una foto aquí/i)).toBeInTheDocument();
	});
});
