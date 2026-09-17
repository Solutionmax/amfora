import type { UpdateUserInput } from "./dto";

export interface AuthenticatedUser {
  userId?: string;
  isAdmin?: boolean;
}

/**
 * Admins can manage any user. Members can update only their own profile and
 * cannot submit the privilege field, even when trying to set it to false.
 */
export function canUpdateUser(
  authenticatedUser: AuthenticatedUser,
  target: Pick<UpdateUserInput, "id" | "isAdmin">
): boolean {
  if (authenticatedUser.isAdmin === true) return true;

  return !!authenticatedUser.userId && authenticatedUser.userId === target.id && target.isAdmin === undefined;
}
