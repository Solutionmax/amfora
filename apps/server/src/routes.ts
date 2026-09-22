import type { FastifyInstance } from "fastify";

import { appRoutes } from "./modules/app/routes";
import { authProvidersRoutes } from "./modules/auth-providers/routes";
import { authRoutes } from "./modules/auth/routes";
import { fileRoutes } from "./modules/file/routes";
import { folderRoutes } from "./modules/folder/routes";
import { healthRoutes } from "./modules/health/routes";
import { inviteRoutes } from "./modules/invite/routes";
import { reverseShareRoutes } from "./modules/reverse-share/routes";
import { shareRoutes } from "./modules/share/routes";
import { storageRoutes } from "./modules/storage/routes";
import { twoFactorRoutes } from "./modules/two-factor/routes";
import { updateRoutes } from "./modules/update/routes";
import { userRoutes } from "./modules/user/routes";

/** Every HTTP route the server exposes, in one place so a test can see the whole surface. */
export function registerRoutes(app: FastifyInstance) {
  app.register(authRoutes);
  app.register(authProvidersRoutes, { prefix: "/auth" });
  app.register(twoFactorRoutes, { prefix: "/auth" });
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
}
