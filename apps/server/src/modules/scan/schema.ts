import { z } from "zod";

import { SCAN_STATUSES } from "./status";

/** The two fields every file in an answer carries. Null both: nothing to tell, or scanning is off. */
export const scanSchema = {
  scanStatus: z
    .enum(SCAN_STATUSES)
    .nullable()
    .optional()
    .describe("Virus scan: pending, clean, infected, error or skipped. Null when scanning is off."),
  scanDetail: z.string().nullable().optional().describe("What was found, or why the file was not scanned"),
};
