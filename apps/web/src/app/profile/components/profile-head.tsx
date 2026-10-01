"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { ImageEditModal } from "@/components/modals/image-edit-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProfileHeadProps } from "../types";
import { nameInitials } from "../utils";

const linkClass =
  "cursor-pointer rounded-[5px] font-semibold outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-primary/35 disabled:pointer-events-none disabled:opacity-45";

/** Large avatar, the full name, role and member-since, and the photo links. */
export function ProfileHead({
  userData,
  isAdmin,
  firstName,
  lastName,
  onImageChange,
  onImageRemove,
}: ProfileHeadProps) {
  const t = useTranslations();
  const format = useFormatter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const first = (firstName ?? userData?.firstName ?? "").trim();
  const last = (lastName ?? userData?.lastName ?? "").trim();
  const fullName = `${first} ${last}`.trim() || userData?.username || "";
  const initials = nameInitials(first, last);
  const role = isAdmin ? t("navbar.roleAdmin") : t("navbar.roleUser");
  const since = userData?.createdAt
    ? format.dateTime(new Date(userData.createdAt), { day: "numeric", month: "long", year: "numeric" })
    : null;

  const resetInput = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setIsEditModalOpen(true);
  };

  const handleEditClose = () => {
    setIsEditModalOpen(false);
    setSelectedFile(null);
    resetInput();
  };

  const handleImageEdit = async (croppedImageFile: File) => {
    handleEditClose();
    setIsBusy(true);
    try {
      await onImageChange(croppedImageFile);
    } finally {
      setIsBusy(false);
    }
  };

  const handleRemove = async () => {
    setIsBusy(true);
    try {
      await onImageRemove();
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4 pb-2 sm:gap-5">
      {isBusy ? (
        <Skeleton className="size-[72px] shrink-0 rounded-full" />
      ) : (
        <Avatar className="size-[72px] shrink-0">
          {userData?.image && <AvatarImage alt="" src={userData.image} className="object-cover" />}
          <AvatarFallback className="bg-primary font-display text-2xl font-bold text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
      )}
      <div className="min-w-0">
        <h1 className="break-words font-display text-[26px] font-bold leading-[1.15] tracking-[-0.02em] lg:text-[30px]">
          {fullName}
        </h1>
        <p className="mt-1 text-ink-3">
          {since ? `${role} · ${t("profile.calm.memberSince", { date: since })}` : role}
        </p>
        <div className="mt-2 flex flex-wrap gap-4 text-[13px]">
          <button
            type="button"
            className={`${linkClass} text-primary hover:text-[color-mix(in_oklab,var(--primary)_75%,var(--ink))]`}
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
          >
            {t("profile.calm.changePhoto")}
          </button>
          {userData?.image && (
            <button
              type="button"
              className={`${linkClass} text-ink-3 hover:text-bad`}
              onClick={() => void handleRemove()}
              disabled={isBusy}
            >
              {t("profile.calm.removePhoto")}
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          type="file"
          onChange={handleFileChange}
          aria-label={t("profile.calm.changePhoto")}
          tabIndex={-1}
        />
      </div>
      <ImageEditModal
        isOpen={isEditModalOpen}
        onClose={handleEditClose}
        onSave={handleImageEdit}
        imageFile={selectedFile}
      />
    </div>
  );
}
