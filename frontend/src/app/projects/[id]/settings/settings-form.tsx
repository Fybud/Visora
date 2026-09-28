"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ApiProject } from "@/lib/data";
import { updateSettingsAction } from "@/app/actions";

/** Editable project settings — brand, category, market, and positioning. */
export function SettingsForm({ project }: { project: ApiProject }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const [isRerunning, setIsRerunning] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [positioning, setPositioning] = useState(project.positioning ?? "");
  const [country, setCountry] = useState(project.country ?? "India");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");
    setSaved(false);
    try {
      const result = await updateSettingsAction(project.id, {
        positioning: positioning.trim(),
        country: country.trim() || "India",
      });
      if (result?.ok === false) {
        setError(result.error ?? "Failed to save.");
      } else {
        setSaved(true);
        startTransition(() => router.refresh());
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRerun = async () => {
    setIsRerunning(true);
    setError("");
    try {
      // Save first so the new positioning is in the DB before re-run.
      const saveResult = await updateSettingsAction(project.id, {
        positioning: positioning.trim(),
        country: country.trim() || "India",
      });
      if (saveResult?.ok === false) {
        setError(saveResult.error ?? "Failed to save settings.");
        setIsRerunning(false);
        return;
      }
      router.push(`/projects/${project.id}/scan?from=intents`);
    } catch (e) {
      setError(String(e));
      setIsRerunning(false);
    }
  };

  const readonlyRows = [
    { label: "Brand name", value: project.brand || "—" },
    { label: "Website URL", value: project.website || "—" },
    { label: "Category", value: project.category || "—" },
  ];

  return (
    <form className="b-card flex flex-col gap-5 p-5" onSubmit={handleSave}>
      {/* Read-only inferred fields */}
      {readonlyRows.map((row) => (
        <div key={row.label}>
          <span className="b-label mb-2 block">{row.label}</span>
          <div className="b-input flex items-center bg-zinc-100 text-zinc-500" aria-readonly>
            {row.value}
          </div>
        </div>
      ))}

      {/* Editable: positioning north star */}
      <div>
        <label htmlFor="settings-positioning" className="b-label mb-2 block">
          How should we talk about you?{" "}
          <span className="font-normal text-zinc-400">(optional)</span>
        </label>
        <input
          id="settings-positioning"
          type="text"
          value={positioning}
          onChange={(e) => { setPositioning(e.target.value); setSaved(false); }}
          placeholder='e.g. "Evening sacks for Indian wedding guests"'
          className="b-input w-full placeholder:text-zinc-400"
          disabled={isSaving || isRerunning}
        />
        <p className="mt-1 text-xs text-zinc-400">
          The north star for searches, AI questions, competitors, and copy fixes.
          After saving, click <strong>Re-run from search intent</strong> to apply.
        </p>
      </div>

      {/* Editable: market */}
      <div>
        <label htmlFor="settings-market" className="b-label mb-2 block">
          Market
        </label>
        <input
          id="settings-market"
          type="text"
          value={country}
          onChange={(e) => { setCountry(e.target.value); setSaved(false); }}
          placeholder="India"
          className="b-input w-full"
          disabled={isSaving || isRerunning}
        />
      </div>

      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}

      {saved ? (
        <p className="text-xs font-semibold text-emerald-600">Saved ✓</p>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          disabled={isSaving || isRerunning || isPending}
          className="b-btn b-btn-sm b-btn-primary"
        >
          {isSaving ? "Saving…" : "Save settings"}
        </button>
        <button
          type="button"
          onClick={() => void handleRerun()}
          disabled={isSaving || isRerunning || isPending}
          className="b-btn b-btn-sm"
          title="Saves, then re-runs Google, AI questions, rivals, and fixes with the new positioning. Does not recrawl the site."
        >
          {isRerunning ? "Starting…" : "Re-run from search intent"}
        </button>
      </div>
    </form>
  );
}
