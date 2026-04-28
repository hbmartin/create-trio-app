import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

type PackageJson = {
	scripts?: Record<string, string>;
};

const readPackageJson = async (): Promise<PackageJson> =>
	JSON.parse(
		await readFile(path.join(process.cwd(), "package.json"), "utf8"),
	) as PackageJson;

describe("package lifecycle scripts", () => {
	it("keeps release validation on a single build path", async () => {
		const { scripts = {} } = await readPackageJson();
		const buildLifecycleScripts = [
			"package:check",
			"prepack",
			"prepublishOnly",
		].filter(
			(scriptName) => scripts[scriptName]?.includes("pnpm build") === true,
		);

		expect(buildLifecycleScripts).toEqual(["package:check"]);
		expect(scripts.prepublishOnly).toBe("pnpm check");
		expect(scripts.prepack).toBeUndefined();
	});
});
