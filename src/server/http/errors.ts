import { z } from "zod";

import { AccessError } from "#/server/access-error";
import type { AccessErrorCode } from "#/server/contracts/errors";
import { CompanionCapError } from "#/server/domain-error";

const accessErrorSchema = z.object({
	code: z.enum(["unauthorized", "forbidden", "not_found", "conflict"]),
});

const accessErrorStatus: Record<AccessErrorCode, number> = {
	unauthorized: 401,
	forbidden: 403,
	not_found: 404,
	conflict: 409,
};

export function accessErrorResponse(error: AccessError): Response {
	return Response.json(
		{ code: error.code },
		{ status: accessErrorStatus[error.code] },
	);
}

export async function decodeAccessError(
	response: Response,
): Promise<AccessError | null> {
	const payload: unknown = await response
		.clone()
		.json()
		.catch(() => null);
	const parsed = accessErrorSchema.safeParse(payload);
	return parsed.success ? new AccessError(parsed.data.code) : null;
}

export function errorResponse(error: unknown): Response {
	if (error instanceof AccessError) return accessErrorResponse(error);
	if (error instanceof CompanionCapError)
		return Response.json(
			{ code: error.code, maxCompanions: error.maxCompanions },
			{ status: 422 },
		);
	if (error instanceof z.ZodError)
		return Response.json({ code: "invalid_request" }, { status: 400 });
	return Response.json({ code: "internal_error" }, { status: 500 });
}
