#! /usr/bin/env bun

import { program } from "commander";

program
  .name("integro")
  .version("0.1.0", "-v, -V, --version")
  .command("generate-client", "generate type-safe client")
  .alias("g")
  .command("generate-validators", "generate type checkers")
  .alias("v")
  .command("serve", "serve the API")
  .alias("s")
  .command("dev", "run dev server", { isDefault: true })
  .parse(process.argv);
