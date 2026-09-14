import { type NextRequest, NextResponse } from "next/server";

import { hasSameOrigin, shouldValidateRequest } from "#/server/middleware/csrf";

/** The single same-origin boundary for every extractable HTTP endpoint. */
export function proxy(request: NextRequest): NextResponse {
	if (shouldValidateRequest(request.method) && !hasSameOrigin(request)) {
		return NextResponse.json({ code: "forbidden" }, { status: 403 });
	}
	return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
