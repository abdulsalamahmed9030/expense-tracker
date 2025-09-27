"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { AddTransactionModal } from "@/components/transactions/add-transaction-modal";

type Transaction = {
  id: string;
  amount: number;
  type: "income" | "expense";
  category_id: string | null;
  occurred_at: string;
  note: string | null;
};

export default function TransactionsPage() {
  const supabase = createSupabaseBrowserClient();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("occurred_at", { ascending: false });

      if (!error && data) setTransactions(data as Transaction[]);
    };

    fetchData();

    const channel = supabase
      .channel("transactions-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Transactions</h1>

      <AddTransactionModal />

      <div className="rounded-2xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30">
            <tr>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Amount</th>
              <th className="px-4 py-2 text-left">Note</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-b last:border-0">
                <td className="px-4 py-2">
                  {new Date(t.occurred_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-2">{t.type}</td>
                <td className="px-4 py-2">${Number(t.amount).toFixed(2)}</td>
                <td className="px-4 py-2">{t.note ?? "-"}</td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  No transactions yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
