"use client";

import {
	cancelReservation,
	requestGuestLink,
	reserveGift,
	submitMessage,
	submitRsvp,
} from "#/api-client";
import type {
	PublicEventPreviewProps,
	RequestGuestLinkInput,
} from "#/server/contracts/public";
import type { PublicEventPageProps } from "#/ui/public-event-page";
import { PublicEventPage } from "#/ui/public-event-page";
import { PublicEventPreview } from "#/ui/public-event-preview";

export function PublicEventPageWrapper({
	data,
	slug,
}: {
	data: Omit<
		PublicEventPageProps,
		| "onRegisterGuest"
		| "onSubmitRsvp"
		| "onReserveGift"
		| "onCancelReservation"
		| "onSubmitMessage"
		| "onRequestGuestLink"
	>;
	slug: string;
}) {
	return (
		<PublicEventPage
			{...data}
			onSubmitRsvp={(input) => submitRsvp({ slug, ...input })}
			onReserveGift={(input) => reserveGift({ slug, ...input })}
			onCancelReservation={(input) => cancelReservation({ slug, ...input })}
			onSubmitMessage={(input) => submitMessage({ slug, ...input })}
			onRequestGuestLink={(input: RequestGuestLinkInput) =>
				requestGuestLink({ slug, ...input })
			}
		/>
	);
}

export function PublicEventPreviewWrapper({
	event,
	slug,
}: {
	event: PublicEventPreviewProps["event"];
	slug: string;
}) {
	return (
		<PublicEventPreview
			event={event}
			onRequestGuestLink={(input: RequestGuestLinkInput) =>
				requestGuestLink({ slug, ...input })
			}
		/>
	);
}
