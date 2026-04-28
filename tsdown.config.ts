import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts", "src/cli.ts"],
	clean: true,
	dts: true,
	format: "esm",
	outExtensions: () => ({
		dts: ".d.ts",
		js: ".js",
	}),
	platform: "node",
	sourcemap: true,
});
