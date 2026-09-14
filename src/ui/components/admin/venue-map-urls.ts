/**
 * Pure URL builders for the venue address field's saved map link and its
 * live map preview. Kept dependency-free so they are unit-testable without
 * touching the DOM or the Google Maps loader.
 */

/** The link saved alongside the address once a Places suggestion is picked. */
export function buildPlaceMapUrl(address: string, placeId: string): string {
	const encodedAddress = encodeURIComponent(address);
	return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}&query_place_id=${placeId}`;
}

/** Reads back the place id a `buildPlaceMapUrl` link carries, if any. */
export function extractPlaceId(mapUrl: string): string | null {
	try {
		return new URL(mapUrl).searchParams.get("query_place_id");
	} catch {
		return null;
	}
}

/**
 * The Maps Embed API URL for the preview iframe. Prefers the saved place id
 * for an exact pin; falls back to a free-text address search when the saved
 * link predates the Places integration (or was typed in by hand).
 */
export function buildEmbedUrl(
	apiKey: string,
	address: string,
	mapUrl: string,
): string {
	const placeId = extractPlaceId(mapUrl);
	const query = placeId ? `place_id:${placeId}` : encodeURIComponent(address);
	return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${query}`;
}
