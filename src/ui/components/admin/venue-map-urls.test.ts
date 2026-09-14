import { describe, expect, it } from "vitest";

import {
	buildEmbedUrl,
	buildPlaceMapUrl,
	extractPlaceId,
} from "./venue-map-urls";

describe("buildPlaceMapUrl", () => {
	it("builds a Maps search URL carrying the encoded address and place id", () => {
		const url = buildPlaceMapUrl("Calle Mayor 1, Madrid", "abc123");

		expect(url).toBe(
			"https://www.google.com/maps/search/?api=1&query=Calle%20Mayor%201%2C%20Madrid&query_place_id=abc123",
		);
	});
});

describe("extractPlaceId", () => {
	it("reads the query_place_id param out of a built map URL", () => {
		const url = buildPlaceMapUrl("Calle Mayor 1, Madrid", "abc123");

		expect(extractPlaceId(url)).toBe("abc123");
	});

	it("returns null for a plain map URL with no place id", () => {
		expect(
			extractPlaceId("https://www.google.com/maps/search/?api=1&query=Madrid"),
		).toBeNull();
	});

	it("returns null for an empty or malformed URL", () => {
		expect(extractPlaceId("")).toBeNull();
		expect(extractPlaceId("not a url")).toBeNull();
	});
});

describe("buildEmbedUrl", () => {
	it("prefers the saved place id when the map URL carries one", () => {
		const mapUrl = buildPlaceMapUrl("Calle Mayor 1, Madrid", "abc123");

		const embedUrl = buildEmbedUrl("test-key", "Calle Mayor 1, Madrid", mapUrl);

		expect(embedUrl).toBe(
			"https://www.google.com/maps/embed/v1/place?key=test-key&q=place_id:abc123",
		);
	});

	it("falls back to the encoded address when the map URL has no place id", () => {
		const embedUrl = buildEmbedUrl(
			"test-key",
			"Calle Mayor 1, Madrid",
			"https://example.com/some-other-link",
		);

		expect(embedUrl).toBe(
			"https://www.google.com/maps/embed/v1/place?key=test-key&q=Calle%20Mayor%201%2C%20Madrid",
		);
	});

	it("falls back to the encoded address when the map URL is empty", () => {
		const embedUrl = buildEmbedUrl("test-key", "Calle Mayor 1, Madrid", "");

		expect(embedUrl).toBe(
			"https://www.google.com/maps/embed/v1/place?key=test-key&q=Calle%20Mayor%201%2C%20Madrid",
		);
	});
});
