"use client";

import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { EventList } from "#/ui/components/admin/event-list";

export function AdminHomeWrapper({
	events,
}: {
	events: ComponentProps<typeof EventList>["events"];
}) {
	const router = useRouter();
	return (
		<EventList
			events={events}
			eventHref={(eventId) => `/admin/${eventId}`}
			newEventHref="/admin/new"
			homeHref="/admin"
			onSignOut={async () => {
				await fetch("/api/auth/sign-out", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: "{}",
				});
				router.push("/");
				router.refresh();
			}}
		/>
	);
}
