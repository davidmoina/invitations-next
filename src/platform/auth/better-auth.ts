import "server-only";

import { betterAuth } from "better-auth";

import {
	createBetterAuthAdapter,
	createOrganizerProfile,
} from "#/platform/db/auth-adapter";
import { serverEnv } from "#/platform/env";

function createAuth() {
	const env = serverEnv();

	return betterAuth({
		database: createBetterAuthAdapter(),
		baseURL: env.BETTER_AUTH_URL,
		secret: env.BETTER_AUTH_SECRET,
		emailAndPassword: { enabled: true },
		databaseHooks: {
			user: {
				create: {
					// better-auth@1.7.1 declares this as
					// `after(user, context): Promise<void>` in its shipped types.
					after: async (user) => createOrganizerProfile(user.id),
				},
			},
		},
	});
}

let instance: ReturnType<typeof createAuth> | undefined;

/**
 * Builds the Better Auth instance on first use. Reading secrets at import
 * time would evaluate them before the request environment exists (design
 * D11), so construction is deferred to the first caller.
 */
export function getAuth(): ReturnType<typeof createAuth> {
	instance ??= createAuth();
	return instance;
}
