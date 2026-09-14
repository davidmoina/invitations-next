import { getAuth } from "#/platform/auth/better-auth";

export const runtime = "nodejs";

async function handle(request: Request): Promise<Response> {
	return getAuth().handler(request);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
