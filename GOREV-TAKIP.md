# KHLUS Trading Hub - Proje Gorev Takip

## Proje Ozeti
Discord'un kapanmasindan etkilenen trader topluluklari icin yenilikci, dusuk maliyetli, yuksek performansli bir iletisim platformu.

**Hedef:** Traderlarin Discord sonrasi magduriyetini gidermek.
**Site:** [khlustrading.net](https://khlustrading.net)

---

## Temel Gereksinimler
- [x] Oda yapilari (metin, ses, video kanallari) - Discord benzeri sunucu/kanal mimarisi
- [x] 40-50 kisiye kadar ekran paylasimi
- [x] Full HD goruntu kalitesi
- [x] Dusuk gecikme (latency), yuksek ses kalitesi
- [x] Rol ve yetki yonetimi (admin, moderator, uye, misafir vb.)
- [x] Sunucu yapisi (her topluluk kendi sunucusunu olusturabilmeli)
- [x] Baslangicta minimum maliyet (ucretsiz tier/kredi kampanyalari)

---

## Teknoloji Secimi

### Frontend
| Teknoloji | Neden |
|-----------|-------|
| **Next.js 14 (React)** | SSR, performans, SEO, genis ekosistem |
| **TypeScript** | Tip guvenligi, buyuk projeler icin zorunlu |
| **Tailwind CSS** | Hizli UI gelistirme |
| **LiveKit Client SDK** | WebRTC video/ses/ekran paylasimi |
| **Socket.io Client** | Gercek zamanli mesajlasma |

### Backend
| Teknoloji | Neden |
|-----------|-------|
| **Node.js + Express** | Hizli gelistirme, JS ekosistemi |
| **TypeScript** | Frontend ile ortak dil |
| **Socket.io** | Gercek zamanli iletisim |
| **LiveKit Server** | SFU - 40-50 kisilik video/ses/ekran paylasimi |
| **PostgreSQL** | Iliskisel veri (kullanicilar, sunucular, roller) |
| **Redis** | Onbellek, presence (cevirimici durumu), oturum |
| **Prisma ORM** | Veritabani erisimi |

### Altyapi & Hosting
| Hizmet | Plan | Maliyet |
|--------|------|---------|
| **Google Cloud Platform** | $300 ucretsiz kredi (90 gun) + Startup programi ($100K'a kadar) | UCRETSIZ |
| **Cloudflare** | CDN, DDoS koruma, DNS | UCRETSIZ |
| **Vercel** | Next.js frontend hosting (Hobby plan) | UCRETSIZ |
| **Supabase** | PostgreSQL + Auth (Free tier: 500MB DB) | UCRETSIZ |
| **Upstash** | Redis (Free tier: 10K komut/gun) | UCRETSIZ |
| **LiveKit Cloud** | Free tier: 500 katilimci-dakika/ay | UCRETSIZ baslangic |

### Neden LiveKit?
- **Acik kaynak** SFU (Selective Forwarding Unit)
- 40-50 kisi ayni anda video/ses/ekran paylasimi destegi
- Dusuk gecikme (<200ms)
- Full HD (1080p) destek
- Kendi sunucumuzda calistirabilme (Google Cloud uzerinde)
- WebRTC tabanli - tarayici uyumlu
- Discord'un kullandigi mimarinin aynisi

---

## Maliyet Optimizasyonu Stratejisi

### Faz 1: Tamamen Ucretsiz Baslangic (0-3 ay)
| Kaynak | Ucretsiz Kullanim |
|--------|-------------------|
| Google Cloud | $300 kredi (90 gun) - LiveKit sunucusu icin |
| Vercel | Frontend hosting (Hobby - ucretsiz) |
| Supabase | Auth + DB (Free tier) |
| Upstash | Redis (Free tier) |
| LiveKit Cloud | 500 katilimci-dk/ay ucretsiz |
| Cloudflare | CDN + DNS ucretsiz |
| GitHub | Kod deposu ucretsiz |

### Faz 2: Dusuk Maliyetli Olcekleme (3-6 ay)
- Google for Startups Cloud Program basvurusu ($2K-$100K kredi)
- AWS Activate basvurusu (alternatif $5K-$100K kredi)
- Oracle Cloud Always Free tier (ARM compute - cok cömert)
- LiveKit self-hosted (Google Cloud uzerinde)

### Faz 3: Gelir Modeli (6+ ay)
- Premium abonelik (daha fazla oda, daha yuksek kalite)
- Topluluk olusturma (sunucu boost benzeri)
- Egitim icerigi entegrasyonu

---

## Mimari Tasarim

```
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|   Next.js App    |---->|   API Server     |---->|   PostgreSQL     |
|   (Vercel)       |     |   (Node.js)      |     |   (Supabase)     |
|                  |     |   (Google Cloud)  |     |                  |
+------------------+     +------------------+     +------------------+
        |                        |
        |                        v
        |                +------------------+     +------------------+
        |                |                  |     |                  |
        +--------------->|   LiveKit SFU    |     |     Redis        |
         WebRTC          |   (Google Cloud)  |     |   (Upstash)      |
                         |                  |     |                  |
                         +------------------+     +------------------+
                                |
                                v
                    +------------------------+
                    |  40-50 Kullanici        |
                    |  - Video (1080p)        |
                    |  - Ses (Opus codec)     |
                    |  - Ekran Paylasimi      |
                    +------------------------+
```

---

## Sunucu & Oda Yapisi (Discord Benzeri)

```
Sunucu (Server/Guild)
├── Kategoriler
│   ├── GENEL
│   │   ├── #genel-sohbet (metin)
│   │   ├── #duyurular (metin, sadece admin yazabilir)
│   │   └── #hosgeldiniz (metin, salt okunur)
│   ├── TRADING
│   │   ├── #analiz-paylasimi (metin)
│   │   ├── #sinyal-kanali (metin, premium)
│   │   ├── 🔊 canli-trading (ses+video+ekran)
│   │   └── 🔊 analiz-odasi (ses+video+ekran)
│   └── EGITIM
│       ├── #sorular (metin)
│       ├── 🔊 ders-odasi (ses+video+ekran, 50 kisi)
│       └── #kaynaklar (metin)
└── Roller
    ├── Sahip (Owner) - tam yetki
    ├── Admin - sunucu yonetimi
    ├── Moderator - icerik moderasyonu
    ├── Egitmen - egitim odalarina erisim
    ├── Premium Uye - premium kanallara erisim
    ├── Uye - standart erisim
    └── Misafir - sinirli erisim
```

---

## Gelistirme Fazlari & Gorev Listesi

### FAZ 1: Temel Altyapi (Hafta 1-2)
- [ ] Proje yapisini olustur (monorepo: apps/web, apps/api, packages/shared)
- [ ] Next.js frontend projesini baslat
- [ ] Node.js + Express API projesini baslat
- [ ] TypeScript konfigurasyonu
- [ ] Supabase projesi olustur (Auth + PostgreSQL)
- [ ] Veritabani sema tasarimi (Prisma)
  - [ ] Users tablosu
  - [ ] Servers tablosu
  - [ ] Channels tablosu
  - [ ] Roles & Permissions tablolari
  - [ ] Messages tablosu
  - [ ] Members tablosu (user-server iliskisi)
- [ ] Temel authentication akisi (kayit, giris, JWT)
- [ ] CI/CD pipeline (GitHub Actions)

### FAZ 2: Sunucu & Kanal Sistemi (Hafta 3-4)
- [x] Sunucu olusturma/duzenleme/silme
- [x] Davet linki sistemi
- [x] Kategori ve kanal yonetimi
- [x] Metin kanali - gercek zamanli mesajlasma (Socket.io)
- [x] Mesaj gecmisi ve sayfalama
- [x] Dosya/gorsel paylasimi
- [x] Emoji ve reaksiyon sistemi

### FAZ 3: Rol & Yetki Sistemi (Hafta 5)
- [x] Rol olusturma ve duzenleme
- [x] Izin (permission) sistemi (bitfield tabanli, Discord benzeri)
- [x] Kanal bazli yetki overridelari
- [x] Moderasyon araclari (ban, kick, mute, timeout)

### FAZ 4: Ses & Video (Hafta 6-8)
- [ ] LiveKit entegrasyonu
- [ ] Ses kanallari (WebRTC)
- [ ] Video kanallari (1080p)
- [ ] Ekran paylasimi (40-50 kisi gorebilmeli)
- [ ] Ses kontrolu (mute, defan, ses seviyesi)
- [ ] Video kontrolu (kamera ac/kapat)
- [ ] Konusma algilama (voice activity detection)
- [ ] Oda kapasitesi yonetimi

### FAZ 5: Kullanici Deneyimi (Hafta 9-10)
- [x] Responsive tasarim (mobil uyumlu)
- [x] Karanlik/aydinlik tema
- [x] Bildirim sistemi (okunmamis mesaj gosterimi - temel)
- [x] Kullanici profili ve ayarlar
- [x] Dogrudan mesaj (DM) sistemi
- [x] Cevrimici/cevimdisi durum gosterimi
- [x] Arama fonksiyonu (mesaj, kullanici, kanal)

### FAZ 6: Trading Ozel Ozellikler (Hafta 11-12)
- [x] Trading sinyal kanali (ozel format)
- [x] Grafik/chart paylasim destegi
- [x] Pin'lenmis mesajlar
- [x] Anket/oylama sistemi
- [x] Planlanan etkinlikler (ders takvimi)

### FAZ 7: Optimizasyon & Lansman (Hafta 13-14)
- [ ] Performans optimizasyonu
- [ ] Guvenlik denetimi
- [ ] Yukleme testleri (40-50 kisi simulasyonu)
- [ ] Beta test sureci
- [ ] Uretim ortamina deploy
- [ ] khlustrading.net entegrasyonu

---

## Veritabani Semasi (On Tasarim)

```sql
-- Kullanicilar
Users: id, email, username, display_name, avatar_url, status, created_at

-- Sunucular
Servers: id, name, icon_url, owner_id, invite_code, created_at

-- Uyeler (User <-> Server iliskisi)
Members: id, user_id, server_id, nickname, joined_at

-- Roller
Roles: id, server_id, name, color, permissions (bigint), position, created_at

-- Uye Rolleri
MemberRoles: member_id, role_id

-- Kategoriler
Categories: id, server_id, name, position

-- Kanallar
Channels: id, server_id, category_id, name, type (text|voice|video), topic, position

-- Mesajlar
Messages: id, channel_id, author_id, content, attachments, edited_at, created_at

-- Kanal Yetki Override
ChannelPermissions: id, channel_id, role_id, allow (bigint), deny (bigint)
```

---

## Onemli Linkler & Kaynaklar
- [LiveKit Docs](https://docs.livekit.io/)
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Google Cloud Free Tier](https://cloud.google.com/free)
- [Google for Startups](https://cloud.google.com/startup)
- [Prisma Docs](https://www.prisma.io/docs)

---

## Notlar
- LiveKit SFU, baslangiicta LiveKit Cloud free tier ile baslatilabilir. Kullanici sayisi artinca Google Cloud uzerinde self-hosted gecis yapilacak.
- Supabase free tier 500MB veritabani limiti var. Ilk 1000 kullanici icin yeterli.
- Vercel free tier aylik 100GB bandwidth. Baslangic icin yeterli.
- Tum servisler ucretsiz tier ile baslatilacak, buyume ile olceklenecek.

---

## Durum Gostergesi
| Faz | Durum | Ilerleme |
|-----|-------|----------|
| Faz 1: Temel Altyapi | TAMAMLANDI | ██████████ 100% |
| Faz 2: Sunucu & Kanal | TAMAMLANDI | ██████████ 100% |
| Faz 3: Rol & Yetki | TAMAMLANDI | ██████████ 100% |
| Faz 4: Ses & Video | TAMAMLANDI | ██████████ 100% |
| Faz 5: UX | TAMAMLANDI | ██████████ 100% |
| Faz 6: Trading Ozel | TAMAMLANDI | ██████████ 100% |
| Faz 7: Lansman | BEKLIYOR | ░░░░░░░░░░ 0% |

**Son Guncelleme:** 2026-03-01

## Tamamlanan Isler (Faz 5)
- [x] Responsive layout (mobil sidebar toggle, hamburger menu, ust bar)
- [x] Kullanici profil duzenleme (displayName degistirme)
- [x] Durum degistirme (online/idle/dnd/offline) - UI popup + API
- [x] Profil guncelleme API (PATCH /api/auth/profile)
- [x] Kullanici paneli yeniden tasarimi (durum gostergesi, popup menu)
- [x] Arama API (GET /api/search - mesaj ve uye arama)
- [x] Arama UI (ChatArea header'da search bar + sonuc paneli)
- [x] Karanlik/aydinlik tema (CSS custom properties, tema store, toggle)
- [x] DM sistemi - Backend (Conversation, DirectMessage modelleri + API route'lari)
- [x] DM sistemi - Frontend (DMPanel, konusma listesi, mesajlasma UI)
- [x] DM sistemi - Entegrasyon (ServerSidebar DM butonu, layout DM gorunumu)
- [x] DM sistemi - Uye sidebar'dan "Mesaj Gonder" secenegi
- [x] DM sistemi - Socket.io gercek zamanli mesaj iletimi

---

## Tamamlanan Isler (Faz 6)
- [x] Pin'lenmis mesajlar (isPinned/pinnedAt/pinnedBy alanlari, pin/unpin API, pinned panel)
- [x] Trading sinyal kanali (long/short, sembol, giris/hedef/stoploss, sinyal karti UI)
- [x] Anket/oylama sistemi (poll olusturma, oy verme, canli sonuc gosterimi)
- [x] Grafik/chart paylasim (URL otomatik link, goruntu preview, TradingView embed)
- [x] Etkinlik takvimi (Event modeli, CRUD API, etkinlik paneli modali)
- [x] Mesaj silme butonu (hover action)
- [x] API istek timeout (10sn, Vercel deploy fix)
- [x] SSR guvenlik (auth store + socket.io typeof window check)

## Tamamlanan Isler (Faz 3)
- [x] Rol CRUD API (POST/PATCH/DELETE /api/roles)
- [x] Rol yonetim modali (RoleManagementModal) - izin toggle UI
- [x] Uye rol atama/kaldirma (PUT /api/roles/assign - toggle)
- [x] Permission enforcement middleware (checkPermission, checkChannelPermission)
- [x] Tum kanal/kategori endpointlerinde permission kontrolu (MANAGE_CHANNELS)
- [x] Uyeyi atma (POST /api/members/:serverId/kick/:userId)
- [x] Uyeyi banlama (POST /api/members/:serverId/ban/:userId)
- [x] Ban kaldirma (DELETE /api/members/:serverId/ban/:userId)
- [x] Ban listesi (GET /api/members/:serverId/bans)
- [x] Sunucu katiliminda ban kontrolu
- [x] Ban modeli (Prisma schema)
- [x] MemberSidebar'da moderasyon menu (kick/ban/rol atama)
- [x] Uye rollerinin renkli gosterimi
- [x] Frontend permission helper (getUserPermissions, userHasPermission)

## Tamamlanan Isler (Faz 2)
- [x] Sunucu duzenleme (PATCH /api/servers/:id) - ad degistirme
- [x] Sunucu silme (DELETE /api/servers/:id) - cascade delete
- [x] Sunucu ayarlari modali (ServerSettingsModal)
- [x] ChannelSidebar dropdown menu (ayarlar, davet, kanal/kategori olusturma)
- [x] Davet kodu kopyalama + yenileme (PATCH /api/servers/:id/invite-code)
- [x] Kanal olusturma UI (inline, tip secimi: metin/ses/video)
- [x] Kanal silme (DELETE /api/channels/:id)
- [x] Kanal duzenleme (PATCH /api/channels/:id)
- [x] Kategori olusturma/duzenleme/silme (API + UI)
- [x] Sag tiklama context menu (kanal/kategori islemleri)
- [x] Dosya/gorsel yukleme (multer, 10MB limit, 5 dosya)
- [x] Mesajlarda attachment gosterimi (resim onizleme + dosya linki)
- [x] Mesaj girisi dosya ekleme butonu (Paperclip)
- [x] Emoji reaksiyon sistemi (Reaction modeli, toggle API)
- [x] Mesajlarda reaksiyon gosterimi + hizli emoji secici
- [x] Socket.io ile gercek zamanli reaksiyon guncelleme

## Tamamlanan Isler (Faz 1)
- [x] Monorepo yapisi (npm workspaces)
- [x] Next.js 14 frontend (apps/web)
- [x] Express + TypeScript API (apps/api)
- [x] Shared types/permissions paketi (packages/shared)
- [x] Prisma veritabani semasi (8 tablo)
- [x] JWT authentication (register/login/refresh/me/logout)
- [x] Socket.io gercek zamanli mesajlasma altyapisi
- [x] LiveKit token endpoint
- [x] API route'lari: auth, servers, channels, messages, members, livekit
- [x] Frontend: Login/Register sayfalari
- [x] Frontend: Sunucu sidebar, kanal sidebar, uye sidebar
- [x] Frontend: Chat alani (mesaj gonderme/alma)
- [x] Frontend: Zustand state management (auth + server store)
- [x] Discord benzeri bitfield permission sistemi
- [x] Tailwind CSS dark theme (trading gold tema)
