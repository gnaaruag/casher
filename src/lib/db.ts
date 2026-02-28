import { openDB, DBSchema, IDBPDatabase } from "idb";

export type TransactionType = "in" | "out";

export interface Casher {
  id: string;
  name: string;
  startDate: string; // ISO date string YYYY-MM-DD
  endDate: string;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  isGlobal: boolean;
  casherId: string | null; // null if global
  budget: number | null;
  createdAt: number;
}

export interface Transaction {
  id: string;
  casherId: string;
  type: TransactionType;
  amount: number;
  categoryId: string | null; // null for income
  title: string;
  description: string; // longer justification / notes
  date: string; // ISO date string YYYY-MM-DD
  createdAt: number;
}

interface CasherDB extends DBSchema {
  cashers: {
    key: string;
    value: Casher;
    indexes: { "by-createdAt": number };
  };
  categories: {
    key: string;
    value: Category;
    indexes: { "by-casherId": string; "by-createdAt": number };
  };
  transactions: {
    key: string;
    value: Transaction;
    indexes: { "by-casherId": string; "by-date": string; "by-categoryId": string };
  };
}

let dbPromise: Promise<IDBPDatabase<CasherDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<CasherDB>("casher-db", 1, {
      upgrade(db) {
        const casherStore = db.createObjectStore("cashers", { keyPath: "id" });
        casherStore.createIndex("by-createdAt", "createdAt");

        const catStore = db.createObjectStore("categories", { keyPath: "id" });
        catStore.createIndex("by-casherId", "casherId");
        catStore.createIndex("by-createdAt", "createdAt");

        const txStore = db.createObjectStore("transactions", { keyPath: "id" });
        txStore.createIndex("by-casherId", "casherId");
        txStore.createIndex("by-date", "date");
        txStore.createIndex("by-categoryId", "categoryId");
      },
    });
  }
  return dbPromise;
}

function uid() {
  return crypto.randomUUID();
}

// ── Cashers ────────────────────────────────────────────────
export async function getCashers(): Promise<Casher[]> {
  const db = await getDB();
  const all = await db.getAll("cashers");
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function createCasher(data: Omit<Casher, "id" | "createdAt">): Promise<Casher> {
  const db = await getDB();
  const casher: Casher = { ...data, id: uid(), createdAt: Date.now() };
  await db.put("cashers", casher);
  return casher;
}

export async function deleteCasher(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("cashers", id);
  // cascade delete
  const txs = await db.getAllFromIndex("transactions", "by-casherId", id);
  for (const tx of txs) await db.delete("transactions", tx.id);
  const cats = await db.getAllFromIndex("categories", "by-casherId", id);
  for (const cat of cats) await db.delete("categories", cat.id);
}

// ── Categories ─────────────────────────────────────────────
export async function getCategories(casherId: string): Promise<Category[]> {
  const db = await getDB();
  const all = await db.getAll("categories");
  return all
    .filter((c) => c.isGlobal || c.casherId === casherId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function getAllCategories(): Promise<Category[]> {
  const db = await getDB();
  const all = await db.getAll("categories");
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function createCategory(
  data: Omit<Category, "id" | "createdAt">
): Promise<Category> {
  const db = await getDB();
  const cat: Category = { ...data, id: uid(), createdAt: Date.now() };
  await db.put("categories", cat);
  return cat;
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("categories", id);
  // cascade: remove all transactions under this category
  const txs = await db.getAllFromIndex("transactions", "by-categoryId", id);
  for (const tx of txs) await db.delete("transactions", tx.id);
}

// ── Transactions ───────────────────────────────────────────
export async function getTransactions(casherId: string): Promise<Transaction[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("transactions", "by-casherId", casherId);
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function createTransaction(
  data: Omit<Transaction, "id" | "createdAt">
): Promise<Transaction> {
  const db = await getDB();
  const tx: Transaction = { ...data, id: uid(), createdAt: Date.now() };
  await db.put("transactions", tx);
  return tx;
}

export async function updateTransaction(
  id: string,
  data: Partial<Omit<Transaction, "id" | "createdAt">>
): Promise<Transaction> {
  const db = await getDB();
  const existing = await db.get("transactions", id);
  if (!existing) throw new Error("Transaction not found");
  const updated: Transaction = { ...existing, ...data };
  await db.put("transactions", updated);
  return updated;
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("transactions", id);
}
