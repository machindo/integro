import { isSubject } from '../createSubject';
import type { IntegroApp } from '../types/IntegroApp';
import { HandlerContext } from '../types/HandlerContext';
import { PathError } from '../types/errors';
import { isUnwrappable } from '../unwrap';

export const resolveProp = async (
  { path: [firstProp, ...path], app, context }:
    { path: string[], app: IntegroApp, context: HandlerContext }
): Promise<IntegroApp> => {
  const unwrappedApp = isUnwrappable(app) ? await app(context) : app;

  if (!unwrappedApp) throw new PathError(`Path could not be found in the app.`);
  if (context.type === 'request' && isSubject(unwrappedApp)) throw new PathError(`Subjects may not be accessed by the client.`);

  const property = firstProp == null ? undefined : (unwrappedApp as Record<string, IntegroApp>)[firstProp];

  return property ? resolveProp({ path, app: property, context }) : unwrappedApp;
};
