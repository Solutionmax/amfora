import { useState } from "react";
import { IconUserMinus, IconUserPlus } from "@tabler/icons-react";
import axios from "axios";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { LineList, LineRow } from "@/components/ui/line-list";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  addGroupMember,
  createGroup,
  removeGroupMember,
  updateGroup,
  type Group,
  type GroupMember,
} from "@/http/endpoints";
import type { User } from "@/http/endpoints/auth/types";

const fullName = (person: { firstName: string; lastName: string; username: string }) =>
  `${person.firstName} ${person.lastName}`.trim() || person.username;

/** Create a group, or change one: name, description and who is in it. Members change at once. */
export function GroupModal({
  isOpen,
  group,
  users,
  onClose,
  onChanged,
}: {
  isOpen: boolean;
  /** Null makes a new group. */
  group: Group | null;
  users: User[];
  onClose: () => void;
  /** Called with the group after any change, so the list behind the dialog is current. */
  onChanged: (group: Group | null) => void;
}) {
  const t = useTranslations();
  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [current, setCurrent] = useState<Group | null>(group);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const failure = (err: unknown) =>
    axios.isAxiosError(err) && err.response?.data?.code === "GROUP_NAME_TAKEN"
      ? t("groups.errors.nameTaken")
      : t("groups.errors.saveFailed");

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const body = { name: name.trim(), description: description.trim() };
      const { data } = current ? await updateGroup(current.id, body) : await createGroup(body);
      toast.success(t(current ? "groups.messages.saved" : "groups.messages.created"));
      onChanged(data.group);
      if (current) onClose();
      else setCurrent(data.group);
    } catch (err) {
      setError(failure(err));
    } finally {
      setBusy(false);
    }
  };

  const changeMember = async (userId: string, action: "add" | "remove") => {
    if (!current) return;
    setBusy(true);
    try {
      const { data } = await (action === "add" ? addGroupMember : removeGroupMember)(current.id, userId);
      setCurrent(data.group);
      setPick("");
      onChanged(data.group);
    } catch (err) {
      console.error("Error changing group member:", err);
      toast.error(t("groups.errors.memberFailed"));
    } finally {
      setBusy(false);
    }
  };

  const members: GroupMember[] = current?.members ?? [];
  const candidates = users.filter((user) => user.isActive && !members.some((member) => member.id === user.id));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {current ? t("groups.modal.titleEdit", { name: current.name }) : t("groups.modal.titleNew")}
          </DialogTitle>
          <DialogDescription>{t("groups.modal.description")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <Field label={t("groups.modal.name")} htmlFor="group-name" error={error}>
            <Input id="group-name" value={name} maxLength={60} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label={t("groups.modal.descriptionLabel")} htmlFor="group-description">
            <Input
              id="group-description"
              value={description}
              maxLength={200}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>

          {current && (
            <section aria-labelledby="group-members-heading" className="grid gap-2">
              <h3 id="group-members-heading" className="text-[13px] font-medium text-ink-2">
                {t("groups.modal.members", { count: members.length })}
              </h3>
              {members.length === 0 ? (
                <p className="border-y border-line py-3 text-[13px] text-ink-3">{t("groups.modal.noMembers")}</p>
              ) : (
                <LineList top className="max-h-[220px] overflow-y-auto">
                  {members.map((member) => (
                    <LineRow
                      key={member.id}
                      title={fullName(member)}
                      sub={`@${member.username}`}
                      className="min-h-[52px] py-2"
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={busy}
                        aria-label={t("groups.modal.removeMember", { name: fullName(member) })}
                        onClick={() => changeMember(member.id, "remove")}
                      >
                        <IconUserMinus aria-hidden="true" />
                      </Button>
                    </LineRow>
                  ))}
                </LineList>
              )}
              <div className="flex items-center gap-2">
                <Select value={pick} onValueChange={setPick} disabled={candidates.length === 0}>
                  <SelectTrigger className="min-w-0 flex-1" aria-label={t("groups.modal.pickUser")}>
                    <SelectValue placeholder={t("groups.modal.pickUser")} />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {fullName(user)} (@{user.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!pick || busy}
                  onClick={() => changeMember(pick, "add")}
                >
                  <IconUserPlus aria-hidden="true" />
                  {t("groups.modal.addMember")}
                </Button>
              </div>
            </section>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" type="button" onClick={onClose}>
            {current ? t("groups.modal.close") : t("common.cancel")}
          </Button>
          <Button type="button" onClick={save} disabled={busy || name.trim().length === 0}>
            {busy ? t("common.saving") : current ? t("common.save") : t("groups.modal.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
