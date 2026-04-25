import path from "node:path";
import { CliError } from "./errors.js";

export interface NameParts {
	kebab: string;
	camel: string;
	pascal: string;
	display: string;
}

const PACKAGE_NAME_PATTERN =
	/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
const MODULE_NAME_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const RESERVED_MODULE_NAMES = new Set(["admin", "kernel", "users"]);

export function defaultPackageNameFromTarget(targetDir: string): string {
	return path.basename(path.resolve(targetDir)).toLowerCase();
}

export function validatePackageName(packageName: string): string {
	if (!PACKAGE_NAME_PATTERN.test(packageName)) {
		throw new CliError(
			`Invalid package name "${packageName}". Use a lowercase npm package name.`,
		);
	}
	return packageName;
}

export function parseModuleName(moduleName: string): NameParts {
	if (!MODULE_NAME_PATTERN.test(moduleName)) {
		throw new CliError(
			`Invalid module name "${moduleName}". Use lowercase kebab-case, for example "billing" or "customer-notes".`,
		);
	}
	if (RESERVED_MODULE_NAMES.has(moduleName)) {
		throw new CliError(
			`"${moduleName}" is part of the generated core and cannot be added as a feature module.`,
		);
	}

	const segments = moduleName.split("-");
	const [firstSegment, ...remainingSegments] = segments;
	if (!firstSegment) {
		throw new CliError(`Invalid module name "${moduleName}".`);
	}

	const pascalSegments = segments.map(capitalize);
	const camel =
		firstSegment +
		remainingSegments.map((segment) => capitalize(segment)).join("");

	return {
		kebab: moduleName,
		camel,
		pascal: pascalSegments.join(""),
		display: pascalSegments.join(" "),
	};
}

export function normalizeProjectTitle(packageName: string): string {
	const unscoped = packageName.includes("/")
		? packageName.split("/").at(-1)
		: packageName;
	const source = unscoped ?? packageName;
	return source
		.split(/[-_.]/)
		.filter((segment) => segment.length > 0)
		.map(capitalize)
		.join(" ");
}

function capitalize(value: string): string {
	const [first = "", ...rest] = value;
	return `${first.toUpperCase()}${rest.join("")}`;
}
