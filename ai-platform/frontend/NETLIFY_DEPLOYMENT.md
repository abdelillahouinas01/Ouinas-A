# نشر المشروع على Netlify

## الخطوات السريعة

### 1. تحضير المشروع

```bash
cd frontend
npm install
npm run build
```

### 2. إنشاء حساب على Netlify
- اذهب إلى [netlify.com](https://netlify.com)
- سجل دخول أو أنشئ حساباً جديداً

### 3. نشر المشروع

#### الطريقة الأولى: Drag & Drop
1. انقر على "Add new site"
2. اختر "Deploy manually"
3. اسحب مجلد `dist` إلى منطقة الرفع

#### الطريقة الثانية: GitHub Integration
1. أرفع المشروع على GitHub
2. في Netlify، اختر "New site from Git"
3. اختر repository الخاص بك
4. اختر الـ branch (عادة `main`)
5. قم بتعيين Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`

### 4. إضافة متغيرات البيئة

في لوحة تحكم Netlify:

1. اذهب إلى **Site settings** → **Build & deploy** → **Environment**
2. أضف المتغيرات التالية:

```
VITE_API_BASE_URL = https://your-backend-domain.com
VITE_GITHUB_CLIENT_ID = your_github_client_id
VITE_GITHUB_REDIRECT_URI = https://your-site-name.netlify.app/auth/callback
```

### 5. تحديث GitHub OAuth

1. اذهب إلى [GitHub Settings](https://github.com/settings/developers)
2. عدّل OAuth App:
   - Homepage URL: `https://your-site-name.netlify.app`
   - Authorization callback: `https://your-site-name.netlify.app/auth/callback`

### 6. تكوين API Backend

تأكد من أن Backend API متاح على:
```
https://your-backend-domain.com
```

وقم بتحديث CORS:
```
CORS_ORIGIN=https://your-site-name.netlify.app
```

---

## ملفات التكوين المضمنة

- ✅ `netlify.toml` - تكوين Netlify الكامل
- ✅ `vercel.json` - تكوين Vercel (بديل)
- ✅ `.env.production` - متغيرات الإنتاج

---

## المتطلبات

- Node.js 18+
- npm أو yarn
- حساب Netlify مجاني أو مدفوع
- Backend API مشغّل وآمن (HTTPS)

---

## استكشاف الأخطاء

### خطأ: CORS origin not allowed

**الحل**: تأكد من تحديث `CORS_ORIGIN` في Backend

### خطأ: GitHub OAuth redirect_uri mismatch

**الحل**: تحديث GitHub OAuth App callback URL

### خطأ: API calls failing

**الحل**: تحديث `VITE_API_BASE_URL` بعنوان Backend الصحيح

---

## روابط مفيدة

- [Netlify Docs](https://docs.netlify.com)
- [Vite Build Guide](https://vitejs.dev/guide/build.html)
- [React Deployment](https://react.dev/learn/start-a-new-react-project#production-toolchains)

---

## نصائح الأداء

1. استخدم Netlify Edge Functions للـ APIs
2. فعّل Netlify Analytics
3. استخدم Netlify Forms للـ Contact Forms
4. قم بتفعيل Gzip compression

---

## الدعم

للمزيد من المساعدة:
- تحقق من `../ARCHITECTURE.md`
- تحقق من `../SETUP.md`
- اقرأ `../GETTING_STARTED.md`
