"use client";
import { useState } from "react";
import ModalShell from "./ModalShell";
import { createTransaction, Transaction, Category } from "@/lib/db";
import DatePicker from "./DatePicker";

interface Props {
  casherId: string;
  type: "in" | "out";
  categories: Category[];
  prefillCategoryId?: string;
  onClose: () => void;
  onCreated: (tx: Transaction) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function AddTransactionModal({
  casherId,
  type,
  categories,
  prefillCategoryId,
  onClose,
  onCreated,
}: Props) {
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState(
    prefillCategoryId ?? categories[0]?.id ?? ""
  );
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(today());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isExpense = type === "out";
  const prefillCategory = prefillCategoryId
    ? categories.find((c) => c.id === prefillCategoryId)
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!title.trim()) {
      setError("Enter a title.");
      return;
    }
    if (isExpense && !categoryId) {
      setError("Select a category.");
      return;
    }
    if (!date) {
      setError("Select a date.");
      return;
    }
    setLoading(true);
    try {
      const tx = await createTransaction({
        casherId,
        type,
        amount: amt,
        categoryId: isExpense ? categoryId : null,
        title: title.trim(),
        description: description.trim(),
        date,
      });
      onCreated(tx);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="px-6 pb-8">
        <h2 className="text-2xl font-bold mb-1">
          {isExpense ? "Add Expense" : "Add Income"}
        </h2>
        <div className="flex items-center gap-2 mb-5">
          <p className="text-sm text-ink/50">
            {isExpense ? "Record a spend" : "Log money coming in"}
          </p>
          {prefillCategory && (
            <span
              className="text-xs font-bold px-2.5 py-0.5 rounded-full border-[2px] shrink-0"
              style={{
                borderColor: prefillCategory.color,
                color: prefillCategory.color,
              }}
            >
              {prefillCategory.name}
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Amount */}
          <div>
            <label className="text-sm font-semibold text-ink/60 mb-1 block">
              Amount
            </label>
            <div className="relative">
              <input
                className="field pl-9"
                type="number"
                min="0"
                step="0.01"
                placeholder="₹ 0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-sm font-semibold text-ink/60 mb-1 block">
              Title
            </label>
            <input
              className="field"
              placeholder={isExpense ? "Dinner at Toscano, Cab ride…" : "March salary, Freelance…"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Category — only for expenses without a prefilled category */}
          {isExpense && !prefillCategoryId && (
            <div>
              <label className="text-sm font-semibold text-ink/60 mb-1 block">
                Category
              </label>
              {categories.length === 0 ? (
                <p className="text-sm text-ink/40 italic">
                  No categories yet — create one first.
                </p>
              ) : (
                <CategoryDropdown
                  categories={categories}
                  value={categoryId}
                  onChange={setCategoryId}
                />
              )}
            </div>
          )}

          {/* Date */}
          <DatePicker
            label="Date"
            value={date}
            onChange={setDate}
            color={isExpense ? "var(--red)" : "var(--green)"}
          />

          {/* Description / notes */}
          <div>
            <label className="text-sm font-semibold text-ink/60 mb-1 block">
              Notes{" "}
              <span className="font-normal text-ink/35">(optional)</span>
            </label>
            <textarea
              className="field resize-none"
              rows={2}
              placeholder={
                isExpense
                  ? "Any extra context…"
                  : "Source, reference, notes…"
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm font-semibold" style={{ color: "var(--red)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || (isExpense && categories.length === 0)}
            className="mt-1 w-full py-3 rounded-full border-[2.5px] border-ink bg-ink text-cream font-bold text-base hover:bg-ink/80 active:scale-95 transition-all disabled:opacity-40"
          >
            {loading ? "Saving…" : isExpense ? "Add Expense" : "Add Income"}
          </button>
        </form>
      </div>
    </ModalShell>
  );
}

function CategoryDropdown({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <select
      className="field"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
