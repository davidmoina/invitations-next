"use client";

import { useRouter } from "next/navigation";
import { createEvent } from "#/api-client";
import { CreateEventForm } from "#/ui/components/admin/create-event-form";

export function NewEventWrapper() {
	const router = useRouter();
	return (
		<CreateEventForm
			onCreateEvent={async (input) => {
				const created = await createEvent({ data: input });
				router.push(`/admin/${created.id}`);
				router.refresh();
				return created;
			}}
		/>
	);
}
