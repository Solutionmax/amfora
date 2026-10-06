import type { FastifyInstance } from "fastify";

import { activityRoutes } from "./modules/activity/routes";
import { registerApiKeyAuth } from "./modules/api-key/auth";
import { apiKeyRoutes } from "./modules/api-key/routes";
import { appRoutes } from "./modules/app/routes";
import { authProvidersRoutes } from "./modules/auth-providers/routes";
import { authRoutes } from "./modules/auth/routes";
import { fileRoutes } from "./modules/file/routes";
import { folderRoutes } from "./modules/folder/routes";
import { healthRoutes } from "./modules/health/routes";
import { inviteRoutes } from "./modules/invite/routes";
import { passkeyRoutes } from "./modules/passkey/routes";
import { reverseShareRoutes } from "./modules/reverse-share/routes";
import { secretRoutes } from "./modules/secret/routes";
import { shareRoutes } from "./modules/share/routes";
import { storageRoutes } from "./modules/storage/routes";
import { trashRoutes } from "./modules/trash/routes";
import { twoFactorRoutes } from "./modules/two-factor/routes";
import { registerSecondStepGate } from "./modules/two-factor/second-step";
import { updateRoutes } from "./modules/update/routes";
import { userRoutes } from "./modules/user/routes";

/** Every HTTP route the server exposes, in one place so a test can see the whole surface. */
export function registerRoutes(app: FastifyInstance) {
  // Before the routes: a hook only reaches the route plugins registered after it.
  registerApiKeyAuth(app);
  registerSecondStepGate(app);

  app.register(authRoutes);
  app.register(authProvidersRoutes, { prefix: "/auth" });
  app.register(twoFactorRoutes, { prefix: "/auth" });
  app.register(passkeyRoutes, { prefix: "/auth" });
  app.register(inviteRoutes);
  app.register(userRoutes);
  app.register(folderRoutes);
  app.register(fileRoutes);
  app.register(shareRoutes);
  app.register(reverseShareRoutes);
  app.register(storageRoutes);
  app.register(appRoutes);
  app.register(healthRoutes);
  app.register(updateRoutes);
  app.register(apiKeyRoutes);
  app.register(secretRoutes);
  app.register(activityRoutes);
  app.register(trashRoutes);
}
