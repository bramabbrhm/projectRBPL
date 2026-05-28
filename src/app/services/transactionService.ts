import { supabase } from '../lib/supabase';
import type { Transaction, TransactionItem, ServiceResponse } from '../types/database';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export interface CreateTransactionInput {
  cashier_id: string;
  payment_method: 'Cash' | 'QRIS' | 'E-Wallet';
  cart: CartItem[];
  cash_received?: number;
  notes?: string;
}

export const transactionService = {
  async create(input: CreateTransactionInput): Promise<ServiceResponse<Transaction>> {
    const subtotal = input.cart.reduce((s, c) => s + c.price * c.qty, 0);
    const tax = Math.round(subtotal * 0.1);
    const total = subtotal + tax;
    const change = input.cash_received ? Math.max(0, input.cash_received - total) : null;

    const { data: txn, error: txnError } = await supabase
      .from('transactions')
      .insert({
        cashier_id: input.cashier_id,
        payment_method: input.payment_method,
        subtotal,
        tax,
        total,
        cash_received: input.cash_received ?? null,
        change_amount: change,
        notes: input.notes ?? null,
      })
      .select()
      .single();

    if (txnError) return { data: null, error: txnError.message };

    const items = input.cart.map(c => ({
      transaction_id: txn.id,
      product_id: c.id,
      product_name: c.name,
      quantity: c.qty,
      unit_price: c.price,
    }));

    const { error: itemsError } = await supabase.from('transaction_items').insert(items);
    if (itemsError) return { data: null, error: itemsError.message };

    return { data: txn as Transaction, error: null };
  },

  async getToday(): Promise<ServiceResponse<Transaction[]>> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('transactions')
      .select('*, cashier:profiles(full_name, avatar_initials), items:transaction_items(*)')
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`)
      .order('created_at', { ascending: false });
    return { data: data as Transaction[] | null, error: error?.message ?? null };
  },

  async getByDateRange(from: string, to: string): Promise<ServiceResponse<Transaction[]>> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, cashier:profiles(full_name, avatar_initials), items:transaction_items(*)')
      .gte('created_at', `${from}T00:00:00`)
      .lte('created_at', `${to}T23:59:59`)
      .order('created_at', { ascending: false });
    return { data: data as Transaction[] | null, error: error?.message ?? null };
  },

  async getByCashier(cashierId: string, limit = 20): Promise<ServiceResponse<Transaction[]>> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, items:transaction_items(*)')
      .eq('cashier_id', cashierId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return { data: data as Transaction[] | null, error: error?.message ?? null };
  },

  async getById(id: string): Promise<ServiceResponse<Transaction>> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, cashier:profiles(full_name, avatar_initials), items:transaction_items(*, product:products(name, emoji))')
      .eq('id', id)
      .single();
    return { data: data as Transaction | null, error: error?.message ?? null };
  },

  async getTodayStats(cashierId?: string): Promise<{ count: number; revenue: number }> {
    const today = new Date().toISOString().split('T')[0];
    let query = supabase
      .from('transactions')
      .select('total')
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`);
    if (cashierId) query = query.eq('cashier_id', cashierId);
    const { data } = await query;
    const count = data?.length ?? 0;
    const revenue = data?.reduce((s, t) => s + (t.total ?? 0), 0) ?? 0;
    return { count, revenue };
  },
};
