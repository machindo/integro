import { IntegroApp } from './types/IntegroApp';

export const defineApp = <T extends IntegroApp>(app: T) => app;
