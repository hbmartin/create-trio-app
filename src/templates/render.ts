import type { TemplateFile } from "../file-system.js";
import type { NameParts } from "../names.js";

export interface CoreTemplateContext {
	packageName: string;
	projectTitle: string;
	generatorVersion: string;
}

export interface ModuleTemplateContext {
	module: NameParts;
}

type TokenValues = Record<string, string>;

export function renderFiles(
	files: readonly TemplateFile[],
	tokens: TokenValues,
): TemplateFile[] {
	return files.map((file) => ({
		relativePath: renderText(file.relativePath, tokens),
		content: renderText(file.content, tokens),
	}));
}

export function renderText(source: string, tokens: TokenValues): string {
	let rendered = source;
	for (const [token, value] of Object.entries(tokens)) {
		rendered = rendered.split(token).join(value);
	}
	return rendered;
}

export function coreTokens(context: CoreTemplateContext): TokenValues {
	return {
		__PACKAGE_NAME__: context.packageName,
		__PROJECT_TITLE__: context.projectTitle,
		__GENERATOR_VERSION__: context.generatorVersion,
	};
}

export function moduleTokens(context: ModuleTemplateContext): TokenValues {
	return {
		__MODULE_KEBAB__: context.module.kebab,
		__MODULE_CAMEL__: context.module.camel,
		__MODULE_PASCAL__: context.module.pascal,
		__MODULE_DISPLAY__: context.module.display,
	};
}
