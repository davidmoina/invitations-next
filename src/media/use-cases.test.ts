import { describe, expect, test, vi } from "vitest";

const database = vi.hoisted(() => ({
	insertEventMedia: vi.fn(),
	listEventMedia: vi.fn(),
	runMutation: vi.fn(),
	setEventCoverMedia: vi.fn(),
}));

vi.mock("#/platform/db/domain-mutations", () => ({
	deleteEventMedia: vi.fn(),
	insertEventMedia: database.insertEventMedia,
	listEventMedia: database.listEventMedia,
	runMutation: database.runMutation,
	setEventCoverMedia: database.setEventCoverMedia,
}));

import { addEventMedia, setEventCoverMedia } from "./use-cases";

describe("media use cases", () => {
	test("returns complete admin media after an upload", async () => {
		database.runMutation.mockImplementation(
			async (_actor, mutation) => (await mutation({})).value,
		);
		database.insertEventMedia.mockResolvedValue({
			id: "media-1",
			imagePublicId: "events/event-1/photo",
			width: 1200,
			height: 800,
			alt: "Ceremony",
			position: 0,
			isCover: true,
		});
		const storage = {
			upload: vi.fn().mockResolvedValue({
				publicId: "events/event-1/photo",
				width: 1200,
				height: 800,
				bytes: 10,
			}),
			remove: vi.fn(),
			urlFor: (publicId: string, variant: string) =>
				`https://images.example/${publicId}/${variant}`,
		};

		const result = await addEventMedia(
			{
				kind: "organizer",
				userId: "user-1" as never,
				eventId: "event-1" as never,
				role: "owner",
			},
			{
				data: new Uint8Array(),
				filename: "photo.jpg",
				contentType: "image/jpeg",
				alt: "Ceremony",
				position: 0,
			},
			storage,
		);

		expect(result).toEqual({
			id: "media-1",
			imagePublicId: "events/event-1/photo",
			alt: "Ceremony",
			position: 0,
			isCover: true,
			urls: {
				thumb: "https://images.example/events/event-1/photo/thumb",
				card: "https://images.example/events/event-1/photo/card",
				full: "https://images.example/events/event-1/photo/full",
			},
		});
	});

	describe("setEventCoverMedia", () => {
		test("returns storage-derived URLs for every media item", async () => {
			database.runMutation.mockImplementation(
				async (_actor, mutation) => (await mutation({})).value,
			);
			database.setEventCoverMedia.mockResolvedValue({
				id: "media-1",
				imagePublicId: "events/event-1/cover",
				alt: "Cover",
				position: 0,
				isCover: true,
			});
			database.listEventMedia.mockResolvedValue([
				{
					id: "media-1",
					imagePublicId: "events/event-1/cover",
					alt: "Cover",
					position: 0,
					isCover: true,
				},
			]);
			const storage = {
				upload: vi.fn(),
				remove: vi.fn(),
				urlFor: (publicId: string, variant: string) =>
					`https://images.example/${publicId}/${variant}`,
			};

			const result = await setEventCoverMedia(
				{
					kind: "organizer",
					userId: "user-1" as never,
					eventId: "event-1" as never,
					role: "owner",
				},
				"media-1",
				storage,
			);

			expect(result).toEqual({
				media: [
					{
						id: "media-1",
						imagePublicId: "events/event-1/cover",
						alt: "Cover",
						position: 0,
						isCover: true,
						urls: {
							thumb: "https://images.example/events/event-1/cover/thumb",
							card: "https://images.example/events/event-1/cover/card",
							full: "https://images.example/events/event-1/cover/full",
						},
					},
				],
			});
		});
	});
});
