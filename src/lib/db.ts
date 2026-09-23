import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import os from "os";

function getDatabaseUrl(): string {
  // If explicitly provided via custom env (e.g. external Postgres/MySQL), use it
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith("file:.")) {
    return process.env.DATABASE_URL;
  }

  // On Vercel / serverless environment where files are read-only
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDir = os.tmpdir();
    const targetDbPath = path.join(tmpDir, "dev.db");

    if (!fs.existsSync(targetDbPath)) {
      const candidates = [
        path.join(process.cwd(), "prisma", "dev.db"),
        path.join(process.cwd(), "dev.db"),
        path.join(__dirname, "..", "..", "prisma", "dev.db"),
        path.join(__dirname, "..", "prisma", "dev.db"),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          try {
            fs.copyFileSync(p, targetDbPath);
            console.log(`[DB] Copied SQLite database to writable path: ${targetDbPath}`);
            break;
          } catch (err) {
            console.error(`[DB] Failed to copy SQLite db from ${p}:`, err);
          }
        }
      }
    }

    if (fs.existsSync(targetDbPath)) {
      return `file:${targetDbPath.replace(/\\/g, "/")}`;
    }
  }

  return process.env.DATABASE_URL || "file:./dev.db";
}

const dbUrl = getDatabaseUrl();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
