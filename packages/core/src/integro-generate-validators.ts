import { mkdir, open, rmdir, unlink, writeFile } from "fs/promises";
import path, { join } from "path";
import { Project } from "ts-morph";
import { ModuleKind, ScriptTarget } from "typescript";
import { TypiaProgrammer } from "typia/lib/programmers/TypiaProgrammer.js";
import { getConfig } from "./getConfig.js";
import { Config } from "./types/Config.js";

const generateValidators = async (cwd: string, config: Config | undefined) => {
  const rootPath = config?.root ? join(cwd, config.root) : cwd;
  const outDir = config?.out
    ? join(cwd, config?.out, "server")
    : join(cwd, ".integro/server");
  const project = new Project({
    compilerOptions: {
      lib: ["ESNext"],
      module: ModuleKind.ESNext,
      target: ScriptTarget.ESNext,
      outDir,
      declaration: true,
      noEmit: false,
    },
  });
  const functionFiles = project.addSourceFilesAtPaths(`${rootPath}/**/*.ts`);
  const tmpDir = join(outDir, "tmp");
  const outFilePath = join(tmpDir, "types.ts");
  const outFileContents = ['import typia from "typia";'];

  for (const file of functionFiles) {
    const { name } = path.parse(file.getBaseName());
    const filePath = file.getFilePath();
    const pathname = filePath
      .substring(rootPath.length + 1)
      .match(/^[^.]*/)?.[0];
    const namedExport = file
      .getExportSymbols()
      .find((e) => e.getName() === name);
    const defaultExport = file.getDefaultExportSymbol();
    const fn = (namedExport ?? defaultExport)?.getDeclarations()[0];

    if (!fn) {
      console.warn(
        `${file.getFilePath()} is missing default or "${name}" function`
      );
      continue;
    }

    outFileContents.push(
      `import ${
        namedExport ? `{ ${name} }` : name
      } from '${file.getFilePath()}';\nexport const validate_${pathname?.replaceAll(
        "/",
        "_"
      )} = typia.createValidate<Parameters<typeof ${name}>[0]>();`
    );
  }

  // Output to temporary TS file
  await mkdir(tmpDir, { recursive: true });
  await writeFile(outFilePath, outFileContents.join("\n"));

  // Create types checkers from temporary TS file
  await TypiaProgrammer.build({
    input: join(outDir, "tmp"),
    output: outDir,
    project: join(import.meta.dir, "../tsconfig.json"),
  });

  // Clean up
  await unlink(outFilePath);
  await rmdir(tmpDir);
};

console.log("Generating validators...");

const cwd = process.cwd();
const config = await getConfig();

await generateValidators(cwd, config);
