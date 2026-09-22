import { FastifyReply, FastifyRequest } from "fastify";

import { EmailService } from "../email/service";
import { BRANDING_IMAGE_MAX_BYTES, BrandingImage } from "./branding-image";
import { LogoService } from "./logo.service";
import { AppService } from "./service";

export class AppController {
  private appService = new AppService();
  private logoService = new LogoService();
  private emailService = new EmailService();

  /** Public: streams the page rendition, or 404 when none is set. */
  getBrandingImage(image: BrandingImage) {
    return async (_request: FastifyRequest, reply: FastifyReply) => {
      const buffer = await image.read();
      if (!buffer) {
        return reply.status(404).send();
      }
      return reply.header("Content-Type", "image/webp").header("Cache-Control", "public, max-age=300").send(buffer);
    };
  }

  /** Public: the JPEG that og:image points at. The URL carries a version, so it may be cached longer. */
  getBrandingLinkPreview(image: BrandingImage) {
    return async (_request: FastifyRequest, reply: FastifyReply) => {
      const buffer = await image.readLinkPreview();
      if (!buffer) {
        return reply.status(404).send();
      }
      return reply.header("Content-Type", "image/jpeg").header("Cache-Control", "public, max-age=3600").send(buffer);
    };
  }

  uploadBrandingImage(image: BrandingImage) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const file = await request.file();
        if (!file) {
          return reply.status(400).send({ error: "No file uploaded" });
        }
        if (!file.mimetype.startsWith("image/")) {
          return reply.status(400).send({ error: "Only images are allowed" });
        }

        const chunks: Buffer[] = [];
        let totalSize = 0;
        for await (const chunk of file.file) {
          totalSize += chunk.length;
          if (totalSize > BRANDING_IMAGE_MAX_BYTES) {
            throw new Error(`${image.options.label} too large. Maximum size is 3MB.`);
          }
          chunks.push(chunk);
        }

        await image.save(Buffer.concat(chunks));
        return reply.send({ message: `${image.options.label} saved` });
      } catch (error: any) {
        console.error(`${image.options.label} upload error:`, error);
        return reply.status(400).send({ error: error.message });
      }
    };
  }

  removeBrandingImage(image: BrandingImage) {
    return async (_request: FastifyRequest, reply: FastifyReply) => {
      await image.remove();
      return reply.send({ message: `${image.options.label} removed` });
    };
  }

  async activateBrandpack(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { token } = request.body as { token: string };
      const brandpack = await this.appService.activateBrandpack(token);
      return reply.send({ brandpack });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async removeBrandpack(_request: FastifyRequest, reply: FastifyReply) {
    await this.appService.removeBrandpack();
    return reply.send({ message: "Brandpack removed" });
  }

  async getAppInfo(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const appInfo = await this.appService.getAppInfo();
      return reply.send(appInfo);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async getSystemInfo(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const systemInfo = await this.appService.getSystemInfo();
      return reply.send(systemInfo);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async getAllConfigs(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const configs = await this.appService.getAllConfigs();
      return reply.send({ configs });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async getPublicConfigs(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const configs = await this.appService.getPublicConfigs();
      return reply.send({ configs });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async updateConfig(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { key } = request.params as { key: string };
      const { value } = request.body as { value: string };

      const config = await this.appService.updateConfig(key, value);
      return reply.send({ config });
    } catch (error: any) {
      if (error.message === "Configuration not found") {
        return reply.status(404).send({ error: error.message });
      }
      return reply.status(400).send({ error: error.message });
    }
  }

  async bulkUpdateConfigs(request: FastifyRequest, reply: FastifyReply) {
    try {
      const updates = request.body as Array<{ key: string; value: string }>;
      const configs = await this.appService.bulkUpdateConfigs(updates);
      return reply.send({ configs });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async testSmtpConnection(request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();

      if (!(request as any).user?.isAdmin) {
        return reply.status(403).send({ error: "Access restricted to administrators" });
      }

      const body = request.body as any;
      const smtpConfig = body.smtpConfig || undefined;

      const result = await this.emailService.testConnection(smtpConfig);
      return reply.send(result);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async uploadLogo(request: FastifyRequest, reply: FastifyReply) {
    try {
      const file = await request.file();
      if (!file) {
        return reply.status(400).send({ error: "No file uploaded" });
      }

      if (!file.mimetype.startsWith("image/")) {
        return reply.status(400).send({ error: "Only images are allowed" });
      }

      const chunks: Buffer[] = [];
      const maxLogoSize = 5 * 1024 * 1024;
      let totalSize = 0;

      for await (const chunk of file.file) {
        totalSize += chunk.length;
        if (totalSize > maxLogoSize) {
          throw new Error("Logo file too large. Maximum size is 5MB.");
        }
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);
      const base64Logo = await this.logoService.uploadLogo(buffer);
      await this.appService.updateConfig("appLogo", base64Logo);

      return reply.send({ logo: base64Logo });
    } catch (error: any) {
      console.error("Upload error:", error);
      return reply.status(400).send({ error: error.message });
    }
  }

  async removeLogo(_request: FastifyRequest, reply: FastifyReply) {
    try {
      await this.logoService.deleteLogo();
      return reply.send({ message: "Logo removed successfully" });
    } catch (error: any) {
      console.error("Logo removal error:", error);
      return reply.status(400).send({ error: error.message });
    }
  }
}
