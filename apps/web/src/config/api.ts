import axios from "axios";

import { SHARE_PASSWORD_HEADER } from "@/lib/share-password";

const apiInstance = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 120000, // 2 minutes timeout for API calls
});

// Call sites pass the share password as a normal request param. Lift it into a header
// before the request is serialised so that it never becomes part of the query string.
apiInstance.interceptors.request.use((config) => {
  const params = config.params as Record<string, unknown> | undefined;
  const password = params?.password;

  if (typeof password === "string" && password.length > 0) {
    config.headers.set(SHARE_PASSWORD_HEADER, encodeURIComponent(password));
  }

  if (params && "password" in params) {
    const rest = { ...params };
    delete rest.password;
    config.params = rest;
  }

  return config;
});

export default apiInstance;
