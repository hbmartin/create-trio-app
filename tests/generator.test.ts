import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CommandInvocation } from "../src/generator.js";
import { addModule, addSheriffEntry, createProject } from "../src/generator.js";

let tempRoot: string;

beforeEach(async () => {
	tempRoot = await mkdtemp(path.join(os.tmpdir(), "create-trio-app-"));
});

afterEach(async () => {
	await rm(tempRoot, { recursive: true, force: true });
});

describe("createProject", () => {
	it("creates a production-core project without running skipped commands", async () => {
		const calls: CommandInvocation[] = [];
		const targetDir = path.join(tempRoot, "generated-app");

		const result = await createProject(
			{
				name: "generated-app",
				targetDir,
				skipInstall: true,
				skipGit: true,
				skipMigrations: true,
				force: false,
				dryRun: false,
			},
			(invocation) => {
				calls.push(invocation);
			},
		);

		expect(calls).toEqual([]);
		expect(result.files).toContain("package.json");
		expect(result.files).toContain(".trio-generator.json");
		expect(result.files).toContain("modules/kernel/index.ts");
		expect(result.files).toContain("modules/users/factory.ts");
		expect(result.files).toContain("modules/admin/factory.ts");
		expect(result.files).not.toContain("modules/whatsapp/index.ts");

		const packageJson = await readFile(path.join(targetDir, "package.json"), {
			encoding: "utf8",
		});
		expect(packageJson).toContain('"name": "generated-app"');
		expect(packageJson).toContain('"test:affected": "vitest run"');
		expect(packageJson).toContain('"db:generate": "drizzle-kit generate"');
	});

	it("reports files without writing in dry-run mode", async () => {
		const targetDir = path.join(tempRoot, "dry-run-app");

		const result = await createProject({
			name: "dry-run-app",
			targetDir,
			skipInstall: true,
			skipGit: true,
			skipMigrations: true,
			force: false,
			dryRun: true,
		});

		expect(result.dryRun).toBe(true);
		expect(result.files).toContain("package.json");
		await expect(
			readFile(path.join(targetDir, "package.json")),
		).rejects.toThrow();
	});

	it("refuses to overwrite conflicting files unless forced", async () => {
		const targetDir = path.join(tempRoot, "conflict-app");
		await createProject({
			name: "conflict-app",
			targetDir,
			skipInstall: true,
			skipGit: true,
			skipMigrations: true,
			force: false,
			dryRun: false,
		});

		await expect(
			createProject({
				name: "conflict-app",
				targetDir,
				skipInstall: true,
				skipGit: true,
				skipMigrations: true,
				force: false,
				dryRun: false,
			}),
		).rejects.toThrow("Refusing to overwrite existing files");
	});

	it("runs install, migration, and git commands by default", async () => {
		const runCommand = vi.fn();
		const targetDir = path.join(tempRoot, "commands-app");

		await createProject(
			{
				name: "commands-app",
				targetDir,
				skipInstall: false,
				skipGit: false,
				skipMigrations: false,
				force: false,
				dryRun: false,
			},
			runCommand,
		);

		expect(runCommand).toHaveBeenCalledWith({
			command: "pnpm",
			args: ["install"],
			cwd: targetDir,
		});
		expect(runCommand).toHaveBeenCalledWith({
			command: "pnpm",
			args: ["db:generate"],
			cwd: targetDir,
		});
		expect(runCommand).toHaveBeenCalledWith({
			command: "git",
			args: ["init"],
			cwd: targetDir,
		});
	});
});

describe("addModule", () => {
	it("adds a vertical-slice module and updates Sheriff entry points", async () => {
		const targetDir = path.join(tempRoot, "module-app");
		await createProject({
			name: "module-app",
			targetDir,
			skipInstall: true,
			skipGit: true,
			skipMigrations: true,
			force: false,
			dryRun: false,
		});

		const result = await addModule({
			moduleName: "billing-ledger",
			projectDir: targetDir,
			dryRun: false,
			force: false,
		});

		expect(result.files).toContain("modules/billing-ledger/factory.ts");
		expect(result.files).toContain("app/composition/billing-ledger.ts");
		expect(result.files).toContain("sheriff.config.ts");

		const factory = await readFile(
			path.join(targetDir, "modules/billing-ledger/factory.ts"),
			"utf8",
		);
		expect(factory).toContain("createBillingLedgerUseCases");

		const sheriff = await readFile(path.join(targetDir, "sheriff.config.ts"), {
			encoding: "utf8",
		});
		expect(sheriff).toContain(
			'"billing-ledger": "./modules/billing-ledger/index.ts"',
		);
	});

	it("requires a generated project marker", async () => {
		await expect(
			addModule({
				moduleName: "billing",
				projectDir: tempRoot,
				dryRun: false,
				force: false,
			}),
		).rejects.toThrow("Missing .trio-generator.json");
	});

	it("does not write module files in dry-run mode", async () => {
		const targetDir = path.join(tempRoot, "dry-module-app");
		await createProject({
			name: "dry-module-app",
			targetDir,
			skipInstall: true,
			skipGit: true,
			skipMigrations: true,
			force: false,
			dryRun: false,
		});

		const result = await addModule({
			moduleName: "billing",
			projectDir: targetDir,
			dryRun: true,
			force: false,
		});

		expect(result.dryRun).toBe(true);
		expect(result.files).toContain("modules/billing/factory.ts");
		await expect(
			readFile(path.join(targetDir, "modules/billing/factory.ts")),
		).rejects.toThrow();
	});
});

describe("addSheriffEntry", () => {
	it("inserts a module entry before enableBarrelLess", () => {
		const source = [
			"export const config = {",
			"\tentryPoints: {",
			'\t\tusers: "./modules/users/index.ts",',
			"\t},",
			"\tenableBarrelLess: true,",
			"};",
			"",
		].join("\n");

		expect(
			addSheriffEntry({ config: source, moduleName: "billing-ledger" }),
		).toContain('"billing-ledger": "./modules/billing-ledger/index.ts"');
	});

	it("does not duplicate existing entries", () => {
		const source = [
			"export const config = {",
			"\tentryPoints: {",
			'\t\t"billing": "./modules/billing/index.ts",',
			"\t},",
			"\tenableBarrelLess: true,",
			"};",
			"",
		].join("\n");

		expect(addSheriffEntry({ config: source, moduleName: "billing" })).toBe(
			source,
		);
	});
});
