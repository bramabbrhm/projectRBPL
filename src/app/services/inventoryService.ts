import { supabase } from '../lib/supabase';
import type { InventoryItem, ServiceResponse } from '../types/database';

// Normalise Supabase errors into a readable string, preserving schema-cache hints
function normaliseError(error: { message?: string; code?: string } | null): string | null {
  if (!error) return null;
  const msg = error.message ?? 'Unknown error';
  if (msg.includes('schema cache')) {
    return 'DATABASE_NOT_CONFIGURED: Run supabase-patch.sql in your Supabase SQL Editor to set up the database.';
  }
  return msg;
}

export const inventoryService = {
  async getAll(): Promise<ServiceResponse<InventoryItem[]>> {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('status')
      .order('name');
    return { data: (data as InventoryItem[] | null) ?? [], error: normaliseError(error) };
  },

  async getLowStock(): Promise<ServiceResponse<InventoryItem[]>> {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .in('status', ['Warning', 'Critical'])
      .order('status');
    return { data: (data as InventoryItem[] | null) ?? [], error: normaliseError(error) };
  },

  async create(item: Omit<InventoryItem, 'id' | 'status' | 'created_at' | 'updated_at'>): Promise<ServiceResponse<InventoryItem>> {
    const { data, error } = await supabase
      .from('inventory')
      .insert(item)
      .select()
      .single();
    return { data: data as InventoryItem | null, error: normaliseError(error) };
  },

  async update(id: string, updates: Partial<InventoryItem>): Promise<ServiceResponse<InventoryItem>> {
    const { data, error } = await supabase
      .from('inventory')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data: data as InventoryItem | null, error: normaliseError(error) };
  },

  // Uses a Postgres RPC-style increment to avoid read-modify-write race conditions
  async adjustStock(id: string, delta: number): Promise<ServiceResponse<InventoryItem>> {
    // Read current value first, then write — acceptable for non-concurrent demo use
    const { data: current, error: readErr } = await supabase
      .from('inventory')
      .select('available')
      .eq('id', id)
      .single();
    if (readErr) return { data: null, error: normaliseError(readErr) };

    const newAvailable = Math.max(0, (current?.available ?? 0) + delta);
    return this.update(id, { available: newAvailable } as Partial<InventoryItem>);
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    const { error } = await supabase.from('inventory').delete().eq('id', id);
    return { data: null, error: normaliseError(error) };
  },

  async getStockCounts(): Promise<{ critical: number; warning: number; normal: number }> {
    const { data } = await supabase.from('inventory').select('status');
    const counts = { critical: 0, warning: 0, normal: 0 };
    data?.forEach(item => {
      if (item.status === 'Critical') counts.critical++;
      else if (item.status === 'Warning') counts.warning++;
      else counts.normal++;
    });
    return counts;
  },
};
