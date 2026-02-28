"use client";
import { useState } from "react";
import ModalShell from "./ModalShell";
import { createCategory, Category } from "@/lib/db";

const COLORS = [
  { label: "Black", value: "#000000" },
  { label: "Brown", value: "#7c2d12" },
  { label: "Dark Red", value: "#7f1d1d" },
  { label: "Red", value: "#dc2626" },
  { label: "Orange", value: "#f97316" },
  { label: "Amber", value: "#ca8a04" },
  { label: "Yellow", value: "#eab308" },
  { label: "Lime", value: "#84cc16" },
  { label: "Green", value: "#16a34a" },
  { label: "Emerald", value: "#059669" },
  { label: "Teal", value: "#0d9488" },
  { label: "Cyan", value: "#0891b2" },
  { label: "Blue", value: "#0284c7" },
  { label: "Sky", value: "#2563eb" },
  { label: "Indigo", value: "#4f46e5" },
  { label: "Purple", value: "#7c3aed" },
  { label: "Violet", value: "#a855f7" },
  { label: "Pink", value: "#ec4899" },
];

interface Props {
  casherId: string;
  onClose: () => void;
  onCreated: (cat: Category) => void;
}

export default function CreateCategoryModal({ casherId, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0].value);
  const [isGlobal, setIsGlobal] = useState(true);
  const [budget, setBudget] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Category name is required.");
      return;
    }
    const parsedBudget = budget ? parseFloat(budget) : null;
    if (budget && (isNaN(parsedBudget!) || parsedBudget! <= 0)) {
      setError("Budget must be a positive number.");
      return;
    }
    setLoading(true);
    try {
      const cat = await createCategory({
        name: name.trim(),
        color,
        isGlobal,
        casherId: isGlobal ? null : casherId,
        budget: parsedBudget,
      });
      onCreated(cat);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="px-6 pb-8">
        <h2 className="text-2xl font-bold mb-1">New Category</h2>
        <p className="text-sm text-ink/40 mb-5">Group your expenses.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className="text-sm font-semibold text-ink/50 mb-1.5 block">Name</label>
            <input
              className="field"
              placeholder="Food, Transport, Rent…"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              autoFocus
            />
          </div>

          {/* Color */}
          <div>
            <label className="text-sm font-semibold text-ink/50 mb-2 block">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className="w-8 h-8 rounded-full transition-all active:scale-90"
                  style={{
                    background: c.value,
                    outline: color === c.value ? `3px solid var(--ink)` : "3px solid transparent",
                    outlineOffset: "2px",
                  }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className="text-sm font-semibold text-ink/50 mb-1.5 block">
              Budget{" "}
              <span className="font-normal text-ink/35">(optional)</span>
            </label>
            <div className="relative">
              <input
                className="field pl-9"
                type="number"
                min="0"
                step="0.01"
                placeholder="₹ 0.00"
                value={budget}
                onChange={(e) => { setBudget(e.target.value); setError(""); }}
              />
            </div>
            {budget && !isNaN(parseFloat(budget)) && (
              <p className="text-xs text-ink/40 mt-1 ml-1">
                Spend will be tracked against this limit.
              </p>
            )}
          </div>

          {/* Scope */}
          <div>
            <label className="text-sm font-semibold text-ink/50 mb-2 block">Scope</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsGlobal(true)}
                className={`flex-1 py-2 rounded-full border-[2.5px] border-ink text-sm font-semibold transition-all active:scale-95 ${
                  isGlobal ? "bg-ink text-cream" : "bg-transparent text-ink"
                }`}
              >
                Global
              </button>
              <button
                type="button"
                onClick={() => setIsGlobal(false)}
                className={`flex-1 py-2 rounded-full border-[2.5px] border-ink text-sm font-semibold transition-all active:scale-95 ${
                  !isGlobal ? "bg-ink text-cream" : "bg-transparent text-ink"
                }`}
              >
                This Casher only
              </button>
            </div>
          </div>

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
            {loading ? "Creating…" : "Create Category"}
          </button>
        </form>
      </div>
    </ModalShell>
  );
}
