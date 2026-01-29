import { redirect } from 'next/navigation';

export default function Home() {
  // Middleware zaten yönlendirme yapıyor, ama fallback olarak
  redirect('/login');
}
