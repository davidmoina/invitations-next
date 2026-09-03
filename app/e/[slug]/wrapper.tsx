"use client";

import { useRouter } from "next/navigation";
import {
	cancelReservation,
	registerGuest,
	requestGuestLink,
	reserveGift,
	submitMessage,
	submitRsvp,
} from "#/api-client";
import type { PublicEventPageProps } from "#/ui/public-event-page";
import { PublicEventPage } from "#/ui/public-event-page";

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
	const router = useRouter();
	return (
		<PublicEventPage
			{...data}
			onSubmitRsvp={(input) => submitRsvp({ slug, ...input })}
			onReserveGift={(input) => reserveGift({ slug, ...input })}
			onCancelReservation={(input) => cancelReservation({ slug, ...input })}
			onSubmitMessage={(input) => submitMessage({ slug, ...input })}
			onRequestGuestLink={(input) => requestGuestLink({ slug, ...input })}
			onRegisterGuest={async (input) => {
				const result = await registerGuest({
					slug,
					...input,
				});
				if (!result.ok) return result;
				// The secure cookie is now set. Refresh the route loader.
				router.refresh();
				return { ok: true };
			}}
		/>
	);
}
