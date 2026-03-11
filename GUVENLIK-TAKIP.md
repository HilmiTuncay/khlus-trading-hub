# Güvenlik ve Mantık Notları

Tarih: 2026-03-11
Kapsam: apps/api, apps/web, apps/desktop, packages/shared

## Kritik / Yüksek
- ~~Kanal izinleri (READ_MESSAGES, SEND_MESSAGES, CONNECT vb.) pratikte uygulanmıyor.~~ ✅ DÜZELTILDI: Mesaj okuma/yazma, pinned, arama ve LiveKit token endpointlerine kanal izin kontrolü eklendi. **Kalan sorunlar aşağıda "Ek Bulgular" altında listeleniyor** (reactions, poll vote, typing, channel metadata, voice:get_users, attach_files).
- ~~Vote endpointinde üyelik kontrolü yok.~~ ✅ DÜZELTILDI: Üyelik kontrolü eklendi. (Ancak kanal izni hala eksik — Ek Bulgular P2)

## Orta
- Socket typing olaylarında (typing:start/stop) üyelik veya odaya katılım kontrolü yok; kanal ID’si bilinen kanallara sahte yazıyor bildirimi yapılabilir.
- CORS/CSRF tarafında Vercel preview izin kontrolü “baseName içeriyor + vercel.app” mantığıyla yapılıyor. Aynı baseName’i içeren farklı bir Vercel projesi istemeden izinli sayılabilir.
- CSRF middleware’inde referer için new URL(referer) hataya düşerse yakalanmıyor; hatalı Referer başlığı 500 üretebilir (DoS yüzeyi).
- ~~Refresh token cookie süresi 7 gün, refresh token süresi 30 gün.~~ ✅ DÜZELTILDI: Cookie süresi 30 güne güncellendi.

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
- [P2] Refresh token invalidation yok (token replay): POST /api/auth/refresh eski refresh token'ı geçersiz kılmıyor (DB'de tutulmuyor). Çalınan bir refresh token 30 gün boyunca sınırsız yeni access token üretebilir. (apps\api\src\routes\auth.ts:186-211)
- [P2] Mesaj silmede moderatör yetkisi eksik: DELETE /api/messages/:messageId yalnızca yazarını kontrol ediyor. MANAGE_MESSAGES iznine sahip moderatörler başkalarının mesajlarını silemiyor. (apps\api\src\routes\messages.ts:402)
- [P2] Kanal oluşturmada categoryId sunucu eşleşmesi yok: POST /api/channels'da verilen categoryId'nin belirtilen serverId'ye ait olduğu doğrulanmıyor. Farklı bir sunucunun kategorisine kanal bağlanabilir. (apps\api\src\routes\channels.ts:44)
- [P3] Etkinlik oluşturmada izin kontrolü eksik: POST /api/events sadece üyelik kontrol ediyor. Herhangi bir sunucu üyesi etkinlik oluşturabilir; MANAGE_SERVER veya özel izin zorunlu değil. (apps\api\src\routes\events.ts:55)
- [P3] Yüklenen dosyalara auth'suz erişim: /uploads/ statik olarak sunuluyor, auth kontrolü yok. randomBytes(16) dosya adı tahmin edilmesi zor olsa da URL paylaşıldığında oturum dışı erişim mümkün. (apps\api\src\index.ts:122-138)
- [P3] DM mesajlarında rate limit yok: POST /api/dm/:conversationId/messages endpoint'ine özel rate limiting uygulanmıyor. Genel rate limiter dışında DM spam koruması yok. (apps\api\src\routes\dm.ts:173)
- [P3] Hesap kilitleme in-memory: loginAttempts Map bellekte tutuluyor. Sunucu restart'ında sıfırlanır, çoklu instance/horizontal scale durumunda paylaşılmaz. (apps\api\src\routes\auth.ts:32)
- [P3] Rol hiyerarşisi kontrolü yok: PUT /api/roles/assign sadece MANAGE_ROLES izni kontrol ediyor. İşlem yapanın rolü hedeften yüksek mi diye bakılmıyor; düşük pozisyonlu moderatör yüksek pozisyonlu üyeye rol atayabilir. (apps\api\src\routes\roles.ts:191)
- [P3] Kayıt ekranında kullanıcı numaralandırma: POST /api/auth/register "Bu email adresi zaten kullanılıyor" ve "Bu kullanıcı adı zaten kullanılıyor" şeklinde farklı hata mesajları döndürüyor. Saldırgan geçerli email/kullanıcı adı bilgisini öğrenebilir. (apps\api\src\routes\auth.ts:74-82)
- [P4] Etkinlik channelId doğrulama eksik: POST /api/events channelId parametresinin sunucuya ait olup olmadığını veya var olup olmadığını kontrol etmiyor. Farklı bir sunucunun kanalına referans verilebilir. (apps\api\src\routes\events.ts:72-82)
- [P4] Etkinlik tarih doğrulaması yok: POST /api/events startAt'ın gelecekte olduğunu veya endAt >= startAt olduğunu doğrulamıyor. Geçmiş tarihli veya tutarsız etkinlik oluşturulabilir. (apps\api\src\routes\events.ts:79-80)
