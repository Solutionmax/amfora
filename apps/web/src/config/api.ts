import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from "axios";

import { isPublicPath } from "@/components/auth/paths/public-paths";
import { SHARE_PASSWORD_HEADER } from "@/lib/share-password";
import { isSetupRequiredError, SETUP_PAGE, setupUrl } from "@/lib/two-factor-setup";

// Axios 1.20's private response sentinel blocks contextual R inference in generated
// endpoints. Keep the established Promise<R> contract on this full-response client.
// Defaults come from Axios itself; only the conditional response-method return changes.
type ReadMethod = <
  T = AxiosResponse["data"],
  R = AxiosResponse<T>,
  D = AxiosRequestConfig["data"],
  P = AxiosRequestConfig["params"],
>(
  url: string,
  config?: AxiosRequestConfig<D, P>
) => Promise<R>;
type BodyMethod = <
  T = AxiosResponse["data"],
  R = AxiosResponse<T>,
  D = AxiosRequestConfig["data"],
  P = AxiosRequestConfig["params"],
>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig<D, P>
) => Promise<R>;
type RequestMethod = <
  T = AxiosResponse["data"],
  R = AxiosResponse<T>,
  D = AxiosRequestConfig["data"],
  P = AxiosRequestConfig["params"],
>(
  config: AxiosRequestConfig<D, P>
) => Promise<R>;
type ReadVerbs = "get" | "delete" | "head" | "options";
type BodyVerbs = "post" | "put" | "patch" | "postForm" | "putForm" | "patchForm" | "query";
type ApiClient = Omit<AxiosInstance, ReadVerbs | BodyVerbs | "request"> &
  Record<ReadVerbs, ReadMethod> &
  Record<BodyVerbs, BodyMethod> &
  ReadMethod &
  RequestMethod & { request: RequestMethod };

const apiInstance = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 120000, // 2 minutes timeout for API calls
}) as ApiClient;

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
    !window.location.pathname.startsWith(SETUP_PAGE) &&
    !isPublicPath(window.location.pathname)
  ) {
    window.location.assign(setupUrl(window.location.pathname + window.location.search));
  }

  return Promise.reject(error);
});

export default apiInstance;
