import { spawn } from "bun";
import { program } from "commander";
import { join } from "path";
import { getConfig } from "./getConfig";

const cwd = process.cwd();
const config = await getConfig();

program
  .option("--watch", "watch and reload", true)
  .option("--no-watch", "do not watch and reload")
  .parse(process.argv);

const watch = program.getOptionValue("watch");

if (watch) {
  const proc = spawn(
    [
      "bunx",
      "nodemon",
      "--exec",
      `bun integro dev --no-watch`,
      "--ext",
      ".js,.ts,.json",
      "--watch",
      join(cwd, config?.root ?? "") ?? ".",
    ],
    {
      cwd,
      env: { ...process.env },
      onExit: () => console.log("App has quit"),
      stdout: "inherit",
    }
  );

  console.log("Running dev server...");
} else {
  await import("./dev");
}

// ${join(import.meta.dir, "dev.ts")}
