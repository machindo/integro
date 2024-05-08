export type RegularRequestData = {
  type: 'request';
  path: string[];
  args: unknown[];
};

export type BatchRequestData = {
  type: 'all' | 'allSettled' | 'allSequential' | 'allSettledSequential';
  data: RequestData[];
};

export type RequestData = RegularRequestData | BatchRequestData;
