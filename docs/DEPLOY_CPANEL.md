# النشر على cPanel — نطاق https://tomornah.wordpress.aait-d.com

تم ضبط المشروع ليعمل المتجر على جذر الموقع (`/`)، ولوحة التحكم (الداشبورد) على المسار الفرعي (`/admin`) على نفس النطاق:
* **المتجر الرئيسي (Next.js)**: يعمل على `https://tomornah.wordpress.aait-d.com/` (عبر ميزة Setup Node.js App في cPanel).
* **لوحة التحكم (Vite / React)**: تعمل على `https://tomornah.wordpress.aait-d.com/admin/` (ملفات ثابتة Static داخل مجلد `admin` بدون الحاجة لسيرفر منفصل).

---

## 1) بناء ورفع لوحة التحكم (الداشبورد إلى `/admin`)

1. تأكد من إعدادات ملف `dashboard/.env.local` (تم تجهيزها بالنطاق الفعلي):
   ```env
   VITE_API_MODE=laravel
   VITE_API_URL=https://tomorna.doha.aait-d.com/api
   VITE_AUTH_STRATEGY=token
   VITE_MOCK_FALLBACK=true
   VITE_STOREFRONT_URL=https://tomornah.wordpress.aait-d.com
   ```
2. ابنِ الداشبورد من جهازك بتشغيل:
   ```bash
   npm run build:dashboard
   ```
   *(المشروع مبرمج تلقائياً لضبط base المسارات إلى `/admin/` وقت الـ build الإنتاجي)*.
3. ادخل لمجلد `dashboard/dist` واضغط **جميع محتوياته** (بما في ذلك ملف `.htaccess` ومجلد `assets`) داخل ملف ZIP.
4. في cPanel:
   * افتح **File Manager**.
   * ادخل إلى المجلد الرئيسي للنطاق (Document Root للنطاق `tomornah.wordpress.aait-d.com`، وعادة يكون `public_html` أو مجلد باسم النطاق).
   * أنشئ مجلداً جديداً باسم `admin`.
   * ادخل مجلد `admin` وارفع ملف الـ ZIP واستخرجه هناك (Extract).
   * تأكد من وجود ملف `.htaccess` داخل مجلد `admin` (المشروع يحتوي بالفعل على إعداد `PassengerEnabled off` بداخل `.htaccess` ليعمل بسرعة فائقة وبدون أي تعارض مع Next.js).

---

## 2) رفع وتشغيل المتجر (Next.js عبر Setup Node.js App)

1. **رفع ملفات المشروع:**
   * ارفع مجلد المشروع كاملاً إلى السيرفر في مجلد **خارج** `public_html` (مثلاً في المسار الرئيسي للحساب `~/tamrna`).
   * *طريقة Git:* من cPanel ← **Git™ Version Control** ← استنسخ الريبو (Clone).
   * *أو طريقة الـ ZIP:* اضغط ملفات المشروع من جهازك (باستثناء `node_modules` و `.next`) وارفعها إلى `~/tamrna` وفك الضغط.

2. **إنشاء التطبيق من Setup Node.js App:**
   * في cPanel ← افتح **Setup Node.js App** ← اضغط **Create Application**.
   * املأ الحقول بالتالي:
     * **Node.js version**: اختر `20.x` أو `22.x` (المشروع يتطلب `>=20.9.0`).
     * **Application mode**: `Production`.
     * **Application root**: `tamrna` (جذر المشروع كاملاً لأن `web` يحتاج `shared`).
     * **Application URL**: اختر النطاق `tomornah.wordpress.aait-d.com`.
     * **Application startup file**:
       ```text
       web/server.cjs
       ```
   * أضف المتغيرات البيئية (Environment Variables) في الصفحة:
     ```env
     NEXT_PUBLIC_API_MODE=mock
     NEXT_PUBLIC_SITE_URL=https://tomornah.wordpress.aait-d.com
     NEXT_PUBLIC_DASHBOARD_URL=https://tomornah.wordpress.aait-d.com/admin
     ```
   * اضغط **Create**.

3. **تثبيت الحزم وبناء المتجر على السيرفر:**
   * انسخ أمر تفعيل البيئة (Command to enter virtual environment) الظاهر في أعلى صفحة التطبيق في cPanel.
   * افتح **Terminal** في cPanel، الصق الأمر، ثم نفذ:
     ```bash
     cd ~/tamrna
     npm install
     npm run build:web
     ```
   * ارجع لصفحة Node.js App واضغط **Restart**.

---

## 3) التحقق واختبار الروابط بعد النشر

* المتجر الرئيسي: `https://tomornah.wordpress.aait-d.com`
* لوحة التحكم: `https://tomornah.wordpress.aait-d.com/admin`
* تسجيل دخول الداشبورد: `https://tomornah.wordpress.aait-d.com/admin/login`
* عند محاولة الدخول على `/admin` من المتجر سيتم توجيهك مباشرة للوحة التحكم.

---

## 4) التحديثات المستقبلية

* **الداشبورد:** بعد أي تعديل، قم بتشغيل `npm run build:dashboard` محلياً، ثم استبدل الملفات داخل مجلد `admin` على السيرفر.
* **المتجر:** بعد سحب التحديثات على السيرفر (`git pull`)، شغل `npm run build:web` ثم اضغط **Restart** من cPanel.

