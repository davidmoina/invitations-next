import type {
	AddGuestsResult,
	AddMediaResult,
	AdminAuditEntry,
	AdminEvent,
	AdminEventListItem,
	AdminEventPageData,
	AdminGift,
	AdminGuest,
	AdminMembership,
	CreatedEvent,
	IssueGuestLinkResult,
	NewEventInput,
	RemoveMediaResult,
	TransferOwnershipResult,
} from "#/server/contracts/admin";
import type {
	PublicEventPageData,
	RegisterGuestInput,
	RegisterGuestResult,
	RequestGuestLinkInput,
	RequestGuestLinkResult,
	ReserveGiftResult,
	RsvpResult,
} from "#/server/contracts/public";
import { decodeAccessError } from "#/server/http/errors";

export type RequestOptions = {
	method?: "GET" | "POST" | "PATCH" | "DELETE";
	body?: BodyInit;
	headers?: HeadersInit;
	cache?: RequestCache;
};

export type ApiRequest = <T>(
	path: string,
	options?: RequestOptions,
) => Promise<T>;

export type EventScope = { eventId: AdminEvent["id"] };
export type GuestInput = Pick<AdminGuest, "displayName" | "email" | "phone">;
export type GiftInput = Pick<
	AdminGift,
	"title" | "description" | "imagePublicId" | "url"
> & { position: number };
export type GuestUpdate = Partial<
	Pick<
		AdminGuest,
		"displayName" | "email" | "phone" | "attending" | "companions"
	>
>;
export type GiftUpdate = Partial<GiftInput>;
type AddedGuests = Extract<AddGuestsResult, { ok: true }>["value"]["added"];
type IssuedGuestLink = Extract<IssueGuestLinkResult, { ok: true }>["value"];

export type ApiClient = {
	signUp(input: {
		name: string;
		email: string;
		password: string;
	}): Promise<{ ok: boolean }>;
	signIn(input: { email: string; password: string }): Promise<{ ok: boolean }>;
	signOut(): Promise<{ ok: boolean }>;
	requireSession(): Promise<{ userId: string }>;
	getOrganizerEvents(): Promise<AdminEventListItem[]>;
	createEvent(input: NewEventInput): Promise<CreatedEvent>;
	getAdminEvent(input: EventScope): Promise<AdminEventPageData>;
	updateEvent(
		input: EventScope & NewEventInput & { status: AdminEvent["status"] },
	): Promise<AdminEvent>;
	deleteEvent(input: EventScope): Promise<void>;
	listAdminAudit(input: EventScope): Promise<AdminAuditEntry[]>;
	inviteCollaborator(
		input: EventScope & { email: string },
	): Promise<AdminMembership>;
	removeCollaborator(
		input: EventScope & { userId: string },
	): Promise<AdminMembership>;
	transferOwnershipAdmin(
		input: EventScope & { nextOwnerId: string },
	): Promise<TransferOwnershipResult>;
	addGuests(input: EventScope & { guests: GuestInput[] }): Promise<AddedGuests>;
	editGuest(
		input: EventScope & { guestId: string } & GuestUpdate,
	): Promise<AdminGuest>;
	issueGuestLink(
		input: EventScope & { guestId: string },
	): Promise<IssuedGuestLink>;
	createGift(input: EventScope & GiftInput): Promise<AdminGift>;
	editGift(
		input: EventScope & { giftId: string } & GiftUpdate,
	): Promise<AdminGift>;
	cancelReservationAdmin(
		input: EventScope & { giftId: string },
	): Promise<ReserveGiftResult>;
	addEventMedia(
		input: EventScope & { file: File; alt: string; position: number },
	): Promise<AddMediaResult>;
	removeEventMedia(
		input: EventScope & { mediaId: string },
	): Promise<RemoveMediaResult>;
	getPublicEvent(input: { slug: string }): Promise<PublicEventPageData>;
	requestGuestLink(
		input: { slug: string } & RequestGuestLinkInput,
	): Promise<RequestGuestLinkResult>;
	registerGuest(
		input: { slug: string } & RegisterGuestInput,
	): Promise<RegisterGuestResult>;
	submitRsvp(input: {
		slug: string;
		attending: boolean;
		companions: number;
	}): Promise<RsvpResult>;
	submitMessage(input: {
		slug: string;
		body: string;
	}): Promise<{ ok: boolean }>;
	reserveGift(input: {
		slug: string;
		giftId: string;
	}): Promise<ReserveGiftResult>;
	cancelReservation(input: {
		slug: string;
		giftId: string;
	}): Promise<ReserveGiftResult>;
};

function json(body: unknown): RequestOptions {
	return {
		body: JSON.stringify(body),
		headers: { "content-type": "application/json" },
	};
}

function eventPath(eventId: string): string {
	return `/api/events/${encodeURIComponent(eventId)}`;
}

function publicPath(slug: string): string {
	return `/api/public/${encodeURIComponent(slug)}`;
}

export function createApiClient(request: ApiRequest): ApiClient {
	return {
		signUp: async (input) => {
			await request<unknown>("/api/auth/sign-up/email", {
				method: "POST",
				...json(input),
			});
			return { ok: true };
		},
		signIn: async (input) => {
			await request<unknown>("/api/auth/sign-in/email", {
				method: "POST",
				...json(input),
			});
			return { ok: true };
		},
		requireSession: () => request("/api/session", { cache: "no-store" }),
		getOrganizerEvents: () => request("/api/events", { cache: "no-store" }),
		createEvent: (input) =>
			request("/api/events", { method: "POST", ...json(input) }),
		signOut: async () => {
			await request<unknown>("/api/auth/sign-out", {
				method: "POST",
				...json({}),
			});
			return { ok: true };
		},
		getAdminEvent: ({ eventId }) =>
			request(eventPath(eventId), { cache: "no-store" }),
		updateEvent: ({ eventId, ...input }) =>
			request(eventPath(eventId), { method: "PATCH", ...json(input) }),
		deleteEvent: async ({ eventId }) => {
			await request<unknown>(eventPath(eventId), { method: "DELETE" });
		},
		listAdminAudit: ({ eventId }) =>
			request(`${eventPath(eventId)}/audit`, { cache: "no-store" }),
		inviteCollaborator: ({ eventId, email }) =>
			request(`${eventPath(eventId)}/collaborators`, {
				method: "POST",
				...json({ email }),
			}),
		removeCollaborator: ({ eventId, userId }) =>
			request(
				`${eventPath(eventId)}/collaborators/${encodeURIComponent(userId)}`,
				{
					method: "DELETE",
				},
			),
		transferOwnershipAdmin: ({ eventId, nextOwnerId }) =>
			request(`${eventPath(eventId)}/collaborators/transfer`, {
				method: "POST",
				...json({ nextOwnerId }),
			}),
		addGuests: ({ eventId, guests }) =>
			request(`${eventPath(eventId)}/guests`, {
				method: "POST",
				...json({ guests }),
			}),
		editGuest: ({ eventId, guestId, ...input }) =>
			request(`${eventPath(eventId)}/guests/${encodeURIComponent(guestId)}`, {
				method: "PATCH",
				...json(input),
			}),
		issueGuestLink: ({ eventId, guestId }) =>
			request(
				`${eventPath(eventId)}/guests/${encodeURIComponent(guestId)}/link`,
				{
					method: "POST",
				},
			),
		createGift: ({ eventId, ...input }) =>
			request(`${eventPath(eventId)}/gifts`, {
				method: "POST",
				...json(input),
			}),
		editGift: ({ eventId, giftId, ...input }) =>
			request(`${eventPath(eventId)}/gifts/${encodeURIComponent(giftId)}`, {
				method: "PATCH",
				...json(input),
			}),
		cancelReservationAdmin: ({ eventId, giftId }) =>
			request(
				`${eventPath(eventId)}/gifts/${encodeURIComponent(giftId)}/reservation`,
				{
					method: "DELETE",
				},
			),
		addEventMedia: async ({ eventId, file, alt, position }) => {
			const form = new FormData();
			form.set("file", file);
			form.set("alt", alt);
			form.set("position", String(position));
			return request(`${eventPath(eventId)}/media`, {
				method: "POST",
				body: form,
			});
		},
		removeEventMedia: ({ eventId, mediaId }) =>
			request(`${eventPath(eventId)}/media/${encodeURIComponent(mediaId)}`, {
				method: "DELETE",
			}),
		getPublicEvent: ({ slug }) => request(publicPath(slug)),
		requestGuestLink: ({ slug, ...input }) =>
			request(`${publicPath(slug)}/access`, {
				method: "POST",
				...json(input),
			}),
		registerGuest: ({ slug, ...input }) =>
			request(`${publicPath(slug)}/guests`, { method: "POST", ...json(input) }),
		submitRsvp: ({ slug, ...input }) =>
			request(`${publicPath(slug)}/rsvp`, { method: "POST", ...json(input) }),
		submitMessage: ({ slug, body }) =>
			request(`${publicPath(slug)}/messages`, {
				method: "POST",
				...json({ body }),
			}),
		reserveGift: ({ slug, giftId }) =>
			request(
				`${publicPath(slug)}/gifts/${encodeURIComponent(giftId)}/reservation`,
				{
					method: "POST",
				},
			),
		cancelReservation: ({ slug, giftId }) =>
			request(
				`${publicPath(slug)}/gifts/${encodeURIComponent(giftId)}/reservation`,
				{
					method: "DELETE",
				},
			),
	};
}

export async function parseResponse<T>(response: Response): Promise<T> {
	if (!response.ok) {
		const accessError = await decodeAccessError(response);
		if (accessError) throw accessError;
		throw new Error(`API request failed with status ${response.status}.`);
	}
	if (response.status === 204) return undefined as T;
	return (await response.json()) as T;
}
