import { prisma } from "../../shared/prisma";
import { ConfigService } from "../config/service";
import { resolvePaidAppearance } from "./appearance";
import { backgroundImage, linkPreviewImage, shareCoverImage } from "./branding-image";
import { verifyBrandpack } from "./brandpack";
import { BRANDPACK_PUBLIC_KEY } from "./brandpack-key";

export class AppService {
  private configService = new ConfigService();

  /** The key is a constructor argument only so tests can use their own; nothing reads it from env. */
  constructor(private readonly brandpackPublicKey: string = BRANDPACK_PUBLIC_KEY) {}

  async getAppInfo() {
    const value = (key: string) => this.configService.getValue(key).catch(() => "");
    const [
      appName,
      appDescription,
      appLogo,
      firstUserAccess,
      appPrimaryColor,
      appFontFamily,
      appRadius,
      appHideCredit,
      appCustomCss,
      appBrandpack,
      appSharePlayback,
      backgroundExists,
      appShareCover,
      appLinkPreview,
    ] = await Promise.all([
      this.configService.getValue("appName"),
      this.configService.getValue("appDescription"),
      this.configService.getValue("appLogo"),
      this.configService.getValue("firstUserAccess"),
      value("appPrimaryColor"),
      value("appFontFamily"),
      value("appRadius"),
      value("appHideCredit"),
      value("appCustomCss"),
      value("appBrandpack"),
      value("appSharePlayback"),
      backgroundImage.exists(),
      shareCoverImage.linkPreviewInfo(),
      linkPreviewImage.linkPreviewInfo(),
    ]);

    const brandpack = appBrandpack ? verifyBrandpack(appBrandpack, this.brandpackPublicKey) : null;
    if (appBrandpack && !brandpack) {
      console.warn("appBrandpack is set but does not verify; paid customization is ignored");
    }

    return {
      appName,
      appDescription,
      appLogo,
      firstUserAccess: firstUserAccess === "true",
      appPrimaryColor: appPrimaryColor ?? "",
      appFontFamily: appFontFamily ?? "",
      appRadius: appRadius ?? "",
      appShareCover,
      appLinkPreview,
      // Missing config (an install from before the switch existed) means off.
      appSharePlayback: appSharePlayback === "true",
      ...resolvePaidAppearance({ appHideCredit, appCustomCss, backgroundExists }, brandpack),
    };
  }

  /** Verifies before storing, so an admin learns about a bad pack at paste time. */
  async activateBrandpack(token: string) {
    const brandpack = verifyBrandpack(token, this.brandpackPublicKey);
    if (!brandpack) {
      throw new Error("This brandpack does not verify. Check that you pasted the whole token.");
    }
    await this.updateConfig("appBrandpack", token.trim());
    return brandpack;
  }

  async removeBrandpack() {
    await this.updateConfig("appBrandpack", "");
  }

  async getSystemInfo() {
    return {
      storageProvider: "s3",
      s3Enabled: true,
    };
  }

  async getAllConfigs() {
    return prisma.appConfig.findMany({
      where: {
        key: {
          not: "jwtSecret",
        },
      },
      orderBy: {
        group: "asc",
      },
    });
  }

  async getPublicConfigs() {
    const sensitiveKeys = [
      "smtpHost",
      "smtpPort",
      "smtpUser",
      "smtpPass",
      "smtpSecure",
      "smtpNoAuth",
      "smtpTrustSelfSigned",
      "jwtSecret",
    ];

    return prisma.appConfig.findMany({
      where: {
        key: {
          notIn: sensitiveKeys,
        },
      },
      orderBy: {
        group: "asc",
      },
    });
  }

  async updateConfig(key: string, value: string) {
    if (key === "jwtSecret") {
      throw new Error("JWT Secret cannot be updated through this endpoint");
    }

    if (key === "passwordAuthEnabled") {
      if (value === "false") {
        const canDisable = await this.configService.validatePasswordAuthDisable();
        if (!canDisable) {
          throw new Error(
            "Password authentication cannot be disabled. At least one authentication provider must be active."
          );
        }
      }
    }

    const config = await prisma.appConfig.findUnique({
      where: { key },
    });

    if (!config) {
      throw new Error("Configuration not found");
    }

    return prisma.appConfig.update({
      where: { key },
      data: { value },
    });
  }

  async bulkUpdateConfigs(updates: Array<{ key: string; value: string }>) {
    if (updates.some((update) => update.key === "jwtSecret")) {
      throw new Error("JWT Secret cannot be updated through this endpoint");
    }
    const passwordAuthUpdate = updates.find((update) => update.key === "passwordAuthEnabled");
    if (passwordAuthUpdate && passwordAuthUpdate.value === "false") {
      const canDisable = await this.configService.validatePasswordAuthDisable();
      if (!canDisable) {
        throw new Error(
          "Password authentication cannot be disabled. At least one authentication provider must be active."
        );
      }
    }

    const keys = updates.map((update) => update.key);
    const existingConfigs = await prisma.appConfig.findMany({
      where: { key: { in: keys } },
    });

    if (existingConfigs.length !== keys.length) {
      const existingKeys = existingConfigs.map((config) => config.key);
      const missingKeys = keys.filter((key) => !existingKeys.includes(key));
      throw new Error(`Configurations not found: ${missingKeys.join(", ")}`);
    }

    return prisma.$transaction(
      updates.map((update) =>
        prisma.appConfig.update({
          where: { key: update.key },
          data: { value: update.value },
        })
      )
    );
  }
}
