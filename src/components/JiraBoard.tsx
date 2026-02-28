"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { Category, Transaction, deleteCategory } from "@/lib/db";
import TransactionDetailModal from "./TransactionDetailModal";

interface Props {
  categories: Category[];
  transactions: Transaction[];
  onRefresh: () => void;
}

function fmtAmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function BudgetBar({
  spent,
  budget,
  color,
}: {
  spent: number;
  budget: number;
  color: string;
}) {
  const pct = Math.min((spent / budget) * 100, 100);
  const over = spent > budget;
  const barColor = over ? "var(--red)" : color;

  return (
    <div className="px-5 pb-3">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs font-semibold" style={{ color: barColor }}>
          ₹{fmtAmt(spent)} spent
        </span>
        <span className="text-xs text-ink/40 font-medium">
          of ₹{fmtAmt(budget)}
        </span>
      </div>
      {/* Track */}
      <div
        className="w-full h-1.5 rounded-full overflow-hidden"
        style={{ background: color + "25" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
      {over && (
        <p className="text-[10px] font-bold mt-1" style={{ color: "var(--red)" }}>
          ₹{fmtAmt(spent - budget)} over budget
        </p>
      )}
    </div>
  );
}

export default function JiraBoard({
  categories,
  transactions,
  onRefresh,
}: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const expenses = transactions.filter((t) => t.type === "out");

  function toggle(id: string) {
    setCollapsed((p) => ({ ...p, [id]: !p[id] }));
  }

  async function handleDeleteCategory(id: string) {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    await deleteCategory(id);
    setConfirmDelete(null);
    onRefresh();
  }

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  // Sort: over/at-budget categories sink to the bottom
  const sortedCategories = [...categories].sort((a, b) => {
    const spentA = expenses.filter((t) => t.categoryId === a.id).reduce((s, t) => s + t.amount, 0);
    const spentB = expenses.filter((t) => t.categoryId === b.id).reduce((s, t) => s + t.amount, 0);
    const fullA = a.budget !== null && spentA >= a.budget ? 1 : 0;
    const fullB = b.budget !== null && spentB >= b.budget ? 1 : 0;
    return fullA - fullB;
  });

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <p className="text-2xl font-bold mb-2">No categories yet</p>
        <p className="text-sm text-ink/50">
          Create a category to start tracking expenses.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-0">
        {sortedCategories.map((cat) => {
          const catExpenses = expenses
            .filter((t) => t.categoryId === cat.id)
            .sort((a, b) => b.date.localeCompare(a.date));
          const total = catExpenses.reduce((s, t) => s + t.amount, 0);
          const isCollapsed = collapsed[cat.id];
          const isConfirming = confirmDelete === cat.id;
          const budget = cat.budget ?? null;

          return (
            <div key={cat.id} className="border-b-[2.5px] border-ink">
              {/* Column header */}
              <div className="flex items-center px-5 py-3.5 gap-2">
                {/* Collapse toggle */}
                <button
                  onClick={() => toggle(cat.id)}
                  className="flex items-center gap-2.5 flex-1 min-w-0"
                >
                  {isCollapsed ? (
                    <ChevronRight size={15} strokeWidth={2.5} className="text-ink/40 shrink-0" />
                  ) : (
                    <ChevronDown size={15} strokeWidth={2.5} className="text-ink/40 shrink-0" />
                  )}
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: cat.color }}
                  />
                  {/* Name + scope stacked */}
                  <div className="flex flex-col items-start min-w-0">
                    <span className="font-bold text-base leading-tight truncate w-full">{cat.name}</span>
                    {cat.isGlobal && (
                      <span className="text-[10px] font-semibold tracking-wider uppercase text-ink/35 leading-tight mt-0.5">
                        global
                      </span>
                    )}
                  </div>
                </button>

                {/* Right side: total (no-budget only) + count + delete */}
                <div className="flex items-center gap-2 shrink-0">
                  {budget === null && total > 0 && (
                    <span className="text-sm font-bold" style={{ color: cat.color }}>
                      ₹{fmtAmt(total)}
                    </span>
                  )}
                  <span
                    className="text-[11px] font-bold w-6 h-6 rounded-full flex items-center justify-center"
                    style={{
                      background: cat.color + "25",
                      color: cat.color,
                    }}
                  >
                    {catExpenses.length}
                  </span>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center border-[2px] transition-all active:scale-90 ${
                      isConfirming
                        ? "border-dater-red bg-dater-red text-cream"
                        : "border-transparent text-ink/25 hover:border-ink/20 hover:text-ink/50"
                    }`}
                    title={isConfirming ? "Tap again to confirm" : "Delete category"}
                  >
                    <Trash2 size={13} strokeWidth={2} />
                  </button>
                </div>
              </div>

              {/* Budget bar — shown whether collapsed or not */}
              {budget !== null && (
                <BudgetBar spent={total} budget={budget} color={cat.color} />
              )}

              {/* Confirm delete banner */}
              {isConfirming && (
                <div className="mx-5 mb-3 px-3 py-2 rounded-lg border-[2px] border-dater-red/40 bg-dater-red/5 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-dater-red">
                    Tap trash again to delete &ldquo;{cat.name}&rdquo;
                  </p>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="text-xs font-bold text-ink/40 hover:text-ink/70"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Items */}
              {!isCollapsed && (
                <div className="px-5 pb-4 flex flex-col gap-2">
                  {catExpenses.length === 0 && (
                    <p className="text-sm text-ink/35 italic py-1">No expenses yet.</p>
                  )}
                  {catExpenses.map((tx) => (
                    <button
                      key={tx.id}
                      onClick={() => setSelected(tx)}
                      className="w-full text-left flex items-center justify-between px-4 py-3 rounded-xl border-[2.5px] border-ink bg-white hover:bg-cream active:scale-[0.99] transition-all"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-semibold text-sm truncate">
                          {tx.title || "Untitled"}
                        </span>
                        <span className="text-xs text-ink/40 font-medium truncate">
                          {tx.description ? tx.description : fmtDate(tx.date)}
                          {tx.description ? ` · ${fmtDate(tx.date)}` : ""}
                        </span>
                      </div>
                      <span
                        className="font-bold text-base shrink-0 ml-3"
                        style={{ color: cat.color }}
                      >
                        ₹{fmtAmt(tx.amount)}
                      </span>
                    </button>
                  ))}

                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Transaction detail modal */}
      {selected && (
        <TransactionDetailModal
          transaction={selected}
          category={catMap[selected.categoryId ?? ""] ?? null}
          onClose={() => setSelected(null)}
          onDeleted={() => {
            setSelected(null);
            onRefresh();
          }}
        />
      )}
    </>
  );
}
