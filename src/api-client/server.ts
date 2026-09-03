import "server-only";

import { cookies, headers } from "next/headers";

import { createApiClient, parseResponse, type RequestOptions } from "./shared";

function apiBaseUrl(): string {
	const origin = process.env.APP_ORIGIN;
	if (!origin)
		throw new Error("APP_ORIGIN is required for server API requests.");
	return origin;
}

async function request<T>(
	path: string,
	options: RequestOptions = {},
): Promise<T> {
	const [cookieStore, requestHeaders] = await Promise.all([
		cookies(),
		headers(),
	]);
	const cookie = cookieStore.toString() || requestHeaders.get("cookie") || "";
	const outgoingHeaders = new Headers(options.headers);
	if (cookie) outgoingHeaders.set("cookie", cookie);
	const response = await fetch(new URL(path, apiBaseUrl()), {
		...options,
		headers: outgoingHeaders,
		cache: options.cache,
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
