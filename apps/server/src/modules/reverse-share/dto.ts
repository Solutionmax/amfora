import { z } from "zod";

export const FieldRequirementSchema = z.enum(["HIDDEN", "OPTIONAL", "REQUIRED"]);

export const CreateReverseShareSchema = z.object({
  name: z.string().optional().describe("The reverse share name"),
  description: z.string().optional().describe("The reverse share description"),
  expiration: z
    .string()
    .datetime({
      message: "Data de expiração deve estar no formato ISO 8601 (ex: 2025-02-06T13:20:49Z)",
    })
    .optional(),
  maxFiles: z.number().int().positive().nullable().optional().describe("Maximum number of files allowed"),
  maxFileSize: z.number().int().positive().nullable().optional().describe("Maximum file size in bytes"),
  allowedFileTypes: z.string().nullable().optional().describe("Comma-separated list of allowed file extensions"),
  password: z.string().optional().describe("Password for private access"),
  pageLayout: z.enum(["WETRANSFER", "DEFAULT"]).default("DEFAULT").describe("Page layout type"),
  nameFieldRequired: FieldRequirementSchema.default("OPTIONAL").describe("Name field requirement setting"),
  emailFieldRequired: FieldRequirementSchema.default("OPTIONAL").describe("Email field requirement setting"),
});

export const UpdateReverseShareSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  expiration: z.string().datetime().optional(),
  maxFiles: z.number().int().positive().nullable().optional(),
  maxFileSize: z.number().int().positive().nullable().optional(),
  allowedFileTypes: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
  pageLayout: z.enum(["WETRANSFER", "DEFAULT"]).optional(),
  isActive: z.boolean().optional(),
  nameFieldRequired: FieldRequirementSchema.optional().describe("Name field requirement setting"),
  emailFieldRequired: FieldRequirementSchema.optional().describe("Email field requirement setting"),
});

export const ReverseShareFileSchema = z.object({
  id: z.string().describe("The file ID"),
  name: z.string().describe("The file name"),
  description: z.string().nullable().describe("The file description"),
  extension: z.string().describe("The file extension"),
  size: z.string().describe("The file size"),
  objectName: z.string().describe("The file object name"),
  uploaderEmail: z.string().nullable().describe("The uploader email"),
  uploaderName: z.string().nullable().describe("The uploader name"),
  createdAt: z.string().describe("The file creation date"),
  updatedAt: z.string().describe("The file update date"),
});

export const ReverseShareResponseSchema = z.object({
  id: z.string().describe("The reverse share ID"),
  name: z.string().nullable().describe("The reverse share name"),
  description: z.string().nullable().describe("The reverse share description"),
  expiration: z.string().nullable().describe("The reverse share expiration date"),
  maxFiles: z.number().nullable().describe("Maximum number of files allowed"),
  maxFileSize: z.number().nullable().describe("Maximum file size in bytes"),
  allowedFileTypes: z.string().nullable().describe("Allowed file types"),
  pageLayout: z.string().describe("Page layout type"),
  isActive: z.boolean().describe("Whether the reverse share is active"),
  hasPassword: z.boolean().describe("Whether the reverse share has a password"),
  nameFieldRequired: z.string().describe("Name field requirement setting"),
  emailFieldRequired: z.string().describe("Email field requirement setting"),
  createdAt: z.string().describe("The reverse share creation date"),
  updatedAt: z.string().describe("The reverse share update date"),
  creatorId: z.string().describe("The creator ID"),
  files: z.array(ReverseShareFileSchema),
  alias: z
    .object({
      id: z.string(),
      alias: z.string(),
      reverseShareId: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
    })
    .nullable()
    .optional()
    .describe("The reverse share alias"),
});

export const ReverseSharePublicSchema = z.object({
  id: z.string().describe("The reverse share ID"),
  name: z.string().nullable().describe("The reverse share name"),
  description: z.string().nullable().describe("The reverse share description"),
  maxFiles: z.number().nullable().describe("Maximum number of files allowed"),
  maxFileSize: z.number().nullable().describe("Maximum file size in bytes"),
  allowedFileTypes: z.string().nullable().describe("Allowed file types"),
  pageLayout: z.string().describe("Page layout type"),
  hasPassword: z.boolean().describe("Whether the reverse share has a password"),
  currentFileCount: z.number().describe("Current number of files uploaded"),
  nameFieldRequired: z.string().describe("Name field requirement setting"),
  emailFieldRequired: z.string().describe("Email field requirement setting"),
});

export const UploadToReverseShareSchema = z.object({
  name: z.string().describe("The file name"),
  description: z.string().optional().describe("File description"),
  extension: z.string().describe("The file extension"),
  size: z.number().int().positive().describe("The file size in bytes"),
  objectName: z.string().describe("The file object name"),
  uploaderEmail: z.string().email().optional().describe("The uploader email"),
  uploaderName: z.string().optional().describe("The uploader name"),
});

export const ReverseSharePasswordSchema = z.object({
  password: z.string().describe("The reverse share password"),
});

export const UpdateReverseSharePasswordSchema = z.object({
  password: z.string().nullable().describe("The new password. Send null to remove password"),
});

export const GetPresignedUrlSchema = z.object({
  objectName: z.string().describe("The object name for the file"),
});

export const UpdateReverseShareFileSchema = z.object({
  name: z.string().min(1, "Name is required").optional().describe("New file name"),
  description: z.string().nullable().optional().describe("New file description (can be null to remove)"),
});

export type CreateReverseShareInput = z.infer<typeof CreateReverseShareSchema>;
export type UpdateReverseShareInput = z.infer<typeof UpdateReverseShareSchema>;
export type ReverseShareResponse = z.infer<typeof ReverseShareResponseSchema>;
export type ReverseSharePublic = z.infer<typeof ReverseSharePublicSchema>;
export type UploadToReverseShareInput = z.infer<typeof UploadToReverseShareSchema>;
export type GetPresignedUrlInput = z.infer<typeof GetPresignedUrlSchema>;
export type UpdateReverseShareFileInput = z.infer<typeof UpdateReverseShareFileSchema>;
