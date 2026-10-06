import { z } from "zod";

const name = z
  .string()
  .trim()
  .min(1, "A group needs a name")
  .max(60, "At most 60 characters")
  .refine((value) => !/\p{C}/u.test(value), "Use letters, numbers and normal punctuation only");
const description = z.string().trim().max(200, "At most 200 characters");

export const CreateGroupSchema = z.object({
  name,
  description: description.optional(),
});

export const UpdateGroupSchema = z.object({
  name: name.optional(),
  // An empty text clears it.
  description: description.optional(),
});

export const GroupParamsSchema = z.object({ id: z.string().min(1) });
export const GroupMemberParamsSchema = z.object({ id: z.string().min(1), userId: z.string().min(1) });
export const AddMemberSchema = z.object({ userId: z.string().min(1) });

const MemberSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  username: z.string(),
  email: z.string(),
});

export const GroupResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
  shareCount: z.number(),
  members: z.array(MemberSchema),
});

export const PickableGroupSchema = z.object({ id: z.string(), name: z.string() });

export const SharedWithMeSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  alias: z.string(),
  expiration: z.string().nullable(),
  createdAt: z.string(),
  owner: z.object({ firstName: z.string(), lastName: z.string() }).nullable(),
  group: z.object({ id: z.string(), name: z.string() }),
});

export type CreateGroupInput = z.infer<typeof CreateGroupSchema>;
export type UpdateGroupInput = z.infer<typeof UpdateGroupSchema>;
