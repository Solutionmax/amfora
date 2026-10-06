import type { FastifyReply, FastifyRequest } from "fastify";

import { actorOf, recordRequestActivity } from "../activity/activity";
import type { CreateGroupInput, UpdateGroupInput } from "./dto";
import { GroupError, GroupService } from "./service";

const userIdOf = (request: FastifyRequest) => (request.user as { userId: string }).userId;

function fail(reply: FastifyReply, error: unknown) {
  if (error instanceof GroupError) {
    return reply.status(error.status).send({ error: error.message, code: error.code, ...error.extra });
  }
  console.error("Group error:", error);
  return reply.status(500).send({ error: "Internal server error" });
}

export class GroupController {
  private service = new GroupService();

  async list(_request: FastifyRequest, reply: FastifyReply) {
    return reply.send({ groups: await this.service.list() });
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      return reply.status(201).send({ group: await this.service.create(request.body as CreateGroupInput) });
    } catch (error) {
      return fail(reply, error);
    }
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      return reply.send({ group: await this.service.update(id, request.body as UpdateGroupInput) });
    } catch (error) {
      return fail(reply, error);
    }
  }

  async remove(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      await this.service.remove(id);
      return reply.send({ success: true });
    } catch (error) {
      return fail(reply, error);
    }
  }

  async addMember(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const { userId } = request.body as { userId: string };
      const { group, user } = await this.service.addMember(id, userId);
      await this.recordMembership(request, "account.group_added", group.name, user.id);
      return reply.send({ group });
    } catch (error) {
      return fail(reply, error);
    }
  }

  async removeMember(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id, userId } = request.params as { id: string; userId: string };
      const { group, user } = await this.service.removeMember(id, userId);
      if (user) await this.recordMembership(request, "account.group_removed", group.name, user.id);
      return reply.send({ group });
    } catch (error) {
      return fail(reply, error);
    }
  }

  /** An administrator changed whose group somebody is in: a line in that person's own log. */
  private async recordMembership(
    request: FastifyRequest,
    action: "account.group_added" | "account.group_removed",
    groupName: string,
    memberId: string
  ) {
    await recordRequestActivity(request, {
      action,
      ownerId: memberId,
      subject: groupName,
      subjectId: memberId,
      ...(await actorOf(userIdOf(request))),
    });
  }

  async pickable(request: FastifyRequest, reply: FastifyReply) {
    return reply.send({ groups: await this.service.pickable(userIdOf(request)) });
  }

  async sharedWithMe(request: FastifyRequest, reply: FastifyReply) {
    return reply.send({ shares: await this.service.sharedWithMe(userIdOf(request)) });
  }
}
