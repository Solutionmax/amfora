import { Prisma } from "@prisma/client";

import { prisma } from "../../shared/prisma";
import type { CreateGroupInput, UpdateGroupInput } from "./dto";

export class GroupError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly extra: Record<string, unknown> = {}
  ) {
    super(message);
  }
}

const MEMBER_SELECT = { id: true, firstName: true, lastName: true, username: true, email: true } as const;

const groupInclude = {
  members: { select: { user: { select: MEMBER_SELECT } }, orderBy: { createdAt: "asc" } },
  _count: { select: { shares: true } },
} satisfies Prisma.GroupInclude;

type GroupRow = Prisma.GroupGetPayload<{ include: typeof groupInclude }>;

function present(group: GroupRow) {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    createdAt: group.createdAt.toISOString(),
    shareCount: group._count.shares,
    members: group.members.map((m) => m.user),
  };
}

const taken = (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

export class GroupService {
  async list() {
    const groups = await prisma.group.findMany({ include: groupInclude, orderBy: { name: "asc" } });
    return groups.map(present);
  }

  private async get(id: string) {
    const group = await prisma.group.findUnique({ where: { id }, include: groupInclude });
    if (!group) throw new GroupError("Group not found", 404);
    return group;
  }

  async create(input: CreateGroupInput) {
    try {
      const group = await prisma.group.create({
        data: { name: input.name, description: input.description || null },
        include: groupInclude,
      });
      return present(group);
    } catch (error) {
      if (taken(error)) throw new GroupError("A group with this name already exists", 409, "GROUP_NAME_TAKEN");
      throw error;
    }
  }

  async update(id: string, input: UpdateGroupInput) {
    await this.get(id);
    try {
      const group = await prisma.group.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined ? { description: input.description || null } : {}),
        },
        include: groupInclude,
      });
      return present(group);
    } catch (error) {
      if (taken(error)) throw new GroupError("A group with this name already exists", 409, "GROUP_NAME_TAKEN");
      throw error;
    }
  }

  /** Refused while shares still point at the group: they must never fall back to "anyone with the link". */
  async remove(id: string) {
    const group = await this.get(id);
    const shares = group._count.shares;
    if (shares > 0) {
      throw new GroupError(
        `This group is used by ${shares} ${shares === 1 ? "share" : "shares"}`,
        409,
        "GROUP_IN_USE",
        { shares }
      );
    }
    try {
      await prisma.group.delete({ where: { id } });
    } catch (error) {
      // A share created between the count and the delete: the schema refuses, so report it the same way.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new GroupError("This group is used by a share", 409, "GROUP_IN_USE", {
          shares: await prisma.share.count({ where: { groupId: id } }),
        });
      }
      throw error;
    }
    return { name: group.name };
  }

  async addMember(id: string, userId: string) {
    await this.get(id);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: MEMBER_SELECT });
    if (!user) throw new GroupError("User not found", 404);
    await prisma.groupMembership.upsert({
      where: { groupId_userId: { groupId: id, userId } },
      create: { groupId: id, userId },
      update: {},
    });
    return { group: present(await this.get(id)), user };
  }

  async removeMember(id: string, userId: string) {
    await this.get(id);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: MEMBER_SELECT });
    await prisma.groupMembership.deleteMany({ where: { groupId: id, userId } });
    return { group: present(await this.get(id)), user };
  }

  /** The groups a share may be limited to: those the user is in, or all of them for an administrator. */
  async pickable(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
    const groups = await prisma.group.findMany({
      where: user?.isAdmin ? {} : { members: { some: { userId } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return groups;
  }

  /** Throws when the user may not limit a share to this group. */
  async assertMayPick(userId: string, groupId: string) {
    const allowed = await this.pickable(userId);
    if (!allowed.some((group) => group.id === groupId)) {
      throw new GroupError("You can only limit a share to a group you are a member of", 403, "GROUP_NOT_ALLOWED");
    }
  }

  /** Shares limited to groups the user is in, other people's only, with a link to open them by. */
  async sharedWithMe(userId: string) {
    const shares = await prisma.share.findMany({
      where: {
        groupId: { not: null },
        group: { members: { some: { userId } } },
        creatorId: { not: userId },
        alias: { isNot: null },
      },
      select: {
        id: true,
        name: true,
        expiration: true,
        createdAt: true,
        alias: { select: { alias: true } },
        creator: { select: { firstName: true, lastName: true } },
        group: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return shares.map((share) => ({
      id: share.id,
      name: share.name,
      alias: share.alias!.alias,
      expiration: share.expiration?.toISOString() ?? null,
      createdAt: share.createdAt.toISOString(),
      owner: share.creator,
      group: share.group!,
    }));
  }
}
