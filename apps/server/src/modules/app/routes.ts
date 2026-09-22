import { FastifyInstance } from "fastify";
import { z } from "zod";

import { createAdminGuard } from "../../shared/admin-guard";
import { backgroundImage, BrandingImage, linkPreviewImage, shareCoverImage } from "./branding-image";
import { AppController } from "./controller";
import { BulkUpdateConfigSchema, ConfigResponseSchema } from "./dto";

const linkPreviewInfo = z
  .object({
    width: z.number().describe("Width of the og:image rendition"),
    height: z.number().describe("Height of the og:image rendition"),
    version: z.string().describe("Changes on every upload, for cache busting"),
  })
  .nullable();

export async function appRoutes(app: FastifyInstance) {
  const appController = new AppController();

  // First run only: no user yet, or the one user just registered and the setup flag is
  // still on. Every other single-admin installation needs a real, current admin.
  const adminPreValidation = createAdminGuard({ firstRun: "setup" });

  /** No first-run exception here: nothing about a brandpack or a background belongs to setup. */
  const strictAdminPreValidation = createAdminGuard();

  app.get(
    "/app/info",
    {
      schema: {
        tags: ["App"],
        operationId: "getAppInfo",
        summary: "Get application base information",
        description: "Get application base information",
        response: {
          200: z.object({
            appName: z.string().describe("The application name"),
            appDescription: z.string().describe("The application description"),
            appLogo: z.string().describe("The application logo"),
            firstUserAccess: z.boolean().describe("Whether it's the first user access"),
            appPrimaryColor: z.string().describe("Installation accent color"),
            appFontFamily: z.string().describe("Installation font family"),
            appRadius: z.string().describe("Installation corner radius"),
            appHideCredit: z.boolean().describe("Whether the Amfora credit is hidden (needs a valid brandpack)"),
            appBackground: z
              .boolean()
              .describe("Whether a public-page background image is set (needs a valid brandpack)"),
            appCustomCss: z.string().describe("Custom CSS, sanitised, empty without a valid brandpack"),
            appShareCover: linkPreviewInfo.describe("The download page cover (free), or null"),
            appLinkPreview: linkPreviewInfo.describe("The default link preview image (free), or null"),
            appSharePlayback: z.boolean().describe("Whether video and audio play on public download pages"),
            brandpack: z
              .object({ organisation: z.string(), issuedAt: z.string() })
              .nullable()
              .describe("The verified brandpack, or null"),
          }),
          400: z.object({ error: z.string().describe("Error message") }),
        },
      },
    },
    appController.getAppInfo.bind(appController)
  );

  app.get(
    "/app/system-info",
    {
      schema: {
        tags: ["App"],
        operationId: "getSystemInfo",
        summary: "Get system information",
        description: "Get system information including storage provider",
        response: {
          200: z.object({
            storageProvider: z.enum(["s3", "filesystem"]).describe("The active storage provider"),
            s3Enabled: z.boolean().describe("Whether S3 storage is enabled"),
          }),
          400: z.object({ error: z.string().describe("Error message") }),
        },
      },
    },
    appController.getSystemInfo.bind(appController)
  );

  app.patch(
    "/app/configs/:key",
    {
      preValidation: adminPreValidation,
      schema: {
        tags: ["App"],
        operationId: "updateConfig",
        summary: "Update a configuration value",
        description: "Update a configuration value (admin only)",
        params: z.object({
          key: z.string().describe("The config key"),
        }),
        body: z.object({
          value: z.string().describe("The config value"),
        }),
        response: {
          200: z.object({
            config: ConfigResponseSchema,
          }),
          400: z.object({ error: z.string().describe("Error message") }),
          401: z.object({ error: z.string().describe("Error message") }),
          403: z.object({ error: z.string().describe("Error message") }),
          404: z.object({ error: z.string().describe("Error message") }),
        },
      },
    },
    appController.updateConfig.bind(appController)
  );

  app.get(
    "/app/configs/public",
    {
      schema: {
        tags: ["App"],
        operationId: "getPublicConfigs",
        summary: "List public configurations",
        description: "List public configurations (excludes sensitive data like SMTP credentials)",
        response: {
          200: z.object({
            configs: z.array(ConfigResponseSchema),
          }),
          400: z.object({ error: z.string().describe("Error message") }),
        },
      },
    },
    appController.getPublicConfigs.bind(appController)
  );

  app.get(
    "/app/configs",
    {
      preValidation: adminPreValidation,
      schema: {
        tags: ["App"],
        operationId: "getAllConfigs",
        summary: "List all configurations",
        description: "List all configurations including sensitive data (admin only)",
        response: {
          200: z.object({
            configs: z.array(ConfigResponseSchema),
          }),
          400: z.object({ error: z.string().describe("Error message") }),
          401: z.object({ error: z.string().describe("Error message") }),
          403: z.object({ error: z.string().describe("Error message") }),
        },
      },
    },
    appController.getAllConfigs.bind(appController)
  );

  app.patch(
    "/app/configs",
    {
      preValidation: adminPreValidation,
      schema: {
        tags: ["App"],
        operationId: "bulkUpdateConfigs",
        summary: "Bulk update configuration values",
        description: "Bulk update configuration values (admin only)",
        body: BulkUpdateConfigSchema,
        response: {
          200: z.object({
            configs: z.array(ConfigResponseSchema),
          }),
          400: z.object({ error: z.string().describe("Error message") }),
          401: z.object({ error: z.string().describe("Error message") }),
          403: z.object({ error: z.string().describe("Error message") }),
        },
      },
    },
    appController.bulkUpdateConfigs.bind(appController)
  );

  app.post(
    "/app/test-smtp",
    {
      preValidation: adminPreValidation,
      schema: {
        tags: ["App"],
        operationId: "testSmtpConnection",
        summary: "Test SMTP connection with provided or saved configuration",
        description:
          "Validates SMTP connectivity using either provided configuration parameters or the currently saved settings. This endpoint allows testing SMTP settings before saving them permanently. Requires admin privileges.",
        body: z
          .object({
            smtpConfig: z
              .object({
                smtpEnabled: z.string().describe("Whether SMTP is enabled ('true' or 'false')"),
                smtpHost: z.string().describe("SMTP server hostname or IP address (e.g., 'smtp.gmail.com')"),
                smtpPort: z
                  .union([z.string(), z.number()])
                  .transform(String)
                  .describe("SMTP server port (typically 587 for TLS, 25 for non-secure)"),
                smtpUser: z.string().describe("Username for SMTP authentication (e.g., email address)"),
                smtpPass: z.string().describe("Password for SMTP authentication (for Gmail, use App Password)"),
                smtpSecure: z
                  .string()
                  .optional()
                  .describe("Connection security method ('auto', 'ssl', 'tls', or 'none')"),
                smtpNoAuth: z.string().optional().describe("Disable SMTP authentication ('true' or 'false')"),
                smtpTrustSelfSigned: z
                  .string()
                  .optional()
                  .describe("Trust self-signed certificates ('true' or 'false')"),
              })
              .optional()
              .describe("SMTP configuration to test. If not provided, uses currently saved configuration"),
          })
          .optional()
          .describe("Request body containing SMTP configuration to test. Send empty body to test saved configuration"),
        response: {
          200: z.object({
            success: z.boolean().describe("Whether the SMTP connection test was successful"),
            message: z.string().describe("Descriptive message about the test result"),
          }),
          400: z.object({
            error: z.string().describe("Error message describing what went wrong with the test"),
          }),
          401: z.object({
            error: z.string().describe("Authentication error - invalid or missing JWT token"),
          }),
          403: z.object({
            error: z.string().describe("Authorization error - user does not have admin privileges"),
          }),
        },
      },
    },
    appController.testSmtpConnection.bind(appController)
  );

  app.post(
    "/app/logo",
    {
      preValidation: adminPreValidation,
      schema: {
        tags: ["App"],
        operationId: "uploadLogo",
        summary: "Upload app logo",
        description: "Upload a new app logo (admin only)",
        response: {
          200: z.object({
            logo: z.string().describe("The logo URL"),
          }),
          400: z.object({ error: z.string().describe("Error message") }),
          401: z.object({ error: z.string().describe("Error message") }),
          403: z.object({ error: z.string().describe("Error message") }),
        },
      },
    },
    appController.uploadLogo.bind(appController)
  );

  app.delete(
    "/app/logo",
    {
      preValidation: adminPreValidation,
      schema: {
        tags: ["App"],
        operationId: "removeLogo",
        summary: "Remove app logo",
        description: "Remove the current app logo (admin only)",
        response: {
          200: z.object({
            message: z.string().describe("Success message"),
          }),
          400: z.object({ error: z.string().describe("Error message") }),
          401: z.object({ error: z.string().describe("Error message") }),
          403: z.object({ error: z.string().describe("Error message") }),
        },
      },
    },
    appController.removeLogo.bind(appController)
  );

  const adminErrors = {
    400: z.object({ error: z.string().describe("Error message") }),
    401: z.object({ error: z.string().describe("Error message") }),
    403: z.object({ error: z.string().describe("Error message") }),
  };

  const brandingImages: Array<{
    path: string;
    image: BrandingImage;
    operation: string;
    title: string;
    note: string;
  }> = [
    {
      path: "/app/background",
      image: backgroundImage,
      operation: "Background",
      title: "public-page background image",
      note: "brandpack needed for it to show",
    },
    {
      path: "/app/share-cover",
      image: shareCoverImage,
      operation: "ShareCover",
      title: "download page cover image",
      note: "shown on every download page and used for link previews",
    },
    {
      path: "/app/link-preview",
      image: linkPreviewImage,
      operation: "LinkPreview",
      title: "default link preview image",
      note: "og:image when no cover is set",
    },
  ];

  for (const { path, image, operation, title, note } of brandingImages) {
    app.get(
      path,
      {
        schema: {
          tags: ["App"],
          operationId: `get${operation}`,
          summary: `The ${title}`,
          description: `Streams the ${title} as WebP, or 404 when there is none`,
        },
      },
      appController.getBrandingImage(image)
    );

    if (image.options.withLinkPreview) {
      app.get(
        `${path}/og`,
        {
          schema: {
            tags: ["App"],
            operationId: `get${operation}LinkPreview`,
            summary: `The ${title} for og:image`,
            description: `Streams a 1200 px JPEG of the ${title}, or 404 when there is none`,
          },
        },
        appController.getBrandingLinkPreview(image)
      );
    }

    app.post(
      path,
      {
        preValidation: strictAdminPreValidation,
        schema: {
          tags: ["App"],
          operationId: `upload${operation}`,
          summary: `Upload the ${title}`,
          description: `Upload the ${title} (admin only, ${note}); max 3 MB`,
          response: { 200: z.object({ message: z.string() }), ...adminErrors },
        },
      },
      appController.uploadBrandingImage(image)
    );

    app.delete(
      path,
      {
        preValidation: strictAdminPreValidation,
        schema: {
          tags: ["App"],
          operationId: `remove${operation}`,
          summary: `Remove the ${title}`,
          description: `Remove the ${title} (admin only)`,
          response: { 200: z.object({ message: z.string() }), ...adminErrors },
        },
      },
      appController.removeBrandingImage(image)
    );
  }

  app.put(
    "/app/brandpack",
    {
      preValidation: strictAdminPreValidation,
      schema: {
        tags: ["App"],
        operationId: "activateBrandpack",
        summary: "Activate a brandpack",
        description: "Verifies and stores a signed brandpack (admin only)",
        body: z.object({ token: z.string().min(1).max(4096) }),
        response: {
          200: z.object({ brandpack: z.object({ organisation: z.string(), issuedAt: z.string() }) }),
          ...adminErrors,
        },
      },
    },
    appController.activateBrandpack.bind(appController)
  );

  app.delete(
    "/app/brandpack",
    {
      preValidation: strictAdminPreValidation,
      schema: {
        tags: ["App"],
        operationId: "removeBrandpack",
        summary: "Remove the brandpack",
        description: "Removes the stored brandpack (admin only); paid customization switches off",
        response: { 200: z.object({ message: z.string() }), ...adminErrors },
      },
    },
    appController.removeBrandpack.bind(appController)
  );
}
