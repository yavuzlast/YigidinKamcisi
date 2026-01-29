'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { calculateBalances, calculateSettlements, getMonthName, formatCurrency } from '@/lib/balances';
import Link from 'next/link';
import MonthSelector from './MonthSelector';
import ExpenseItem from './ExpenseItem';
import { GroupMember, MemberBalance, Settlement } from '@/types/database';

interface ExpenseWithPayer {
  id: string;
  title: string;
  total_amount: number;
  expense_date: string;
  is_installment: boolean;
  installment_months: number;
  payer_user_id: string;
  payer?: { display_name: string } | null;
}

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [expenses, setExpenses] = useState<ExpenseWithPayer[]>([]);
  const [balances, setBalances] = useState<MemberBalance[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [occurrenceCount, setOccurrenceCount] = useState(0);

  const defaultMonth = '2026-02';
  const currentMonth = searchParams.get('month') || defaultMonth;
  const monthStart = `${currentMonth}-01`;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const supabase = createClient();

      // Grup üyelerini al
      const { data: membersData } = await supabase
        .from('group_members')
        .select('*')
        .order('display_name');

      setMembers(membersData || []);

      // Ay sonunu hesapla
      const [year, month] = currentMonth.split('-').map(Number);
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

      // Bu aydaki occurrence'ları al
      const { data: occurrences } = await supabase
        .from('expense_occurrences')
        .select(`
          *,
          expense:expenses(
            id,
            title,
            payer_user_id,
            expense_participants(user_id)
          )
        `)
        .gte('month', monthStart)
        .lt('month', monthEnd);

      // Harcamaları al
      const { data: rawExpenses } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      // Payer bilgisini ekle
      const expensesWithPayer = rawExpenses?.map(exp => {
        const payer = membersData?.find(m => m.user_id === exp.payer_user_id);
        return {
          ...exp,
          payer: payer ? { display_name: payer.display_name } : null
        };
      }) || [];

      setExpenses(expensesWithPayer);

      // Occurrence'ları hesaplama için hazırla
      const occurrencesWithDetails = (occurrences || []).map((occ) => ({
        ...occ,
        payer_user_id: occ.expense?.payer_user_id || '',
        participant_user_ids: occ.expense?.expense_participants?.map((p: { user_id: string }) => p.user_id) || [],
      }));

      // Bakiyeleri hesapla
      const calculatedBalances = calculateBalances(membersData || [], occurrencesWithDetails);
      const calculatedSettlements = calculateSettlements(calculatedBalances);

      setBalances(calculatedBalances);
      setSettlements(calculatedSettlements);
      setTotalExpenses(occurrencesWithDetails.reduce((sum, occ) => sum + Number(occ.amount), 0));
      setOccurrenceCount(occurrencesWithDetails.length);
      setLoading(false);
    };

    loadData();
  }, [currentMonth, monthStart]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Aylık Özet</h1>
          <p className="text-[var(--color-text-muted)] mt-1">{getMonthName(currentMonth)}</p>
        </div>
        <MonthSelector currentMonth={currentMonth} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card animate-fade-in stagger-1">
          <div className="text-[var(--color-text-muted)] text-sm mb-1">Toplam Harcama</div>
          <div className="text-2xl font-bold text-orange-400">{formatCurrency(totalExpenses)}</div>
        </div>
        <div className="card animate-fade-in stagger-2">
          <div className="text-[var(--color-text-muted)] text-sm mb-1">Harcama Sayısı</div>
          <div className="text-2xl font-bold">{occurrenceCount}</div>
        </div>
        <div className="card animate-fade-in stagger-3">
          <div className="text-[var(--color-text-muted)] text-sm mb-1">Transfer Sayısı</div>
          <div className="text-2xl font-bold">{settlements.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card animate-fade-in stagger-4">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Kişi Bakiyeleri
          </h2>
          
          {balances.length === 0 ? (
            <p className="text-[var(--color-text-muted)] text-center py-8">Henüz grup üyesi yok</p>
          ) : (
            <div className="space-y-3">
              {balances.map((balance) => (
                <div
                  key={balance.user_id}
                  className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-bg-hover)] flex items-center justify-center text-sm font-medium">
                      {balance.display_name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium">{balance.display_name}</div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        Ödedi: {formatCurrency(balance.total_paid)} · Borç: {formatCurrency(balance.total_owed)}
                      </div>
                    </div>
                  </div>
                  <div className={`font-semibold ${balance.net_balance > 0 ? 'text-green-400' : balance.net_balance < 0 ? 'text-red-400' : 'text-[var(--color-text-muted)]'}`}>
                    {balance.net_balance > 0 && '+'}{formatCurrency(balance.net_balance)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card animate-fade-in stagger-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Kim Kime Ödesin?
          </h2>

          {settlements.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-[var(--color-text-muted)]">Herkes eşit! Transfer gerekmiyor.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {settlements.map((settlement, idx) => (
                <div key={idx} className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-red-500/5 to-green-500/5 border border-[var(--color-border)]">
                  <div className="flex-1 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-xs font-medium text-red-400">
                      {settlement.from_name[0]?.toUpperCase()}
                    </div>
                    <span className="font-medium">{settlement.from_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                    <span className="font-bold text-orange-400">{formatCurrency(settlement.amount)}</span>
                    <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                  <div className="flex-1 flex items-center justify-end gap-2">
                    <span className="font-medium">{settlement.to_name}</span>
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-xs font-medium text-green-400">
                      {settlement.to_name[0]?.toUpperCase()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Son Harcamalar
          </h2>
        </div>

        {!expenses || expenses.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--color-bg-hover)] mb-4">
              <svg className="w-8 h-8 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p className="text-[var(--color-text-muted)] mb-4">Henüz harcama eklenmemiş</p>
            <Link href="/expenses/new" className="btn btn-primary">İlk Harcamayı Ekle</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {expenses.slice(0, 10).map((expense) => (
              <ExpenseItem key={expense.id} expense={expense} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
