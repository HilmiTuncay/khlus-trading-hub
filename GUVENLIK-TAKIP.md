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

## Ek Bulgular (Son İnceleme)
- [P3] typing olaylarında kanal izni kontrolü yok: typing:start/stop yalnızca üyelik kontrol ediyor. READ_MESSAGES izni olmayan kanallara sahte “yazıyor” bildirimi gönderilebilir. (D:\khlus hub\khlus-trading-hub\apps\api\src\socket\index.ts:270)
- [P2] Poll oylarında kanal izni kontrolü yok: Üyelik kontrolü var ama kanal izinleri (READ_MESSAGES gibi) kontrol edilmiyor; kanal erişimi kısıtlı kullanıcı mesaj ID biliyorsa oy kullanabilir. (D:\khlus hub\khlus-trading-hub\apps\api\src\routes\messages.ts:329)
- [P2] Ek dosya göndermede ATTACH_FILES izni atlanıyor: Mesaj gönderimi için SEND_MESSAGES kontrolü var ama ek dosya varsa ATTACH_FILES zorunlu değil. (D:\khlus hub\khlus-trading-hub\apps\api\src\routes\messages.ts:126)
- [P2] Reaksiyonlarda kanal izni kontrolü yok: PUT/GET /api/reactions sadece sunucu üyeliğini kontrol ediyor; READ_MESSAGES ve ADD_REACTIONS gibi kanal izinleri uygulanmıyor. (D:\khlus hub\khlus-trading-hub\apps\api\src\routes\reactions.ts:16)
- [P2] Kanal metadata erişimi kanal izninden bağımsız: GET /api/channels/:channelId sadece üyelik kontrol ediyor; gizli kanallar için en az READ_MESSAGES kontrolü eklenmeli. (D:\khlus hub\khlus-trading-hub\apps\api\src\routes\channels.ts:65)
- [P2] voice:get_users kanal bazlı CONNECT iznini dikkate almıyor: Sunucu üyesi herkes tüm voice/video kanallarındaki kullanıcı listesini alabiliyor. (D:\khlus hub\khlus-trading-hub\apps\api\src\socket\index.ts:221)
