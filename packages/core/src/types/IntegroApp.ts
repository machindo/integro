// eslint-disable-next-line @typescript-eslint/no-explicit-any -- this is the convention for a generic function type
export type Handler = (...arguments_: any[]) => any;

export type IntegroApp = Handler | {
  [K: string]: IntegroApp;
}
