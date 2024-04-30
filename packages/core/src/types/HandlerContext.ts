export type MessageContext = {
  type: 'message';
  auth?: string;
  request?: undefined;
};

export type RequestContext = {
  type: 'request';
  auth?: undefined;
  request: Request;
};

export type HandlerContext =
  | MessageContext
  | RequestContext;
