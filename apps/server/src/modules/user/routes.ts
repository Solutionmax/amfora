import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import { createAdminGuard, loadAccount } from "../../shared/admin-guard";
import { createPasswordSchema } from "../auth/dto";
import { canUpdateUser } from "./authorization";
import { UserController } from "./controller";
import { UpdateUserSchema, UserResponseSchema } from "./dto";
import { validatePasswordMiddleware } from "./middleware";

export async function userRoutes(app: FastifyInstance) {
  const userController = new UserController();

  // Open only while there is no user at all, so the very first account can be created.
  const preValidation = createAdminGuard({ firstRun: "noUsers" });

  const updateUserPreValidation = async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (authErr) {
      console.error(authErr);
      return reply.status(401).send({ error: "Unauthorized: a valid token is required to access this resource." });
    }

    const body = request.body as { id?: string; isAdmin?: boolean } | undefined;
    const userId = (request.user as { userId?: string }).userId;

    let account;
    try {
      account = await loadAccount(userId);
    } catch (err) {
      console.error(err);
      return reply.status(500).send({ error: "Internal server error" });
    }
    // Privilege comes from the database, not from the day-long token claim.
    const authenticatedUser = { userId, isAdmin: account?.isActive === true && account.isAdmin };

    if (!account?.isActive || !canUpdateUser(authenticatedUser, { id: body?.id ?? "", isAdmin: body?.isAdmin })) {
      return reply.status(403).send({ error: "You can only update your own profile" });
    }
  };

  const createRegisterSchema = async () => {
    const passwordSchema = await createPasswordSchema();
    return z.object({
      firstName: z.string().min(1).describe("User first name"),
      lastName: z.string().min(1).describe("User last name"),
      username: z.string().min(3).describe("User username"),
      email: z.string().email().describe("User email"),
      image: z.string().optional().describe("User profile image URL"),
      password: passwordSchema.describe("User password"),
    });
  };

  const createUpdateSchema = async () => {
    const passwordSchema = await createPasswordSchema();
    return UpdateUserSchema.extend({
      password: passwordSchema.optional(),
    });
  };

  app.post(
    "/auth/register",
    {
      preValidation: [preValidation, validatePasswordMiddleware],
      schema: {
        tags: ["User"],
        operationId: "registerUser",
        summary: "Register New User",
        description: "Register a new user (admin only)",
        body: await createRegisterSchema(),
        response: {
          201: z.object({
            user: z.object({
              id: z.string().describe("User ID"),
              firstName: z.string().describe("User first name"),
              lastName: z.string().describe("User last name"),
              username: z.string().describe("User username"),
              email: z.string().email().describe("User email"),
              image: z.string().nullable().describe("User profile image URL"),
              isAdmin: z.boolean().describe("User is admin"),
              isActive: z.boolean().describe("User is active"),
              createdAt: z.date().describe("User creation date"),
              updatedAt: z.date().describe("User last update date"),
            }),
            message: z.string().describe("User registration message"),
          }),
          400: z.object({ error: z.string().describe("Error message") }),
          401: z.object({ error: z.string().describe("Error message") }),
          403: z.object({ error: z.string().describe("Error message") }),
        },
      },
    },
    userController.register.bind(userController)
  );

  app.get(
    "/users",
    {
      preValidation,
      schema: {
        tags: ["User"],
        operationId: "listUsers",
        summary: "List All Users",
        description: "List all users (admin only)",
        response: {
          200: z.array(
            z.object({
              id: z.string().describe("User ID"),
              firstName: z.string().describe("User first name"),
              lastName: z.string().describe("User last name"),
              username: z.string().describe("User username"),
              email: z.string().email().describe("User email"),
              image: z.string().nullable().describe("User profile image URL"),
              isAdmin: z.boolean().describe("User is admin"),
              isActive: z.boolean().describe("User is active"),
              createdAt: z.date().describe("User creation date"),
              updatedAt: z.date().describe("User last update date"),
            })
          ),
          400: z.object({ error: z.string().describe("Error message") }),
          401: z.object({ error: z.string().describe("Error message") }),
          403: z.object({ error: z.string().describe("Error message") }),
        },
      },
    },
    userController.listUsers.bind(userController)
  );

  app.get(
    "/users/:id",
    {
      preValidation,
      schema: {
        tags: ["User"],
        operationId: "getUserById",
        summary: "Get User by ID",
        description: "Get a user by ID (admin only)",
        params: z.object({ id: z.string().describe("User ID") }),
        response: {
          200: z.object({
            id: z.string().describe("User ID"),
            firstName: z.string().describe("User first name"),
            lastName: z.string().describe("User last name"),
            username: z.string().describe("User username"),
            email: z.string().email().describe("User email"),
            image: z.string().nullable().describe("User profile image URL"),
            isAdmin: z.boolean().describe("User is admin"),
            isActive: z.boolean().describe("User is active"),
            createdAt: z.date().describe("User creation date"),
            updatedAt: z.date().describe("User last update date"),
          }),
          400: z.object({ error: z.string().describe("Error message") }),
          401: z.object({ error: z.string().describe("Error message") }),
          403: z.object({ error: z.string().describe("Error message") }),
          404: z.object({ error: z.string().describe("Error message") }),
        },
      },
    },
    userController.getUserById.bind(userController)
  );

  app.put(
    "/users",
    {
      preValidation: updateUserPreValidation,
      schema: {
        tags: ["User"],
        operationId: "updateUser",
        summary: "Update User Data",
        description: "Update your own profile or manage users as an administrator",
        body: await createUpdateSchema(),
        response: {
          200: z.object({
            id: z.string().describe("User ID"),
            firstName: z.string().describe("User first name"),
            lastName: z.string().describe("User last name"),
            username: z.string().describe("User username"),
            email: z.string().email().describe("User email"),
            image: z.string().nullable().describe("User profile image URL"),
            isAdmin: z.boolean().describe("User is admin"),
            isActive: z.boolean().describe("User is active"),
            createdAt: z.date().describe("User creation date"),
            updatedAt: z.date().describe("User last update date"),
          }),
          400: z.object({ error: z.string().describe("Error message") }),
          401: z.object({ error: z.string().describe("Error message") }),
          403: z.object({ error: z.string().describe("Error message") }),
        },
      },
    },
    userController.updateUser.bind(userController)
  );

  app.patch(
    "/users/:id/activate",
    {
      preValidation,
      schema: {
        tags: ["User"],
        operationId: "activateUser",
        summary: "Activate User",
        description: "Activate a user (admin only)",
        params: z.object({ id: z.string().describe("User ID") }),
        response: {
          200: z.object({
            id: z.string().describe("User ID"),
            firstName: z.string().describe("User first name"),
            lastName: z.string().describe("User last name"),
            username: z.string().describe("User username"),
            email: z.string().email().describe("User email"),
            image: z.string().nullable().describe("User profile image URL"),
            isAdmin: z.boolean().describe("User is admin"),
            isActive: z.boolean().describe("User is active"),
            createdAt: z.date().describe("User creation date"),
            updatedAt: z.date().describe("User last update date"),
          }),
          400: z.object({ error: z.string().describe("Error message") }),
          401: z.object({ error: z.string().describe("Error message") }),
          403: z.object({ error: z.string().describe("Error message") }),
        },
      },
    },
    userController.activateUser.bind(userController)
  );

  app.patch(
    "/users/:id/deactivate",
    {
      preValidation,
      schema: {
        tags: ["User"],
        operationId: "deactivateUser",
        summary: "Deactivate User",
        description: "Deactivate a user (admin only)",
        params: z.object({ id: z.string().describe("User ID") }),
        response: {
          200: z.object({
            id: z.string().describe("User ID"),
            firstName: z.string().describe("User first name"),
            lastName: z.string().describe("User last name"),
            username: z.string().describe("User username"),
            email: z.string().email().describe("User email"),
            image: z.string().nullable().describe("User profile image URL"),
            isAdmin: z.boolean().describe("User is admin"),
            isActive: z.boolean().describe("User is active"),
            createdAt: z.date().describe("User creation date"),
            updatedAt: z.date().describe("User last update date"),
          }),
          400: z.object({ error: z.string().describe("Error message") }),
          401: z.object({ error: z.string().describe("Error message") }),
          403: z.object({ error: z.string().describe("Error message") }),
        },
      },
    },
    userController.deactivateUser.bind(userController)
  );

  app.delete(
    "/users/:id",
    {
      preValidation,
      schema: {
        tags: ["User"],
        operationId: "deleteUser",
        summary: "Delete User",
        description: "Delete a user (admin only)",
        params: z.object({ id: z.string().describe("User ID") }),
        response: {
          200: z.object({
            id: z.string().describe("User ID"),
            firstName: z.string().describe("User first name"),
            lastName: z.string().describe("User last name"),
            username: z.string().describe("User username"),
            email: z.string().email().describe("User email"),
            image: z.string().nullable().describe("User profile image URL"),
            isAdmin: z.boolean().describe("User is admin"),
            isActive: z.boolean().describe("User is active"),
            createdAt: z.date().describe("User creation date"),
            updatedAt: z.date().describe("User last update date"),
          }),
          400: z.object({ error: z.string().describe("Error message") }),
          401: z.object({ error: z.string().describe("Error message") }),
          403: z.object({ error: z.string().describe("Error message") }),
        },
      },
    },
    userController.deleteUser.bind(userController)
  );

  app.patch(
    "/users/:id/image",
    {
      preValidation,
      schema: {
        tags: ["User"],
        operationId: "updateUserImage",
        summary: "Update User Image",
        description: "Update user profile image (admin only)",
        params: z.object({ id: z.string().describe("User ID") }),
        body: z.object({
          image: z.string().url().describe("User profile image URL"),
        }),
        response: {
          200: z.object({
            id: z.string().describe("User ID"),
            firstName: z.string().describe("User first name"),
            lastName: z.string().describe("User last name"),
            username: z.string().describe("User username"),
            email: z.string().email().describe("User email"),
            image: z.string().nullable().describe("User profile image URL"),
            isAdmin: z.boolean().describe("User is admin"),
            isActive: z.boolean().describe("User is active"),
            createdAt: z.date().describe("User creation date"),
            updatedAt: z.date().describe("User last update date"),
          }),
          400: z.object({ error: z.string().describe("Error message") }),
          401: z.object({ error: z.string().describe("Error message") }),
          403: z.object({ error: z.string().describe("Error message") }),
        },
      },
    },
    userController.updateUserImage.bind(userController)
  );

  app.post(
    "/users/avatar",
    {
      preValidation: async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          await request.jwtVerify();
        } catch (err) {
          console.error(err);
          return reply.status(401).send({ error: "Unauthorized" });
        }
      },
      schema: {
        tags: ["User"],
        operationId: "uploadAvatar",
        summary: "Upload user avatar",
        description: "Upload and update user profile image",
        consumes: ["multipart/form-data"],
        response: {
          200: UserResponseSchema,
          400: z.object({ error: z.string() }),
          401: z.object({ error: z.string() }),
        },
      },
    },
    userController.uploadAvatar.bind(userController)
  );

  app.delete(
    "/users/avatar",
    {
      preValidation: async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          await request.jwtVerify();
        } catch (err) {
          console.error(err);
          reply.status(401).send({ error: "Unauthorized" });
        }
      },
      schema: {
        tags: ["User"],
        operationId: "removeAvatar",
        summary: "Remove user avatar",
        description: "Remove user profile image",
        response: {
          200: UserResponseSchema,
          401: z.object({ error: z.string() }),
        },
      },
    },
    userController.removeAvatar.bind(userController)
  );
}
