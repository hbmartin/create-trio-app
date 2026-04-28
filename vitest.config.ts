import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		clearMocks: true,
		coverage: {
			include: ["src/**/*.ts"],
			provider: "v8",
			reporter: ["text", "lcov"],
		},
		include: ["tests/**/*.test.ts"],
		restoreMocks: true,
	},
});
