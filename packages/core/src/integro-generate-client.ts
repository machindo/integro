import path, { join } from "path";
import {
  IndentationText,
  Node,
  Project,
  QuoteKind,
  SyntaxKind,
  VariableDeclarationKind,
} from "ts-morph";
import { ModuleKind, ScriptTarget } from "typescript";
import { getConfig } from "./getConfig.js";
import { footprintOfType } from "./typeFootprint.js";
import { Config } from "./types/Config.js";

const generateClient = async (cwd: string, config: Config | undefined) => {
  const rootPath = config?.root ? join(cwd, config.root) : cwd;
  const outDir = config?.out
    ? join(cwd, config?.out, "client")
    : join(cwd, ".integro/client");
  const internalProject = new Project();
  const project = new Project({
    compilerOptions: {
      lib: ["ESNext"],
      module: ModuleKind.ESNext,
      target: ScriptTarget.ESNext,
      outDir,
      declaration: true,
      noEmit: false,
    },
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces,
      quoteKind: QuoteKind.Single,
    },
  });

  project.addSourceFilesAtPaths(`${cwd}/src/**/*.ts`);

  const functionFiles = project
    .getSourceFiles()
    .filter((f) => f.getFilePath().startsWith(rootPath));
  const clientFileSource = internalProject.addSourceFileAtPath(
    join(import.meta.dir, "templates/client.ts")
  );
  const clientFileOut = project.createSourceFile(
    "index.ts",
    clientFileSource?.getText()
  );
  const createClient = clientFileOut.getFunctionOrThrow("createClient");
  const clientObject = createClient
    .getVariableDeclarationOrThrow("c")
    .getInitializerIfKindOrThrow(SyntaxKind.ObjectLiteralExpression);
  const dotPathsArray = clientFileOut
    .getVariableDeclarationOrThrow("ClientDotPath")
    .getInitializerIfKindOrThrow(SyntaxKind.SatisfiesExpression)
    .getChildrenOfKind(SyntaxKind.AsExpression)[0]
    .getChildrenOfKind(SyntaxKind.ArrayLiteralExpression)[0];
  const slashPathsArray = clientFileOut
    .getVariableDeclarationOrThrow("ClientSlashPath")
    .getInitializerIfKindOrThrow(SyntaxKind.SatisfiesExpression)
    .getChildrenOfKind(SyntaxKind.AsExpression)[0]
    .getChildrenOfKind(SyntaxKind.ArrayLiteralExpression)[0];

  clientObject.getProperty("_")?.remove();

  for (const file of functionFiles) {
    const { name } = path.parse(file.getBaseName());
    const filePath = file.getFilePath();
    const pathname = filePath
      .substring(rootPath.length + 1)
      .match(/^[^.]*/)?.[0];

    if (!pathname) {
      console.warn(`invalid pathname for ${file.getFilePath()}`);
      continue;
    }

    const dotPath = pathname.replaceAll("/", ".");
    const segments = pathname.split("/");
    const fn = (
      file.getExportSymbols().find((e) => e.getName() === name) ??
      file.getDefaultExportSymbol()
    )?.getDeclarations()[0];

    if (!fn) {
      console.warn(
        `${file.getFilePath()} is missing default or "${name}" function`
      );
      continue;
    }

    const fnType = footprintOfType({ type: fn.getType(), node: fn });
    const initializer = `cc<${fnType}>({ host, pathname: "${pathname}", middlewares })`;
    let obj = clientObject;

    for (const segment of segments.slice(0, segments.length - 1)) {
      const maybeObj =
        obj.getProperty(segment)?.getChildAtIndex(2) ??
        obj
          .addPropertyAssignment({
            name: segment,
            initializer: "{}",
          })
          .getInitializer();

      if (!Node.isObjectLiteralExpression(maybeObj)) {
        throw new Error("Error creating client");
      }

      obj = maybeObj;
    }

    // Create nested method
    obj.addPropertyAssignment({
      name,
      initializer,
    });
    slashPathsArray.addElement(`"${pathname}"`);
    dotPathsArray.addElement(`"${dotPath}"`);

    // Create flat slash-notation and dot-notation methods
    if (pathname.includes("/")) {
      clientObject.addPropertyAssignments([
        {
          name: `"${pathname}"`,
          initializer,
        },
        {
          name: `"${dotPath}"`,
          initializer,
        },
      ]);
    }
  }

  const emitResult = await clientFileOut.emit();

  for (const diagnostic of emitResult.getDiagnostics())
    console.log(diagnostic.getMessageText());
};

console.log("Generating client...");

const cwd = process.cwd();
const config = await getConfig();

await generateClient(cwd, config);
