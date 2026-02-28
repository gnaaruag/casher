"use client";
import { useEffect, useState, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  getCashers,
  getCategories,
  getTransactions,
  deleteCasher,
  Casher,
  Category,
  Transaction,
} from "@/lib/db";
import {
  ChevronDown,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  LayoutGrid,
  Tag,
  Banknote,
  ShoppingCart,
  Trash2,
  Download,
} from "lucide-react";
import CreateCasherModal from "@/components/CreateCasherModal";
import CreateCategoryModal from "@/components/CreateCategoryModal";
import AddTransactionModal from "@/components/AddTransactionModal";
import JiraBoard from "@/components/JiraBoard";

type Modal =
  | null
  | "create-casher"
  | "create-category"
  | { type: "add-tx"; txType: "in" | "out"; prefillCategoryId?: string };

function fmtAmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function Home() {
  const [cashers, setCashers] = useState<Casher[]>([]);
  const [activeCasherId, setActiveCasherId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [modal, setModal] = useState<Modal>(null);
  const [casherDropdown, setCasherDropdown] = useState(false);
  const [confirmDeleteCasher, setConfirmDeleteCasher] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // ── Load cashers ─────────────────────────────────────────
  const refreshCashers = useCallback(async () => {
    const all = await getCashers();
    setCashers(all);
    return all;
  }, []);

  // ── Load data for active casher ──────────────────────────
  const refreshActive = useCallback(async (casherId: string) => {
    const [cats, txs] = await Promise.all([
      getCategories(casherId),
      getTransactions(casherId),
    ]);
    setCategories(cats);
    setTransactions(txs);
  }, []);

  // ── Initial load ─────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const all = await refreshCashers();
      if (all.length > 0) {
        const id = all[0].id;
        setActiveCasherId(id);
        await refreshActive(id);
      }
      setLoaded(true);
    })();
  }, [refreshCashers, refreshActive]);

  // ── Switch casher ────────────────────────────────────────
  async function selectCasher(id: string) {
    setActiveCasherId(id);
    setCasherDropdown(false);
    setConfirmDeleteCasher(null);
    await refreshActive(id);
  }

  // ── Delete casher ────────────────────────────────────────
  async function handleDeleteCasher(id: string) {
    if (confirmDeleteCasher !== id) {
      setConfirmDeleteCasher(id);
      return;
    }
    await deleteCasher(id);
    setConfirmDeleteCasher(null);
    const remaining = await refreshCashers();
    if (remaining.length > 0) {
      const next = remaining[0].id;
      setActiveCasherId(next);
      await refreshActive(next);
    } else {
      setActiveCasherId(null);
      setCategories([]);
      setTransactions([]);
    }
  }

  // ── Export to Excel ──────────────────────────────────────
  function exportCasher() {
    if (!activeCasher) return;

    const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

    // Summary sheet
    const summaryData = [
      ["Casher", activeCasher.name],
      ["Period", `${activeCasher.startDate} → ${activeCasher.endDate}`],
      [],
      ["Total In (₹)", totalIn],
      ["Total Out (₹)", totalOut],
      ["Net (₹)", totalIn - totalOut],
      [],
      ["Category", "Budget (₹)", "Spent (₹)", "Remaining (₹)"],
      ...categories.map((cat) => {
        const spent = transactions
          .filter((t) => t.type === "out" && t.categoryId === cat.id)
          .reduce((s, t) => s + t.amount, 0);
        const budget = cat.budget ?? "-";
        const remaining =
          typeof budget === "number" ? budget - spent : "-";
        return [cat.name, budget, spent, remaining];
      }),
    ];

    // Transactions sheet
    const txData = [
      ["Date", "Type", "Category", "Amount (₹)", "Description"],
      ...transactions
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((tx) => [
          tx.date,
          tx.type === "in" ? "Income" : "Expense",
          tx.categoryId ? (catMap[tx.categoryId]?.name ?? "Unknown") : "—",
          tx.amount,
          tx.description || "",
        ]),
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), "Summary");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(txData), "Transactions");

    XLSX.writeFile(
      wb,
      `${activeCasher.name.replace(/\s+/g, "_")}_${activeCasher.startDate}.xlsx`
    );
  }

  const activeCasher = cashers.find((c) => c.id === activeCasherId);

  // ── Stats ────────────────────────────────────────────────
  const totalIn = transactions
    .filter((t) => t.type === "in")
    .reduce((s, t) => s + t.amount, 0);

  const totalOut = transactions
    .filter((t) => t.type === "out")
    .reduce((s, t) => s + t.amount, 0);

  const balance = totalIn - totalOut;

  const todayOut = transactions
    .filter((t) => t.type === "out" && t.date === todayStr())
    .reduce((s, t) => s + t.amount, 0);

  // Avg daily spend — based on days elapsed since casher start (min 1)
  const avgDailySpend = (() => {
    if (!activeCasher || totalOut === 0) return 0;
    const start = new Date(activeCasher.startDate + "T00:00:00");
    const now = new Date();
    const elapsed = Math.max(
      1,
      Math.floor((now.getTime() - start.getTime()) / 86400000) + 1
    );
    return totalOut / elapsed;
  })();

  // Days remaining in the casher
  const daysRemaining = (() => {
    if (!activeCasher) return null;
    const end = new Date(activeCasher.endDate + "T00:00:00");
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.ceil((end.getTime() - now.getTime()) / 86400000);
  })();

  // Top category by spend
  const topCategory = (() => {
    if (categories.length === 0) return null;
    const expenses = transactions.filter((t) => t.type === "out" && t.categoryId);
    if (expenses.length === 0) return null;
    const byCategory: Record<string, number> = {};
    for (const tx of expenses) {
      byCategory[tx.categoryId!] = (byCategory[tx.categoryId!] ?? 0) + tx.amount;
    }
    const topId = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]?.[0];
    return topId ? categories.find((c) => c.id === topId) ?? null : null;
  })();

  // ── Handlers ─────────────────────────────────────────────
  async function handleCasherCreated(casher: Casher) {
    await refreshCashers();
    setActiveCasherId(casher.id);
    await refreshActive(casher.id);
    setModal(null);
  }

  async function handleCategoryCreated(_cat: Category) {
    if (activeCasherId) await refreshActive(activeCasherId);
    setModal(null);
  }

  async function handleTransactionCreated(_tx: Transaction) {
    if (activeCasherId) await refreshActive(activeCasherId);
    setModal(null);
  }

  if (!loaded) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-ink/40 font-medium">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream max-w-lg mx-auto flex flex-col">
      {/* ── Header ────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-5 border-b-[2.5px] border-ink shrink-0">
        <div className="flex items-center gap-2">
          <Wallet size={20} strokeWidth={2} />
          <span className="text-xl font-bold tracking-tight">Casher</span>
        </div>

        {/* Casher selector */}
        <div className="relative">
          <button
            onClick={() => {
              setCasherDropdown((p) => !p);
              setConfirmDeleteCasher(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-[2.5px] border-ink text-sm font-semibold hover:bg-ink/5 active:scale-95 transition-all"
          >
            <LayoutGrid size={14} strokeWidth={2} />
            {activeCasher ? activeCasher.name : "Select Casher"}
            <ChevronDown size={14} strokeWidth={2.5} />
          </button>

          {casherDropdown && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-cream border-[2.5px] border-ink rounded-xl overflow-hidden z-40 animate-fade-in">
              {cashers.length === 0 && (
                <p className="px-4 py-3 text-sm text-ink/50">No cashers yet.</p>
              )}

              {cashers.map((c) => {
                const isActive = c.id === activeCasherId;
                const isConfirming = confirmDeleteCasher === c.id;
                return (
                  <div
                    key={c.id}
                    className={`border-b-[1.5px] border-ink/10 last:border-0 ${
                      isActive ? "bg-ink text-cream" : ""
                    }`}
                  >
                    <div className="flex items-center gap-1 pr-2">
                      {/* Select area */}
                      <button
                        onClick={() => selectCasher(c.id)}
                        className="flex-1 text-left px-4 py-3 text-sm transition-colors hover:opacity-80"
                      >
                        <div className="font-semibold">{c.name}</div>
                        <div
                          className={`text-xs mt-0.5 ${
                            isActive ? "opacity-60" : "text-ink/50"
                          }`}
                        >
                          {c.startDate} → {c.endDate}
                        </div>
                      </button>

                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCasher(c.id);
                        }}
                        title={isConfirming ? "Tap again to confirm" : "Delete casher"}
                        className={`w-7 h-7 rounded-full flex items-center justify-center border-[2px] transition-all active:scale-90 shrink-0 ${
                          isConfirming
                            ? "border-dater-red bg-dater-red text-white"
                            : isActive
                            ? "border-cream/20 text-cream/40 hover:border-cream/50 hover:text-cream/80"
                            : "border-transparent text-ink/25 hover:border-ink/20 hover:text-ink/60"
                        }`}
                      >
                        <Trash2 size={12} strokeWidth={2} />
                      </button>
                    </div>

                    {/* Confirm banner */}
                    {isConfirming && (
                      <div className="mx-3 mb-2 px-3 py-1.5 rounded-lg bg-dater-red/10 border-[1.5px] border-dater-red/30 flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold text-dater-red leading-tight">
                          Tap trash again — deletes all data.
                        </p>
                        <button
                          onClick={() => setConfirmDeleteCasher(null)}
                          className="text-[11px] font-bold text-ink/50 hover:text-ink shrink-0"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                onClick={() => {
                  setCasherDropdown(false);
                  setModal("create-casher");
                }}
                className="w-full text-left px-4 py-3 text-sm font-bold flex items-center gap-2 text-ink/60 hover:bg-ink/5 border-t-[2px] border-ink/15 transition-colors"
              >
                <Plus size={14} strokeWidth={2.5} />
                New Casher
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── No casher state ──────────────────────────────── */}
      {!activeCasher ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-3xl font-bold">No cashers yet</p>
          <p className="text-sm text-ink/50 max-w-xs">
            A Casher is a period of time — like a month or a project. Create one
            to start tracking.
          </p>
          <button
            onClick={() => setModal("create-casher")}
            className="mt-2 px-6 py-3 rounded-full border-[2.5px] border-ink bg-ink text-cream font-bold text-base active:scale-95 transition-all"
          >
            Create first Casher
          </button>
        </div>
      ) : (
        <>
          {/* ── Stats panel ─────────────────────────────── */}
          <div className="border-b-[2.5px] border-ink shrink-0">
            {/* Balance — hero row */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b-[2.5px] border-ink">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-ink/40">
                  Balance
                </span>
              </div>
              <span
                className="text-2xl font-bold"
                style={{ color: balance >= 0 ? "var(--green)" : "var(--red)" }}
              >
                {balance >= 0 ? "+" : "−"}₹{fmtAmt(Math.abs(balance))}
              </span>
            </div>

            {/* Secondary rows */}
            <div className="divide-y-[2px] divide-ink/10">
              <StatRow
                label="Money In"
                value={`₹${fmtAmt(totalIn)}`}
                icon={<ArrowDownLeft size={13} strokeWidth={2.5} />}
                color="var(--green)"
              />
              <StatRow
                label="Money Out"
                value={`₹${fmtAmt(totalOut)}`}
                icon={<ArrowUpRight size={13} strokeWidth={2.5} />}
                color="var(--red)"
              />
              <StatRow
                label="Today's Spend"
                value={todayOut > 0 ? `₹${fmtAmt(todayOut)}` : "—"}
                color="var(--ink)"
              />
              <StatRow
                label="Avg Daily Spend"
                value={avgDailySpend > 0 ? `₹${fmtAmt(avgDailySpend)}` : "—"}
                color="var(--ink)"
              />
              <StatRow
                label="Days Remaining"
                value={
                  daysRemaining === null
                    ? "—"
                    : daysRemaining < 0
                    ? "Ended"
                    : daysRemaining === 0
                    ? "Last day"
                    : `${daysRemaining}d`
                }
                color={
                  daysRemaining !== null && daysRemaining <= 3
                    ? "var(--red)"
                    : "var(--ink)"
                }
              />
              {topCategory && (
                <StatRow
                  label="Top Category"
                  value={topCategory.name}
                  color={topCategory.color}
                />
              )}
            </div>
          </div>

          {/* ── Action bar ──────────────────────────────── */}
          <div className="flex items-center gap-2 px-5 py-3 border-b-[2.5px] border-ink shrink-0">
            <ActionBtn
              onClick={() => setModal({ type: "add-tx", txType: "out" })}
              icon={<ShoppingCart size={16} strokeWidth={2} />}
              addIcon
              filled
              title="Add expense"
            />
            <ActionBtn
              onClick={() => setModal({ type: "add-tx", txType: "in" })}
              icon={<Banknote size={16} strokeWidth={2} />}
              addIcon
              title="Add income"
            />
            <ActionBtn
              onClick={() => setModal("create-category")}
              icon={<Tag size={15} strokeWidth={2} />}
              addIcon
              title="New category"
            />
          </div>

          {/* ── Casher strip: date range + export ───────── */}
          <div className="flex items-center justify-between px-5 py-2 border-b-[2.5px] border-ink shrink-0">
            <span className="text-xs font-semibold text-ink/40">
              {activeCasher.startDate} → {activeCasher.endDate}
            </span>
            <button
              onClick={exportCasher}
              title="Export as Excel"
              className="flex items-center gap-1.5 text-xs font-bold text-ink/50 hover:text-ink transition-colors active:scale-95 py-0.5 px-2 rounded-full hover:bg-ink/5"
            >
              <Download size={13} strokeWidth={2.5} />
              Export
            </button>
          </div>

          {/* ── Jira board ──────────────────────────────── */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <JiraBoard
              categories={categories}
              transactions={transactions}
              onRefresh={() =>
                activeCasherId && refreshActive(activeCasherId)
              }
            />
          </div>
        </>
      )}

      {/* ── Modals ──────────────────────────────────────── */}
      {modal === "create-casher" && (
        <CreateCasherModal
          onClose={() => setModal(null)}
          onCreated={handleCasherCreated}
        />
      )}

      {modal === "create-category" && activeCasherId && (
        <CreateCategoryModal
          casherId={activeCasherId}
          onClose={() => setModal(null)}
          onCreated={handleCategoryCreated}
        />
      )}

      {typeof modal === "object" &&
        modal !== null &&
        modal.type === "add-tx" &&
        activeCasherId && (
          <AddTransactionModal
            casherId={activeCasherId}
            type={modal.txType}
            categories={categories}
            prefillCategoryId={modal.prefillCategoryId}
            onClose={() => setModal(null)}
            onCreated={handleTransactionCreated}
          />
        )}

      {/* Dismiss dropdown on outside click */}
      {casherDropdown && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => {
            setCasherDropdown(false);
            setConfirmDeleteCasher(null);
          }}
        />
      )}
    </div>
  );
}

function StatRow({
  label,
  value,
  icon,
  color = "var(--ink)",
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-2.5">
      <div className="flex items-center gap-1.5 text-ink/40">
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-widest">
          {label}
        </span>
      </div>
      <span className="text-base font-bold" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

function ActionBtn({
  onClick,
  icon,
  addIcon = false,
  filled = false,
  title,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  addIcon?: boolean;
  filled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full border-[2.5px] border-ink transition-all active:scale-95 ${
        filled
          ? "bg-ink text-cream hover:bg-ink/80"
          : "bg-transparent text-ink hover:bg-ink/5"
      }`}
    >
      {addIcon && <Plus size={12} strokeWidth={3} />}
      {icon}
    </button>
  );
}
