import crypto from "node:crypto";
import * as http from "node:http";
import fastifyCookie from "@fastify/cookie";
import { fastifyCors } from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import fastifyRateLimit from "@fastify/rate-limit";
import { fastifySwaggerUi } from "@fastify/swagger-ui";
import { fastify } from "fastify";
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from "fastify-type-provider-zod";

import { registerSwagger } from "./config/swagger.config";
import { envTimeoutOverrides } from "./config/timeout.config";
import { prisma } from "./shared/prisma";

/** Megabytes that may be posted to the API in one request. Uploads bypass this entirely. */
const bodyLimitBytes = Number(process.env.API_BODY_LIMIT_MB || 256) * 1024 * 1024;

/** Requests per minute per IP across every route. Sensitive routes set their own lower limit. */
const globalRateLimit = Number(process.env.RATE_LIMIT_MAX || 600);

/** Comma separated list of origins allowed to call this API from a browser. Empty means none. */
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export async function buildApp() {
  const jwtConfig = await prisma.appConfig.findUnique({
    where: { key: "jwtSecret" },
  });

  const JWT_SECRET = jwtConfig?.value || crypto.randomBytes(64).toString("hex");

  const app = fastify({
    ajv: {
      customOptions: {
        removeAdditional: false,
      },
    },
    logger: {
      level: "warn",
    },
    bodyLimit: bodyLimitBytes,
    connectionTimeout: 0,
    keepAliveTimeout: envTimeoutOverrides.keepAliveTimeout,
    requestTimeout: envTimeoutOverrides.requestTimeout,
    trustProxy:
      process.env.TRUST_PROXY && !["true", "false"].includes(process.env.TRUST_PROXY)
        ? process.env.TRUST_PROXY.split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        : false,
    maxParamLength: 500,
    onProtoPoisoning: "error",
    onConstructorPoisoning: "error",
    ignoreTrailingSlash: true,
    serverFactory: (handler: (req: any, res: any) => void) => {
      const server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
        res.setTimeout(0);
        req.setTimeout(0);

        req.on("close", () => {
          if (typeof global !== "undefined" && global.gc) {
            setImmediate(() => global.gc!());
          }
        });

        handler(req, res);
      });

      server.maxHeadersCount = 0;
      server.timeout = 0;
      server.keepAliveTimeout = envTimeoutOverrides.keepAliveTimeout;
      server.headersTimeout = envTimeoutOverrides.keepAliveTimeout + 1000;

      return server;
    },
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.addSchema({
    $id: "dateFormat",
    type: "string",
    format: "date-time",
  });

  // The web app reaches this API server-side (Next.js proxy routes), so no browser
  // ever needs cross-origin access. Deny by default; opt in with CORS_ORIGINS.
  app.register(fastifyCors, {
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
  });

  // Global ceiling. Individual routes tighten this further (see rate-limit.config.ts).
  await app.register(fastifyRateLimit, {
    global: true,
    max: globalRateLimit,
    timeWindow: "1 minute",
    // onRequest, so that a flood is rejected before the body is read and validated.
    // On preHandler a malformed body would fail validation first and never be counted.
    hook: "onRequest",
    keyGenerator: (request) => request.ip,
    allowList: () => false,
    addHeaders: { "x-ratelimit-limit": true, "x-ratelimit-remaining": true, "x-ratelimit-reset": true },
  });

  app.register(fastifyCookie);
  app.register(fastifyJwt, {
    secret: JWT_SECRET,
    cookie: {
      cookieName: "token",
      signed: false,
    },
    sign: {
      expiresIn: "1d",
    },
  });

  app.decorateRequest("jwtSign", function (this: any, payload: object, options?: object) {
    return this.server.jwt.sign(payload, options);
  });

  registerSwagger(app);
  app.register(fastifySwaggerUi, {
    routePrefix: "/swagger",
  });

  app.register(require("@scalar/fastify-api-reference"), {
    routePrefix: "/docs",
    configuration: {
      theme: "deepSpace",
    },
  });

  return app;
}
