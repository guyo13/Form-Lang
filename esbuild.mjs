//@ts-check
import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { promisify } from "util";

const __filename = fileURLToPath(import.meta.url); // Get the current file's path
const __dirname = path.dirname(__filename);
const execPromise = promisify(exec);

const watch = process.argv.includes("--watch");
const minify = process.argv.includes("--minify");

const success = watch ? "Watch build succeeded" : "Build succeeded";

async function emitDeclarations(projectPath) {
  try {
    const { stdout, stderr } = await execPromise(
      `tsc --emitDeclarationOnly --project tsconfig.src.json`,
      {
        cwd: projectPath,
      },
    );

    if (stderr) {
      console.error(stderr);
      throw new Error("Declaration emit failed");
    }

    console.log(stdout);
    console.log("Declaration emit succeeded.");
  } catch (error) {
    console.error("Error emitting declarations:", error);
  }
}

function getTime() {
  const date = new Date();
  return `[${`${padZeroes(date.getHours())}:${padZeroes(date.getMinutes())}:${padZeroes(date.getSeconds())}`}] `;
}

function padZeroes(i) {
  return i.toString().padStart(2, "0");
}

const commonPlugins = [
  {
    name: "watch-plugin",
    setup(build) {
      build.onEnd((result) => {
        if (result.errors.length === 0) {
          console.log(getTime() + success);
        }
      });
    },
  },
];
const generateTypesPlugin = {
  name: "run-tsc",
  setup(build) {
    build.onEnd(async (result) => {
      if (result.errors.length === 0) {
        console.log("Building types");
        await emitDeclarations(__dirname);
      }
    });
  },
};

async function writePackageJson(packageJson, filePath) {
  try {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, JSON.stringify(packageJson, null, 2));
    console.log(`package.json created at ${filePath}`);
  } catch (err) {
    console.error(`Error creating package.json: ${err}`);
    throw err;
  }
}

const esmPlugin = {
  name: "create-esm-package-json",
  setup(build) {
    build.onEnd(async (result) => {
      if (result.errors.length === 0) {
        await writePackageJson(
          { type: "module" },
          path.join(__dirname, "out", "esm", "package.json"),
        );
      }
    });
  },
};

const cjsPlugin = {
  name: "create-cjs-package-json",
  setup(build) {
    build.onEnd(async (result) => {
      if (result.errors.length === 0) {
        await writePackageJson(
          { type: "commonjs" },
          path.join(__dirname, "out", "cjs", "package.json"),
        );
      }
    });
  },
};

const ctx = await esbuild.context({
  // Entry points for the vscode extension and the language server
  entryPoints: ["src/extension/main.ts", "src/language/main.ts"],
  outdir: "out",
  bundle: true,
  target: "ES2017",
  // VSCode's extension host is still using cjs, so we need to transform the code
  format: "cjs",
  // To prevent confusing node, we explicitly use the `.cjs` extension
  outExtension: {
    ".js": ".cjs",
  },
  loader: { ".ts": "ts" },
  external: ["vscode"],
  platform: "node",
  sourcemap: !minify,
  minify,
  plugins: [...commonPlugins, generateTypesPlugin],
});

const librarySharedConfig = {
  entryPoints: ["src/lib/index.ts"],
  bundle: true,
  sourcemap: !minify,
  minify,
  loader: { ".ts": "ts" },
};

const libraryEsmCtx = await esbuild.context({
  ...librarySharedConfig,
  outdir: "out/esm/lib",
  platform: "neutral",
  mainFields: ["module"],
  format: "esm",
  outExtension: {
    ".js": ".mjs",
  },
  plugins: [...commonPlugins, esmPlugin],
});

const libraryCjsCtx = await esbuild.context({
  ...librarySharedConfig,
  outdir: "out/cjs/lib",
  platform: "node",
  format: "cjs",
  plugins: [...commonPlugins, cjsPlugin],
});

if (watch) {
  await Promise.all(ctx.watch(), libraryEsmCtx.watch(), libraryCjsCtx.watch());
} else {
  await Promise.all([
    ctx.rebuild(),
    libraryEsmCtx.rebuild(),
    libraryCjsCtx.rebuild(),
  ]);
  Promise.allSettled([
    ctx.dispose(),
    libraryEsmCtx.dispose(),
    libraryCjsCtx.dispose(),
  ]);
}
