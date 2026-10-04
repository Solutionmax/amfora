import { FastifyReply, FastifyRequest } from "fastify";

import { env } from "../../env";
import { prisma } from "../../shared/prisma";
import { recordRequestActivity, recordVisitorActivity } from "../activity/activity";
import { ConfigService } from "../config/service";
import {
  CompleteTwoFactorLoginSchema,
  createResetPasswordSchema,
  LoginSchema,
  RequestPasswordResetSchema,
} from "./dto";
import { AuthService } from "./service";
import { TrustedDeviceService } from "./trusted-device.service";

export class AuthController {
  private authService = new AuthService();
  private configService = new ConfigService();

  private getClientInfo(request: FastifyRequest) {
    const realIP = request.headers["x-real-ip"] as string;
    const realUserAgent = request.headers["x-user-agent"] as string;

    const userAgent = realUserAgent || request.headers["user-agent"] || "";
    const ipAddress = realIP || request.ip || request.socket.remoteAddress || "";

    return { userAgent, ipAddress };
  }

  private async recordSignIn(request: FastifyRequest, user: { id: string; firstName?: string; lastName?: string }) {
    await recordRequestActivity(request, {
      action: "account.signed_in",
      ownerId: user.id,
      actorId: user.id,
      actorName: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || null,
    });
  }

  /** The name that was typed goes in the log only when it belongs to an account. */
  private async recordFailedSignIn(request: FastifyRequest, reason: string) {
    const typed = (request.body as { emailOrUsername?: unknown } | undefined)?.emailOrUsername;
    if (typeof typed !== "string" || !typed) return;
    const user = await prisma.user
      .findFirst({
        where: { OR: [{ email: typed }, { username: typed }] },
        select: { id: true, firstName: true, lastName: true },
      })
      .catch(() => null);
    await recordVisitorActivity(request, {
      action: "account.sign_in_failed",
      ownerId: user?.id ?? null,
      // The same name a successful sign in shows, so one person is one name in the log.
      actorName: user ? `${user.firstName} ${user.lastName}`.trim() : null,
      detail: reason,
    });
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      const input = LoginSchema.parse(request.body);
      const { userAgent, ipAddress } = this.getClientInfo(request);
      const result = await this.authService.login(input, userAgent, ipAddress, request.cookies["trusted-device"]);

      if ("requiresTwoFactor" in result) {
        return reply.send(result);
      }

      const user = result;
      const token = await request.jwtSign({
        userId: user.id,
        isAdmin: user.isAdmin,
      });

      reply.setCookie("token", token, {
        httpOnly: true,
        path: "/",
        secure: env.SECURE_SITE === "true" ? true : false,
        sameSite: env.SECURE_SITE === "true" ? "lax" : "strict",
      });

      await this.recordSignIn(request, user);
      return reply.send({ user });
    } catch (error: any) {
      await this.recordFailedSignIn(request, error.message);
      return reply.status(400).send({ error: error.message });
    }
  }

  async completeTwoFactorLogin(request: FastifyRequest, reply: FastifyReply) {
    try {
      const input = CompleteTwoFactorLoginSchema.parse(request.body);
      const { userAgent, ipAddress } = this.getClientInfo(request);
      const user = await this.authService.completeTwoFactorLogin(
        input.userId,
        input.token,
        input.rememberDevice,
        userAgent,
        ipAddress,
        input.challengeId
      );

      if (input.rememberDevice) {
        const deviceToken = await new TrustedDeviceService().addTrustedDevice(user.id, userAgent, ipAddress);
        reply.setCookie("trusted-device", deviceToken, {
          httpOnly: true,
          secure: env.SECURE_SITE === "true",
          sameSite: "strict",
          path: "/",
          maxAge: 30 * 86400,
        });
      }
      const token = await request.jwtSign({
        userId: user.id,
        isAdmin: user.isAdmin,
      });

      reply.setCookie("token", token, {
        httpOnly: true,
        path: "/",
        secure: env.SECURE_SITE === "true" ? true : false,
        sameSite: env.SECURE_SITE === "true" ? "lax" : "strict",
      });

      await this.recordSignIn(request, user);
      return reply.send({ user });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    reply.clearCookie("token", { path: "/" });
    return reply.send({ message: "Logout successful" });
  }

  async requestPasswordReset(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email } = RequestPasswordResetSchema.parse(request.body);
      await this.authService.requestPasswordReset(email);
      return reply.send({
        message: "If an account exists with this email, a password reset link will be sent.",
      });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async resetPassword(request: FastifyRequest, reply: FastifyReply) {
    try {
      const schema = await createResetPasswordSchema();
      const input = schema.parse(request.body);
      await this.authService.resetPassword(input.token, input.password);
      return reply.send({ message: "Password reset successfully" });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async getCurrentUser(request: FastifyRequest, reply: FastifyReply) {
    try {
      let userId: string | null = null;
      try {
        await request.jwtVerify();
        userId = (request as any).user?.userId;
      } catch (err) {
        return reply.send({ user: null });
      }

      if (!userId) {
        return reply.send({ user: null });
      }

      const user = await this.authService.getUserById(userId);
      if (!user) {
        return reply.send({ user: null });
      }

      return reply.send({ user });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async getTrustedDevices(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized: a valid token is required to access this resource." });
      }

      const devices = await this.authService.getTrustedDevices(userId);
      return reply.send({ devices });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async removeTrustedDevice(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized: a valid token is required to access this resource." });
      }

      const { id } = request.params as { id: string };
      await this.authService.removeTrustedDevice(userId, id);
      return reply.send({ success: true, message: "Trusted device removed successfully" });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async removeAllTrustedDevices(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized: a valid token is required to access this resource." });
      }

      const result = await this.authService.removeAllTrustedDevices(userId);
      return reply.send(result);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }

  async getAuthConfig(request: FastifyRequest, reply: FastifyReply) {
    try {
      const passwordAuthEnabled = await this.configService.getValue("passwordAuthEnabled");
      return reply.send({
        passwordAuthEnabled: passwordAuthEnabled === "true",
      });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  }
}
