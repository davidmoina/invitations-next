import { describe, expect, it } from "vitest";

import {
	selectMigrationDatabaseUrl,
	selectRuntimeDatabaseUrl,
} from "./database-target";

const urls = {
	DATABASE_URL: "postgresql://production.example/app",
	DATABASE_URL_TEST: "postgresql://test.example/app",
};

describe("database target selection", () => {
	it("uses the test database for local development and test execution", () => {
		expect(selectRuntimeDatabaseUrl({ ...urls, NODE_ENV: "development" })).toBe(
			urls.DATABASE_URL_TEST,
		);
		expect(selectRuntimeDatabaseUrl({ ...urls, NODE_ENV: "test" })).toBe(
			urls.DATABASE_URL_TEST,
		);
	});

	it("uses the production database only in the production runtime", () => {
		expect(selectRuntimeDatabaseUrl({ ...urls, NODE_ENV: "production" })).toBe(
			urls.DATABASE_URL,
		);
	});

	it("requires migrations to name their target explicitly", () => {
		expect(
			selectMigrationDatabaseUrl({
				...urls,
				DATABASE_MIGRATION_TARGET: "development",
			}),
		).toBe(urls.DATABASE_URL_TEST);
		expect(
			selectMigrationDatabaseUrl({
				...urls,
				DATABASE_MIGRATION_TARGET: "production",
			}),
		).toBe(urls.DATABASE_URL);
		expect(() => selectMigrationDatabaseUrl(urls)).toThrow(
			"DATABASE_MIGRATION_TARGET",
		);
	});
});
