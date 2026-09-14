"use client";
import { Button, Input, Label, TextField } from "@heroui/react";
import { useEffect, useRef, useState } from "react";

import { FIELD_CLASS, LABEL_CLASS } from "./event-form-fields";
import {
	getGoogleMapsApiKey,
	loadGoogleMapsPlaces,
} from "./google-maps-loader";
import { buildEmbedUrl, buildPlaceMapUrl } from "./venue-map-urls";

export type VenueAddressFieldValue = { address: string; mapUrl: string };

export type VenueAddressFieldProps = {
	address: string;
	mapUrl: string;
	onChange: (next: VenueAddressFieldValue) => void;
	/** Injected explicitly in tests; defaults to the build-time public key. */
	apiKey?: string | null;
};

type PlaceSelectEvent = Event & {
	placePrediction: {
		toPlace: () => {
			formattedAddress: string | null;
			id: string;
			fetchFields: (options: { fields: string[] }) => Promise<void>;
		};
	};
};

/**
 * A single Google Places-backed address field, with a map preview and a
 * link to the full place. Falls back to two plain inputs — same ids and
 * labels as before this field existed — whenever no API key is configured
 * or the Maps script fails to load, so the form keeps working either way.
 */
export function VenueAddressField({
	address,
	mapUrl,
	onChange,
	apiKey,
}: VenueAddressFieldProps) {
	const resolvedApiKey = apiKey === undefined ? getGoogleMapsApiKey() : apiKey;

	const containerRef = useRef<HTMLDivElement>(null);
	const [loadError, setLoadError] = useState(false);

	// A ref keeps the effect below from re-running (and re-appending the
	// widget) just because the parent form re-renders with a fresh inline
	// `onChange` closure on every keystroke elsewhere in the form.
	const onChangeRef = useRef(onChange);
	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	useEffect(() => {
		if (!resolvedApiKey) return;
		const container = containerRef.current;
		if (!container) return;

		let cancelled = false;
		let element: HTMLElement | null = null;

		const handleSelect = async (event: Event) => {
			const { placePrediction } = event as PlaceSelectEvent;
			const place = placePrediction.toPlace();
			await place.fetchFields({ fields: ["formattedAddress", "id"] });
			if (cancelled) return;
			const formattedAddress = place.formattedAddress ?? "";
			onChangeRef.current({
				address: formattedAddress,
				mapUrl: buildPlaceMapUrl(formattedAddress, place.id),
			});
		};

		loadGoogleMapsPlaces(resolvedApiKey)
			.then((places) => {
				if (cancelled || !container) return;
				const autocomplete = new places.PlaceAutocompleteElement();
				autocomplete.requestedLanguage = "es";
				autocomplete.requestedRegion = "es";
				autocomplete.addEventListener("gmp-select", handleSelect);
				container.append(autocomplete);
				element = autocomplete;
			})
			.catch(() => {
				if (!cancelled) setLoadError(true);
			});

		return () => {
			cancelled = true;
			if (element) {
				element.removeEventListener("gmp-select", handleSelect);
				element.remove();
			}
		};
	}, [resolvedApiKey]);

	if (!resolvedApiKey || loadError) {
		return (
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<TextField className="space-y-1">
					<Label htmlFor="event-venue-address" className={LABEL_CLASS}>
						Dirección
					</Label>
					<Input
						id="event-venue-address"
						value={address}
						onChange={(e) => onChange({ address: e.target.value, mapUrl })}
						className={FIELD_CLASS}
					/>
				</TextField>
				<TextField className="space-y-1">
					<Label htmlFor="event-venue-map" className={LABEL_CLASS}>
						Enlace al mapa
					</Label>
					<Input
						id="event-venue-map"
						type="url"
						value={mapUrl}
						onChange={(e) => onChange({ address, mapUrl: e.target.value })}
						className={FIELD_CLASS}
					/>
				</TextField>
				{loadError && (
					<p className="sm:col-span-2 text-xs text-error">
						No se pudo cargar Google Maps.
					</p>
				)}
			</div>
		);
	}

	const embedUrl = address
		? buildEmbedUrl(resolvedApiKey, address, mapUrl)
		: null;

	return (
		<div>
			<span className={LABEL_CLASS}>Dirección</span>
			<div ref={containerRef} />

			{address && (
				<div className="mt-2 flex items-center gap-2 text-sm text-on-surface">
					<span>{address}</span>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onPress={() => onChange({ address: "", mapUrl: "" })}
						className="text-xs font-medium text-secondary hover:underline p-0 h-auto"
					>
						Quitar
					</Button>
				</div>
			)}

			{embedUrl && (
				<iframe
					title="Mapa del lugar"
					loading="lazy"
					referrerPolicy="no-referrer-when-downgrade"
					src={embedUrl}
					className="mt-2 w-full h-48 rounded-xl border border-stone-300"
				/>
			)}

			{mapUrl && (
				<a
					href={mapUrl}
					target="_blank"
					rel="noreferrer"
					className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
				>
					Ver en Google Maps
				</a>
			)}
		</div>
	);
}
