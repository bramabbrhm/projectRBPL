import { useState, useEffect, useCallback } from 'react';
import { inventoryService } from '../services/inventoryService';
import type { InventoryItem } from '../types/database';

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await inventoryService.getAll();
    setError(error);
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const createItem = async (item: Omit<InventoryItem, 'id' | 'status' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await inventoryService.create(item);
    if (!error && data) setItems(prev => [...prev, data]);
    return { data, error };
  };

  const updateItem = async (id: string, updates: Partial<InventoryItem>) => {
    const { data, error } = await inventoryService.update(id, updates);
    if (!error && data) setItems(prev => prev.map(i => i.id === id ? data : i));
    return error;
  };

  const deleteItem = async (id: string) => {
    // Optimistic remove
    setItems(prev => prev.filter(i => i.id !== id));
    const { error } = await inventoryService.delete(id);
    if (error) await fetchItems(); // rollback on failure
    return error;
  };

  return { items, loading, error, refetch: fetchItems, createItem, updateItem, deleteItem };
}

export function useLowStockItems() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    inventoryService.getLowStock().then(({ data }) => {
      setItems(data ?? []);
      setLoading(false);
    });
  }, []);

  return { items, loading };
}
