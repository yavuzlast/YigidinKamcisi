'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface DeleteExpenseButtonProps {
  expenseId: string;
}

export default function DeleteExpenseButton({ expenseId }: DeleteExpenseButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      // Önce ilişkili kayıtları sil
      await supabase.from('expense_occurrences').delete().eq('expense_id', expenseId);
      await supabase.from('expense_participants').delete().eq('expense_id', expenseId);
      
      // Sonra harcamayı sil
      const { error } = await supabase.from('expenses').delete().eq('id', expenseId);

      if (error) throw error;

      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      console.error('Harcama silinirken hata:', error);
      alert('Harcama silinirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-[var(--color-text-muted)]">Emin misiniz?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="btn btn-danger !py-2 !px-3 text-sm"
        >
          {loading ? 'Siliniyor...' : 'Evet, Sil'}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          className="btn btn-secondary !py-2 !px-3 text-sm"
        >
          İptal
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="btn btn-secondary !py-2 !px-3 text-sm text-red-400 hover:text-red-300"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      Sil
    </button>
  );
}

