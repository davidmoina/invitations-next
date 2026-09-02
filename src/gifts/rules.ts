import type { AdminGift } from "#/server/contracts/admin";
import type { PublicGift } from "#/server/contracts/public";

type GiftWithReservation = {
	id: string;
	title: string;
	description: string | null;
	imagePublicId: string | null;
	url: string | null;
	reservation: { guestId: string; displayName: string } | null;
};

export function toPublicDto(
	gift: GiftWithReservation,
	viewerGuestId: string | null,
): PublicGift {
	return {
		id: gift.id,
		title: gift.title,
		description: gift.description,
		imagePublicId: gift.imagePublicId,
		url: gift.url,
		status: gift.reservation ? "reserved" : "available",
		reservedByMe: gift.reservation?.guestId === viewerGuestId,
	};
}

export function toAdminDto(gift: GiftWithReservation): AdminGift {
	return {
		id: gift.id,
		title: gift.title,
		description: gift.description,
		imagePublicId: gift.imagePublicId,
		url: gift.url,
		status: gift.reservation ? "reserved" : "available",
		reservedBy: gift.reservation,
	};
}
