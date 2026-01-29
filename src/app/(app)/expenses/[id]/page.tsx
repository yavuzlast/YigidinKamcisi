import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency, getMonthName } from '@/lib/balances';
import DeleteExpenseButton from './DeleteExpenseButton';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ExpenseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Harcamayı al
  const { data: expense } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', id)
    .single();

  if (!expense) notFound();

  // Grup üyelerini al
  const { data: members } = await supabase
    .from('group_members')
    .select('*');

  // Payer ve creator bilgilerini members'dan bul
  const payer = members?.find(m => m.user_id === expense.payer_user_id);
  const creator = members?.find(m => m.user_id === expense.created_by);

  // Katılımcıları al
  const { data: rawParticipants } = await supabase
    .from('expense_participants')
    .select('user_id')
    .eq('expense_id', id);

  // Katılımcı bilgilerini members'dan bul
  const participants = rawParticipants?.map((p) => {
    const member = members?.find(m => m.user_id === p.user_id);
    return {
      user_id: p.user_id,
      member: member ? { display_name: member.display_name, email: member.email } : null,
    };
  });

  // Occurrence'ları al
  const { data: occurrences } = await supabase
    .from('expense_occurrences')
    .select('*')
    .eq('expense_id', id)
    .order('month');

  const isOwner = expense.created_by === user.id;
  const participantCount = participants?.length || 1;
  const sharePerPerson = expense.total_amount / participantCount;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
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
        {/* Ana bilgiler */}
        <div className="card">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-[var(--color-text-muted)] mb-1">Toplam Tutar</div>
              <div className="text-3xl font-bold text-orange-400">
                {formatCurrency(expense.total_amount)}
              </div>
            </div>
            <div>
              <div className="text-sm text-[var(--color-text-muted)] mb-1">Kişi Başı</div>
              <div className="text-3xl font-bold">
                {formatCurrency(sharePerPerson)}
              </div>
            </div>
          </div>

          {expense.is_installment && (
            <div className="mt-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <div className="flex items-center gap-2 text-orange-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-medium">
                  {expense.installment_months} Taksit
                </span>
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

        {/* Kim Ödedi */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Ödeyen
          </h2>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-sm font-medium text-green-400">
              {payer?.display_name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div className="font-medium">{payer?.display_name}</div>
              <div className="text-xs text-[var(--color-text-muted)]">{payer?.email}</div>
            </div>
          </div>
        </div>

        {/* Katılımcılar */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Katılımcılar ({participantCount} kişi)
          </h2>
          <div className="space-y-2">
            {participants?.map((p) => (
              <div
                key={p.user_id}
                className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-bg-hover)] flex items-center justify-center text-sm font-medium">
                    {p.member?.display_name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">{p.member?.display_name}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">{p.member?.email}</div>
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

        {/* Taksit Takvimi */}
        {expense.is_installment && occurrences && occurrences.length > 0 && (
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
                      isPast
                        ? 'bg-green-500/5 border-green-500/20'
                        : 'bg-[var(--color-bg)] border-[var(--color-border)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          isPast
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-[var(--color-bg-hover)]'
                        }`}
                      >
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

        {/* Meta bilgiler */}
        <div className="text-sm text-[var(--color-text-muted)] text-center">
          {creator?.display_name} tarafından eklendi ·{' '}
          {new Date(expense.created_at).toLocaleDateString('tr-TR')}
        </div>
      </div>
    </div>
  );
}

