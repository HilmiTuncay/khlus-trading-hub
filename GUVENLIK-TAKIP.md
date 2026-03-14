# Güvenlik ve Mantık Notları

Tarih: 2026-03-14
Kapsam: apps/api, apps/web, apps/desktop, packages/shared

## Kritik / Yüksek
- ~~Kanal izinleri (READ_MESSAGES, SEND_MESSAGES, CONNECT vb.) pratikte uygulanmıyor.~~ ✅ DÜZELTILDI: Mesaj okuma/yazma, pinned, arama, LiveKit, poll vote, reactions, kanal metadata ve voice:get_users endpointlerine kanal izin kontrolü eklendi.
- ~~Vote endpointinde üyelik kontrolü yok.~~ ✅ DÜZELTILDI: Üyelik kontrolü + kanal izni eklendi.

## Orta
- ~~Socket typing olaylarında üyelik veya odaya katılım kontrolü yok.~~ ✅ DÜZELTILDI: typing:start/stop'a kanal izni (READ_MESSAGES) kontrolü eklendi.
- CORS/CSRF tarafında Vercel preview izin kontrolü "baseName içeriyor + vercel.app" mantığıyla yapılıyor. Aynı baseName'i içeren farklı bir Vercel projesi istemeden izinli sayılabilir.
- ~~CSRF middleware'inde referer için new URL(referer) hataya düşerse yakalanmıyor.~~ ✅ DÜZELTILDI: try/catch eklendi (önceki commit'te).
- ~~Refresh token cookie süresi 7 gün, refresh token süresi 30 gün.~~ ✅ DÜZELTILDI: Cookie süresi 30 güne güncellendi.

## Düşük
- ~~Seed ve reset scriptlerinde sabit e‑posta/şifre/davet kodu var.~~ ✅ DÜZELTILDI: NODE_ENV=production kontrolü eklendi (önceki commit'te).
- Davet kodu 8 hex (2^32) ve join için ayrı bir rate limit yok. Genel limiter var ama davet brute‑force için daha sıkı limit önerilir.

## Düzeltilen Ek Bulgular (2026-03-14)
- ~~[P2] Poll oylarında kanal izni kontrolü yok~~ ✅ DÜZELTILDI: READ_MESSAGES kontrolü eklendi.
- ~~[P2] Ek dosya göndermede ATTACH_FILES izni atlanıyor~~ ✅ DÜZELTILDI: Ek dosya varsa ATTACH_FILES kontrolü eklendi.
- ~~[P2] Reaksiyonlarda kanal izni kontrolü yok~~ ✅ DÜZELTILDI: PUT ve GET endpointlerine READ_MESSAGES + ADD_REACTIONS kontrolü eklendi.
- ~~[P2] Kanal metadata erişimi kanal izninden bağımsız~~ ✅ DÜZELTILDI: GET /channels/:channelId'e READ_MESSAGES kontrolü eklendi.
- ~~[P2] voice:get_users kanal bazlı CONNECT iznini dikkate almıyor~~ ✅ DÜZELTILDI: Her voice kanal için CONNECT izni filtresi eklendi.
- ~~[P2] Refresh token invalidation yok (token replay)~~ ✅ DÜZELTILDI: JWT jti + in-memory used token set ile refresh token rotation eklendi.
- ~~[P2] Mesaj silmede moderatör yetkisi eksik~~ ✅ DÜZELTILDI: Yazar değilse MANAGE_MESSAGES izni kontrolü eklendi.
- ~~[P2] Kanal oluşturmada categoryId sunucu eşleşmesi yok~~ ✅ DÜZELTILDI: categoryId'nin serverId'ye ait olduğu doğrulanıyor.
- ~~[P3] typing olaylarında kanal izni kontrolü yok~~ ✅ DÜZELTILDI: READ_MESSAGES kontrolü eklendi.
- ~~[P3] Etkinlik oluşturmada izin kontrolü eksik~~ ✅ DÜZELTILDI: MANAGE_SERVER izni kontrolü eklendi.
- ~~[P3] DM mesajlarında rate limit yok~~ ✅ DÜZELTILDI: Dakikada 30 mesaj rate limiter eklendi.
- ~~[P3] Rol hiyerarşisi kontrolü yok~~ ✅ DÜZELTILDI: Rol atamada pozisyon hiyerarşisi kontrolü eklendi (sunucu sahibi muaf).
- ~~[P3] Kayıt ekranında kullanıcı numaralandırma~~ ✅ DÜZELTILDI: Email/username ayrı hata mesajı yerine genel mesaj döndürülüyor.
- ~~[P4] Etkinlik channelId doğrulama eksik~~ ✅ DÜZELTILDI: channelId'nin serverId'ye ait olduğu doğrulanıyor.
- ~~[P4] Etkinlik tarih doğrulaması yok~~ ✅ DÜZELTILDI: startAt gelecekte olmalı, endAt >= startAt kontrolü eklendi.

## Kalan Açık Konular
- [P3] Yüklenen dosyalara auth'suz erişim: /uploads/ statik olarak sunuluyor. randomBytes(16) dosya adı tahmin edilmesi zor olsa da URL paylaşıldığında oturum dışı erişim mümkün. Signed URL veya auth middleware önerilir.
- [P3] Hesap kilitleme in-memory: loginAttempts Map bellekte tutuluyor. Sunucu restart'ında sıfırlanır. Redis veya DB tabanlı çözüm önerilir.
- [P3] Refresh token replay koruması in-memory: usedRefreshTokens Set bellekte tutuluyor. Çoklu instance/horizontal scale durumunda Redis'e taşınmalı.
- CORS/CSRF Vercel preview izin mantığı gevşek: tam host eşleşmesi veya güvenli regex önerilir.
- Davet kodu brute-force için sıkı rate limit yok.
