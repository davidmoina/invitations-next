"use client";

import { useRouter } from "next/navigation";
import {
	cancelReservation,
	registerGuest,
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
	>;
	slug: string;
}) {
	const router = useRouter();
	return (
		<PublicEventPage
			{...data}
			onSubmitRsvp={(input) => submitRsvp({ data: input })}
			onReserveGift={(input) => reserveGift({ data: input })}
			onCancelReservation={(input) => cancelReservation({ data: input })}
			onSubmitMessage={(input) => submitMessage({ data: input })}
			onRegisterGuest={async (input) => {
				const result = await registerGuest({
					data: { slug, ...input },
				});
				if (!result.ok) return result;
				// The secure cookie is now set. Refresh the route loader.
				router.refresh();
				return { ok: true };
			}}
		/>
	);
}
