# النشر على Vercel

الريبو فيها تطبيقان، فبنعمل **مشروعين** على Vercel من نفس الريبو (`harmovich67/Tamarah_Nextjs`، فرع `main`):

| المشروع | Root Directory | Framework |
| --- | --- | --- |
| الداشبورد (لوحة التحكم) | `dashboard` | Vite (الإعدادات في `dashboard/vercel.json`) |
| الموقع | `web` | Next.js |

الإعدادات العامة (وضع `laravel` ورابط الـAPI) موجودة في `dashboard/.env.production` و`web/.env.production`، فمش لازم تكتبها
تاني. اللي بتضيفه في Vercel هو روابط المشروعين لبعض فقط.

## 1) الداشبورد

1. Vercel ← **Add New… → Project** ← اختر الريبو.
2. **Root Directory**: `dashboard` (وسيب **Include source files outside of the Root Directory** مفعّل، لأن الداشبورد بيعتمد على مجلد `shared`).
3. Framework = Vite، وأوامر البناء بتيجي من `vercel.json` (البناء بـ`VITE_BASE_PATH=/` عشان يشتغل على جذر الدومين).
4. **Environment Variables**:
   * `VITE_STOREFRONT_URL` = رابط مشروع الموقع (مثلاً `https://tamrna.vercel.app`)
5. **Deploy**.

## 2) الموقع

1. **Add New… → Project** ← نفس الريبو.
2. **Root Directory**: `web` (نفس الملاحظة عن الملفات خارج الـRoot).
3. Framework = Next.js (بيتعرّف لوحده، والبناء `next build --webpack` من `web/package.json`).
4. **Environment Variables**:
   * `NEXT_PUBLIC_SITE_URL` = رابط الموقع نفسه (مثلاً `https://tamrna.vercel.app`)
   * `NEXT_PUBLIC_DASHBOARD_URL` = رابط الداشبورد
5. **Deploy**.

> متغيرات `VITE_*` و`NEXT_PUBLIC_*` بتتدمج وقت البناء. لو غيّرت واحد منها لازم **Redeploy**.

بعد أول نشر للاتنين، حط رابط كل واحد في إعدادات التاني (الخطوتين 1.4 و2.4) وسوّي Redeploy.

## ملاحظات

* **Node**: Settings → General → Node.js Version = 22.x (المشروع يطلب `>=20.9`).
* **CORS**: الباك بيرد بـ`Access-Control-Allow-Origin: *`، والدخول بـBearer token (مش كوكيز)، فمفيش إعداد مطلوب لدومين Vercel.
* **ما يزال تجريبيًا**: الدفع/الطلبات والحساب والكوبونات وقوائم الموقع وسلايدر الرئيسية (الباك مفيهوش لها endpoints). الموقع بياخد
  المنتجات والأقسام والسلة من الباك الحقيقي (انظر README).
* دومين خاص: Settings → Domains، وبعدها حدّث `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_DASHBOARD_URL` / `VITE_STOREFRONT_URL` وسوّي Redeploy.
* على Vercel مفيش حاجة اسمها `.htaccess` أو `web/server.cjs`: الأول للـApache والتاني لـcPanel بس.
