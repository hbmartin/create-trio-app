import path from "node:path";
import { CliError } from "./errors.js";
import { defaultPackageNameFromTarget, validatePackageName } from "./names.js";

export interface CreateOptions {
	name: string;
	targetDir: string;
	skipInstall: boolean;
	skipGit: boolean;
	skipMigrations: boolean;
	force: boolean;
	dryRun: boolean;
}

export interface AddModuleOptions {
	moduleName: string;
	projectDir: string;
	dryRun: boolean;
	force: boolean;
}

export type CliCommand =
	| { type: "create"; options: CreateOptions }
	| { type: "add-module"; options: AddModuleOptions }
	| { type: "help" }
	| { type: "version" };

interface ParserState {
	index: number;
	argv: string[];
}

export const HELP_TEXT = [
	"Usage:",
	"  create-trio-app <target-dir> [options]",
	"  create-trio-app add module <module-name> [options]",
	"",
	"Create options:",
	"  --name <package-name>   npm package name for the generated app",
	"  --skip-install          do not run pnpm install",
	"  --skip-git              do not initialize a git repository",
	"  --skip-migrations       do not run pnpm db:generate",
	"  --force                 overwrite conflicting files",
	"  --dry-run               print files without writing",
	"",
	"Add module options:",
	"  --project <path>        generated project root (default: current directory)",
	"  --force                 overwrite conflicting scaffold files",
	"  --dry-run               print files without writing",
	"",
	"Other:",
	"  --help                  show this message",
	"  --version               print package version",
].join("\n");

export function parseCliArguments(argv: string[]): CliCommand {
	if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
		return { type: "help" };
	}
	if (argv.includes("--version") || argv.includes("-v")) {
		return { type: "version" };
	}

	if (argv[0] === "add") {
		return parseAddCommand(argv);
	}

	return parseCreateCommand(argv);
}

function parseCreateCommand(argv: string[]): CliCommand {
	const [targetArg, ...rest] = argv;
	if (!targetArg || targetArg.startsWith("-")) {
		throw new CliError("Missing target directory.");
	}

	const state: ParserState = { argv: rest, index: 0 };
	const targetDir = path.resolve(targetArg);
	let packageName = defaultPackageNameFromTarget(targetDir);
	let skipInstall = false;
	let skipGit = false;
	let skipMigrations = false;
	let force = false;
	let dryRun = false;

	while (state.index < state.argv.length) {
		const arg = readCurrentArg(state);
		if (arg === "--name") {
			packageName = readValue(state, arg);
			continue;
		}
		if (arg === "--skip-install") {
			skipInstall = true;
			state.index += 1;
			continue;
		}
		if (arg === "--skip-git") {
			skipGit = true;
			state.index += 1;
			continue;
		}
		if (arg === "--skip-migrations") {
			skipMigrations = true;
			state.index += 1;
			continue;
		}
		if (arg === "--force") {
			force = true;
			state.index += 1;
			continue;
		}
		if (arg === "--dry-run") {
			dryRun = true;
			state.index += 1;
			continue;
		}
		throw new CliError(`Unknown option: ${arg}`);
	}

	return {
		type: "create",
		options: {
			name: validatePackageName(packageName),
			targetDir,
			skipInstall,
			skipGit,
			skipMigrations,
			force,
			dryRun,
		},
	};
}

function parseAddCommand(argv: string[]): CliCommand {
	if (argv[1] !== "module") {
		throw new CliError('Expected "create-trio-app add module <module-name>".');
	}
	const moduleName = argv[2];
	if (!moduleName || moduleName.startsWith("-")) {
		throw new CliError("Missing module name.");
	}

	const state: ParserState = { argv: argv.slice(3), index: 0 };
	let projectDir = process.cwd();
	let dryRun = false;
	let force = false;

	while (state.index < state.argv.length) {
		const arg = readCurrentArg(state);
		if (arg === "--project") {
			projectDir = path.resolve(readValue(state, arg));
			continue;
		}
		if (arg === "--dry-run") {
			dryRun = true;
			state.index += 1;
			continue;
		}
		if (arg === "--force") {
			force = true;
			state.index += 1;
			continue;
		}
		throw new CliError(`Unknown option: ${arg}`);
	}

	return {
		type: "add-module",
		options: {
			moduleName,
			projectDir,
			dryRun,
			force,
		},
	};
}

function readCurrentArg(state: ParserState): string {
	const arg = state.argv[state.index];
	if (!arg) {
		throw new CliError("Unexpected end of arguments.");
	}
	return arg;
}

function readValue(state: ParserState, option: string): string {
	const value = state.argv[state.index + 1];
	if (!value || value.startsWith("-")) {
		throw new CliError(`Missing value for ${option}.`);
	}
	state.index += 2;
	return value;
}
