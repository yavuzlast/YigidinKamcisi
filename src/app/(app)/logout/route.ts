import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:3000'));
}

export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/login`);
}

