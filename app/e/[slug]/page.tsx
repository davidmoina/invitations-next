import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { getPublicEvent, getPublicEventPreview } from "#/api-client/server";
import { accessErrorCode } from "#/server/access-error";
import { PublicEventPageWrapper, PublicEventPreviewWrapper } from "./wrapper";

const searchSchema = z.object({ token: z.string().optional() });

export default async function PublicEventRoute({
	params,
	searchParams,
}: {
	params: Promise<{ slug: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const p = await params;
	const s = await searchParams;
	const deps = searchSchema.parse(s);

	if (deps.token) {
		const query = new URLSearchParams({
			slug: p.slug,
			token: deps.token,
		});
		redirect(`/api/guest-link?${query.toString()}`);
	}

	try {
		const data = await getPublicEvent({
			slug: p.slug,
		});
		return <PublicEventPageWrapper data={data} slug={p.slug} />;
	} catch (error) {
		if (accessErrorCode(error) === "not_found") notFound();
		if (accessErrorCode(error) === "unauthorized") {
			const event = await getPublicEventPreview({ slug: p.slug });
			return <PublicEventPreviewWrapper event={event} slug={p.slug} />;
		}
		throw error;
	}
}
