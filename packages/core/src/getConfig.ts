import { Glob } from "bun";
import { join } from "path";
import { checkConfigModule } from "./types/Config";

const cwd = process.cwd();

export const getConfig = async () => {
  const configFileGlob = new Glob("integro.config.{js,json,mjs,ts}");

  try {
    const file = Array.from(configFileGlob.scanSync(cwd))[0];
    const configModule = await import(join(cwd, file));

    if (!checkConfigModule(configModule)) return;

    const { default: config } = configModule;

    return config;
  } catch (e) {
    console.warn(e);
  }
};
