# تقرير ربط الـ API

> أُنشئ تلقائيًا بواسطة `npm run connect` — 2026-10-22 08:53

- **API_URL:** `https://tomorna.doha.aait-d.com/api`
- **الـ Auth:** `token`
- **ملف الـ API:** لم يُستخدم

## فحص السيرفر الحي

| | المجموعة | الفحص | التفاصيل |
| --- | --- | --- | --- |
| ❌ | الاتصال | مسار /settings | HTTP 404 · 703ms — The route api/storefront/settings could not be found. |
| ❌ | CORS | Preflight من المتجر (http://localhost:3000) | headers ناقصة: authorization, content-type, x-requested-with, accept-language |
| ❌ | CORS | Preflight من اللوحة (http://localhost:5173) | headers ناقصة: authorization, content-type, x-requested-with, accept-language |
| ❌ | المتجر | Shell (الإعدادات + القوائم) | HTTP 404 · 333ms The route api/storefront/shell could not be found. |
| ✅ | المتجر | الصفحة الرئيسية | HTTP 200 · 481ms |
| ✅ | المتجر | الكتالوج | HTTP 200 · 387ms |
| ✅ | اللوحة | تسجيل الدخول | استلم token |
| ✅ | اللوحة | بيانات المستخدم (user.role_name) | role_name = admin |
| ❌ | اللوحة | المستخدم الحالي | HTTP 404 · 330ms The route api/admin/auth/me could not be found. |
| ✅ | اللوحة | إحصائيات الداشبورد | HTTP 200 · 372ms |
| ✅ | اللوحة | قائمة المنتجات | 4 عنصر · 395ms |
| ✅ | اللوحة | قائمة الأقسام | 8 عنصر · 369ms |
| ✅ | اللوحة | قائمة الطلبات | 0 عنصر · 386ms |
| ❌ | اللوحة | قائمة الكوبونات | HTTP 404 · 366ms The route api/admin/coupons could not be found. |
| ✅ | اللوحة | قائمة المستخدمين | 0 عنصر · 352ms |

### المطلوب إصلاحه

- **مسار /settings:** المسار غير موجود: شغّل المعالج بملف الـ API لمطابقة المسارات.
- **Preflight من المتجر (http://localhost:3000):** في config/cors.php: أضف الـ origin إلى allowed_origins و allowed_headers => [*] و supports_credentials => true عند استخدام cookie.
- **Preflight من اللوحة (http://localhost:5173):** في config/cors.php: أضف الـ origin إلى allowed_origins و allowed_headers => [*] و supports_credentials => true عند استخدام cookie.
- **Shell (الإعدادات + القوائم):** المسار أو الرد غير صحيح.
- **المستخدم الحالي:** المسار غير مطابق أو خطأ في السيرفر.
- **قائمة الكوبونات:** المسار غير مطابق أو خطأ في السيرفر.

---
لإعادة التشغيل بعد أي تعديل في الباك اند: `npm run connect -- --check`
