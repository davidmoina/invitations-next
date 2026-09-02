import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

const requestContext = new AsyncLocalStorage<Request>();

export function withRequestContext<T>(request: Request, operation: () => T): T {
	return requestContext.run(request, operation);
}

export function currentRequest(): Request {
	const request = requestContext.getStore();
	if (!request) throw new Error("No HTTP request context is active.");
	return request;
}
