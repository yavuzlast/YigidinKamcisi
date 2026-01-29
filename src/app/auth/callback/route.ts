import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/dashboard';
  const error = searchParams.get('error');
  const error_description = searchParams.get('error_description');

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code && !token_hash) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const cookieStore = await cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          return cookieStore.get(name)?.value;
        },
        async set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        async remove(name: string, options: CookieOptions) {
          cookieStore.delete(name);
        },
      },
    }
  );

  let authError = null;

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'magiclink' | 'email',
    });
    authError = error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    authError = error;
  }

  if (authError) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(authError.message)}`);
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.redirect(`${origin}/login?error=no_user`);
  }

  // İzinli e-posta kontrolü
  const allowedEmailsRaw = process.env.ALLOWED_EMAILS?.trim() || '';
  const allowedEmails = allowedEmailsRaw ? allowedEmailsRaw.split(',').map(e => e.trim().toLowerCase()).filter(e => e) : [];

  if (allowedEmails.length > 0 && !allowedEmails.includes(user.email.toLowerCase())) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=unauthorized`);
  }

  // Kullanıcıyı gruba ekle
  const { data: existingMember } = await supabase
    .from('group_members')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!existingMember) {
    const { data: group } = await supabase
      .from('groups')
      .select('id')
      .limit(1)
      .single();

    if (group) {
      await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: user.id,
        email: user.email,
        display_name: user.email.split('@')[0],
      });
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
