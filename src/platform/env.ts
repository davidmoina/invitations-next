import "server-only";

import { z } from "zod";

const serverEnvironmentSchema = z.object({
	DATABASE_URL: z.string().min(1),
	DATABASE_URL_TEST: z.string().min(1),
	BETTER_AUTH_SECRET: z.string().min(1),
	BETTER_AUTH_URL: z.url(),
	APP_ORIGIN: z.url(),
	CLOUDINARY_CLOUD_NAME: z.string().min(1),
	CLOUDINARY_API_KEY: z.string().min(1),
	CLOUDINARY_API_SECRET: z.string().min(1),
	RESEND_API_KEY: z.string().min(1),
	EMAIL_FROM: z.string().min(1),
});

const serverEnvironmentKeys = Object.keys(
	serverEnvironmentSchema.shape,
) as Array<keyof typeof serverEnvironmentSchema.shape>;

export const serverEnv = () => {
	const parsed = serverEnvironmentSchema.safeParse(process.env);

	if (!parsed.success) {
		const missingKeys: string[] = serverEnvironmentKeys.filter(
			(key) => !process.env[key]?.trim(),
		);
		const invalidKeys = parsed.error.issues
			.map((issue) => issue.path[0])
			.filter((key): key is string => typeof key === "string")
			.filter((key) => !missingKeys.includes(key));
		const invalidDescription = invalidKeys.length
			? `; invalid values: ${invalidKeys.join(", ")}`
			: "";

		throw new Error(
			`Missing required server environment variables: ${missingKeys.join(", ")}${invalidDescription}`,
		);
	}

	return parsed.data;
};
