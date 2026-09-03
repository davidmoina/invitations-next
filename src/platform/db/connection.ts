import "server-only";

import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import { selectRuntimeDatabaseUrl } from "#/platform/db/database-target";
import * as schema from "#/platform/db/schema";
import { serverEnv } from "#/platform/env";

neonConfig.webSocketConstructor = ws;

function createDatabase() {
	const env = serverEnv();
	const connectionString = selectRuntimeDatabaseUrl({
		...env,
		NODE_ENV: process.env.NODE_ENV,
	});

	return drizzle({ client: new Pool({ connectionString }), schema });
}

export type Database = ReturnType<typeof createDatabase>;

let database: Database | undefined;

/**
 * The single connection pool for the whole sealed database module. Built on
 * first use, never at import time, so environment variables are read when a
 * request needs them (design D11: module-scope env reads can evaluate to
 * `undefined` on edge runtimes). Only files under `src/platform/db/**` may
 * import this; nothing outside the seal ever receives the handle.
 */
export function getDatabase(): Database {
	database ??= createDatabase();
	return database;
}
