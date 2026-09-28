"use client";

import { useState } from "react";
import { useAuthModal } from "@/components/AuthModal";

function isAuthError(message?: string) {
  return (message ?? "").toLowerCase().includes("authentication required");
}

function afterLoginUrl() {
  return typeof window !== "undefined" ? `${window.location.origin}/start` : "/start";
}

function rememberWebsite(website: string) {
  sessionStorage.setItem("pending_website", website);
}

function rememberPositioning(positioning: string) {
  if (positioning) {
    sessionStorage.setItem("pending_positioning", positioning);
  } else {
    sessionStorage.removeItem("pending_positioning");
  }
}

/** Landing intake — remembers the URL and optional positioning, then login starts the first scan. */
export function DomainIntake({
  cta = "See where you show up",
  compact = false,
}: {
  cta?: string;
  compact?: boolean;
}) {
  const { openAuthModal } = useAuthModal();
  const [url, setUrl] = useState("");
  const [positioning, setPositioning] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const submitWebsite = async (raw: string, pos: string) => {
    setIsLoading(true);
    setError("");
    try {
      let website = raw.trim();
      if (website && !/^https?:\/\//i.test(website)) {
        website = `https://${website}`;
      }
      rememberWebsite(website);
      rememberPositioning(pos.trim());

      const formData = new FormData();
      formData.append("website", website);
      if (pos.trim()) {
        formData.append("positioning", pos.trim());
      }

      const { createProjectAction } = await import("@/app/actions");
      const result = await createProjectAction(formData);

      if (isAuthError(result?.error)) {
        openAuthModal(afterLoginUrl());
        setIsLoading(false);
        return;
      }

      if (result?.error) {
        throw new Error(result.error);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      if (message.includes("NEXT_REDIRECT")) throw err;
      if (isAuthError(message)) {
        rememberWebsite(raw.trim());
        rememberPositioning(positioning.trim());
        openAuthModal(afterLoginUrl());
        setIsLoading(false);
        return;
      }
      setError(message);
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitWebsite(url, positioning);
  };

  return (
    <form onSubmit={handleSubmit} className={compact ? "w-full" : "mx-auto w-full max-w-2xl"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <input
          id="website"
          name="website"
          type="text"
          required
          inputMode="url"
          autoComplete="url"
          placeholder="https://yourbrand.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isLoading}
          className="min-w-0 flex-1 border border-[var(--line)] bg-white px-5 py-4 text-base font-medium text-[var(--ink)] shadow-[0_1px_0_rgba(15,15,14,0.04)] outline-none transition focus:border-[var(--ink)] disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="shrink-0 bg-[var(--ink)] px-7 py-4 text-sm font-black uppercase tracking-[0.14em] text-[var(--paper)] transition hover:bg-[var(--rust)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Opening…" : cta}
        </button>
      </div>

      {/* Optional positioning line — the north star for the scan */}
      <div className="mt-3">
        <input
          id="positioning"
          name="positioning"
          type="text"
          inputMode="text"
          placeholder='How should we talk about you? e.g. "Evening sacks for Indian wedding guests"'
          value={positioning}
          onChange={(e) => setPositioning(e.target.value)}
          disabled={isLoading}
          className="w-full border border-[var(--line)] bg-white/60 px-5 py-3 text-sm font-medium text-[var(--ink)] shadow-[0_1px_0_rgba(15,15,14,0.04)] outline-none transition placeholder:text-zinc-400 focus:border-[var(--ink)] focus:bg-white disabled:opacity-60"
        />
        <p className="mt-1.5 text-xs text-zinc-400">
          <span className="font-semibold text-zinc-500">Optional.</span>{" "}
          Skip it and we infer from the site. Fill it and every search, AI question, and recommendation is tailored to that position.
        </p>
      </div>

      {error ? (
        <p className="mt-3 border border-[var(--rust)] bg-[var(--rust-soft)] px-3 py-2 text-sm font-medium text-[var(--ink)]">
          {error}
        </p>
      ) : null}
    </form>
  );
}
