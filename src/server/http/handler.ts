import { errorResponse, isExpectedFailure } from "./errors";
import { withRequestContext } from "./request-context";

/** Establishes one request context and one owned error wire format per route. */
export function handleRoute(
	request: Request,
	operation: () => Promise<Response>,
): Promise<Response> {
	return withRequestContext(request, async () => {
		try {
			return await operation();
		} catch (error) {
			// Expected failures already reach the client as a typed status; an
			// unexpected one only ever surfaces as an opaque 500, so it must
			// leave its cause in the server log.
			if (!isExpectedFailure(error)) {
				const { pathname } = new URL(request.url);
				console.error(
					`Unhandled error in ${request.method} ${pathname}`,
					error,
				);
			}
			return errorResponse(error);
		}
	});
}
