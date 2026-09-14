/** A request can mutate state only after the proxy checks its origin. */
export function shouldValidateRequest(method: string): boolean {
	return !["GET", "HEAD", "OPTIONS"].includes(method);
}

export function hasSameOrigin(request: Request): boolean {
	const origin = request.headers.get("origin");
	return origin !== null && origin === new URL(request.url).origin;
}
