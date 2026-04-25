#!/usr/bin/env node

import { HELP_TEXT, parseCliArguments } from "./args.js";
import { CliError, formatError } from "./errors.js";
import { addModule, createProject, GENERATOR_VERSION } from "./generator.js";

async function main(argv: string[]): Promise<number> {
	const command = parseCliArguments(argv);
	if (command.type === "help") {
		console.log(HELP_TEXT);
		return 0;
	}
	if (command.type === "version") {
		console.log(GENERATOR_VERSION);
		return 0;
	}
	if (command.type === "create") {
		const result = await createProject(command.options);
		printCreateResult(result);
		return 0;
	}

	const result = await addModule(command.options);
	printAddModuleResult(result);
	return 0;
}

function printCreateResult(
	result: Awaited<ReturnType<typeof createProject>>,
): void {
	const prefix = result.dryRun ? "Would create" : "Created";
	console.log(`${prefix} ${result.files.length} files in ${result.rootDir}`);
	for (const file of result.files) {
		console.log(`  ${file}`);
	}
	if (result.followUpCommands.length > 0) {
		console.log("Follow-up commands:");
		for (const command of result.followUpCommands) {
			console.log(`  ${command}`);
		}
	}
}

function printAddModuleResult(
	result: Awaited<ReturnType<typeof addModule>>,
): void {
	const prefix = result.dryRun ? "Would add" : "Added";
	console.log(`${prefix} ${result.files.length} files in ${result.projectDir}`);
	for (const file of result.files) {
		console.log(`  ${file}`);
	}
}

try {
	const exitCode = await main(process.argv.slice(2));
	process.exitCode = exitCode;
} catch (error) {
	if (error instanceof CliError) {
		console.error(formatError(error));
		process.exitCode = 1;
	} else {
		console.error(formatError(error));
		process.exitCode = 1;
	}
}
