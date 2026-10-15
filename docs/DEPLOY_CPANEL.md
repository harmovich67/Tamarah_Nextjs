# النشر على cPanel

الداشبورد ملفات ثابتة (تتبني على جهازك وتترفع). الموقع (Next.js) محتاج Node.js على السيرفر.
الأفضل دومين فرعي لكل واحد (مثلاً `admin.example.com` للداشبورد و`example.com` للموقع)، لأن الـbuild بيفترض إن التطبيق على جذر الدومين.

## 1) الداشبورد (admin)

1. في `dashboard/.env.local` (مش بيترفع على git) حط القيم الحقيقية قبل البناء، لأن Vite بيدمجها في الملفات وقت الـbuild:

   ```
   VITE_API_MODE=laravel
   VITE_API_URL=https://tomorna.doha.aait-d.com/api
   VITE_AUTH_STRATEGY=token
   VITE_MOCK_FALLBACK=true
   VITE_STOREFRONT_URL=https://example.com
   ```

2. ابنِ من جذر المشروع: `npm run build:dashboard`
3. اضغط **محتوى** `dashboard/dist` (مش المجلد نفسه) في ملف zip.
4. في cPanel: **File Manager** ← جذر الدومين الفرعي (Document Root) ← Upload ← Extract.
5. اتأكد إن ملف `.htaccess` ظهر (فعّل Show Hidden Files). هو اللي بيخلي المسارات زي `/products` تشتغل عند refresh.

## 2) الموقع (Next.js)

1. ارفع الكود على السيرفر (cPanel **Git™ Version Control** ← Clone من الريبو) في مجلد خارج `public_html`، مثلاً `~/tamrna`.
2. cPanel ← **Setup Node.js App** ← Create Application:
   - Node.js version: 20 أو أحدث (المشروع يطلب `>=20.9`)
   - Application mode: Production
   - Application root: `tamrna` (جذر الريبو، لأن `web` بيعتمد على مجلد `shared` في نفس الـworkspace)
   - Application URL: دومين الموقع
   - Application startup file: `web/server.cjs`
3. أضف Environment variables (قبل الـbuild لأن `NEXT_PUBLIC_*` بتتدمج وقت البناء):

   ```
   NEXT_PUBLIC_API_MODE=mock
   NEXT_PUBLIC_SITE_URL=https://example.com
   NEXT_PUBLIC_DASHBOARD_URL=https://admin.example.com
   ```

   الموقع لسه على بيانات تجريبية (mock) لأنه مش مربوط بالباك.
4. من الـterminal اللي cPanel بيديهولك (بعد `source` للـvirtualenv اللي بيظهر في الصفحة):

   ```
   cd ~/tamrna && npm install && npm run build:web
   ```

5. اضغط **Restart** في صفحة الـNode.js App.

## 3) CORS في الباك اند

الداشبورد بيكلم `https://tomorna.doha.aait-d.com/api` من دومين تاني، فلازم الباك يسمح بدومين الداشبورد
(`https://admin.example.com`) في إعدادات CORS (`config/cors.php` → `allowed_origins`)، وإلا المتصفح هيمنع الطلبات.

## 4) التحديث بعدين

- الداشبورد: ابنِ تاني وارفع محتوى `dist` فوق القديم.
- الموقع: `git pull` ← `npm install` ← `npm run build:web` ← Restart.
