import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/** Allow long-lived SSE / scan proxies (seconds; ignored on some hosts). */
export const maxDuration = 3600;

const UPSTREAM = (process.env.API_BASE_URL || "http://localhost:8080/api").replace(/\/$/, "");

async function proxy(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const joined = path.join("/");
  const target = `${UPSTREAM}/${joined}${req.nextUrl.search}`;
  const isStream = joined.endsWith("/scan-stream") || joined.includes("/scan-stream?");

  const headers = new Headers();
  const cookie = req.headers.get("cookie");
  const contentType = req.headers.get("content-type");
  if (cookie) headers.set("cookie", cookie);
  if (contentType) headers.set("content-type", contentType);
  const email = req.headers.get("x-user-email");
  if (email) headers.set("x-user-email", email);
  // Prefer no compression on streams so the browser EventSource parser stays happy.
  if (isStream) headers.set("accept", "text/event-stream");

  const init: RequestInit & { duplex?: "half" } = {
    method: req.method,
    headers,
    cache: "no-store",
    redirect: "manual",
    duplex: "half",
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  const upstream = await fetch(target, init);
  const out = new Headers();
  const pass = [
    "content-type",
    "cache-control",
    "connection",
    "x-accel-buffering",
    "content-security-policy",
    "x-frame-options",
  ];
  for (const key of pass) {
    const value = upstream.headers.get(key);
    if (value) out.set(key, value);
  }
  if (isStream || (upstream.headers.get("content-type") || "").includes("text/event-stream")) {
    out.set("Content-Type", "text/event-stream; charset=utf-8");
    out.set("Cache-Control", "no-cache, no-transform");
    out.set("Connection", "keep-alive");
    out.set("X-Accel-Buffering", "no");
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: out,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
