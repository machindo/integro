import { createApiClient } from "@integro/demo-server";

export const api = createApiClient("http://localhost:8000/api", {
  fetchOptions: { credentials: 'include' }
});
