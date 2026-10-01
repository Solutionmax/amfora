import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@/http/endpoints/auth/types";
import { cn } from "@/lib/utils";

export function userInitials(user: Pick<User, "firstName" | "lastName" | "username">): string {
  const letters = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.trim();

  return (letters || user.username?.slice(0, 2) || "?").toUpperCase();
}

/** Round photo, or initials on the accent. Deactivated people turn grey. */
export function UserAvatar({ user, className }: { user: User; className?: string }) {
  return (
    <Avatar className={cn("size-[34px]", className)}>
      {user.image && (
        <AvatarImage src={user.image} alt="" className={cn("object-cover", !user.isActive && "grayscale")} />
      )}
      <AvatarFallback
        className={cn(
          "font-display text-[12px] font-bold",
          user.isActive ? "bg-primary text-primary-foreground" : "bg-line text-ink-2"
        )}
      >
        {userInitials(user)}
      </AvatarFallback>
    </Avatar>
  );
}
