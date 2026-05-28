import { useState, useEffect, useCallback } from 'react';
import { attendanceService } from '../services/attendanceService';
import type { AttendanceRecord } from '../types/database';

export function useAttendance(employeeId: string) {
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    const [todayRes, historyRes] = await Promise.all([
      attendanceService.getTodayRecord(employeeId),
      attendanceService.getHistory(employeeId, 30),
    ]);
    setTodayRecord(todayRes.data);
    setHistory(historyRes.data ?? []);
    setLoading(false);
  }, [employeeId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const checkIn = async (): Promise<{ data: AttendanceRecord | null; error: string | null }> => {
    setActionLoading(true);
    const { data, error } = await attendanceService.checkIn(employeeId);
    if (error) setError(error);
    else setTodayRecord(data);
    setActionLoading(false);
    return { data, error };
  };

  const checkOut = async (): Promise<{ data: AttendanceRecord | null; error: string | null }> => {
    setActionLoading(true);
    const { data, error } = await attendanceService.checkOut(employeeId);
    if (error) setError(error);
    else setTodayRecord(data);
    setActionLoading(false);
    return { data, error };
  };

  const isCheckedIn = !!(todayRecord?.time_in && !todayRecord?.time_out);
  const isCheckedOut = !!(todayRecord?.time_in && todayRecord?.time_out);

  return { todayRecord, history, loading, actionLoading, error, checkIn, checkOut, isCheckedIn, isCheckedOut, refetch: fetchData };
}

export function useMonthSummary(employeeId: string) {
  const [summary, setSummary] = useState({ hadir: 0, terlambat: 0, absen: 0, totalHours: 0 });

  useEffect(() => {
    if (!employeeId) return;
    const now = new Date();
    attendanceService.getMonthSummary(employeeId, now.getFullYear(), now.getMonth() + 1)
      .then(setSummary);
  }, [employeeId]);

  return summary;
}
