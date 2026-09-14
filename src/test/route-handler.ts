/** Typed in-process transport for testing exported Next Route Handlers. */
export type RouteParams = Record<string, string>;

type RequestOptions = {
	path: string;
	method?: "GET" | "POST" | "PATCH" | "DELETE";
	headers?: HeadersInit;
	body?: BodyInit;
};

type JsonRequestOptions = Omit<RequestOptions, "body" | "headers"> & {
	body: unknown;
	headers?: HeadersInit;
};

export function request(options: RequestOptions): Request {
	return new Request(`https://app.test${options.path}`, {
		method: options.method ?? "GET",
		headers: options.headers,
		body: options.body,
	});
}

export function jsonRequest(options: JsonRequestOptions): Request {
	const headers = new Headers(options.headers);
	headers.set("content-type", "application/json");
	return request({
		...options,
		headers,
		body: JSON.stringify(options.body),
	});
}

export async function callRoute(
	handler: (request: Request) => Promise<Response>,
	options: RequestOptions,
): Promise<Response> {
	return handler(request(options));
}

export async function callJsonRoute(
	handler: (request: Request) => Promise<Response>,
	options: JsonRequestOptions,
): Promise<Response> {
	return handler(jsonRequest(options));
}

export async function callParameterizedRoute<P extends RouteParams>(
	handler: (
		request: Request,
		context: { params: Promise<P> },
	) => Promise<Response>,
	options: RequestOptions & { params: P },
): Promise<Response> {
	return handler(request(options), { params: Promise.resolve(options.params) });
}

export async function callParameterizedJsonRoute<P extends RouteParams>(
	handler: (
		request: Request,
		context: { params: Promise<P> },
	) => Promise<Response>,
	options: JsonRequestOptions & { params: P },
): Promise<Response> {
	return handler(jsonRequest(options), {
		params: Promise.resolve(options.params),
	});
}

export function cookieHeader(cookie: string): HeadersInit {
	return { cookie };
}

export function responseCookies(response: Response): string[] {
	return response.headers.getSetCookie();
}
