import { describe, expect, it } from "vitest";
import { parseCliArguments } from "../src/args.js";

describe("parseCliArguments", () => {
	it("parses create-project options", () => {
		expect(
			parseCliArguments([
				"../my-app",
				"--name",
				"my-app",
				"--skip-install",
				"--skip-git",
				"--skip-migrations",
				"--force",
				"--dry-run",
			]),
		).toEqual({
			type: "create",
			options: expect.objectContaining({
				name: "my-app",
				skipInstall: true,
				skipGit: true,
				skipMigrations: true,
				force: true,
				dryRun: true,
			}),
		});
	});

	it("defaults the package name from the target directory", () => {
		const command = parseCliArguments(["./Example-App", "--skip-install"]);

		expect(command).toEqual({
			type: "create",
			options: expect.objectContaining({
				name: "example-app",
			}),
		});
	});

	it("parses add-module options", () => {
		expect(
			parseCliArguments([
				"add",
				"module",
				"billing-ledger",
				"--project",
				"../my-app",
				"--dry-run",
			]),
		).toEqual({
			type: "add-module",
			options: expect.objectContaining({
				moduleName: "billing-ledger",
				dryRun: true,
				force: false,
			}),
		});
	});

	it("rejects unknown options", () => {
		expect(() => parseCliArguments(["app", "--wat"])).toThrow(
			"Unknown option: --wat",
		);
	});

	it("returns help for empty args", () => {
		expect(parseCliArguments([])).toEqual({ type: "help" });
	});
});
