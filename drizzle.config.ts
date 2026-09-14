import { defineConfig } from "drizzle-kit";

import { selectMigrationDatabaseUrl } from "./src/platform/db/database-target.ts";

const databaseUrl = selectMigrationDatabaseUrl(process.env);

export default defineConfig({
	dialect: "postgresql",
	schema: "./src/platform/db/schema/index.ts",
	out: "./drizzle",
	dbCredentials: {
		url: databaseUrl,
	},
});
