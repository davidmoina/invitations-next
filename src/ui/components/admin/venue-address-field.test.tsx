import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { VenueAddressField } from "./venue-address-field";

const { loadGoogleMapsPlaces } = vi.hoisted(() => ({
	loadGoogleMapsPlaces: vi.fn(),
}));

vi.mock("./google-maps-loader", () => ({
	getGoogleMapsApiKey: () => null,
	loadGoogleMapsPlaces,
}));

class FakePlaceAutocompleteElement extends HTMLElement {
	requestedLanguage?: string;
	requestedRegion?: string;
}
if (!customElements.get("gmp-place-autocomplete-fake")) {
	customElements.define(
		"gmp-place-autocomplete-fake",
		FakePlaceAutocompleteElement,
	);
}

function mockPlacesLibrary() {
	loadGoogleMapsPlaces.mockResolvedValue({
		PlaceAutocompleteElement: FakePlaceAutocompleteElement,
	});
}

function dispatchPlaceSelected(
	element: Element,
	place: { formattedAddress: string; id: string },
) {
	const selectEvent = new Event("gmp-select");
	Object.assign(selectEvent, {
		placePrediction: {
			toPlace: () => ({
				fetchFields: async () => {},
				formattedAddress: place.formattedAddress,
				id: place.id,
			}),
		},
	});
	element.dispatchEvent(selectEvent);
}

describe("VenueAddressField", () => {
	afterEach(() => {
		cleanup();
		loadGoogleMapsPlaces.mockReset();
	});

	describe("without an API key", () => {
		it("renders the two plain inputs and propagates edits", async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(
				<VenueAddressField
					address=""
					mapUrl=""
					onChange={onChange}
					apiKey={null}
				/>,
			);

			const addressInput = screen.getByLabelText(/dirección/i);
			const mapInput = screen.getByLabelText(/enlace al mapa/i);
			expect(addressInput).toBeInTheDocument();
			expect(mapInput).toBeInTheDocument();

			await user.type(addressInput, "M");
			expect(onChange).toHaveBeenLastCalledWith({ address: "M", mapUrl: "" });

			await user.type(mapInput, "h");
			expect(onChange).toHaveBeenLastCalledWith({
				address: "",
				mapUrl: "h",
			});

			expect(loadGoogleMapsPlaces).not.toHaveBeenCalled();
		});

		it("keeps the saved values in the inputs", () => {
			render(
				<VenueAddressField
					address="Calle Mayor 1"
					mapUrl="https://maps.example.com/x"
					onChange={vi.fn()}
					apiKey={null}
				/>,
			);

			expect(screen.getByLabelText(/dirección/i)).toHaveValue("Calle Mayor 1");
			expect(screen.getByLabelText(/enlace al mapa/i)).toHaveValue(
				"https://maps.example.com/x",
			);
		});
	});

	describe("with an API key", () => {
		it("renders the Places widget instead of the plain inputs", async () => {
			mockPlacesLibrary();
			render(
				<VenueAddressField
					address=""
					mapUrl=""
					onChange={vi.fn()}
					apiKey="test-key"
				/>,
			);

			await waitFor(() => {
				expect(loadGoogleMapsPlaces).toHaveBeenCalledWith("test-key");
			});
			expect(
				screen.queryByLabelText(/enlace al mapa/i),
			).not.toBeInTheDocument();
			await waitFor(() => {
				expect(
					document.querySelector("gmp-place-autocomplete-fake"),
				).not.toBeNull();
			});
		});

		it("fills the address and a map link carrying the place id when a place is selected", async () => {
			mockPlacesLibrary();
			const onChange = vi.fn();
			render(
				<VenueAddressField
					address=""
					mapUrl=""
					onChange={onChange}
					apiKey="test-key"
				/>,
			);

			const element = await waitFor(() => {
				const el = document.querySelector("gmp-place-autocomplete-fake");
				expect(el).not.toBeNull();
				return el as Element;
			});

			dispatchPlaceSelected(element, {
				formattedAddress: "Calle Mayor 1, Madrid",
				id: "abc",
			});

			await waitFor(() => {
				expect(onChange).toHaveBeenCalledWith({
					address: "Calle Mayor 1, Madrid",
					mapUrl: expect.stringContaining("query_place_id=abc"),
				});
			});
		});

		it("shows the saved address, the map preview and the Maps link", () => {
			mockPlacesLibrary();
			const savedMapUrl =
				"https://www.google.com/maps/search/?api=1&query=Calle%20Mayor%201&query_place_id=abc";
			render(
				<VenueAddressField
					address="Calle Mayor 1, Madrid"
					mapUrl={savedMapUrl}
					onChange={vi.fn()}
					apiKey="test-key"
				/>,
			);

			expect(screen.getByText("Calle Mayor 1, Madrid")).toBeInTheDocument();

			const iframe = screen.getByTitle(/mapa del lugar/i);
			expect(iframe.getAttribute("src")).toContain("place_id:abc");

			const link = screen.getByRole("link", { name: /ver en google maps/i });
			expect(link).toHaveAttribute("href", savedMapUrl);
			expect(link).toHaveAttribute("target", "_blank");
		});

		it("clears both the address and the map link when Quitar is clicked", async () => {
			mockPlacesLibrary();
			const user = userEvent.setup();
			const onChange = vi.fn();
			render(
				<VenueAddressField
					address="Calle Mayor 1, Madrid"
					mapUrl="https://www.google.com/maps/search/?api=1&query=Calle%20Mayor%201&query_place_id=abc"
					onChange={onChange}
					apiKey="test-key"
				/>,
			);

			await user.click(screen.getByRole("button", { name: /quitar/i }));

			expect(onChange).toHaveBeenCalledWith({ address: "", mapUrl: "" });
		});
	});

	describe("when the Maps script fails to load", () => {
		it("falls back to the plain inputs with an inline error", async () => {
			loadGoogleMapsPlaces.mockRejectedValue(new Error("network down"));
			render(
				<VenueAddressField
					address=""
					mapUrl=""
					onChange={vi.fn()}
					apiKey="test-key"
				/>,
			);

			expect(
				await screen.findByText(/no se pudo cargar google maps/i),
			).toBeInTheDocument();
			expect(screen.getByLabelText(/dirección/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/enlace al mapa/i)).toBeInTheDocument();
		});
	});
});
