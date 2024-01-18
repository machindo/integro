import typia from "typia";

type Middleware = (request: Request) => Request;

export type Config = {
  root?: string;
  out?: string;
  middleware?: Middleware[];
};

export type ConfigModule = {
  default: Config;
};

export const checkConfigModule = typia.createIs<ConfigModule>();
