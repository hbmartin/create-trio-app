import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { CliError } from "./errors.js";

export interface TemplateFile {
	relativePath: string;
	content: string;
}

export interface WriteFilesOptions {
	rootDir: string;
	files: readonly TemplateFile[];
	force: boolean;
	dryRun: boolean;
}

export interface WriteFilesResult {
	writtenFiles: string[];
	skippedBecauseDryRun: boolean;
}

export async function writeTemplateFiles(
	options: WriteFilesOptions,
): Promise<WriteFilesResult> {
	const conflicts = await findConflicts({
		rootDir: options.rootDir,
		files: options.files,
	});
	if (conflicts.length > 0 && !options.force) {
		throw new CliError(
			[
				"Refusing to overwrite existing files:",
				...conflicts.map((filePath) => `  - ${filePath}`),
				"Re-run with --force to overwrite them.",
			].join("\n"),
		);
	}

	const writtenFiles = options.files.map((file) => file.relativePath);
	if (options.dryRun) {
		return { writtenFiles, skippedBecauseDryRun: true };
	}

	for (const file of options.files) {
		const destination = resolveInsideRoot(options.rootDir, file.relativePath);
		await mkdir(path.dirname(destination), { recursive: true });
		await writeFile(destination, file.content, "utf8");
	}

	return { writtenFiles, skippedBecauseDryRun: false };
}

export async function readProjectFile(
	projectDir: string,
	relativePath: string,
): Promise<string> {
	return await readFile(resolveInsideRoot(projectDir, relativePath), "utf8");
}

export async function writeProjectFile(params: {
	projectDir: string;
	relativePath: string;
	content: string;
	dryRun: boolean;
}): Promise<void> {
	if (params.dryRun) {
		return;
	}
	const destination = resolveInsideRoot(params.projectDir, params.relativePath);
	await writeFile(destination, params.content, "utf8");
}

export async function assertGeneratedProject(
	projectDir: string,
): Promise<void> {
	try {
		await access(path.join(projectDir, ".trio-generator.json"));
	} catch {
		throw new CliError(
			`Project at "${projectDir}" does not look like a create-trio-app project. Missing .trio-generator.json.`,
		);
	}
}

async function findConflicts(params: {
	rootDir: string;
	files: readonly TemplateFile[];
}): Promise<string[]> {
	const conflicts: string[] = [];
	for (const file of params.files) {
		const destination = resolveInsideRoot(params.rootDir, file.relativePath);
		try {
			await access(destination);
			conflicts.push(file.relativePath);
		} catch {}
	}
	return conflicts;
}

function resolveInsideRoot(rootDir: string, relativePath: string): string {
	if (path.isAbsolute(relativePath) || relativePath.includes("\0")) {
		throw new CliError(`Invalid template path: ${relativePath}`);
	}
	const resolvedRoot = path.resolve(rootDir);
	const resolvedPath = path.resolve(resolvedRoot, relativePath);
	const relativeFromRoot = path.relative(resolvedRoot, resolvedPath);
	if (
		relativeFromRoot.startsWith("..") ||
		path.isAbsolute(relativeFromRoot) ||
		relativeFromRoot === ""
	) {
		throw new CliError(`Template path escapes project root: ${relativePath}`);
	}
	return resolvedPath;
}
