import axios from "axios";

export interface ErrorData {
  /**
   * The specific error code from the backend (e.g., "fileSizeExceeded"),
   */
  code: string;
  /**
   * An optional object containing dynamic data from the backend's 'details' field,
   * used for frontend interpolation (e.g.: 1024 for maxsizemb).
   */
  details?: string;
}

/**
 * Attempts to extract the specific error 'code' and, if available, 'details' string from an Axios error response.
 *
 * @param error The error object caught.
 * @returns The 'code' and if available 'details' string from error.response.data.[code|details] if found.
 * If not found, returns a default object with code "error" and details "undefined".
 */
const getErrorData = (error: unknown): ErrorData => {
  if (
    axios.isAxiosError(error) &&
    error.response?.data &&
    typeof error.response.data.code === "string" &&
    error.response.data.code.length > 0
  ) {
    const code = error.response.data.code;
    const details =
      typeof error.response.data.details === "string" && error.response.data.details !== null
        ? error.response.data.details
        : undefined;
    return { code, details };
  }

  return { code: "error", details: "undefined" };
};

export default getErrorData;
