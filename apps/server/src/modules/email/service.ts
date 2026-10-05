import nodemailer from "nodemailer";

import { getCanonicalOrigin } from "../../shared/canonical-origin";
import { ConfigService } from "../config/service";
import { mailShowsCredit } from "./credit";
import { mailLogo } from "./logo";
import { filesReceivedNotice, passwordResetNotice, shareReceivedNotice } from "./messages";
import { noticeMessage, type Notice } from "./notice";

interface SmtpConfig {
  smtpEnabled: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  smtpSecure?: string;
  smtpNoAuth?: string;
  smtpTrustSelfSigned?: string;
}

export class EmailService {
  private configService = new ConfigService();

  private async createTransporter() {
    const smtpEnabled = await this.configService.getValue("smtpEnabled");
    if (smtpEnabled !== "true") {
      return null;
    }

    const port = Number(await this.configService.getValue("smtpPort"));
    const smtpSecure = (await this.configService.getValue("smtpSecure")) || "auto";
    const smtpNoAuth = await this.configService.getValue("smtpNoAuth");
    const smtpTrustSelfSigned = await this.configService.getValue("smtpTrustSelfSigned");

    let secure = false;
    let requireTLS = false;

    if (smtpSecure === "ssl") {
      secure = true;
    } else if (smtpSecure === "tls") {
      requireTLS = true;
    } else if (smtpSecure === "none") {
      secure = false;
      requireTLS = false;
    } else if (smtpSecure === "auto") {
      if (port === 465) {
        secure = true;
      } else if (port === 587 || port === 25) {
        requireTLS = true;
      }
    }

    const transportConfig: any = {
      host: await this.configService.getValue("smtpHost"),
      port: port,
      secure: secure,
      requireTLS: requireTLS,
    };

    if (smtpSecure !== "none") {
      transportConfig.tls = {
        rejectUnauthorized: smtpTrustSelfSigned === "true" ? false : true,
      };
    }

    if (smtpNoAuth !== "true") {
      transportConfig.auth = {
        user: await this.configService.getValue("smtpUser"),
        pass: await this.configService.getValue("smtpPass"),
      };
    }

    return nodemailer.createTransport(transportConfig);
  }

  async testConnection(config?: SmtpConfig) {
    let smtpConfig: SmtpConfig;

    if (config) {
      smtpConfig = config;
    } else {
      smtpConfig = {
        smtpEnabled: await this.configService.getValue("smtpEnabled"),
        smtpHost: await this.configService.getValue("smtpHost"),
        smtpPort: await this.configService.getValue("smtpPort"),
        smtpUser: await this.configService.getValue("smtpUser"),
        smtpPass: await this.configService.getValue("smtpPass"),
        smtpSecure: (await this.configService.getValue("smtpSecure")) || "auto",
        smtpNoAuth: await this.configService.getValue("smtpNoAuth"),
        smtpTrustSelfSigned: await this.configService.getValue("smtpTrustSelfSigned"),
      };
    }

    if (smtpConfig.smtpEnabled !== "true") {
      throw new Error("SMTP is not enabled");
    }

    const port = Number(smtpConfig.smtpPort);
    const smtpSecure = smtpConfig.smtpSecure || "auto";
    const smtpNoAuth = smtpConfig.smtpNoAuth;

    let secure = false;
    let requireTLS = false;

    if (smtpSecure === "ssl") {
      secure = true;
    } else if (smtpSecure === "tls") {
      requireTLS = true;
    } else if (smtpSecure === "none") {
      secure = false;
      requireTLS = false;
    } else if (smtpSecure === "auto") {
      if (port === 465) {
        secure = true;
      } else if (port === 587 || port === 25) {
        requireTLS = true;
      }
    }

    const transportConfig: any = {
      host: smtpConfig.smtpHost,
      port: port,
      secure: secure,
      requireTLS: requireTLS,
    };

    if (smtpSecure !== "none") {
      transportConfig.tls = {
        rejectUnauthorized: smtpConfig.smtpTrustSelfSigned === "true" ? false : true,
      };
    }

    if (smtpNoAuth !== "true") {
      transportConfig.auth = {
        user: smtpConfig.smtpUser,
        pass: smtpConfig.smtpPass,
      };
    }

    const transporter = nodemailer.createTransport(transportConfig);

    try {
      await transporter.verify();
      return { success: true, message: "SMTP connection successful" };
    } catch (error: any) {
      throw new Error(`SMTP connection failed: ${error.message}`);
    }
  }

  /** Sends one mail in the notice layout. Resolves false when sending email is switched off. */
  private async deliver(to: string, notice: Notice): Promise<boolean> {
    const transporter = await this.createTransporter();
    if (!transporter) return false;

    const fromName = await this.configService.getValue("smtpFromName");
    const fromEmail = await this.configService.getValue("smtpFromEmail");
    const appName = await this.configService.getValue("appName");
    const color = await this.configService.getValue("appPrimaryColor").catch(() => undefined);
    // A missing setting is no logo.
    const logo = await mailLogo(await this.configService.getValue("appLogo").catch(() => ""));
    const credit = mailShowsCredit(
      await this.configService.getValue("appHideCredit").catch(() => ""),
      await this.configService.getValue("appBrandpack").catch(() => "")
    );

    await transporter.sendMail({
      from: { name: fromName, address: fromEmail },
      to,
      ...noticeMessage(notice, { appName, color, logo, credit }),
    });
    return true;
  }

  private async deliverOrThrow(to: string, notice: Notice): Promise<void> {
    if (!(await this.deliver(to, notice))) throw new Error("SMTP is not enabled");
  }

  async sendPasswordResetEmail(to: string, resetToken: string, _origin?: string) {
    const resetUrl = `${getCanonicalOrigin()}/reset-password?token=${encodeURIComponent(resetToken)}`;
    await this.deliverOrThrow(to, passwordResetNotice(resetUrl));
  }

  /** Sends a notice to one address. Resolves false when sending email is switched off. */
  async sendNotice(to: string, notice: Notice): Promise<boolean> {
    return this.deliver(to, notice);
  }

  async sendShareNotification(to: string, shareLink: string, shareName?: string, senderName?: string) {
    await this.deliverOrThrow(to, shareReceivedNotice(shareLink, shareName || "Files", senderName || "Someone"));
  }

  async sendReverseShareBatchFileNotification(
    recipientEmail: string,
    reverseShareName: string,
    fileCount: number,
    fileList: string,
    uploaderName: string
  ) {
    await this.deliverOrThrow(recipientEmail, filesReceivedNotice(reverseShareName, fileCount, fileList, uploaderName));
  }
}
