import { PrismaClient } from "@prisma/client";

// SQLite takes one writer at a time. A pool lets simultaneous requests open a connection each,
// and they then time out on each other's locks. One connection lines the queries up instead.
const url = process.env.DATABASE_URL;
const prisma = new PrismaClient(
  url && !url.includes("connection_limit=")
    ? { datasourceUrl: `${url}${url.includes("?") ? "&" : "?"}connection_limit=1` }
    : undefined
);

export { prisma };
