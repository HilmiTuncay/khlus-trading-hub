# Güvenlik ve Mantık Notları

Tarih: 2026-03-11
Kapsam: apps/api, apps/web, apps/desktop, packages/shared

## Kritik / Yüksek
- Kanal izinleri (READ_MESSAGES, SEND_MESSAGES, CONNECT vb.) pratikte uygulanmıyor. Sunucu üyesi olan herkes kanal izinlerinden bağımsız olarak mesaj okuyup yazabiliyor; arama ve LiveKit tokenı da aynı şekilde izinleri atlıyor.
  Etkilenen örnekler: /api/messages (GET/POST), /api/messages/:channelId/pinned, /api/search, /api/livekit/token, socket channel:join ve voice:join.
- /api/messages/:messageId/vote endpointinde üyelik kontrolü yok. MessageId bilen herhangi bir giriş yapmış kullanıcı oylama yapabiliyor.

## Orta
- Socket typing olaylarında (typing:start/stop) üyelik veya odaya katılım kontrolü yok; kanal ID’si bilinen kanallara sahte yazıyor bildirimi yapılabilir.
- CORS/CSRF tarafında Vercel preview izin kontrolü “baseName içeriyor + vercel.app” mantığıyla yapılıyor. Aynı baseName’i içeren farklı bir Vercel projesi istemeden izinli sayılabilir.
- CSRF middleware’inde referer için new URL(referer) hataya düşerse yakalanmıyor; hatalı Referer başlığı 500 üretebilir (DoS yüzeyi).
- Refresh token cookie süresi 7 gün, refresh token süresi 30 gün. Bu durum kullanıcıyı beklenenden erken oturum dışına atar (mantık hatası).

## Düşük
- Seed ve reset scriptlerinde sabit e‑posta/şifre/davet kodu var. Üretimde yanlışlıkla çalıştırılırsa güvenlik riski doğurur (NODE_ENV kontrolü önerilir).
- Davet kodu 8 hex (2^32) ve join için ayrı bir rate limit yok. Genel limiter var ama davet brute‑force için daha sıkı limit önerilir.

## Önerilen Aksiyonlar (Özet)
- Kanal bazlı izinleri gerçekten enforce edin: mesaj okuma/yazma, pin/reaction, arama, LiveKit, socket join/typing.
- Anket oylama endpointine üyelik kontrolü ekleyin.
- Vercel preview allowlist’i daha daraltın (tam host eşleşmesi veya güvenli regex).
- CSRF referer parse işlemini try/catch ile sarmalayın.
- Refresh cookie süresini refresh token süresiyle hizalayın.
- Seed/reset scriptlerini sadece development ortamında çalışacak şekilde sınırlandırın.
