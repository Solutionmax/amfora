"use client";

import { useTranslations } from "next-intl";

import { LogoInput } from "@/app/settings/components/logo-input";
import { Field } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { useAppInfo } from "@/contexts/app-info-context";
import type { CustomizationDraft } from "../hooks/use-customization-draft";
import { FormBlock } from "./form-block";

const NAME_MAX = 60;
const DESCRIPTION_MAX = 160;

export function BrandSection({ draft, update }: Pick<CustomizationDraft, "draft" | "update">) {
  const t = useTranslations();
  const { refreshAppInfo } = useAppInfo();

  return (
    <FormBlock title={t("customization.v2.brand.title")} description={t("customization.calm.brandDescription")}>
      <div className="grid gap-[18px] sm:grid-cols-2 sm:gap-3.5">
        <Field label={t("customization.v2.brand.name")} htmlFor="brand-name">
          <Input
            id="brand-name"
            value={draft.name}
            onChange={(e) => update("name", e.target.value)}
            maxLength={NAME_MAX}
            aria-invalid={!draft.name.trim()}
          />
        </Field>
        <Field label={t("customization.calm.tagline")} htmlFor="brand-description">
          <Input
            id="brand-description"
            value={draft.description}
            onChange={(e) => update("description", e.target.value)}
            maxLength={DESCRIPTION_MAX}
          />
        </Field>
      </div>
      <LogoInput onChange={() => refreshAppInfo()} />
    </FormBlock>
  );
}
