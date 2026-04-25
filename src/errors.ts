export class CliError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CliError";
	}
}

export function formatError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
