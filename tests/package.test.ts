import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

type PackageJson = {
	scripts?: Record<string, string>;
};

const readPackageJson = async (): Promise<PackageJson> =>
	JSON.parse(
		await readFile(path.join(process.cwd(), "package.json"), "utf8"),
	) as PackageJson;

const execFileAsync = promisify(execFile);

const splitScriptCommands = (script: string | undefined): string[] =>
	script
		?.split("&&")
		.map((command) => command.trim())
		.filter((command) => command.length > 0) ?? [];

const invokedPnpmScript = (command: string): string | undefined =>
	/^pnpm(?:\s+run)?\s+([^\s]+)/.exec(command)?.[1];

const scriptReachesScript = (
	scripts: Record<string, string>,
	startScript: string,
	targetScript: string,
	visitedScripts = new Set<string>(),
): boolean => {
	if (visitedScripts.has(startScript)) {
		return false;
	}

	visitedScripts.add(startScript);

	return splitScriptCommands(scripts[startScript]).some((command) => {
		const invokedScript = invokedPnpmScript(command);

		return (
			invokedScript === targetScript ||
			(invokedScript !== undefined &&
				scriptReachesScript(
					scripts,
					invokedScript,
					targetScript,
					visitedScripts,
				))
		);
	});
};

describe("package lifecycle scripts", () => {
	it("builds and validates packages through the pack lifecycle", async () => {
		const { scripts = {} } = await readPackageJson();

		expect(scripts["pack:dry-run"]).toMatch(/^pnpm\s+pack\b/);
		expect(scripts["pack:dry-run"]).toContain("--dry-run");
		expect(scripts["package:check"]).toMatch(
			/^node\s+scripts\/package-check\.mjs$/,
		);
		expect(scripts.prepack).toMatch(
			/^node\s+scripts\/package-check\.mjs\s+--prepack$/,
		);
		expect(scriptReachesScript(scripts, "check", "package:check")).toBe(true);
	});

	it("keeps publish source checks separate from package validation", async () => {
		const { scripts = {} } = await readPackageJson();

		expect(scriptReachesScript(scripts, "prepublishOnly", "lint")).toBe(true);
		expect(scriptReachesScript(scripts, "prepublishOnly", "typecheck")).toBe(
			true,
		);
		expect(scriptReachesScript(scripts, "prepublishOnly", "test")).toBe(true);
		expect(scriptReachesScript(scripts, "prepublishOnly", "build")).toBe(false);
		expect(
			scriptReachesScript(scripts, "prepublishOnly", "package:check"),
		).toBe(false);
	});

	it("can skip nested prepack validation when packaging for validators", async () => {
		await expect(
			execFileAsync(
				process.execPath,
				["scripts/package-check.mjs", "--prepack"],
				{
					env: {
						...process.env,
						CREATE_TRIO_SKIP_PREPACK_CHECK: "1",
					},
				},
			),
		).resolves.toMatchObject({ stderr: "", stdout: "" });
	});

	it("passes the packed tarball directly to publint", async () => {
		const packageCheckScript = await readFile(
			path.join(process.cwd(), "scripts/package-check.mjs"),
			"utf8",
		);

		expect(packageCheckScript).toMatch(
			/"exec"\s*,\s*"publint"\s*,\s*tarballPath\s*,\s*"--pack"\s*,\s*"false"/,
		);
		expect(packageCheckScript).not.toMatch(
			/"exec"\s*,\s*"publint"\s*,\s*"run"/,
		);
	});
});
