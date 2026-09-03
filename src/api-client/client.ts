import { createApiClient, parseResponse, type RequestOptions } from "./shared";

async function request<T>(
	path: string,
	options: RequestOptions = {},
): Promise<T> {
	const response = await fetch(path, {
		...options,
		credentials: "same-origin",
	});
	return parseResponse<T>(response);
}

export const {
	signUp,
	signIn,
	signOut,
	requireSession,
	getOrganizerEvents,
	createEvent,
	getAdminEvent,
	updateEvent,
	deleteEvent,
	listAdminAudit,
	inviteCollaborator,
	removeCollaborator,
	transferOwnershipAdmin,
	addGuests,
	editGuest,
	createGift,
	editGift,
	cancelReservationAdmin,
	addEventMedia,
	removeEventMedia,
	getPublicEvent,
	registerGuest,
	submitRsvp,
	submitMessage,
	reserveGift,
	cancelReservation,
} = createApiClient(request);
