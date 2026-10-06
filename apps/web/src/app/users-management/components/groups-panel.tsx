import { IconPencil, IconTrash, IconUsersGroup } from "@tabler/icons-react";
import { useTranslations } from "next-intl";

import { LoadError } from "@/app/settings/components/load-error";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LineList, LineRow } from "@/components/ui/line-list";
import { Skeleton } from "@/components/ui/skeleton";
import type { Group } from "@/http/endpoints";

/** The groups tab: a hairline list with the number of members and of shares that use each group. */
export function GroupsPanel({
  groups,
  isLoading,
  loadError,
  onRetry,
  onCreate,
  onEdit,
  onDelete,
}: {
  groups: Group[];
  isLoading: boolean;
  loadError: boolean;
  onRetry: () => void;
  onCreate: () => void;
  onEdit: (group: Group) => void;
  onDelete: (group: Group) => void;
}) {
  const t = useTranslations();

  if (isLoading) {
    return (
      <div aria-busy="true" className="grid gap-3 border-t border-line pt-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }
  if (loadError) return <LoadError message={t("groups.errors.loadFailed")} onRetry={onRetry} />;
  if (groups.length === 0) {
    return (
      <EmptyState
        className="border-t border-line"
        icon={<IconUsersGroup />}
        title={t("groups.empty.title")}
        description={t("groups.empty.text")}
        action={<Button onClick={onCreate}>{t("groups.new")}</Button>}
      />
    );
  }

  return (
    <LineList top>
      {groups.map((group) => (
        <LineRow
          key={group.id}
          icon={<IconUsersGroup aria-hidden="true" />}
          title={group.name}
          sub={[
            t("groups.members", { count: group.members.length }),
            t("groups.shares", { count: group.shareCount }),
            group.description,
          ]
            .filter(Boolean)
            .join(" · ")}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("groups.editGroup", { name: group.name })}
            onClick={() => onEdit(group)}
          >
            <IconPencil aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("groups.deleteGroup", { name: group.name })}
            onClick={() => onDelete(group)}
          >
            <IconTrash aria-hidden="true" />
          </Button>
        </LineRow>
      ))}
    </LineList>
  );
}
