import { supabase } from '../lib/supabase';
import type { PayrollRecord, Profile, ServiceResponse } from '../types/database';

export const payrollService = {
  async getAll(): Promise<ServiceResponse<PayrollRecord[]>> {
    const { data, error } = await supabase
      .from('payroll')
      .select('*, employee:profiles(full_name, avatar_initials, role, hourly_rate)')
      .order('period_start', { ascending: false });
    return { data: data as PayrollRecord[] | null, error: error?.message ?? null };
  },

  async getByEmployee(employeeId: string): Promise<ServiceResponse<PayrollRecord[]>> {
    const { data, error } = await supabase
      .from('payroll')
      .select('*')
      .eq('employee_id', employeeId)
      .order('period_start', { ascending: false });
    return { data: data as PayrollRecord[] | null, error: error?.message ?? null };
  },

  async generateMonthlyPayroll(periodStart: string, periodEnd: string, processedBy: string): Promise<ServiceResponse<PayrollRecord[]>> {
    // Get all active employees
    const { data: employees } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_active', true)
      .neq('role', 'owner');

    if (!employees?.length) return { data: [], error: null };

    const records: PayrollRecord[] = [];

    for (const emp of employees as Profile[]) {
      // Get attendance hours for the period
      const { data: attendance } = await supabase
        .from('attendance')
        .select('work_hours')
        .eq('employee_id', emp.id)
        .gte('date', periodStart)
        .lte('date', periodEnd);

      const hoursWorked = attendance?.reduce((s, a) => s + (a.work_hours ?? 0), 0) ?? 0;
      const grossSalary = Math.round(hoursWorked * emp.hourly_rate);
      const deductions  = 0;
      const netSalary   = grossSalary - deductions;

      const { data, error } = await supabase
        .from('payroll')
        .upsert(
          {
            employee_id:  emp.id,
            period_start: periodStart,
            period_end:   periodEnd,
            hours_worked: hoursWorked,
            hourly_rate:  emp.hourly_rate,
            gross_salary: grossSalary,
            deductions,
            net_salary:   netSalary,
            status:       'Belum Dibayar',
            processed_by: processedBy,
          },
          { onConflict: 'employee_id,period_start,period_end' }
        )
        .select('*, employee:profiles(full_name, avatar_initials, role)')
        .single();

      if (!error && data) records.push(data as PayrollRecord);
    }

    return { data: records, error: null };
  },

  async markPaid(id: string): Promise<ServiceResponse<PayrollRecord>> {
    const { data, error } = await supabase
      .from('payroll')
      .update({ status: 'Sudah Dibayar' })
      .eq('id', id)
      .select()
      .single();
    return { data: data as PayrollRecord | null, error: error?.message ?? null };
  },

  async markAllPaid(ids: string[]): Promise<ServiceResponse<null>> {
    const { error } = await supabase
      .from('payroll')
      .update({ status: 'Sudah Dibayar' })
      .in('id', ids);
    return { data: null, error: error?.message ?? null };
  },

  async getPendingCount(): Promise<number> {
    const { count } = await supabase
      .from('payroll')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Belum Dibayar');
    return count ?? 0;
  },

  async getSummaryForPeriod(periodStart: string, periodEnd: string): Promise<{ total: number; paid: number; pending: number }> {
    const { data } = await supabase
      .from('payroll')
      .select('net_salary, status')
      .gte('period_start', periodStart)
      .lte('period_end', periodEnd);
    const total = data?.reduce((s, r) => s + (r.net_salary ?? 0), 0) ?? 0;
    const paid = data?.filter(r => r.status === 'Sudah Dibayar').reduce((s, r) => s + (r.net_salary ?? 0), 0) ?? 0;
    return { total, paid, pending: total - paid };
  },
};
