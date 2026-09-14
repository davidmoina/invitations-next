/**
 * A small fixed-window limiter for route handlers. Storage is process-local:
 * on serverless deployments each instance enforces its own window, so this is
 * abuse mitigation rather than a distributed rate-limit guarantee.
 */
export type FixedWindowRateLimiter = {
	allow(key: { clientIp: string; slug: string }): boolean;
};

type Window = { startsAt: number; count: number };

export type FixedWindowRateLimiterOptions = {
	limit: number;
	windowMs: number;
	now: () => number;
	storage?: Map<string, Window>;
};

export function createFixedWindowRateLimiter({
	limit,
	windowMs,
	now,
	storage,
}: FixedWindowRateLimiterOptions): FixedWindowRateLimiter {
	const windows = storage ?? new Map<string, Window>();

	return {
		allow({ clientIp, slug }) {
			const key = `${clientIp}\u0000${slug}`;
			const currentTime = now();
			for (const [storedKey, window] of windows) {
				if (currentTime - window.startsAt >= windowMs)
					windows.delete(storedKey);
			}
			const current = windows.get(key);
			if (!current || currentTime - current.startsAt >= windowMs) {
				windows.set(key, { startsAt: currentTime, count: 1 });
				return true;
			}
			if (current.count >= limit) return false;
			current.count += 1;
			return true;
		},
	};
}

export function clientIpFrom(request: Request): string {
	return (
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
		request.headers.get("x-real-ip") ||
		"unknown"
	);
}
