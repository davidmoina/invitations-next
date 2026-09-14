type DatabaseEnvironment = {
	DATABASE_URL?: string;
	DATABASE_URL_TEST?: string;
	DATABASE_MIGRATION_TARGET?: string;
	NODE_ENV?: string;
};

function requireDatabaseUrl(
	value: string | undefined,
	variable: string,
): string {
	if (!value?.trim()) {
		throw new Error(
			`${variable} is required for the selected database target.`,
		);
	}

	return value;
}

export function selectRuntimeDatabaseUrl(
	environment: DatabaseEnvironment,
): string {
	return environment.NODE_ENV === "production"
		? requireDatabaseUrl(environment.DATABASE_URL, "DATABASE_URL")
		: requireDatabaseUrl(environment.DATABASE_URL_TEST, "DATABASE_URL_TEST");
}

export function selectMigrationDatabaseUrl(
	environment: DatabaseEnvironment,
): string {
	switch (environment.DATABASE_MIGRATION_TARGET) {
		case "development":
			return requireDatabaseUrl(
				environment.DATABASE_URL_TEST,
				"DATABASE_URL_TEST",
			);
		case "production":
			return requireDatabaseUrl(environment.DATABASE_URL, "DATABASE_URL");
		default:
			throw new Error(
				"DATABASE_MIGRATION_TARGET must be explicitly set to development or production.",
			);
	}
}
