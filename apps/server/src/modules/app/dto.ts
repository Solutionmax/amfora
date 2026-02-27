import { z } from "zod";

export const UpdateConfigSchema = z.object({
  key: z.string().describe("The config key"),
  value: z.string().describe("The config value"),
});

export const BulkUpdateConfigSchema = z.array(
  z.object({
    key: z.string().describe("The config key"),
    value: z.string().describe("The config value"),
  })
);

export const ConfigResponseSchema = z.object({
  key: z.string().describe("The config key"),
  value: z.string().describe("The config value"),
  type: z.string().describe("The config type"),
  group: z.string().describe("The config group"),
  updatedAt: z.date().describe("The config update date"),
});
