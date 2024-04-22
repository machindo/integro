export type Handler = (...arguments_: any[]) => any;

export type IntegroApp = Handler | {
  [K: string]: IntegroApp;
}
