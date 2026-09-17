import assert from "node:assert/strict";
import { test } from "node:test";

import { prisma } from "../../shared/prisma";
import { UpdateAuthProviderSchema } from "./dto";
import { authProvidersRoutes } from "./routes";
import { AuthProvidersService } from "./service";

const patchMethod = (target: object, key: string, implementation: unknown) => {
  const objectTarget = target as Record<string, unknown>;
  const original = objectTarget[key];
  objectTarget[key] = implementation;
  return () => {
    objectTarget[key] = original;
  };
};

test("all provider management routes require JWT validation with one existing user", async () => {
  const originalInterval = globalThis.setInterval;
  globalThis.setInterval = (() => ({ unref() {} })) as unknown as typeof setInterval;

  try {
    const routes: Array<{ url: string; options?: { preValidation?: (request: any, reply: any) => Promise<unknown> } }> =
      [];
    const fakeFastify = {
      get: (url: string, options: any) => routes.push({ url, options }),
      post: (url: string, options: any) => routes.push({ url, options }),
      put: (url: string, options: any) => routes.push({ url, options }),
      delete: (url: string, options: any) => routes.push({ url, options }),
    } as any;

    await authProvidersRoutes(fakeFastify);

    const managementRoutes = routes.filter(({ options }) => Boolean(options?.preValidation));
    assert.equal(managementRoutes.length, 5);

    const restoreCount = patchMethod(prisma.user, "count", async () => 1);
    const restoreFindUnique = patchMethod(prisma.user, "findUnique", async () => ({ isAdmin: true, isActive: true }));

    try {
      for (const route of managementRoutes) {
        let jwtCalls = 0;
        const request = {
          jwtVerify: async () => {
            jwtCalls += 1;
            request.user = { userId: "admin-id", isAdmin: true };
          },
          user: undefined as { userId: string; isAdmin: boolean } | undefined,
        };
        const reply = {
          sent: false,
          status: () => reply,
          send: () => {
            reply.sent = true;
            return reply;
          },
        };

        await route.options?.preValidation?.(request, reply);
        assert.equal(jwtCalls, 1, route.url);
        assert.equal(reply.sent, false, route.url);
      }
    } finally {
      restoreFindUnique();
      restoreCount();
    }
  } finally {
    globalThis.setInterval = originalInterval;
  }
});

test("provider management responses redact client secrets and expose presence", async () => {
  const service = Object.create(AuthProvidersService.prototype) as AuthProvidersService;
  const restoreFindMany = patchMethod(prisma.authProvider, "findMany", async () => [
    {
      id: "provider-id",
      name: "example",
      displayName: "Example",
      type: "oidc",
      clientSecret: "synthetic-secret",
      enabled: true,
      sortOrder: 0,
    },
  ]);

  try {
    const providers = await service.getAllProviders();
    assert.equal(providers[0].hasClientSecret, true);
    assert.equal("clientSecret" in providers[0], false);
  } finally {
    restoreFindMany();
  }
});

test("blank provider secret edits preserve the existing secret", async () => {
  assert.equal(UpdateAuthProviderSchema.safeParse({ clientSecret: "" }).success, true);

  const service = Object.create(AuthProvidersService.prototype) as AuthProvidersService;
  let updateArgs: any;
  const restoreUpdate = patchMethod(prisma.authProvider, "update", async (args: any) => {
    updateArgs = args;
    return { id: "provider-id", name: "example", clientSecret: "synthetic-secret" };
  });

  try {
    await service.updateProvider("provider-id", { displayName: "Example", clientSecret: "" });
    assert.deepEqual(updateArgs.data, { displayName: "Example" });
  } finally {
    restoreUpdate();
  }
});
