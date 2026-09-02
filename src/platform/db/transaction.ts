import type { NeonTransaction } from "drizzle-orm/neon-serverless";
import type { TablesRelationalConfig } from "drizzle-orm/relations";

/**
 * The transaction capability shared with the audit contract. It intentionally
 * lives outside the sealed client module so no database handle is exported.
 */
export type DrizzleTx = NeonTransaction<
	Record<string, unknown>,
	TablesRelationalConfig
>;
