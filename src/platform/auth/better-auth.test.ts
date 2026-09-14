import { readFile } from "node:fs/promises";

import { expect, test } from "vitest";

test("Better Auth receives an adapter factory, never an exported database handle", async () => {
	const [authSource, bootstrapSource] = await Promise.all([
		readFile(new URL("./better-auth.ts", import.meta.url), "utf8"),
		readFile(new URL("../db/bootstrap.ts", import.meta.url), "utf8").catch(
			() => null,
		),
	]);

	expect(authSource).toContain("createBetterAuthAdapter");
	expect(authSource).not.toContain("bootstrapDb");
	expect(bootstrapSource).toBeNull();
});

test("Better Auth reuses the sealed module's pool instead of building its own", async () => {
	const source = await readFile(
		new URL("../db/auth-adapter.ts", import.meta.url),
		"utf8",
	);

	expect(source).toContain("getDatabase()");
	expect(source).not.toContain("new Pool");
});

test("auth secrets are never read at import time", async () => {
	const source = await readFile(
		new URL("./better-auth.ts", import.meta.url),
		"utf8",
	);

	// `serverEnv()` must only ever be called from inside a function body.
	expect(source).not.toMatch(/^const\s+\w+\s*=\s*serverEnv\(\)/m);
});
