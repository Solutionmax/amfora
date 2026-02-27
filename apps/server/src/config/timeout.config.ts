/**
 * Timeout Configuration for Large File Handling
 *
 * These settings control how long the server will wait for various operations
 * when dealing with large files. Adjust based on your infrastructure needs.
 */

export const timeoutConfig = {
  connection: {
    timeout: 0,
    keepAlive: 20 * 60 * 60 * 1000, // 20 hours in milliseconds
  },

  request: {
    timeout: 0,
    bodyTimeout: 0, // Disabled for large files
  },

  file: {
    uploadTimeout: 0,

    downloadTimeout: 0,
    streamTimeout: 30 * 1000, // 30 seconds between chunks
  },

  token: {
    expiration: 60 * 60 * 1000, // 1 hour in milliseconds
  },
};

/**
 * Get timeout configuration based on file size
 * For very large files, we might want different timeouts
 */
export function getTimeoutForFileSize(fileSizeBytes: number) {
  const fileSizeGB = fileSizeBytes / (1024 * 1024 * 1024);

  if (fileSizeGB > 100) {
    return {
      ...timeoutConfig,
      token: {
        expiration: 24 * 60 * 60 * 1000, // 24 hours for very large files
      },
    };
  }

  if (fileSizeGB > 10) {
    return {
      ...timeoutConfig,
      token: {
        expiration: 4 * 60 * 60 * 1000, // 4 hours for large files
      },
    };
  }

  return timeoutConfig;
}

/**
 * Environment-based timeout overrides
 * You can set these in your .env file to override defaults
 */
export const envTimeoutOverrides = {
  keepAliveTimeout: process.env.KEEP_ALIVE_TIMEOUT
    ? parseInt(process.env.KEEP_ALIVE_TIMEOUT)
    : timeoutConfig.connection.keepAlive,

  requestTimeout: process.env.REQUEST_TIMEOUT ? parseInt(process.env.REQUEST_TIMEOUT) : timeoutConfig.request.timeout,

  tokenExpiration: process.env.TOKEN_EXPIRATION
    ? parseInt(process.env.TOKEN_EXPIRATION)
    : timeoutConfig.token.expiration,
};
