import { afterEach, describe, expect, it } from "vitest";

import { serverEnv } from "./env";

const serverEnvKeys = [
	"DATABASE_URL",
	"DATABASE_URL_TEST",
	"BETTER_AUTH_SECRET",
	"BETTER_AUTH_URL",
	"APP_ORIGIN",
	"CLOUDINARY_CLOUD_NAME",
	"CLOUDINARY_API_KEY",
	"CLOUDINARY_API_SECRET",
	"RESEND_API_KEY",
	"EMAIL_FROM",
] as const;

const originalEnvironment = Object.fromEntries(
	serverEnvKeys.map((key) => [key, process.env[key]]),
);

function restoreEnvironment() {
	for (const key of serverEnvKeys) {
		const value = originalEnvironment[key];
		if (value === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	}
}

afterEach(restoreEnvironment);

describe("serverEnv", () => {
	it("reports every missing server-only variable together", () => {
		for (const key of serverEnvKeys) delete process.env[key];

		expect(() => serverEnv()).toThrow(
			"DATABASE_URL, DATABASE_URL_TEST, BETTER_AUTH_SECRET, BETTER_AUTH_URL, APP_ORIGIN, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, RESEND_API_KEY, EMAIL_FROM",
		);
	});

	it("returns validated values when every server-only variable is supplied", () => {
		for (const key of serverEnvKeys) process.env[key] = `${key}_value`;
		process.env.DATABASE_URL = "postgresql://database.example/app";
		process.env.DATABASE_URL_TEST = "postgresql://database.example/test";
		process.env.BETTER_AUTH_URL = "https://auth.example";
		process.env.APP_ORIGIN = "https://app.example";
		process.env.EMAIL_FROM = "Invitations <hello@example.com>";

		expect(serverEnv()).toMatchObject({
			DATABASE_URL: "postgresql://database.example/app",
			DATABASE_URL_TEST: "postgresql://database.example/test",
			BETTER_AUTH_URL: "https://auth.example",
			APP_ORIGIN: "https://app.example",
		});
	});
});
