import { useState, useEffect, useCallback } from 'react';
import { payrollService } from '../services/payrollService';
import type { PayrollRecord } from '../types/database';

export function usePayroll() {
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayroll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await payrollService.getAll();
    if (error) setError(error);
    else setRecords(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPayroll(); }, [fetchPayroll]);

  const markPaid = async (id: string) => {
    const { error } = await payrollService.markPaid(id);
    if (!error) await fetchPayroll();
    return error;
  };

  const markAllPaid = async (ids: string[]) => {
    const { error } = await payrollService.markAllPaid(ids);
    if (!error) await fetchPayroll();
    return error;
  };

  const generateMonthly = async (processedBy: string) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const periodEnd = new Date(year, month, 0).toISOString().split('T')[0];
    const { error } = await payrollService.generateMonthlyPayroll(periodStart, periodEnd, processedBy);
    if (!error) await fetchPayroll();
    return error;
  };

  const pendingCount = records.filter(r => r.status === 'Belum Dibayar').length;
  const totalPending = records.filter(r => r.status === 'Belum Dibayar').reduce((s, r) => s + r.net_salary, 0);

  return { records, loading, error, markPaid, markAllPaid, generateMonthly, pendingCount, totalPending, refetch: fetchPayroll };
}

export function useMyPaycheck(employeeId: string) {
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) return;
    payrollService.getByEmployee(employeeId).then(({ data }) => {
      setRecords(data ?? []);
      setLoading(false);
    });
  }, [employeeId]);

  return { records, loading };
}
