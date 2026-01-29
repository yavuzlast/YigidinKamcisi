'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { GroupMember } from '@/types/database';
import { dateToMonthString, getMonthName } from '@/lib/balances';

export default function NewExpensePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Form state
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [payerId, setPayerId] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentMonths, setInstallmentMonths] = useState(3);
  const [installmentStartMonth, setInstallmentStartMonth] = useState(dateToMonthString(new Date()));

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        setPayerId(user.id);
      }

      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select('*')
        .order('display_name');

      if (membersError) {
        alert('Üyeler yüklenirken hata: ' + membersError.message);
        return;
      }

      if (membersData && membersData.length > 0) {
        setMembers(membersData);
        setSelectedParticipants(membersData.map((m) => m.user_id));
      } else if (user) {
        const { data: groups } = await supabase.from('groups').select('*');
        
        if (!groups || groups.length === 0) {
          alert('Henüz grup oluşturulmamış.');
        } else {
          await supabase.from('group_members').insert({
            group_id: groups[0].id,
            user_id: user.id,
            email: user.email,
            display_name: user.email?.split('@')[0] || 'Kullanıcı',
          });
          window.location.reload();
        }
      }
    };

    loadData();
  }, []);

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !amount || !payerId || selectedParticipants.length === 0) {
      alert('Lütfen tüm alanları doldurun');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const { data: group } = await supabase
        .from('groups')
        .select('id')
        .limit(1)
        .single();

      if (!group) throw new Error('Grup bulunamadı');

      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          group_id: group.id,
          created_by: currentUserId,
          payer_user_id: payerId,
          title,
          notes: notes || null,
          total_amount: parseFloat(amount),
          expense_date: expenseDate,
          is_installment: isInstallment,
          installment_months: isInstallment ? installmentMonths : 1,
          installment_start_month: isInstallment ? `${installmentStartMonth}-01` : null,
        })
        .select()
        .single();

      if (expenseError) throw expenseError;

      const participantInserts = selectedParticipants.map((userId) => ({
        expense_id: expense.id,
        user_id: userId,
      }));

      const { error: participantsError } = await supabase
        .from('expense_participants')
        .insert(participantInserts);

      if (participantsError) throw participantsError;

      const totalAmount = parseFloat(amount);
      const months = isInstallment ? installmentMonths : 1;
      const amountPerMonth = totalAmount / months;

      const occurrences = [];
      const startDate = isInstallment
        ? new Date(`${installmentStartMonth}-01`)
        : new Date(expenseDate);

      for (let i = 0; i < months; i++) {
        const year = startDate.getFullYear();
        const month = startDate.getMonth() + i;
        const actualYear = year + Math.floor(month / 12);
        const actualMonth = month % 12;
        const monthStr = `${actualYear}-${String(actualMonth + 1).padStart(2, '0')}-01`;
        occurrences.push({
          expense_id: expense.id,
          month: monthStr,
          amount: Math.round(amountPerMonth * 100) / 100,
        });
      }

      const { error: occurrencesError } = await supabase
        .from('expense_occurrences')
        .insert(occurrences);

      if (occurrencesError) throw occurrencesError;

      router.push('/dashboard');
      router.refresh();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert('Harcama eklenirken hata: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const futureMonths: string[] = [];
  const now = new Date();
  for (let i = 0; i <= 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    futureMonths.push(dateToMonthString(date));
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Yeni Harcama</h1>
        <p className="text-[var(--color-text-muted)] mt-1">
          Harcama detaylarını girin ve kimler arasında bölüneceğini seçin.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Harcama Başlığı</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Örn: Market alışverişi, Elektrik faturası..."
            required
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Tutar (₺)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            required
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Harcama Tarihi</label>
          <input
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            required
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Kim Ödedi?</label>
          <select
            value={payerId}
            onChange={(e) => setPayerId(e.target.value)}
            required
            className="w-full"
          >
            {members.map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {member.display_name} {member.user_id === currentUserId && '(Ben)'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Kimler Arasında Bölünsün?
          </label>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">
            Harcamaya dahil olmayacak kişilerin seçimini kaldırın.
          </p>
          <div className="space-y-2">
            {members.map((member) => (
              <label
                key={member.user_id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedParticipants.includes(member.user_id)
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedParticipants.includes(member.user_id)}
                  onChange={() => toggleParticipant(member.user_id)}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center ${
                    selectedParticipants.includes(member.user_id)
                      ? 'bg-orange-500'
                      : 'bg-[var(--color-bg-hover)] border border-[var(--color-border)]'
                  }`}
                >
                  {selectedParticipants.includes(member.user_id) && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="w-8 h-8 rounded-full bg-[var(--color-bg-hover)] flex items-center justify-center text-sm font-medium">
                  {member.display_name[0]?.toUpperCase()}
                </div>
                <span className="font-medium">{member.display_name}</span>
                {member.user_id === currentUserId && (
                  <span className="text-xs text-[var(--color-text-muted)]">(Ben)</span>
                )}
              </label>
            ))}
          </div>
          {selectedParticipants.length > 0 && amount && (
            <p className="mt-3 text-sm text-orange-400">
              Kişi başı: ₺{(parseFloat(amount) / selectedParticipants.length / (isInstallment ? installmentMonths : 1)).toFixed(2)}
              {isInstallment && ` × ${installmentMonths} ay`}
            </p>
          )}
        </div>

        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              className={`w-12 h-6 rounded-full transition-colors relative ${
                isInstallment ? 'bg-orange-500' : 'bg-[var(--color-bg-hover)]'
              }`}
              onClick={() => setIsInstallment(!isInstallment)}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  isInstallment ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </div>
            <span className="font-medium">Taksitli Harcama</span>
          </label>

          {isInstallment && (
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]">
              <div>
                <label className="block text-sm font-medium mb-2">Taksit Sayısı</label>
                <select
                  value={installmentMonths}
                  onChange={(e) => setInstallmentMonths(parseInt(e.target.value))}
                  className="w-full"
                >
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                    <option key={n} value={n}>
                      {n} Taksit
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Başlangıç Ayı</label>
                <select
                  value={installmentStartMonth}
                  onChange={(e) => setInstallmentStartMonth(e.target.value)}
                  className="w-full"
                >
                  {futureMonths.map((month) => (
                    <option key={month} value={month}>
                      {getMonthName(month)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Notlar (Opsiyonel)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ek bilgi..."
            rows={3}
            className="w-full resize-none"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn btn-secondary flex-1"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={loading || !title || !amount || selectedParticipants.length === 0}
            className="btn btn-primary flex-1"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Kaydediliyor...
              </>
            ) : (
              'Harcamayı Kaydet'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
