import { can } from "#/accounts/authorization";
import type { Actor } from "#/audit/actor";
import {
	deleteEventMedia,
	insertEventMedia,
	runMutation,
} from "#/platform/db/domain-mutations";

import type {
	ImageStorage,
	ImageVariant,
	StoredImage,
} from "./ports/image-storage";

export type GalleryImage = StoredImage & { urls: Record<ImageVariant, string> };

export function galleryImage(
	storage: ImageStorage,
	image: StoredImage,
): GalleryImage {
	return {
		...image,
		urls: {
			thumb: storage.urlFor(image.publicId, "thumb"),
			card: storage.urlFor(image.publicId, "card"),
			full: storage.urlFor(image.publicId, "full"),
		},
	};
}

function editor(actor: Actor): Extract<Actor, { kind: "organizer" }> {
	if (actor.kind !== "organizer" || !can(actor.role, "editEvent"))
		throw new Error("Organizer editor access is required");
	return actor;
}

export async function addEventMedia(
	actor: Actor,
	input: {
		data: Uint8Array | ReadableStream;
		filename: string;
		contentType: string;
		alt: string;
		position: number;
	},
	storage: ImageStorage,
) {
	const organizer = editor(actor);
	const stored = await storage.upload({
		...input,
		folder: `events/${organizer.eventId}`,
	});
	return runMutation(organizer, async (tx) => {
		const media = await insertEventMedia(tx, {
			eventId: organizer.eventId,
			imagePublicId: stored.publicId,
			width: stored.width,
			height: stored.height,
			alt: input.alt,
			position: input.position,
		});
		if (!media) throw new Error("Media row did not persist");
		return {
			value: media,
			events: [
				{
					action: "media.added",
					entityType: "event_media",
					entityId: media.id,
					eventId: organizer.eventId,
				},
			],
		};
	});
}

export async function removeEventMedia(
	actor: Actor,
	mediaId: string,
	storage: ImageStorage,
) {
	const organizer = editor(actor);
	const media = await runMutation(organizer, async (tx) => {
		const removed = await deleteEventMedia(tx, organizer.eventId, mediaId);
		if (!removed) throw new Error("Media not found for event");
		return {
			value: removed,
			events: [
				{
					action: "media.removed",
					entityType: "event_media",
					entityId: mediaId,
					eventId: organizer.eventId,
				},
			],
		};
	});
	await storage.remove(media.imagePublicId);
	return media;
}
