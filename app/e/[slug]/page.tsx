import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { getPublicEvent } from "#/api-client";
import { accessErrorCode } from "#/server/access-error";
import { PublicEventPageWrapper } from "./wrapper";

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
		redirect(`/api/guest-link?slug=${p.slug}&token=${deps.token}`);
	}

	try {
		const data = await getPublicEvent({
			data: { slug: p.slug },
		});
		return <PublicEventPageWrapper data={data} slug={p.slug} />;
	} catch (error) {
		if (accessErrorCode(error) === "not_found") notFound();
		throw error;
	}
}
