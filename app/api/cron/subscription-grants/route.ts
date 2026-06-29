import { Buffer } from "node:buffer";
import { NextRequest, NextResponse } from "next/server";
import { processDueSchedules } from "@/lib/billing/subscription";

const CRON_SECRET = process.env.CRON_SECRET;
const CRON_JOBS_USERNAME = process.env.CRON_JOBS_USERNAME;
const CRON_JOBS_PASSWORD = process.env.CRON_JOBS_PASSWORD;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const hasBasicCreds = Boolean(CRON_JOBS_USERNAME && CRON_JOBS_PASSWORD);
  const hasBearer = Boolean(CRON_SECRET);

  const isBasicAuthorized = (() => {
    if (!hasBasicCreds) return false;
    if (!authHeader.startsWith("Basic ")) return false;
    try {
      const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf8");
      const [username, password] = decoded.split(":");
      return username === CRON_JOBS_USERNAME && password === CRON_JOBS_PASSWORD;
    } catch (error) {
      console.error("[Cron] Failed to decode basic auth header", error);
      return false;
    }
  })();

  const isBearerAuthorized = hasBearer && authHeader === `Bearer ${CRON_SECRET}`;

  if (!isBasicAuthorized && !isBearerAuthorized) {
    console.error("[Cron] Unauthorized request");
    if (!hasBasicCreds && !hasBearer) {
      return NextResponse.json({ error: "Cron auth not configured" }, { status: 500 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitParam = req.nextUrl.searchParams.get("limit");
  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : DEFAULT_LIMIT;
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  const catchUpParam = req.nextUrl.searchParams.get("catchUp");
  const parsedCatchUp = catchUpParam ? Number.parseInt(catchUpParam, 10) : undefined;
  const catchUp = parsedCatchUp && Number.isFinite(parsedCatchUp)
    ? Math.min(Math.max(parsedCatchUp, 1), 36)
    : undefined;

  const results = await processDueSchedules(limit, catchUp);

  return NextResponse.json({
    processed: results.reduce((sum, item) => sum + item.grantsProcessed, 0),
    schedulesTouched: results.length,
    grants: results,
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
