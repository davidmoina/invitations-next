"use client";

import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { MultiEventDashboard } from "#/ui/components/admin/multi-event-dashboard";

export function AdminDashboardWrapper({
	events,
}: {
	events: ComponentProps<typeof MultiEventDashboard>["events"];
}) {
	const router = useRouter();
	return (
		<MultiEventDashboard
			events={events}
			eventHref={(eventId) => `/admin/${eventId}`}
			newEventHref="/admin/new"
			eventsHref="/admin"
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
