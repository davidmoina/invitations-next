import { errorResponse } from "./errors";
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
			return errorResponse(error);
		}
	});
}
