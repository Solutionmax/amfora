import type {
  CreateReverseShareBody,
  FieldRequirement,
  PageLayout,
  UpdateReverseShareBody,
} from "@/http/endpoints/reverse-shares/types";
import { parseFileTypes, positiveIntOrNull, toDateTimeLocal } from "./receive-format";

export const MIN_PASSWORD_LENGTH = 4;

/** One shape for the create and edit dialogs; numbers stay strings while typing. */
export interface ReceiveFormValues {
  name: string;
  description: string;
  hasExpiration: boolean;
  expiration: string;
  maxFiles: string;
  maxFileSize: string;
  allowedFileTypes: string;
  nameFieldRequired: FieldRequirement;
  emailFieldRequired: FieldRequirement;
  pageLayout: PageLayout;
  hasPassword: boolean;
  password: string;
  isActive: boolean;
}

interface ReceiveLinkSettings {
  name: string | null;
  description: string | null;
  expiration: string | null;
  maxFiles: number | null;
  maxFileSize: number | null;
  allowedFileTypes: string | null;
  nameFieldRequired: string;
  emailFieldRequired: string;
  pageLayout: string;
  hasPassword: boolean;
  isActive: boolean;
}

const asField = (value: string | undefined): FieldRequirement =>
  value === "REQUIRED" || value === "HIDDEN" ? value : "OPTIONAL";

export function emptyReceiveForm(): ReceiveFormValues {
  return {
    name: "",
    description: "",
    hasExpiration: false,
    expiration: "",
    maxFiles: "",
    maxFileSize: "",
    allowedFileTypes: "",
    nameFieldRequired: "OPTIONAL",
    emailFieldRequired: "OPTIONAL",
    pageLayout: "DEFAULT",
    hasPassword: false,
    password: "",
    isActive: true,
  };
}

export function receiveFormFrom(link: ReceiveLinkSettings): ReceiveFormValues {
  return {
    name: link.name ?? "",
    description: link.description ?? "",
    hasExpiration: !!link.expiration,
    expiration: toDateTimeLocal(link.expiration),
    maxFiles: link.maxFiles ? String(link.maxFiles) : "",
    maxFileSize: link.maxFileSize ? String(link.maxFileSize) : "",
    allowedFileTypes: parseFileTypes(link.allowedFileTypes).join(","),
    nameFieldRequired: asField(link.nameFieldRequired),
    emailFieldRequired: asField(link.emailFieldRequired),
    pageLayout: link.pageLayout === "VESSEL" ? "VESSEL" : "DEFAULT",
    hasPassword: link.hasPassword,
    password: "",
    isActive: link.isActive,
  };
}

const isoOrUndefined = (values: ReceiveFormValues) =>
  values.hasExpiration && values.expiration ? new Date(values.expiration).toISOString() : undefined;

export function toCreateBody(values: ReceiveFormValues): CreateReverseShareBody {
  const body: CreateReverseShareBody = {
    name: values.name.trim(),
    pageLayout: values.pageLayout,
    nameFieldRequired: values.nameFieldRequired,
    emailFieldRequired: values.emailFieldRequired,
  };
  const description = values.description.trim();
  if (description) body.description = description;
  const expiration = isoOrUndefined(values);
  if (expiration) body.expiration = expiration;
  if (values.hasPassword && values.password.trim()) body.password = values.password;
  const maxFiles = positiveIntOrNull(values.maxFiles);
  if (maxFiles) body.maxFiles = maxFiles;
  const maxFileSize = positiveIntOrNull(values.maxFileSize);
  if (maxFileSize) body.maxFileSize = maxFileSize;
  const types = parseFileTypes(values.allowedFileTypes).join(",");
  if (types) body.allowedFileTypes = types;
  return body;
}

/**
 * The server cannot clear an end date, so a missing one is left out. A password is only sent when it
 * is new, or as null when protection was switched off.
 */
export function toUpdateBody(values: ReceiveFormValues, id: string, hadPassword: boolean): UpdateReverseShareBody {
  const body: UpdateReverseShareBody = {
    id,
    name: values.name.trim(),
    description: values.description.trim(),
    pageLayout: values.pageLayout,
    isActive: values.isActive,
    nameFieldRequired: values.nameFieldRequired,
    emailFieldRequired: values.emailFieldRequired,
    maxFiles: positiveIntOrNull(values.maxFiles),
    maxFileSize: positiveIntOrNull(values.maxFileSize),
    allowedFileTypes: parseFileTypes(values.allowedFileTypes).join(",") || null,
  };
  const expiration = isoOrUndefined(values);
  if (expiration) body.expiration = expiration;
  if (values.hasPassword && values.password.trim()) body.password = values.password;
  else if (!values.hasPassword && hadPassword) body.password = null;
  return body;
}
