import type { z } from "zod";

export async function parseJson<T extends z.ZodType>(
	request: Request,
	schema: T,
): Promise<z.output<T>> {
	return schema.parse(await request.json());
}

export function parseSearch<T extends z.ZodType>(
	request: Request,
	schema: T,
): z.output<T> {
	return schema.parse(Object.fromEntries(new URL(request.url).searchParams));
}
