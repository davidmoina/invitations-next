/**
 * Client-safe loader for the Google Maps JavaScript API's "places" library.
 *
 * The env module under the platform layer is server-only, so the
 * public key it never carries lives here instead, read straight off
 * `process.env` — Next.js inlines `NEXT_PUBLIC_*` vars into the client
 * bundle at build time, so this is safe to read from a client component.
 */

// Minimal shape of the pieces of the Maps JavaScript API this app touches.
// No `@types/google.maps` dependency: only `importLibrary("places")` and the
// "places" library's autocomplete element are ever used here.
declare global {
	namespace google {
		namespace maps {
			function importLibrary(
				libraryName: "places",
			): Promise<typeof google.maps.places>;

			namespace places {
				class PlaceAutocompleteElement extends HTMLElement {
					requestedLanguage?: string;
					requestedRegion?: string;
				}
			}
		}
	}

	interface Window {
		google?: typeof google;
	}
}

export function getGoogleMapsApiKey(): string | null {
	const trimmed = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
	return trimmed === "" ? null : trimmed;
}

type ImportLibraryFn = (
	libraryName: string,
	...rest: unknown[]
) => Promise<unknown>;

type LooseGoogleMaps = Record<string, unknown> & {
	importLibrary?: ImportLibraryFn;
};

/**
 * A readable port of Google's own dynamic-library-import bootstrap
 * (see "Dynamic Library Import" in the Maps JavaScript API docs). Running it
 * defines `google.maps.importLibrary` as a stub that queues the requested
 * library names, lazily injects the real `<script>` tag exactly once no
 * matter how many libraries get requested, and resolves once that script
 * hands control to its own `importLibrary`.
 */
function installBootstrap(apiKey: string): void {
	const win = window as unknown as { google?: { maps?: LooseGoogleMaps } };
	win.google = win.google ?? {};
	win.google.maps = win.google.maps ?? {};
	const maps = win.google.maps;

	// Idempotent: a second call (any caller, any apiKey) is a no-op once the
	// stub — or the real library — is already installed.
	if (typeof maps.importLibrary === "function") return;

	const requestedLibraries = new Set<string>();
	let scriptReady: Promise<void> | null = null;
	const callbackName = "__gmpBootstrapCallback__";

	const loadScript = (): Promise<void> => {
		if (scriptReady) return scriptReady;
		scriptReady = new Promise((resolve, reject) => {
			maps[callbackName] = resolve;
			const params = new URLSearchParams({
				key: apiKey,
				v: "weekly",
				language: "es",
				libraries: [...requestedLibraries].join(","),
				callback: `google.maps.${callbackName}`,
			});
			const script = document.createElement("script");
			script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
			script.async = true;
			script.nonce =
				document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce ?? "";
			script.onerror = () =>
				reject(new Error("Google Maps script failed to load."));
			document.head.append(script);
		});
		return scriptReady;
	};

	maps.importLibrary = ((libraryName: string, ...rest: unknown[]) => {
		requestedLibraries.add(libraryName);
		return loadScript().then(() => {
			// The real script overwrites `importLibrary` with the genuine
			// implementation just before it invokes the callback above.
			const real = maps.importLibrary as ImportLibraryFn;
			return real(libraryName, ...rest);
		});
	}) satisfies ImportLibraryFn;
}

let placesPromise: Promise<typeof google.maps.places> | null = null;

/**
 * Loads the Maps JavaScript API's "places" library. Safe to call repeatedly:
 * the bootstrap script is injected at most once and every caller shares the
 * same in-flight (or resolved) promise.
 */
export function loadGoogleMapsPlaces(
	apiKey: string,
): Promise<typeof google.maps.places> {
	if (!placesPromise) {
		installBootstrap(apiKey);
		placesPromise = google.maps.importLibrary("places");
	}
	return placesPromise;
}
