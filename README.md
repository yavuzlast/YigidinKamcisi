# Ev Borç Takip Uygulaması

3 kişilik ev grubu için harcama ve borç takip uygulaması. Harcamaları kaydedin, kim ne kadar ödedi/borçlu görsün, ay sonunda kim kime ne göndermeli otomatik hesaplansın.

## Özellikler

- ✅ E-posta ile şifresiz giriş (magic link)
- ✅ Harcama ekleme (kim ödedi, kimler arasında bölünecek)
- ✅ Kişisel harcamalar için bazı kişileri hariç tutma (örn: ped, kişisel eşya)
- ✅ Taksitli harcama desteği (aylara bölünerek hesaplanır)
- ✅ Aylık özet: kişi başı net bakiye
- ✅ Transfer önerisi: kim kime ne kadar ödemeli

## Kurulum

### 1. Supabase Projesi Oluşturma

1. [Supabase](https://supabase.com) hesabı açın
2. Yeni proje oluşturun
3. Proje URL ve anon key'i not edin

### 2. Veritabanı Şemasını Yükleme

Supabase Dashboard → SQL Editor → New Query:

\`\`\`sql
-- supabase/schema.sql dosyasının içeriğini buraya yapıştırın ve çalıştırın
\`\`\`

### 3. Auth Ayarları

Supabase Dashboard → Authentication → Settings:

1. **Email Auth**: Enable Email Confirmations = OFF (magic link için)
2. **URL Configuration**:
   - Site URL: `https://your-app.vercel.app` (deploy sonrası)
   - Redirect URLs: 
     - `http://localhost:3000/auth/callback`
     - `https://your-app.vercel.app/auth/callback`

### 4. Ortam Değişkenleri

`.env.local` dosyası oluşturun:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# İzin verilen e-postalar (sadece bu kişiler giriş yapabilir)
ALLOWED_EMAILS=ali@example.com,veli@example.com,ayse@example.com
\`\`\`

### 5. Geliştirme

\`\`\`bash
npm install
npm run dev
\`\`\`

Tarayıcıda: http://localhost:3000

## Vercel'e Deploy

### 1. GitHub'a Push

\`\`\`bash
git add .
git commit -m "Initial commit"
git push origin main
\`\`\`

### 2. Vercel'de Import

1. [Vercel](https://vercel.com) hesabı açın
2. "Import Project" → GitHub repo'yu seçin
3. Environment Variables ekleyin:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ALLOWED_EMAILS`
4. Deploy!

### 3. Supabase Redirect URL Güncelleme

Deploy sonrası Vercel URL'inizi Supabase → Auth → URL Configuration → Redirect URLs'e ekleyin:
\`https://your-app.vercel.app/auth/callback\`

## Kullanım

1. İzin verilen e-posta ile giriş yapın
2. "Harcama Ekle" ile yeni harcama kaydedin
3. Dashboard'da aylık özet ve transfer önerilerini görün
4. Ay seçerek geçmiş/gelecek ayları inceleyin

## Teknolojiler

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend/Auth/DB**: Supabase (PostgreSQL + Auth)
- **Hosting**: Vercel

## Lisans

MIT
