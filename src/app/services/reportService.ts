import { supabase } from '../lib/supabase';
import type { DashboardStats, MonthlyChartData } from '../types/database';

export const reportService = {
  async getDashboardStats(): Promise<DashboardStats> {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.slice(0, 8) + '01';

    const [todayTxns, monthTxns, criticalStock, warningStock, pendingPayroll] = await Promise.all([
      supabase.from('transactions').select('total').gte('created_at', `${today}T00:00:00`).lte('created_at', `${today}T23:59:59`),
      supabase.from('transactions').select('total').gte('created_at', `${monthStart}T00:00:00`),
      supabase.from('inventory').select('id', { count: 'exact', head: true }).eq('status', 'Critical'),
      supabase.from('inventory').select('id', { count: 'exact', head: true }).eq('status', 'Warning'),
      supabase.from('payroll').select('id', { count: 'exact', head: true }).eq('status', 'Belum Dibayar'),
    ]);

    const revenue_today = todayTxns.data?.reduce((s, t) => s + (t.total ?? 0), 0) ?? 0;
    const revenue_month = monthTxns.data?.reduce((s, t) => s + (t.total ?? 0), 0) ?? 0;

    // Get month expenses from purchases
    const { data: purchases } = await supabase
      .from('purchases')
      .select('total_amount')
      .eq('status', 'Diterima')
      .gte('created_at', `${monthStart}T00:00:00`);
    const expense_month = purchases?.reduce((s, p) => s + (p.total_amount ?? 0), 0) ?? 0;

    return {
      revenue_today,
      revenue_month,
      expense_month,
      profit_month: revenue_month - expense_month,
      transactions_today: todayTxns.data?.length ?? 0,
      transactions_month: monthTxns.data?.length ?? 0,
      critical_stock_count: criticalStock.count ?? 0,
      warning_stock_count: warningStock.count ?? 0,
      pending_payroll_count: pendingPayroll.count ?? 0,
    };
  },

  async getMonthlyChartData(months = 7): Promise<MonthlyChartData[]> {
    const results: MonthlyChartData[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const from = `${year}-${String(month).padStart(2, '0')}-01`;
      const to = new Date(year, month, 0).toISOString().split('T')[0];

      const [rev, exp] = await Promise.all([
        supabase.from('transactions').select('total').gte('created_at', `${from}T00:00:00`).lte('created_at', `${to}T23:59:59`),
        supabase.from('purchases').select('total_amount').eq('status', 'Diterima').gte('created_at', `${from}T00:00:00`).lte('created_at', `${to}T23:59:59`),
      ]);

      const revenue = rev.data?.reduce((s, t) => s + (t.total ?? 0), 0) ?? 0;
      const expense = exp.data?.reduce((s, p) => s + (p.total_amount ?? 0), 0) ?? 0;

      results.push({
        month: d.toLocaleDateString('id-ID', { month: 'short' }),
        revenue,
        expense,
        profit: revenue - expense,
      });
    }

    return results;
  },

  async getTopProducts(limit = 10): Promise<{ name: string; quantity: number; revenue: number }[]> {
    const { data } = await supabase
      .from('transaction_items')
      .select('product_name, quantity, total_price');

    if (!data) return [];

    const map = new Map<string, { quantity: number; revenue: number }>();
    data.forEach(item => {
      const existing = map.get(item.product_name) ?? { quantity: 0, revenue: 0 };
      map.set(item.product_name, {
        quantity: existing.quantity + item.quantity,
        revenue: existing.revenue + item.total_price,
      });
    });

    return Array.from(map.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  },

  async getPaymentMethodBreakdown(): Promise<{ method: string; count: number; total: number }[]> {
    const { data } = await supabase.from('transactions').select('payment_method, total');
    if (!data) return [];

    const map = new Map<string, { count: number; total: number }>();
    data.forEach(t => {
      const existing = map.get(t.payment_method) ?? { count: 0, total: 0 };
      map.set(t.payment_method, { count: existing.count + 1, total: existing.total + t.total });
    });

    return Array.from(map.entries()).map(([method, stats]) => ({ method, ...stats }));
  },
};
