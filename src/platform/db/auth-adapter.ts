import "server-only";

import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDatabase } from "#/platform/db/connection";
import { organizerProfile } from "#/platform/db/schema/domain";

/**
 * Supplies Better Auth's adapter over the module's single connection pool,
 * without publishing the Drizzle handle outside the seal.
 */
export function createBetterAuthAdapter() {
	return drizzleAdapter(getDatabase(), { provider: "pg" });
}

/**
 * Creates the account-level domain row that every Better Auth user owns.
 * This is deliberately inside the database seal: auth configuration must not
 * receive a general-purpose Drizzle handle just to perform this one write.
 */
export async function createOrganizerProfile(userId: string): Promise<void> {
	await getDatabase()
		.insert(organizerProfile)
		.values({ userId, plan: "free" })
		.onConflictDoNothing();
}
