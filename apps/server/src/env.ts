import { z } from "zod";

const envSchema = z.object({
  // Storage configuration
  ENABLE_S3: z.union([z.literal("true"), z.literal("false")]).default("false"),
  S3_ENDPOINT: z.string().optional(),
  S3_PORT: z.string().optional(),
  S3_USE_SSL: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET_NAME: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.union([z.literal("true"), z.literal("false")]).default("false"),
  S3_REJECT_UNAUTHORIZED: z.union([z.literal("true"), z.literal("false")]).default("true"),
  S3_DISABLE_CHECKSUMS: z.union([z.literal("true"), z.literal("false")]).default("false"),

  // Legacy encryption vars (kept for backward compatibility but not used with S3/Garage)
  ENCRYPTION_KEY: z.string().optional(),
  DISABLE_FILESYSTEM_ENCRYPTION: z.union([z.literal("true"), z.literal("false")]).default("true"),

  // Application configuration
  PRESIGNED_URL_EXPIRATION: z.string().optional().default("3600"),
  APP_URL: z.string().url().optional(),
  SECURE_SITE: z.union([z.literal("true"), z.literal("false")]).default("false"),
  STORAGE_URL: z.string().optional(), // Storage URL for internal storage presigned URLs (required when ENABLE_S3=false, e.g., https://syrg.amfora.com or http://192.168.1.100:9379)
  DATABASE_URL: z.string().optional().default("file:/app/server/prisma/amfora.db"),
  CUSTOM_PATH: z.string().optional(),

  // Update checking. An empty AMFORA_UPDATE_URL switches the check off entirely, which is
  // the escape hatch for an installation that must not talk to the outside world.
  AMFORA_UPDATE_URL: z.string().optional().default("https://amfora.solutionmax.net/releases/latest.json"),
  AMFORA_UPDATE_CHECK: z.union([z.literal("true"), z.literal("false")]).default("true"),
  // The public half, shipped on purpose: an operator who has to paste a key in before
  // updates work has a broken install. The variable stays so a fork can sign its own.
  AMFORA_RELEASE_PUBLIC_KEY: z
    .string()
    .optional()
    .default("3c18a8768933ddafb3fc0ac13c972c6ba252e8bfb036638b8e955f2f37fae9b4"),
  // The brandpack key is deliberately not here: see modules/app/brandpack-key.ts.
  // Shared with the host side when over the air updating is installed.
  AMFORA_OTA_DIR: z.string().optional().default("/app/server/ota"),
});

export const env = envSchema.parse(process.env);
