import { useState, useEffect, useCallback } from 'react';
import { reportService } from '../services/reportService';
import type { DashboardStats, MonthlyChartData } from '../types/database';

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<MonthlyChartData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [statsRes, chartRes] = await Promise.all([
      reportService.getDashboardStats(),
      reportService.getMonthlyChartData(7),
    ]);
    setStats(statsRes);
    setChartData(chartRes);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { stats, chartData, loading, refetch: fetchAll };
}

export function useTopProducts() {
  const [products, setProducts] = useState<{ name: string; quantity: number; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportService.getTopProducts(8).then(data => {
      setProducts(data);
      setLoading(false);
    });
  }, []);

  return { products, loading };
}
