import { spawn } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const skipPrepackCheckEnv = "CREATE_TRIO_SKIP_PREPACK_CHECK";
const isPrepackLifecycle = process.argv.includes("--prepack");

if (isPrepackLifecycle && process.env[skipPrepackCheckEnv] === "1") {
	process.exit(0);
}

const run = async (command, args, options = {}) =>
	new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			shell: process.platform === "win32",
			stdio: "inherit",
			...options,
		});

		child.on("error", reject);
		child.on("close", (code) => {
			if (code === 0) {
				resolve();
				return;
			}

			reject(
				new Error(
					`Command failed with exit code ${code}: ${command} ${args.join(" ")}`,
				),
			);
		});
	});

const packDestination = await mkdtemp(
	path.join(tmpdir(), "create-trio-app-pack-"),
);

try {
	await run("pnpm", ["build"]);
	// The public dry-run script sets npm_config_dry_run for lifecycle scripts;
	// validators still need a real temporary tarball to inspect.
	await run(
		"pnpm",
		["pack", "--config.dry-run=false", "--pack-destination", packDestination],
		{
			env: {
				...process.env,
				[skipPrepackCheckEnv]: "1",
			},
		},
	);

	const packedFiles = await readdir(packDestination);
	const tarballName = packedFiles.find((fileName) => fileName.endsWith(".tgz"));

	if (tarballName === undefined) {
		throw new Error(`No package tarball was created in ${packDestination}`);
	}

	const tarballPath = path.join(packDestination, tarballName);

	await run("pnpm", ["exec", "publint", "run", tarballPath, "--pack", "false"]);
	await run("pnpm", ["exec", "attw", tarballPath, "--profile", "esm-only"]);
} finally {
	await rm(packDestination, { recursive: true, force: true });
}
