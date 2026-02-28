"use client";
import { useState } from "react";
import ModalShell from "./ModalShell";
import DatePicker from "./DatePicker";
import { createCasher, Casher } from "@/lib/db";

interface Props {
  onClose: () => void;
  onCreated: (casher: Casher) => void;
}

export default function CreateCasherModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate) {
      setError("All fields are required.");
      return;
    }
    if (endDate < startDate) {
      setError("End date must be after start date.");
      return;
    }
    setLoading(true);
    try {
      const casher = await createCasher({ name: name.trim(), startDate, endDate });
      onCreated(casher);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="px-6 pb-8">
        <h2 className="text-2xl font-bold mb-1">New Casher</h2>
        <p className="text-sm text-ink/40 mb-5">Define a period to track.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className="text-sm font-semibold text-ink/50 mb-1.5 block">
              Name
            </label>
            <input
              className="field"
              placeholder="e.g. March 2025, Q1, Trip to Goa…"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              autoFocus
            />
          </div>

          {/* Date pickers */}
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={(d) => {
              setStartDate(d);
              setError("");
            }}
            color="var(--orange)"
            placeholder="pick start date"
          />

          <DatePicker
            label="End Date"
            value={endDate}
            onChange={(d) => {
              setEndDate(d);
              setError("");
            }}
            color="var(--green)"
            placeholder="pick end date"
          />

          {/* Date range preview */}
          {startDate && endDate && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ink/5 border-[1.5px] border-ink/10">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: "var(--orange)", color: "var(--ink)" }}
              >
                {startDate}
              </span>
              <span className="text-ink/30 text-xs font-bold">→</span>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                style={{ background: "var(--green)" }}
              >
                {endDate}
              </span>
            </div>
          )}

          {error && (
            <p className="text-sm font-semibold" style={{ color: "var(--red)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full py-3 rounded-full border-[2.5px] border-ink bg-ink text-cream font-bold text-base hover:bg-ink/80 active:scale-95 transition-all disabled:opacity-40"
          >
            {loading ? "Creating…" : "Create Casher"}
          </button>
        </form>
      </div>
    </ModalShell>
  );
}
