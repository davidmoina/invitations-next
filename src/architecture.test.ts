import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Design D9 Rule 0: "no file has two owners." These two import-graph
// guards make the seam mechanical instead of a promise in prose:
//
//   (a) no file under `src/ui/**` may import `src/server/functions`,
//       `src/server/middleware`, `src/platform`, `drizzle-orm`, or
//       `better-auth`;
//   (b) no file outside `src/platform/db/**` may import `drizzle-orm` or
//       the sealed db client.
//
// Both guards currently pass trivially — `src/ui/**` and `src/platform/**`
// do not exist yet in work unit 1. That is expected (task 1.10: "Passes
// trivially now (no violating files yet)"); once later work units add
// files under those trees, this test starts doing real work.

type SourceFile = { path: string; content: string };
type ImportViolation = { file: string; specifier: string };

const IMPORT_SPECIFIER_RE =
	/(?:import|export)\s+(?:[^'"]*?\s+from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

/** Extracts every static/dynamic import or re-export specifier string
 *  literal from a TS/TSX source file's text. Pure: no filesystem access. */
function extractImportSpecifiers(source: string): string[] {
	const specifiers: string[] = [];
	for (const match of source.matchAll(IMPORT_SPECIFIER_RE)) {
		const specifier = match[1] ?? match[2];
		if (specifier) specifiers.push(specifier);
	}
	return specifiers;
}

/** Resolves an import specifier to a project-relative path when it points
 *  inside `src/` (via the `#/*` subpath import or a relative path), or
 *  returns bare package specifiers (e.g. "drizzle-orm", "react") unchanged.
 *  Pure string math — no real filesystem or `process.cwd()` involved, so
 *  it works identically against real files and in-memory fixtures. */
function resolveSpecifier(
	importingFilePath: string,
	specifier: string,
): string {
	if (specifier.startsWith("#/")) return `src/${specifier.slice(2)}`;
	if (specifier.startsWith(".")) {
		const fromParts = importingFilePath.split("/").slice(0, -1);
		for (const part of specifier.split("/")) {
			if (part === "." || part === "") continue;
			if (part === "..") fromParts.pop();
			else fromParts.push(part);
		}
		return fromParts.join("/");
	}
	return specifier;
}

/** Scans every file's imports and reports each one a `forbidden` predicate
 *  matches, after resolving it to a project-relative (or bare) specifier. */
function findForbiddenImports(
	files: SourceFile[],
	forbidden: (resolvedSpecifier: string) => boolean,
): ImportViolation[] {
	const violations: ImportViolation[] = [];
	for (const file of files) {
		for (const specifier of extractImportSpecifiers(file.content)) {
			const resolved = resolveSpecifier(file.path, specifier);
			if (forbidden(resolved)) violations.push({ file: file.path, specifier });
		}
	}
	return violations;
}

/** Walks a real directory under the repo root and reads every `.ts`/`.tsx`
 *  source file (skipping test files and an optional excluded subtree).
 *  Returns `[]` when the directory does not exist yet — expected for
 *  `src/ui` and `src/platform` in work unit 1. */
function collectSourceFiles(
	rootDir: string,
	excludeDir?: string,
): SourceFile[] {
	if (!existsSync(rootDir)) return [];
	const results: SourceFile[] = [];
	const walk = (dir: string) => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const entryPath = `${dir}/${entry.name}`;
			if (
				excludeDir &&
				(entryPath === excludeDir || entryPath.startsWith(`${excludeDir}/`))
			)
				continue;
			if (entry.isDirectory()) {
				walk(entryPath);
			} else if (
				/\.(ts|tsx)$/.test(entry.name) &&
				!entry.name.endsWith(".test.ts") &&
				!entry.name.endsWith(".itest.ts")
			) {
				results.push({
					path: entryPath,
					content: readFileSync(entryPath, "utf8"),
				});
			}
		}
	};
	walk(rootDir);
	return results;
}

describe("findForbiddenImports (pure import-graph matcher)", () => {
	it("flags a bare vendor specifier imported from a forbidden area", () => {
		const files: SourceFile[] = [
			{
				path: "src/ui/gift-card.tsx",
				content: 'import { eq } from "drizzle-orm";\n',
			},
		];

		const violations = findForbiddenImports(files, (resolved) =>
			resolved.startsWith("drizzle-orm"),
		);

		expect(violations).toEqual([
			{ file: "src/ui/gift-card.tsx", specifier: "drizzle-orm" },
		]);
	});

	it("does not flag an allowed specifier (triangulation)", () => {
		const files: SourceFile[] = [
			{
				path: "src/ui/gift-card.tsx",
				content: 'import { PublicGift } from "#/server/contracts/public";\n',
			},
		];

		const violations = findForbiddenImports(files, (resolved) =>
			resolved.startsWith("drizzle-orm"),
		);

		expect(violations).toEqual([]);
	});

	it("resolves a relative import to a project path before matching (triangulation)", () => {
		const files: SourceFile[] = [
			{
				path: "src/events/rules.ts",
				content: 'import { db } from "../platform/db/client";\n',
			},
		];

		const violations = findForbiddenImports(files, (resolved) =>
			resolved.startsWith("src/platform"),
		);

		expect(violations).toEqual([
			{ file: "src/events/rules.ts", specifier: "../platform/db/client" },
		]);
	});
});

describe("seam guard (a): src/ui/** never touches server/platform/vendor internals", () => {
	it("finds zero violations in the real repository", () => {
		const uiFiles = collectSourceFiles("src/ui");
		const forbiddenPrefixes = [
			"src/server/functions",
			"src/server/middleware",
			"src/platform",
			"drizzle-orm",
			"better-auth",
		];

		const violations = findForbiddenImports(uiFiles, (resolved) =>
			forbiddenPrefixes.some(
				(prefix) => resolved === prefix || resolved.startsWith(`${prefix}/`),
			),
		);

		expect(violations).toEqual([]);
	});
});

describe("seam guard (b): only src/platform/db/** may import drizzle-orm or the db client", () => {
	it("finds zero violations in the real repository", () => {
		const nonDbFiles = collectSourceFiles("src", "src/platform/db");
		const forbidden = ["drizzle-orm", "src/platform/db/client"];

		const violations = findForbiddenImports(nonDbFiles, (resolved) =>
			forbidden.some(
				(prefix) => resolved === prefix || resolved.startsWith(`${prefix}/`),
			),
		);

		expect(violations).toEqual([]);
	});
});
