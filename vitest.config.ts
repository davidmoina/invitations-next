import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Ported from the TanStack project with one project removed. The `bundle`
// project observed the Start Vite plugin's client-build transform of `.fn.ts`
// modules; Next has no equivalent transform to assert against, so it is
// replaced by a build-output assertion owned by the transport workstream
// (STACK.md §5 / §7.3).
//
// - unit: pure logic, node env, no database, runs in parallel workers.
// - ui: presentational components under src/ui/**, jsdom env, needs the
//   React plugin for JSX transform and its own setup file for jest-dom.
// - integration: hits a real Postgres test branch, must run serially so the
//   concurrency tests that open two real connections are not confused by
//   Vitest's own worker parallelism.
// - types: typecheck-only assertions in *.test-d.ts.
// `server-only` resolves to a module that throws unless the `react-server`
// export condition is set — that throw is the guard doing its job. Next sets
// the condition for Server Components; Vitest does not, so the server-side
// projects must set it themselves. The `ui` project deliberately does NOT:
// there the throw is the assertion that a client component never reaches a
// server module.
const serverConditions = ["react-server"];

export default defineConfig({
	test: {
		projects: [
			{
				resolve: { conditions: serverConditions },
				ssr: { resolve: { conditions: serverConditions } },
				test: {
					name: "unit",
					environment: "node",
					include: ["src/**/*.test.ts"],
				},
			},
			{
				plugins: [react()],
				test: {
					name: "ui",
					environment: "jsdom",
					include: ["src/ui/**/*.test.{ts,tsx}"],
					setupFiles: ["src/test/ui-setup.ts"],
				},
			},
			{
				resolve: { conditions: serverConditions },
				ssr: { resolve: { conditions: serverConditions } },
				test: {
					name: "integration",
					environment: "node",
					include: ["src/**/*.itest.ts"],
					setupFiles: ["src/test/integration-env.ts"],
					pool: "forks",
					fileParallelism: false,
					// Integration tests hit a real Neon branch serially; the default
					// 5 s timeout is too tight under load and produces false-positive
					// timeouts that look like real regressions.
					testTimeout: 30000,
				},
			},
			{
				test: {
					name: "types",
					typecheck: {
						enabled: true,
						only: true,
						include: ["src/**/*.test-d.ts"],
					},
				},
			},
		],
	},
});
