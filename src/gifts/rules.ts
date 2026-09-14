import type { AdminGift } from "#/server/contracts/admin";
import type { PublicGift } from "#/server/contracts/public";

/**
 * How many active reservations one guest may hold at once. Enforced on the
 * server in `reserveGift`; the guest registry UI reads the same constant to
 * disable the reserve action once the guest is at the cap. Runtime-inert
 * module (type-only imports), so the client bundle can import it too.
 */
export const MAX_GIFT_RESERVATIONS_PER_GUEST = 2;

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
