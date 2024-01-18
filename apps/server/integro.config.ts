import { Config } from "integro";

export default {
  root: "./src/api",
  out: "./dist",
  // middleware: [
  //   (req) => {
  //     if (!req.headers.get("Authentication"))
  //       throw new Error("Unauthenticated");

  //     return req;
  //   },
  // ],
} satisfies Config;
