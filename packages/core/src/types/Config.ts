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
export const checkConfigModule = (input: any): input is ConfigModule => {
    const $io0 = (input: any): boolean => "object" === typeof input["default"] && null !== input["default"] && false === Array.isArray(input["default"]) && $io1(input["default"]);
    const $io1 = (input: any): boolean => (undefined === input.root || "string" === typeof input.root) && (undefined === input.out || "string" === typeof input.out) && (undefined === input.middleware || Array.isArray(input.middleware) && input.middleware.every((elem: any) => true));
    return "object" === typeof input && null !== input && $io0(input);
};
