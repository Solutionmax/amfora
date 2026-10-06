"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { PasswordField } from "@/components/auth/password-field";
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
import { defaultPasskeyName } from "../passkey-name";

const MAX_NAME_LENGTH = 60;

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isBusy: boolean;
  error: string | null;
}

function DialogError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-[13px] text-bad">
      {message}
    </p>
  );
}

/** Adding a passkey asks for a name and, like switching two step sign in off, for the password. */
export function AddPasskeyDialog({
  open,
  onOpenChange,
  isBusy,
  error,
  onAdd,
}: DialogProps & { onAdd: (name: string, password: string) => void }) {
  const t = useTranslations();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  // Every opening starts clean, with a name worked out from the browser that is asking.
  useEffect(() => {
    if (!open) return;
    setName(defaultPasskeyName(navigator.userAgent));
    setPassword("");
  }, [open]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim() && password) onAdd(name.trim(), password);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{t("passkeys.addTitle")}</DialogTitle>
            <DialogDescription>{t("passkeys.addDescription")}</DialogDescription>
          </DialogHeader>
          <Field label={t("passkeys.name")} htmlFor="passkey-name" hint={t("passkeys.nameHint")}>
            <Input
              id="passkey-name"
              value={name}
              maxLength={MAX_NAME_LENGTH}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
            />
          </Field>
          <Field label={t("passkeys.password")} htmlFor="passkey-add-password">
            <PasswordField
              id="passkey-add-password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          <DialogError message={error} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isBusy}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isBusy || !name.trim() || !password}>
              {t("passkeys.addButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Removing a passkey asks for the password too. */
export function RemovePasskeyDialog({
  name,
  onOpenChange,
  isBusy,
  error,
  onRemove,
}: Omit<DialogProps, "open"> & { name: string | null; onRemove: (password: string) => void }) {
  const t = useTranslations();
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (name === null) setPassword("");
  }, [name]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (password) onRemove(password);
  };

  return (
    <Dialog open={name !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{t("passkeys.removeTitle", { name: name ?? "" })}</DialogTitle>
            <DialogDescription>{t("passkeys.removeDescription")}</DialogDescription>
          </DialogHeader>
          <Field label={t("passkeys.password")} htmlFor="passkey-remove-password">
            <PasswordField
              id="passkey-remove-password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoFocus
            />
          </Field>
          <DialogError message={error} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isBusy}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={isBusy || !password}>
              {t("passkeys.removeButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
