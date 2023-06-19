import { context } from 'esbuild';
import { glob } from 'glob';
import path from "node:path";

const WATCH = process.argv.includes('--watch');

export async function buildScript(scriptPath, watch = false) {
	const ctx =  await context({
		entryPoints: [scriptPath],
		outfile: `./dist/${normalize(scriptPath)}.js`,
		minify: !watch,
		bundle: true,
		format: "esm",
		platform: "browser",
		loader: {
			".css": "text"
		},
		logLevel: 'info',
		external: await getImportNames()
	});

	await ctx.rebuild();

	if (watch) return ctx.watch();
	ctx.dispose();
}

const getFiles = () => glob("src/**/*.{ts,tsx,js,txt}");
const normalize = f => f.replace(path.extname(f), "").replaceAll(path.sep, "/").replace("src/", "");

export async function getImportNames() {
	const filesWithSrc = await getFiles();
	return filesWithSrc.map(normalize);
}

export async function build(watch = false) {
	const files = await getFiles();
	await Promise.allSettled(files.map(file => buildScript(file, watch)));
}

await build(WATCH);