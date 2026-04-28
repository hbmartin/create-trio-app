import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import packageJson from "../package.json" with { type: "json" };
import type { AddModuleOptions, CreateOptions } from "./args.js";
import { CliError } from "./errors.js";
import {
	assertGeneratedProject,
	readProjectFile,
	writeProjectFile,
	writeTemplateFiles,
} from "./file-system.js";
import { normalizeProjectTitle, parseModuleName } from "./names.js";
import { createModuleTemplateFiles } from "./templates/module.js";
import { createProductionCoreTemplateFiles } from "./templates/production-core.js";

export const GENERATOR_VERSION = packageJson.version;

export interface CommandInvocation {
	command: string;
	args: string[];
	cwd: string;
}

export type CommandRunner = (invocation: CommandInvocation) => void;

export interface GenerateResult {
	rootDir: string;
	files: string[];
	dryRun: boolean;
	followUpCommands: string[];
}

export interface AddModuleResult {
	projectDir: string;
	files: string[];
	dryRun: boolean;
}

export async function createProject(
	options: CreateOptions,
	runCommand: CommandRunner = runCommandInherit,
): Promise<GenerateResult> {
	const files = createProductionCoreTemplateFiles({
		packageName: options.name,
		projectTitle: normalizeProjectTitle(options.name),
		generatorVersion: GENERATOR_VERSION,
	});

	if (!options.dryRun) {
		await mkdir(options.targetDir, { recursive: true });
	}

	const writeResult = await writeTemplateFiles({
		rootDir: options.targetDir,
		files,
		force: options.force,
		dryRun: options.dryRun,
	});

	const followUpCommands = collectCreateFollowUpCommands(options);
	if (!options.dryRun) {
		for (const command of followUpCommands) {
			const [program, ...args] = command.split(" ");
			if (!program) {
				throw new CliError(`Invalid follow-up command: ${command}`);
			}
			runCommand({
				command: program,
				args,
				cwd: options.targetDir,
			});
		}
	}

	return {
		rootDir: options.targetDir,
		files: writeResult.writtenFiles,
		dryRun: writeResult.skippedBecauseDryRun,
		followUpCommands,
	};
}

export async function addModule(
	options: AddModuleOptions,
): Promise<AddModuleResult> {
	await assertGeneratedProject(options.projectDir);
	const module = parseModuleName(options.moduleName);
	const files = createModuleTemplateFiles({ module });

	const writeResult = await writeTemplateFiles({
		rootDir: options.projectDir,
		files,
		force: options.force,
		dryRun: options.dryRun,
	});

	const sheriffConfig = await readProjectFile(
		options.projectDir,
		"sheriff.config.ts",
	);
	const updatedSheriffConfig = addSheriffEntry({
		config: sheriffConfig,
		moduleName: module.kebab,
	});
	await writeProjectFile({
		projectDir: options.projectDir,
		relativePath: "sheriff.config.ts",
		content: updatedSheriffConfig,
		dryRun: options.dryRun,
	});

	return {
		projectDir: options.projectDir,
		files:
			updatedSheriffConfig === sheriffConfig
				? writeResult.writtenFiles
				: [...writeResult.writtenFiles, "sheriff.config.ts"],
		dryRun: writeResult.skippedBecauseDryRun,
	};
}

export function addSheriffEntry(params: {
	config: string;
	moduleName: string;
}): string {
	const entry = `\t\t"${params.moduleName}": "./modules/${params.moduleName}/index.ts",`;
	if (params.config.includes(entry.trim())) {
		return params.config;
	}

	const marker = "\t},\n\tenableBarrelLess";
	if (!params.config.includes(marker)) {
		throw new CliError("Could not find Sheriff entryPoints block.");
	}
	return params.config.replace(marker, `${entry}\n${marker}`);
}

function collectCreateFollowUpCommands(options: CreateOptions): string[] {
	const commands: string[] = [];
	if (!options.skipInstall) {
		commands.push("pnpm install");
	}
	if (!options.skipMigrations) {
		commands.push("pnpm db:generate");
	}
	if (!options.skipGit) {
		commands.push("git init");
	}
	return commands;
}

function runCommandInherit(invocation: CommandInvocation): void {
	const result = spawnSync(invocation.command, invocation.args, {
		cwd: path.resolve(invocation.cwd),
		stdio: "inherit",
	});

	if (result.error) {
		throw new CliError(
			`Failed to run ${formatCommand(invocation)}: ${result.error.message}`,
		);
	}
	if (result.status !== 0) {
		throw new CliError(
			`Command failed with exit code ${result.status}: ${formatCommand(invocation)}`,
		);
	}
}

function formatCommand(invocation: CommandInvocation): string {
	return [invocation.command, ...invocation.args].join(" ");
}
