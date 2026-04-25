import type { TemplateFile } from "../file-system.js";
import type { ModuleTemplateContext } from "./render.js";
import { moduleTokens, renderFiles } from "./render.js";

const moduleTemplateFiles: readonly TemplateFile[] = [
	{
		relativePath: "modules/__MODULE_KEBAB__/domain/__MODULE_KEBAB__-id.ts",
		content: `import { z } from "zod";

export const __MODULE_CAMEL__IdSchema = z.string().min(1).brand<"__MODULE_PASCAL__Id">();

export type __MODULE_PASCAL__Id = z.infer<typeof __MODULE_CAMEL__IdSchema>;

export function as__MODULE_PASCAL__Id(value: string): __MODULE_PASCAL__Id {
	return __MODULE_CAMEL__IdSchema.parse(value);
}
`,
	},
	{
		relativePath: "modules/__MODULE_KEBAB__/domain/index.ts",
		content: `export {
	as__MODULE_PASCAL__Id,
	type __MODULE_PASCAL__Id,
	__MODULE_CAMEL__IdSchema,
} from "./__MODULE_KEBAB__-id";
`,
	},
	{
		relativePath:
			"modules/__MODULE_KEBAB__/application/ports/__MODULE_KEBAB__-repository.ts",
		content: `import type { __MODULE_PASCAL__Id } from "../../domain";

export interface __MODULE_PASCAL__Record {
	id: __MODULE_PASCAL__Id;
	name: string;
}

export interface __MODULE_PASCAL__Repository {
	getById: (id: __MODULE_PASCAL__Id) => Promise<__MODULE_PASCAL__Record | undefined>;
}
`,
	},
	{
		relativePath:
			"modules/__MODULE_KEBAB__/application/use-cases/get-__MODULE_KEBAB__-by-id.ts",
		content: `import { createAppErrorFromCode } from "@/modules/kernel/domain";
import type { __MODULE_PASCAL__Id } from "../../domain";
import type {
	__MODULE_PASCAL__Record,
	__MODULE_PASCAL__Repository,
} from "../ports/__MODULE_KEBAB__-repository";

export interface Get__MODULE_PASCAL__ByIdDependencies {
	__MODULE_CAMEL__Repository: __MODULE_PASCAL__Repository;
}

export function createGet__MODULE_PASCAL__ById(
	dependencies: Get__MODULE_PASCAL__ByIdDependencies,
) {
	return async function get__MODULE_PASCAL__ById(
		id: __MODULE_PASCAL__Id,
	): Promise<__MODULE_PASCAL__Record> {
		const record = await dependencies.__MODULE_CAMEL__Repository.getById(id);
		if (!record) {
			throw createAppErrorFromCode("not_found:__MODULE_KEBAB__");
		}
		return record;
	};
}
`,
	},
	{
		relativePath: "modules/__MODULE_KEBAB__/factory.ts",
		content: `import type { __MODULE_PASCAL__Repository } from "./application/ports/__MODULE_KEBAB__-repository";
import { createGet__MODULE_PASCAL__ById } from "./application/use-cases/get-__MODULE_KEBAB__-by-id";

export interface __MODULE_PASCAL__UseCases {
	get__MODULE_PASCAL__ById: ReturnType<typeof createGet__MODULE_PASCAL__ById>;
}

export interface __MODULE_PASCAL__UseCaseDependencies {
	__MODULE_CAMEL__Repository: __MODULE_PASCAL__Repository;
}

export function create__MODULE_PASCAL__UseCases(
	dependencies: __MODULE_PASCAL__UseCaseDependencies,
): __MODULE_PASCAL__UseCases {
	return {
		get__MODULE_PASCAL__ById: createGet__MODULE_PASCAL__ById({
			__MODULE_CAMEL__Repository: dependencies.__MODULE_CAMEL__Repository,
		}),
	};
}
`,
	},
	{
		relativePath: "modules/__MODULE_KEBAB__/index.ts",
		content: `export type {
	__MODULE_PASCAL__Record,
	__MODULE_PASCAL__Repository,
} from "./application/ports/__MODULE_KEBAB__-repository";
export {
	createGet__MODULE_PASCAL__ById,
	type Get__MODULE_PASCAL__ByIdDependencies,
} from "./application/use-cases/get-__MODULE_KEBAB__-by-id";
export {
	as__MODULE_PASCAL__Id,
	type __MODULE_PASCAL__Id,
	__MODULE_CAMEL__IdSchema,
} from "./domain";
export {
	create__MODULE_PASCAL__UseCases,
	type __MODULE_PASCAL__UseCaseDependencies,
	type __MODULE_PASCAL__UseCases,
} from "./factory";
`,
	},
	{
		relativePath: "app/composition/__MODULE_KEBAB__.ts",
		content: `import "server-only";

import {
	create__MODULE_PASCAL__UseCases,
	type __MODULE_PASCAL__Repository,
	type __MODULE_PASCAL__UseCases,
} from "@/modules/__MODULE_KEBAB__";
import { createCachedFactory } from "./shared/singleton";

export interface __MODULE_PASCAL__UseCaseOverrides {
	__MODULE_CAMEL__Repository?: __MODULE_PASCAL__Repository;
}

function createInMemory__MODULE_PASCAL__Repository(): __MODULE_PASCAL__Repository {
	return {
		getById: async () => undefined,
	};
}

function create__MODULE_PASCAL__UseCasesWithDefaults(
	overrides: __MODULE_PASCAL__UseCaseOverrides = {},
): __MODULE_PASCAL__UseCases {
	return create__MODULE_PASCAL__UseCases({
		__MODULE_CAMEL__Repository:
			overrides.__MODULE_CAMEL__Repository ??
			createInMemory__MODULE_PASCAL__Repository(),
	});
}

export const get__MODULE_PASCAL__UseCases = createCachedFactory<
	__MODULE_PASCAL__UseCases,
	__MODULE_PASCAL__UseCaseOverrides
>(create__MODULE_PASCAL__UseCasesWithDefaults);
`,
	},
	{
		relativePath:
			"tests/modules/__MODULE_KEBAB__/use-cases/get-__MODULE_KEBAB__-by-id.test.ts",
		content: `import { describe, expect, it, vi } from "vitest";
import type { __MODULE_PASCAL__Repository } from "@/modules/__MODULE_KEBAB__";
import {
	as__MODULE_PASCAL__Id,
	createGet__MODULE_PASCAL__ById,
} from "@/modules/__MODULE_KEBAB__";

function createRepository(): __MODULE_PASCAL__Repository {
	return {
		getById: vi.fn(),
	};
}

describe("createGet__MODULE_PASCAL__ById", () => {
	it("returns the record when it exists", async () => {
		const repository = createRepository();
		const id = as__MODULE_PASCAL__Id("__MODULE_KEBAB__-1");
		vi.mocked(repository.getById).mockResolvedValue({
			id,
			name: "__MODULE_DISPLAY__",
		});
		const getById = createGet__MODULE_PASCAL__ById({
			__MODULE_CAMEL__Repository: repository,
		});

		await expect(getById(id)).resolves.toEqual({
			id,
			name: "__MODULE_DISPLAY__",
		});
	});

	it("throws a not-found application error when the record is missing", async () => {
		const repository = createRepository();
		vi.mocked(repository.getById).mockResolvedValue(undefined);
		const getById = createGet__MODULE_PASCAL__ById({
			__MODULE_CAMEL__Repository: repository,
		});

		await expect(getById(as__MODULE_PASCAL__Id("missing"))).rejects.toMatchObject({
			code: "not_found:__MODULE_KEBAB__",
		});
	});
});
`,
	},
	{
		relativePath: "tests/modules/__MODULE_KEBAB__/factory.test.ts",
		content: `import { describe, expect, it } from "vitest";
import { create__MODULE_PASCAL__UseCases } from "@/modules/__MODULE_KEBAB__";

describe("create__MODULE_PASCAL__UseCases", () => {
	it("wires the module use cases", () => {
		const useCases = create__MODULE_PASCAL__UseCases({
			__MODULE_CAMEL__Repository: {
				getById: async () => undefined,
			},
		});

		expect(useCases.get__MODULE_PASCAL__ById).toEqual(expect.any(Function));
	});
});
`,
	},
];

export function createModuleTemplateFiles(
	context: ModuleTemplateContext,
): TemplateFile[] {
	return renderFiles(moduleTemplateFiles, moduleTokens(context));
}
