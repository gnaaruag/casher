"use client";
import ModalShell from "./ModalShell";
import { Transaction, Category, deleteTransaction } from "@/lib/db";
import { Trash2 } from "lucide-react";
import { useState } from "react";

interface Props {
  transaction: Transaction;
  category: Category | null;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

function fmt(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function fmtAmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export default function TransactionDetailModal({
  transaction,
  category,
  onClose,
  onDeleted,
}: Props) {
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    await deleteTransaction(transaction.id);
    onDeleted(transaction.id);
  }

  const isExpense = transaction.type === "out";
  const accentColor = category?.color ?? "var(--ink)";

  return (
    <ModalShell onClose={onClose}>
      <div className="px-6 pb-8">
        {/* Amount + delete */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ink/40 mb-1">
              {isExpense ? "Expense" : "Income"}
            </p>
            <p
              className="text-5xl font-bold leading-none"
              style={{ color: isExpense ? "var(--red)" : "var(--green)" }}
            >
              {isExpense ? "−" : "+"}₹{fmtAmt(transaction.amount)}
            </p>
          </div>
          <button
            onClick={handleDelete}
            className={`mt-1 p-2 rounded-full border-[2.5px] transition-all active:scale-95 ${
              confirming
                ? "border-dater-red bg-dater-red text-cream"
                : "border-ink/30 text-ink/40 hover:border-dater-red hover:text-dater-red"
            }`}
          >
            <Trash2 size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Title */}
        {transaction.title && (
          <p className="text-xl font-bold mb-4 leading-snug">{transaction.title}</p>
        )}

        {confirming && (
          <p className="text-sm text-dater-red font-semibold mb-4">
            Tap the trash again to confirm deletion.
          </p>
        )}

        <div className="flex flex-col gap-0">
          {category && (
            <Row label="Category">
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border-[2px]"
                style={{
                  borderColor: accentColor,
                  color:
                    accentColor === "#f7c948" || accentColor === "#f28a2e"
                      ? "var(--ink)"
                      : accentColor,
                }}
              >
                {category.name}
              </span>
            </Row>
          )}

          <Row label="Date">{fmt(transaction.date)}</Row>

          {transaction.description && (
            <Row label="Notes">
              <span className="leading-relaxed text-ink/70">{transaction.description}</span>
            </Row>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t-[2px] border-ink/10 pt-3 pb-1">
      <p className="text-[10px] font-bold uppercase tracking-widest text-ink/35 mb-1">
        {label}
      </p>
      <div className="text-base font-medium">{children}</div>
    </div>
  );
}
