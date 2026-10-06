import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import { createAdminGuard } from "../../shared/admin-guard";
import { GroupController } from "./controller";
import {
  AddMemberSchema,
  CreateGroupSchema,
  GroupMemberParamsSchema,
  GroupParamsSchema,
  GroupResponseSchema,
  PickableGroupSchema,
  SharedWithMeSchema,
  UpdateGroupSchema,
} from "./dto";

const errorBody = z.object({ error: z.string() }).passthrough();

export async function groupRoutes(app: FastifyInstance) {
  const controller = new GroupController();
  const adminOnly = createAdminGuard();

  const signedIn = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: "Unauthorized: a valid token is required to access this resource." });
    }
  };

  app.get(
    "/groups",
    {
      preValidation: adminOnly,
      schema: {
        tags: ["Group"],
        operationId: "listGroups",
        summary: "List all groups with their members (administrators)",
        response: { 200: z.object({ groups: z.array(GroupResponseSchema) }) },
      },
    },
    controller.list.bind(controller)
  );

  app.post(
    "/groups",
    {
      preValidation: adminOnly,
      schema: {
        tags: ["Group"],
        operationId: "createGroup",
        summary: "Create a group (administrators)",
        body: CreateGroupSchema,
        response: { 201: z.object({ group: GroupResponseSchema }), 409: errorBody },
      },
    },
    controller.create.bind(controller)
  );

  app.patch(
    "/groups/:id",
    {
      preValidation: adminOnly,
      schema: {
        tags: ["Group"],
        operationId: "updateGroup",
        summary: "Rename a group or change its description (administrators)",
        params: GroupParamsSchema,
        body: UpdateGroupSchema,
        response: { 200: z.object({ group: GroupResponseSchema }), 404: errorBody, 409: errorBody },
      },
    },
    controller.update.bind(controller)
  );

  app.delete(
    "/groups/:id",
    {
      preValidation: adminOnly,
      schema: {
        tags: ["Group"],
        operationId: "deleteGroup",
        summary: "Delete a group. Refused while shares still use it (administrators)",
        params: GroupParamsSchema,
        response: { 200: z.object({ success: z.boolean() }), 404: errorBody, 409: errorBody },
      },
    },
    controller.remove.bind(controller)
  );

  app.post(
    "/groups/:id/members",
    {
      preValidation: adminOnly,
      schema: {
        tags: ["Group"],
        operationId: "addGroupMember",
        summary: "Add a user to a group (administrators)",
        params: GroupParamsSchema,
        body: AddMemberSchema,
        response: { 200: z.object({ group: GroupResponseSchema }), 404: errorBody },
      },
    },
    controller.addMember.bind(controller)
  );

  app.delete(
    "/groups/:id/members/:userId",
    {
      preValidation: adminOnly,
      schema: {
        tags: ["Group"],
        operationId: "removeGroupMember",
        summary: "Remove a user from a group. Access ends at once (administrators)",
        params: GroupMemberParamsSchema,
        response: { 200: z.object({ group: GroupResponseSchema }), 404: errorBody },
      },
    },
    controller.removeMember.bind(controller)
  );

  app.get(
    "/groups/pickable",
    {
      preValidation: signedIn,
      schema: {
        tags: ["Group"],
        operationId: "listPickableGroups",
        summary: "The groups a share may be limited to: the user's own, or all for an administrator",
        response: { 200: z.object({ groups: z.array(PickableGroupSchema) }), 401: errorBody },
      },
    },
    controller.pickable.bind(controller)
  );

  app.get(
    "/shares/shared-with-me",
    {
      preValidation: signedIn,
      schema: {
        tags: ["Group"],
        operationId: "listSharedWithMe",
        summary: "Shares of other people that are limited to a group the user is in",
        response: { 200: z.object({ shares: z.array(SharedWithMeSchema) }), 401: errorBody },
      },
    },
    controller.sharedWithMe.bind(controller)
  );
}
