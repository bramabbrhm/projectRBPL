import { supabase } from '../lib/supabase';
import type { Purchase, Supplier, ServiceResponse } from '../types/database';

function normaliseError(error: { message?: string } | null): string | null {
  if (!error) return null;
  const msg = error.message ?? 'Unknown error';
  if (msg.includes('schema cache')) {
    return 'DATABASE_NOT_CONFIGURED: Run supabase-patch.sql in your Supabase SQL Editor.';
  }
  return msg;
}

export interface CreatePurchaseInput {
  supplier_id: string;
  ordered_by: string;
  notes?: string;
  items: { inventory_id: string; quantity: number; unit_price: number }[];
}

export interface CreateSupplierInput {
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export const purchaseService = {
  async getAll(): Promise<ServiceResponse<Purchase[]>> {
    const { data, error } = await supabase
      .from('purchases')
      .select('*, supplier:suppliers(name), ordered_by_profile:profiles!ordered_by(full_name), items:purchase_items(*, inventory:inventory(name, unit))')
      .order('created_at', { ascending: false });
    return { data: (data as Purchase[] | null) ?? [], error: normaliseError(error) };
  },

  async create(input: CreatePurchaseInput): Promise<ServiceResponse<Purchase>> {
    const totalAmount = input.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);

    const { data: purchase, error: pErr } = await supabase
      .from('purchases')
      .insert({
        supplier_id: input.supplier_id,
        ordered_by: input.ordered_by,
        total_amount: totalAmount,
        notes: input.notes ?? null,
        status: 'Menunggu',
      })
      .select()
      .single();
    if (pErr) return { data: null, error: pErr.message };

    const purchaseItems = input.items.map(item => ({
      purchase_id: purchase.id,
      inventory_id: item.inventory_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
    }));

    const { error: iErr } = await supabase.from('purchase_items').insert(purchaseItems);
    if (iErr) return { data: null, error: iErr.message };

    return { data: purchase as Purchase, error: null };
  },

  async updateStatus(id: string, status: 'Menunggu' | 'Diterima' | 'Dibatalkan'): Promise<ServiceResponse<Purchase>> {
    const { data, error } = await supabase
      .from('purchases')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (error) return { data: null, error: error.message };

    // When PO is accepted, increase inventory stock for each item
    if (status === 'Diterima') {
      const { data: poItems } = await supabase
        .from('purchase_items')
        .select('inventory_id, quantity')
        .eq('purchase_id', id);

      if (poItems && poItems.length > 0) {
        await Promise.all(
          poItems.map(async item => {
            const { data: inv } = await supabase
              .from('inventory')
              .select('available')
              .eq('id', item.inventory_id)
              .single();
            if (inv) {
              await supabase
                .from('inventory')
                .update({ available: inv.available + item.quantity })
                .eq('id', item.inventory_id);
            }
          })
        );
      }
    }

    return { data: data as Purchase, error: null };
  },

  // ── Supplier queries ──

  async getSuppliers(): Promise<ServiceResponse<Supplier[]>> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('is_active', true)
      .order('name');
    return { data: (data as Supplier[] | null) ?? [], error: normaliseError(error) };
  },

  async createSupplier(input: CreateSupplierInput): Promise<ServiceResponse<Supplier>> {
    const { data, error } = await supabase
      .from('suppliers')
      .insert({ ...input, is_active: true })
      .select()
      .single();
    return { data: data as Supplier | null, error: error?.message ?? null };
  },

  async updateSupplier(id: string, updates: Partial<Omit<Supplier, 'id' | 'created_at'>>): Promise<ServiceResponse<Supplier>> {
    const { data, error } = await supabase
      .from('suppliers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data: data as Supplier | null, error: error?.message ?? null };
  },

  async deleteSupplier(id: string): Promise<ServiceResponse<null>> {
    // Soft-delete to preserve historical PO references
    const { error } = await supabase
      .from('suppliers')
      .update({ is_active: false })
      .eq('id', id);
    return { data: null, error: error?.message ?? null };
  },

  async getTotalExpenseForMonth(year: number, month: number): Promise<number> {
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const to = new Date(year, month, 0).toISOString().split('T')[0];
    const { data } = await supabase
      .from('purchases')
      .select('total_amount')
      .eq('status', 'Diterima')
      .gte('created_at', `${from}T00:00:00`)
      .lte('created_at', `${to}T23:59:59`);
    return data?.reduce((s, p) => s + (p.total_amount ?? 0), 0) ?? 0;
  },
};
