import { useState, useEffect, useCallback } from 'react';
import { transactionService } from '../services/transactionService';
import type { Transaction } from '../types/database';

export function useTodayTransactions(cashierId?: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({ count: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const [txRes, statsRes] = await Promise.all([
      cashierId ? transactionService.getByCashier(cashierId, 20) : transactionService.getToday(),
      transactionService.getTodayStats(cashierId),
    ]);
    setTransactions(txRes.data ?? []);
    setStats(statsRes);
    setLoading(false);
  }, [cashierId]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  return { transactions, stats, loading, refetch: fetchTransactions };
}

export function useTransactionsByRange(from: string, to: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!from || !to) return;
    setLoading(true);
    transactionService.getByDateRange(from, to).then(({ data }) => {
      setTransactions(data ?? []);
      setLoading(false);
    });
  }, [from, to]);

  return { transactions, loading };
}
