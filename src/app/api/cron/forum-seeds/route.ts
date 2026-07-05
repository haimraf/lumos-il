import { NextResponse } from "next/server";
import { runForumSeed } from "@/lib/forumSeedRunner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isDryRun(request: Request) {
  const url = new URL(request.url);
  const value = url.searchParams.get("dryRun") || url.searchParams.get("dry-run");
  return value === "1" || value === "true";
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization");

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized cron request." }, { status: 401 });
  }

  const result = await runForumSeed({ dryRun: isDryRun(request) });
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

