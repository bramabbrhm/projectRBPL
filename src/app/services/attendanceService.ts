import { supabase } from '../lib/supabase';
import type { AttendanceRecord, ServiceResponse } from '../types/database';

const SHIFT_START_H = 8;
const SHIFT_START_M = 0;

function parseHHMM(timeStr: string): { h: number; m: number } {
  const [h, m] = timeStr.split(':').map(Number);
  return { h: h ?? 0, m: m ?? 0 };
}

function totalMinutes(h: number, m: number) {
  return h * 60 + m;
}

export const attendanceService = {
  async getTodayRecord(employeeId: string): Promise<ServiceResponse<AttendanceRecord | null>> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', today)
      .maybeSingle();
    return { data: data as AttendanceRecord | null, error: error?.message ?? null };
  },

  async checkIn(employeeId: string): Promise<ServiceResponse<AttendanceRecord>> {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const timeIn = now.toTimeString().slice(0, 8); // HH:MM:SS

    const { h, m } = parseHHMM(timeIn);
    const shiftMinutes = totalMinutes(SHIFT_START_H, SHIFT_START_M);
    const inMinutes = totalMinutes(h, m);
    const lateMinutes = Math.max(0, inMinutes - shiftMinutes);
    const status = lateMinutes > 0 ? 'Terlambat' : 'Hadir';

    const { data, error } = await supabase
      .from('attendance')
      .upsert(
        {
          employee_id:  employeeId,
          date:         today,
          time_in:      timeIn,
          status,
          late_minutes: lateMinutes,
        },
        { onConflict: 'employee_id,date' }
      )
      .select()
      .single();
    return { data: data as AttendanceRecord | null, error: error?.message ?? null };
  },

  async checkOut(employeeId: string): Promise<ServiceResponse<AttendanceRecord>> {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const timeOut = now.toTimeString().slice(0, 8); // HH:MM:SS

    // Fetch time_in so we can compute work_hours
    const { data: existing } = await supabase
      .from('attendance')
      .select('time_in')
      .eq('employee_id', employeeId)
      .eq('date', today)
      .maybeSingle();

    let workHours = 0;
    if (existing?.time_in) {
      const inParsed  = parseHHMM(existing.time_in as string);
      const outParsed = parseHHMM(timeOut);
      workHours = Math.max(
        0,
        Math.round(
          ((totalMinutes(outParsed.h, outParsed.m) - totalMinutes(inParsed.h, inParsed.m)) / 60) * 100
        ) / 100
      );
    }

    const { data, error } = await supabase
      .from('attendance')
      .update({ time_out: timeOut, work_hours: workHours })
      .eq('employee_id', employeeId)
      .eq('date', today)
      .select()
      .single();
    return { data: data as AttendanceRecord | null, error: error?.message ?? null };
  },

  async getHistory(employeeId: string, limit = 30): Promise<ServiceResponse<AttendanceRecord[]>> {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .order('date', { ascending: false })
      .limit(limit);
    return { data: (data as AttendanceRecord[] | null) ?? [], error: error?.message ?? null };
  },

  async getAllForPeriod(from: string, to: string): Promise<ServiceResponse<AttendanceRecord[]>> {
    const { data, error } = await supabase
      .from('attendance')
      .select('*, employee:profiles(full_name, avatar_initials, role)')
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: false });
    return { data: (data as AttendanceRecord[] | null) ?? [], error: error?.message ?? null };
  },

  async getMonthSummary(employeeId: string, year: number, month: number): Promise<{ hadir: number; terlambat: number; absen: number; totalHours: number }> {
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const to = new Date(year, month, 0).toISOString().split('T')[0];
    const { data } = await supabase
      .from('attendance')
      .select('status, work_hours')
      .eq('employee_id', employeeId)
      .gte('date', from)
      .lte('date', to);
    const hadir     = data?.filter(r => r.status === 'Hadir').length ?? 0;
    const terlambat = data?.filter(r => r.status === 'Terlambat').length ?? 0;
    const absen     = data?.filter(r => r.status === 'Absen').length ?? 0;
    const totalHours = data?.reduce((s, r) => s + (r.work_hours ?? 0), 0) ?? 0;
    return { hadir, terlambat, absen, totalHours };
  },
};
