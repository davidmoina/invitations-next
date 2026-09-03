export type ImageVariant = "thumb" | "card" | "full";
export type StoredImage = {
	publicId: string;
	width: number;
	height: number;
	bytes: number;
};

export interface ImageStorage {
	upload(input: {
		data: Uint8Array | ReadableStream;
		filename: string;
		contentType: string;
		folder: string;
	}): Promise<StoredImage>;
	remove(publicId: string): Promise<void>;
	urlFor(publicId: string, variant: ImageVariant): string;
}
