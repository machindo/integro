import { createApiClient } from "@integro/demo-server";
import { useQuery } from '@tanstack/react-query';
import { AnyClientMethod } from 'integro/browser';
import useSWR from 'swr';

export const api = createApiClient("http://localhost:8000/api", {
  requestInit: { credentials: 'include' }
});

export const useIntegro = <Fn extends AnyClientMethod>(fn: Fn, ...args: Parameters<Fn>) =>
  useSWR<Awaited<ReturnType<Fn>>>([fn[Symbol.toStringTag], ...args], () => fn(...args));

export const useIntegroQuery = <Fn extends AnyClientMethod>(fn: Fn, ...args: Parameters<Fn>) =>
  useQuery<Awaited<ReturnType<Fn>>>({
    queryKey: [fn[Symbol.toStringTag], ...args],
    queryFn: () => fn(...args)
  });

console.log('Symbol.toStringTag:', Symbol.toStringTag)