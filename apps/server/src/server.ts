import * as fs from "fs/promises";
import crypto from "node:crypto";
import fastifyMultipart from "@fastify/multipart";

import { buildApp } from "./app";
import { directoriesConfig } from "./config/directories.config";
import { appRoutes } from "./modules/app/routes";
import { authProvidersRoutes } from "./modules/auth-providers/routes";
import { authRoutes } from "./modules/auth/routes";
import { fileRoutes } from "./modules/file/routes";
import { folderRoutes } from "./modules/folder/routes";
import { healthRoutes } from "./modules/health/routes";
import { inviteRoutes } from "./modules/invite/routes";
import { reverseShareRoutes } from "./modules/reverse-share/routes";
import { s3StorageRoutes } from "./modules/s3-storage/routes";
import { shareRoutes } from "./modules/share/routes";
import { storageRoutes } from "./modules/storage/routes";
import { twoFactorRoutes } from "./modules/two-factor/routes";
import { updateRoutes } from "./modules/update/routes";
import { userRoutes } from "./modules/user/routes";

if (typeof globalThis.crypto === "undefined") {
  globalThis.crypto = crypto.webcrypto as any;
}

if (typeof global.crypto === "undefined") {
  (global as any).crypto = crypto.webcrypto;
}

async function ensureDirectories() {
  const dirsToCreate = [
    { path: directoriesConfig.uploads, name: "uploads" },
    { path: directoriesConfig.tempUploads, name: "temp-uploads" },
    { path: directoriesConfig.branding, name: "branding" },
  ];

  for (const dir of dirsToCreate) {
    try {
      await fs.access(dir.path);
    } catch {
      await fs.mkdir(dir.path, { recursive: true });
      console.log(`📁 Created ${dir.name} directory: ${dir.path}`);
    }
  }
}

async function startServer() {
  const app = await buildApp();

  await ensureDirectories();
  const { isInternalStorage, isExternalS3 } = await import("./config/storage.config.js");
  const { runAutoMigration } = await import("./scripts/migrate-filesystem-to-s3.js");
  await runAutoMigration();

  await app.register(fastifyMultipart, {
    limits: {
      fieldNameSize: 100,
      fieldSize: 1024 * 1024,
      fields: 10,
      // Only the logo and avatar endpoints post a file through the API; real uploads go
      // straight to storage with a presigned URL and never pass through here.
      fileSize: Number(process.env.API_MULTIPART_LIMIT_MB || 32) * 1024 * 1024,
      files: 1,
      headerPairs: 2000,
    },
  });

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
  app.register(s3StorageRoutes);
  app.register(updateRoutes);

  if (isInternalStorage) {
    console.log("📦 Using internal storage (auto-configured)");
  } else if (isExternalS3) {
    console.log("📦 Using external S3 storage (AWS/S3-compatible)");
  } else {
    console.log("⚠️  WARNING: Storage not configured! Storage may not work.");
  }

  await app.listen({
    port: 3333,
    host: process.env.API_HOST || "127.0.0.1",
  });

  console.log(`Amfora server running on port 3333`);

  // Cleanup on shutdown
  process.on("SIGINT", () => process.exit(0));
  process.on("SIGTERM", () => process.exit(0));
}

startServer().catch((err) => {
  console.error("Error starting server:", err);
  process.exit(1);
});
