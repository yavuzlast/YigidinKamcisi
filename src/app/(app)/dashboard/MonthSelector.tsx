'use client';

import { useRouter } from 'next/navigation';
import { dateToMonthString, getMonthName } from '@/lib/balances';

interface MonthSelectorProps {
  currentMonth: string;
}

export default function MonthSelector({ currentMonth }: MonthSelectorProps) {
  const router = useRouter();

  // Şubat 2026'dan başla, 12 ay göster
  const months: string[] = [];
  const startYear = 2026;
  const startMonth = 1; // Şubat (0-indexed)
  
  for (let i = 0; i < 12; i++) {
    const date = new Date(startYear, startMonth + i, 1);
    months.push(dateToMonthString(date));
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.push(`/dashboard?month=${e.target.value}`);
  };

  return (
    <select
      value={currentMonth}
      onChange={handleChange}
      className="px-4 py-2 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] text-sm font-medium cursor-pointer hover:border-[var(--color-text-muted)] transition-colors"
    >
      {months.map((month) => (
        <option key={month} value={month}>
          {getMonthName(month)}
        </option>
      ))}
    </select>
  );
}

