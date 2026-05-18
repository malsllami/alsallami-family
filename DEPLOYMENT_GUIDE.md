# دليل موقع عائلة السلامي — مرجع شامل

## معلومات المشروع

| العنصر | القيمة |
|--------|--------|
| رابط الموقع | https://malsllami.github.io/alsallami-family/ |
| رابط صفحة الشجرة للأهل | https://malsllami.github.io/alsallami-family/tree-view |
| مستودع GitHub | https://github.com/malsllami/alsallami-family |
| Google Spreadsheet | https://docs.google.com/spreadsheets/d/1ZZkmGrwXT_yVGIRmWl373uuvo2YqbG5P4yX8TkCIS2Y |
| مجلد المشروع المحلي | C:\Users\hP\alsallami-family |
| إيميل المدير | malsllami@gmail.com |

---

## بنية المشروع

```
alsallami-family/
├── src/
│   ├── pages/
│   │   ├── App.jsx              ← الصفحة الرئيسية
│   │   ├── FamilyTree.jsx       ← شجرة العائلة (للأعضاء)
│   │   ├── TreeViewer.jsx       ← شجرة العائلة (للأهل بدون تسجيل)
│   │   ├── Funds.jsx            ← الصناديق
│   │   ├── Articles.jsx         ← المقالات
│   │   ├── AdminDashboard.jsx   ← لوحة المدير
│   │   ├── MemberDashboard.jsx  ← لوحة العضو
│   │   ├── Login.jsx            ← تسجيل الدخول
│   │   └── Register.jsx         ← التسجيل
│   ├── layouts/MainLayout.jsx   ← الشريط العلوي والتذييل
│   ├── components/              ← مكونات مشتركة
│   └── index.css                ← التصميم العام
├── google-apps-script/
│   ├── Code.gs                  ← نقطة دخول API الرئيسية
│   ├── Auth.gs                  ← تسجيل الدخول والتسجيل
│   ├── Admin.gs                 ← إحصائيات وإدارة الأعضاء
│   ├── Tree.gs                  ← شجرة العائلة
│   ├── Funds.gs                 ← الصناديق
│   ├── Articles.gs              ← المقالات
│   ├── Members.gs               ← بيانات الأعضاء
│   ├── Reports.gs               ← التقرير اليومي بالإيميل
│   └── setup.gs                 ← إعداد أولي للجداول
├── .env                         ← متغيرات البيئة (غير مرفوعة على GitHub)
├── vite.config.js
└── package.json
```

---

## ملف .env (لا يُرفع على GitHub)

```
VITE_API_URL=https://script.google.com/macros/s/AKfycbwzzuLlYmvFW7XCpYurbrJrTqQtO5j4eNPC5u7cPrtTxYqNoO-wd1tMNhTx2AxCpC-GJw/exec
```

> إذا فُقد هذا الملف أنشئه يدوياً في جذر المشروع بنفس المحتوى.

---

## 1. نسخ احتياطي على Google Drive

### الطريقة الأسرع — مزامنة تلقائية:
1. ثبّت **Google Drive for Desktop** على الجهاز
2. انقل مجلد `C:\Users\hP\alsallami-family` داخل مجلد Google Drive
3. تتم المزامنة تلقائياً في كل تعديل

### يدوياً عند الحاجة:
1. اضغط بالزر الأيمن على مجلد `alsallami-family`
2. اختر **Send to → Compressed (zipped) folder**
3. ارفع الملف المضغوط على Google Drive

### ملاحظة مهمة:
- الكود محفوظ بالكامل على **GitHub** تلقائياً — هذا النسخ الاحتياطي الأساسي
- ملفات `google-apps-script/` موجودة في المشروع وعلى GitHub
- ملف `.env` **لا** يُرفع على GitHub — احفظه في Google Drive يدوياً

---

## 2. نشر الموقع (أول مرة)

### المتطلبات:
- Node.js مثبّت
- Git مثبّت
- حساب GitHub: **malsllami**

### الخطوات:

**أ. تثبيت المشروع من GitHub (على جهاز جديد):**
```powershell
git clone https://github.com/malsllami/alsallami-family.git
cd alsallami-family
npm install
```

**ب. إنشاء ملف .env:**
```
VITE_API_URL=https://script.google.com/macros/s/AKfycbwzzuLlYmvFW7XCpYurbrJrTqQtO5j4eNPC5u7cPrtTxYqNoO-wd1tMNhTx2AxCpC-GJw/exec
```

**ج. النشر على GitHub Pages:**
```powershell
npm run deploy
```
هذا الأمر يفعل تلقائياً:
1. بناء الموقع في مجلد `dist/`
2. رفع `dist/` إلى فرع `gh-pages` على GitHub

**د. تفعيل GitHub Pages (مرة واحدة فقط):**
1. افتح: https://github.com/malsllami/alsallami-family/settings/pages
2. Source → `Deploy from a branch`
3. Branch → `gh-pages` → `/ (root)`
4. اضغط **Save**

الموقع يكون جاهزاً خلال دقيقة على:
`https://malsllami.github.io/alsallami-family/`

---

## 3. تحديث الموقع بعد أي تعديل

كل مرة تعدّل ملفات الكود شغّل هذه الأوامر بالترتيب:

```powershell
git add .
git commit -m "وصف التعديل"
git push origin main
npm run deploy
```

> `npm run deploy` يعيد البناء وينشر تلقائياً — لا تحتاج شيئاً آخر.

---

## 4. تحديث Google Apps Script (GAS)

عند تعديل أي ملف في `google-apps-script/`:

1. افتح: https://script.google.com
2. اختر مشروع عائلة السلامي
3. انسخ محتوى الملف المعدّل والصقه في المحرر
4. اضغط **Deploy** → **Manage deployments**
5. اضغط **✏️ Edit** على النشر الحالي
6. غيّر **Version** إلى **New version**
7. اضغط **Deploy**

> رابط API لا يتغيّر عند النشر كـ New version.

---

## 5. جداول Google Sheets المطلوبة

| اسم الجدول | الوصف |
|------------|-------|
| الأعضاء | بيانات جميع الأعضاء |
| الشجرة العائلية | عقد الشجرة |
| الزوجات | بيانات الزوجات |
| الأبناء | بيانات الأبناء والبنات |
| الصناديق | الصناديق العائلية |
| أعضاء الصناديق | اشتراكات الأعضاء في الصناديق |
| المقالات | مقالات الموقع |
| طلبات القبول | طلبات التسجيل الجديدة |
| طلبات الشجرة | طلبات الانضمام للشجرة |
| الإعدادات | إعدادات النظام (رمز المدير، رمز المشاهد) |

### جدول الإعدادات — المفاتيح المطلوبة:

| المفتاح | الوصف |
|---------|-------|
| رمز المدير | رمز PIN للدخول للوحة المدير |
| رمز المشاهد | رمز مشاركة شجرة العائلة للأهل (بدون تسجيل) |

---

## 6. التقرير اليومي بالإيميل

### الإعداد (مرة واحدة):
1. أضف ملف `Reports.gs` في محرر GAS
2. اضبط التوقيت: **Project Settings → Time zone → Arabia Standard Time (UTC+3)**
3. شغّل دالة `setupDailyTrigger` مرة واحدة من محرر GAS
4. جرّب فوراً بتشغيل `testReport`

### يصل الإيميل كل يوم بعد منتصف الليل يتضمن:
- طلبات API اليوم
- أعضاء جدد مع أسماءهم
- طلبات معلقة تحتاج اعتماد
- إجمالي الأعضاء

---

## 7. صلاحيات النظام

| الصلاحية | الوصول |
|----------|--------|
| `admin` | لوحة المدير + لوحة العضو (يحتاج رمز PIN إضافي) |
| `member` | لوحة العضو فقط |
| بدون حساب | الصفحة الرئيسية + المقالات + الصناديق (قراءة) + شجرة للأهل برمز مشترك |

---

## 8. استعادة المشروع على جهاز جديد

```powershell
# 1. استنسخ من GitHub
git clone https://github.com/malsllami/alsallami-family.git
cd alsallami-family

# 2. ثبّت المكتبات
npm install

# 3. أنشئ ملف .env
# أنشئ ملف .env يدوياً وضع فيه رابط GAS API (من السجلات أو Google Drive)

# 4. شغّل محلياً للاختبار
npm run dev

# 5. انشر على GitHub Pages
npm run deploy
```

---

## ملاحظات مهمة

- **لا ترفع `.env` على GitHub** — يحتوي على رابط API الخاص
- **GAS API URL لا يتغيّر** طالما تنشر كـ "New version" على نفس النشر
- **كلمات المرور مشفّرة SHA-256** — لا تعدّلها مباشرةً في الجدول
- **sessionStorage** تُمسح عند إغلاق التبويب — رمز المدير يُطلب مجدداً
- بعد كل `npm run deploy` انتظر دقيقة ثم جدّد الصفحة (أو افتح Incognito)
