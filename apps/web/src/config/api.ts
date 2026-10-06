import axios from "axios";

import { SHARE_PASSWORD_HEADER } from "@/lib/share-password";
import { isSetupRequiredError, SETUP_PAGE, setupUrl } from "@/lib/two-factor-setup";

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

// The server answers every route but the set up path with a coded 403 while a second step is
// required and missing. One place sends the user to the set up page, wherever the call came from.
apiInstance.interceptors.response.use(undefined, (error) => {
  if (
    typeof window !== "undefined" &&
    isSetupRequiredError(error) &&
    !window.location.pathname.startsWith(SETUP_PAGE)
  ) {
    window.location.assign(setupUrl(window.location.pathname + window.location.search));
  }

  return Promise.reject(error);
});

export default apiInstance;
