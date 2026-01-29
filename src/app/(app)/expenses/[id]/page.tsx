'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, getMonthName } from '@/lib/balances';
import DeleteExpenseButton from './DeleteExpenseButton';

interface ExpenseData {
  id: string;
  title: string;
  notes: string | null;
  total_amount: number;
  expense_date: string;
  is_installment: boolean;
  installment_months: number;
  payer_user_id: string;
  created_by: string;
  created_at: string;
}

interface Member {
  user_id: string;
  display_name: string;
  email: string;
}

interface Occurrence {
  id: string;
  month: string;
  amount: number;
}

export default function ExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [expense, setExpense] = useState<ExpenseData | null>(null);
  const [payer, setPayer] = useState<Member | null>(null);
  const [creator, setCreator] = useState<Member | null>(null);
  const [participants, setParticipants] = useState<Member[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [isOwner, setIsOwner] = useState(false);

  const id = params.id as string;

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Harcamayı al
      const { data: expenseData } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', id)
        .single();

      if (!expenseData) {
        router.push('/dashboard');
        return;
      }

      setExpense(expenseData);
      setIsOwner(expenseData.created_by === user.id);

      // Grup üyelerini al
      const { data: members } = await supabase
        .from('group_members')
        .select('*');

      const payerMember = members?.find(m => m.user_id === expenseData.payer_user_id);
      const creatorMember = members?.find(m => m.user_id === expenseData.created_by);
      
      setPayer(payerMember || null);
      setCreator(creatorMember || null);

      // Katılımcıları al
      const { data: participantData } = await supabase
        .from('expense_participants')
        .select('user_id')
        .eq('expense_id', id);

      const participantMembers = participantData?.map(p => 
        members?.find(m => m.user_id === p.user_id)
      ).filter(Boolean) as Member[];

      setParticipants(participantMembers || []);

      // Occurrence'ları al
      const { data: occData } = await supabase
        .from('expense_occurrences')
        .select('*')
        .eq('expense_id', id)
        .order('month');

      setOccurrences(occData || []);
      setLoading(false);
    };

    loadData();
  }, [id, router]);

  if (loading || !expense) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const participantCount = participants.length || 1;
  const sharePerPerson = expense.total_amount / participantCount;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-white transition-colors mb-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Geri
          </Link>
          <h1 className="text-2xl font-bold">{expense.title}</h1>
          <p className="text-[var(--color-text-muted)] mt-1">
            {new Date(expense.expense_date).toLocaleDateString('tr-TR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        {isOwner && <DeleteExpenseButton expenseId={expense.id} />}
      </div>

      <div className="space-y-6">
        <div className="card">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-[var(--color-text-muted)] mb-1">Toplam Tutar</div>
              <div className="text-3xl font-bold text-orange-400">{formatCurrency(expense.total_amount)}</div>
            </div>
            <div>
              <div className="text-sm text-[var(--color-text-muted)] mb-1">Kişi Başı</div>
              <div className="text-3xl font-bold">{formatCurrency(sharePerPerson)}</div>
            </div>
          </div>

          {expense.is_installment && (
            <div className="mt-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <div className="flex items-center gap-2 text-orange-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-medium">{expense.installment_months} Taksit</span>
              </div>
              <div className="text-sm text-[var(--color-text-muted)] mt-1">
                Aylık: {formatCurrency(expense.total_amount / expense.installment_months)} / kişi
              </div>
            </div>
          )}

          {expense.notes && (
            <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
              <div className="text-sm text-[var(--color-text-muted)] mb-1">Notlar</div>
              <p>{expense.notes}</p>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Ödeyen
          </h2>
          {payer && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-sm font-medium text-green-400">
                {payer.display_name?.[0]?.toUpperCase()}
              </div>
              <div>
                <div className="font-medium">{payer.display_name}</div>
                <div className="text-xs text-[var(--color-text-muted)]">{payer.email}</div>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Katılımcılar ({participantCount} kişi)
          </h2>
          <div className="space-y-2">
            {participants.map((p) => (
              <div
                key={p.user_id}
                className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-bg-hover)] flex items-center justify-center text-sm font-medium">
                    {p.display_name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">{p.display_name}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">{p.email}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(sharePerPerson)}</div>
                  {expense.is_installment && (
                    <div className="text-xs text-[var(--color-text-muted)]">
                      {formatCurrency(sharePerPerson / expense.installment_months)}/ay
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {expense.is_installment && occurrences.length > 0 && (
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Taksit Takvimi
            </h2>
            <div className="space-y-2">
              {occurrences.map((occ, idx) => {
                const monthStr = occ.month.substring(0, 7);
                const isPast = new Date(occ.month) < new Date();
                
                return (
                  <div
                    key={occ.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isPast ? 'bg-green-500/5 border-green-500/20' : 'bg-[var(--color-bg)] border-[var(--color-border)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        isPast ? 'bg-green-500/20 text-green-400' : 'bg-[var(--color-bg-hover)]'
                      }`}>
                        {isPast ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <span className="font-medium">{getMonthName(monthStr)}</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(occ.amount)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="text-sm text-[var(--color-text-muted)] text-center">
          {creator?.display_name} tarafından eklendi · {new Date(expense.created_at).toLocaleDateString('tr-TR')}
        </div>
      </div>
    </div>
  );
}
