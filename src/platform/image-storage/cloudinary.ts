import "server-only";

import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";

import type { ImageStorage } from "#/media/ports/image-storage";
import { serverEnv } from "#/platform/env";

function configuredCloudinary() {
	const env = serverEnv();
	cloudinary.config({
		cloud_name: env.CLOUDINARY_CLOUD_NAME,
		api_key: env.CLOUDINARY_API_KEY,
		api_secret: env.CLOUDINARY_API_SECRET,
		secure: true,
	});
	return cloudinary;
}

export const cloudinaryImageStorage: ImageStorage = {
	async upload(input) {
		const client = configuredCloudinary();
		const bytes =
			input.data instanceof Uint8Array
				? input.data
				: new Uint8Array(await new Response(input.data).arrayBuffer());
		try {
			const result = await client.uploader.upload(
				`data:${input.contentType};base64,${Buffer.from(bytes).toString("base64")}`,
				{
					folder: input.folder,
					public_id: randomUUID(),
					resource_type: "image",
				},
			);
			return {
				publicId: result.public_id,
				width: result.width,
				height: result.height,
				bytes: result.bytes,
			};
		} catch (error) {
			console.error("Cloudinary image upload failed", {
				contentType: input.contentType,
				bytes: bytes.byteLength,
				folder: input.folder,
				error,
			});
			throw error;
		}
	},
	async remove(publicId) {
		await configuredCloudinary().uploader.destroy(publicId, {
			resource_type: "image",
		});
	},
	urlFor(publicId, variant) {
		const width = ({ thumb: 240, card: 800, full: 1600 } as const)[variant];
		const extension = publicId.split("/").at(-1)?.split(".").at(-1);
		const format =
			extension && publicId.endsWith(`.${extension}`) ? extension : undefined;
		return configuredCloudinary().url(publicId, {
			transformation: [{ width, crop: "limit" }],
			...(format ? { format } : {}),
			secure: true,
		});
	},
};
