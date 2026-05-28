import { supabase } from '../lib/supabase';
import type { Product, ServiceResponse, ProductCategory } from '../types/database';

export const productService = {
  async getAll(): Promise<ServiceResponse<Product[]>> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('category')
      .order('name');
    return { data: data as Product[] | null, error: error?.message ?? null };
  },

  async getAvailable(category?: ProductCategory): Promise<ServiceResponse<Product[]>> {
    let query = supabase.from('products').select('*').eq('is_available', true);
    if (category) query = query.eq('category', category);
    const { data, error } = await query.order('name');
    return { data: data as Product[] | null, error: error?.message ?? null };
  },

  async create(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<ServiceResponse<Product>> {
    const { data, error } = await supabase.from('products').insert(product).select().single();
    return { data: data as Product | null, error: error?.message ?? null };
  },

  async update(id: string, updates: Partial<Product>): Promise<ServiceResponse<Product>> {
    const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single();
    return { data: data as Product | null, error: error?.message ?? null };
  },

  async delete(id: string): Promise<ServiceResponse<null>> {
    const { error } = await supabase.from('products').delete().eq('id', id);
    return { data: null, error: error?.message ?? null };
  },
};
