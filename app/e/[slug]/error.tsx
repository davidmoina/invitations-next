"use client";

import { EventAccessError } from "#/ui/event-error";

export default function ErrorPage({
	error,
}: {
	error: Error & { digest?: string };
}) {
	return <EventAccessError error={error} />;
}
