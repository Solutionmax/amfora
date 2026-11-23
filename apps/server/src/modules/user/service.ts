import bcrypt from "bcryptjs";

import { prisma } from "../../shared/prisma";
import { BLOCKED_MESSAGE, countFailure, isBlocked } from "../auth/login-attempts";
import { secretHash, SessionClaims } from "../auth/session";
import { queueDeletion, queueReceiveDeletion, sweepStorageCleanup } from "../storage/cleanup";
import { RegisterUserInput, UserResponseSchema } from "./dto";
import { IUserRepository, PrismaUserRepository } from "./repository";

type UserWithPassword = {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  password?: string;
  storageLimitBytes?: number | null;
  currentPassword?: string;
};

export class UserService {
  constructor(private readonly userRepository: IUserRepository = new PrismaUserRepository()) {}

  async register(data: RegisterUserInput) {
    const existingUser = await this.userRepository.findUserByEmail(data.email);
    const existingUsername = await this.userRepository.findUserByUsername(data.username);

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    if (existingUsername) {
      throw new Error("User with this username already exists");
    }

    const usersCount = await prisma.user.count();
    const isAdmin = usersCount === 0;

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.userRepository.createUser({
      ...data,
      password: hashedPassword,
      isAdmin,
    });

    if (isAdmin) {
      // The setup window closes the moment the first administrator exists. Leaving it to the
      // browser to switch the flag off kept admin routes open whenever that second call did
      // not happen, for example when the account was created through the API.
      await prisma.appConfig.updateMany({ where: { key: "firstUserAccess" }, data: { value: "false" } });
    }

    return UserResponseSchema.parse(user);
  }

  async listUsers() {
    const users = await this.userRepository.listUsers();
    return users.map((user) => ({ ...UserResponseSchema.parse(user), twoFactorEnabled: user.twoFactorEnabled }));
  }

  async getUserById(id: string) {
    const user = await this.userRepository.findUserById(id);
    if (!user) {
      throw new Error("User not found");
    }
    return UserResponseSchema.parse(user);
  }

  async updateUser(userId: string, data: Partial<UserWithPassword>, actor?: SessionClaims, credentialProof?: string) {
    const { password, storageLimitBytes, currentPassword, ...rest } = data;
    const existing = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const sensitive = !!password || (rest.email !== undefined && rest.email !== existing.email);
    const self = actor?.userId === userId;
    if (sensitive && (!actor || self)) {
      if (!actor || !existing.isActive) throw new Error("Fresh credential verification required");
      if (await isBlocked(userId)) throw new Error(BLOCKED_MESSAGE);
      if (currentPassword) {
        if (!existing.password || !(await bcrypt.compare(currentPassword, existing.password))) {
          await countFailure(userId);
          throw new Error("Invalid current password");
        }
      } else if (!credentialProof) throw new Error("Fresh credential verification required");
    }
    const updateData: any = { ...rest };
    if (storageLimitBytes !== undefined)
      updateData.storageLimitBytes = storageLimitBytes === null ? null : BigInt(storageLimitBytes);
    if (password) updateData.password = await bcrypt.hash(password, 10);
    const user = await prisma.$transaction(async (tx) => {
      if (sensitive && self) {
        const session = await tx.session.findUnique({ where: { id: actor!.sid } });
        if (
          !session ||
          session.userId !== userId ||
          session.version !== existing.sessionVersion ||
          actor!.version !== existing.sessionVersion ||
          session.expiresAt.getTime() <= Date.now()
        )
          throw new Error("Session is revoked. Fresh credential verification required");
      }
      if (sensitive && self && !currentPassword) {
        const consumed = await tx.credentialProof.deleteMany({
          where: {
            id: secretHash(credentialProof!),
            userId,
            sessionId: actor!.sid,
            sessionVersion: existing.sessionVersion,
            expiresAt: { gt: new Date() },
          },
        });
        if (consumed.count !== 1) throw new Error("Fresh credential verification required");
      }
      // Compare the credential version so a concurrent recovery cannot authorize this update with stale proof.
      const changed = await tx.user.updateMany({
        where: { id: userId, sessionVersion: existing.sessionVersion, ...(self ? { isActive: true } : {}) },
        data: { ...updateData, ...(sensitive ? { sessionVersion: { increment: 1 } } : {}) },
      });
      if (changed.count !== 1) throw new Error("Credentials changed. Verify again.");
      if (sensitive) {
        await tx.session.deleteMany({ where: { userId } });
        await tx.trustedDevice.deleteMany({ where: { userId } });
        await tx.loginChallenge.deleteMany({ where: { userId } });
        await tx.credentialProof.deleteMany({ where: { userId } });
        await tx.passwordReset.updateMany({ where: { userId, used: false }, data: { used: true } });
      }
      return tx.user.findUniqueOrThrow({ where: { id: userId } });
    });
    return { ...UserResponseSchema.parse(user), sessionVersion: user.sessionVersion };
  }

  async deleteUser(id: string) {
    const deleted = await prisma.$transaction(
      async (tx) => {
        for (const f of await tx.file.findMany({ where: { userId: id } })) await queueDeletion(tx, f.objectName);
        for (const link of await tx.reverseShare.findMany({ where: { creatorId: id } }))
          await queueReceiveDeletion(tx, link.id);
        for (const r of await tx.uploadReservation.findMany({ where: { ownerId: id } }))
          await queueDeletion(tx, r.objectName, r.uploadId, r.expiresAt);
        await tx.uploadReservation.deleteMany({ where: { ownerId: id } });
        return tx.user.delete({ where: { id } });
      },
      { timeout: 30000 }
    );
    await sweepStorageCleanup(new Date());
    return UserResponseSchema.parse(deleted);
  }

  async activateUser(id: string) {
    const user = await this.userRepository.activateUser(id);
    return UserResponseSchema.parse(user);
  }

  async deactivateUser(id: string) {
    const user = await this.userRepository.deactivateUser(id);
    return UserResponseSchema.parse(user);
  }

  async updateUserImage(userId: string, imageUrl: string | null) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        image: imageUrl,
        updatedAt: new Date(),
      },
    });
    return user;
  }
}
