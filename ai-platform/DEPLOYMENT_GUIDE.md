# 🚀 دليل نشر المشروع على منصات مختلفة

## نشر Frontend على Netlify

### الخطوة 1: تحضير المشروع

```bash
cd frontend
npm install
npm run build
```

### الخطوة 2: نشر على Netlify

#### الطريقة الأولى - CLI:
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

#### الطريقة الثانية - واجهة الويب:
1. اذهب إلى [app.netlify.com](https://app.netlify.com)
2. اختر "Add new site" → "Deploy manually"
3. اسحب مجلد `dist`

### الخطوة 3: إعدادات Netlify

في **Site settings** → **Build & deploy**:

```
Build command: npm run build
Publish directory: dist
Node version: 18.x
```

### الخطوة 4: متغيرات البيئة

في **Settings** → **Build & deploy** → **Environment**:

```
VITE_API_BASE_URL = https://your-backend.herokuapp.com
VITE_GITHUB_CLIENT_ID = xxxx
VITE_GITHUB_REDIRECT_URI = https://your-site.netlify.app/auth/callback
```

---

## نشر Backend على Heroku

### الخطوة 1: إنشاء حساب Heroku

اذهب إلى [heroku.com](https://www.heroku.com) وأنشئ حساباً

### الخطوة 2: تثبيت Heroku CLI

```bash
# Windows
choco install heroku-cli

# macOS
brew tap heroku/brew && brew install heroku

# Linux
curl https://cli-assets.heroku.com/install.sh | sh
```

### الخطوة 3: تسجيل الدخول

```bash
heroku login
```

### الخطوة 4: إنشاء تطبيق Heroku

```bash
cd backend
heroku create your-app-name
```

### الخطوة 5: إضافة قاعدة البيانات

```bash
heroku addons:create heroku-postgresql:hobby-dev --app your-app-name
```

### الخطوة 6: تعيين متغيرات البيئة

```bash
heroku config:set \
  NODE_ENV=production \
  GITHUB_CLIENT_ID=xxxx \
  GITHUB_CLIENT_SECRET=xxxx \
  GITHUB_REDIRECT_URI=https://your-site.netlify.app/auth/callback \
  DEVELOPER_CODE_HASH=xxxx \
  ANTHROPIC_BASE_URL=http://localhost:20128 \
  ANTHROPIC_AUTH_TOKEN=xxxx \
  SESSION_SECRET=$(openssl rand -hex 32) \
  ENCRYPTION_KEY=$(openssl rand -hex 16) \
  CORS_ORIGIN=https://your-site.netlify.app \
  --app your-app-name
```

### الخطوة 7: النشر

```bash
git push heroku main
```

---

## نشر Backend على Railway

### الخطوة 1: إنشاء حساب

اذهب إلى [railway.app](https://railway.app)

### الخطوة 2: الربط مع GitHub

1. اختر "New Project"
2. اختر "Deploy from GitHub repo"
3. اختر المشروع الخاص بك

### الخطوة 3: تكوين البناء

في **Settings**:
- **Root Directory**: `backend`
- **Build Command**: `npm run build`
- **Start Command**: `npm start`

### الخطوة 4: إضافة PostgreSQL

1. اختر "Add" → "Add from Marketplace"
2. اختر PostgreSQL
3. سيتم تعيين `DATABASE_URL` تلقائياً

### الخطوة 5: متغيرات البيئة

في **Variables**:
```
NODE_ENV=production
PORT=3001
GITHUB_CLIENT_ID=xxxx
GITHUB_CLIENT_SECRET=xxxx
GITHUB_REDIRECT_URI=https://your-site.netlify.app/auth/callback
DEVELOPER_CODE_HASH=xxxx
ANTHROPIC_BASE_URL=xxxx
ANTHROPIC_AUTH_TOKEN=xxxx
SESSION_SECRET=xxxx
ENCRYPTION_KEY=xxxx
CORS_ORIGIN=https://your-site.netlify.app
```

---

## نشر على Render

### الخطوة 1: إنشاء حساب

اذهب إلى [render.com](https://render.com)

### الخطوة 2: ربط مع GitHub

1. اختر "New" → "Web Service"
2. اختر repository الخاص بك

### الخطوة 3: الإعدادات

- **Root Directory**: `backend`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Environment**: Node

### الخطوة 4: قاعدة البيانات

1. اختر "New+" → "PostgreSQL"
2. سيتم توفير `DATABASE_URL` تلقائياً

### الخطوة 5: متغيرات البيئة

أضف جميع المتغيرات المطلوبة

---

## نشر الاثنين معاً على Railway

### البنية:
```
your-repo/
├── backend/
├── frontend/
└── railway.json
```

### ملف `railway.json`:

```json
{
  "services": [
    {
      "name": "frontend",
      "rootDir": "frontend",
      "buildCommand": "npm run build",
      "startCommand": "npm start",
      "envPath": ".env.production"
    },
    {
      "name": "backend",
      "rootDir": "backend",
      "buildCommand": "npm run build",
      "startCommand": "npm start",
      "envPath": ".env"
    }
  ]
}
```

---

## قائمة التحقق قبل النشر

### GitHub OAuth
- [ ] أنشئت OAuth App على GitHub
- [ ] حددت Callback URL بشكل صحيح
- [ ] نسخت Client ID و Secret

### متغيرات البيئة
- [ ] حددت DATABASE_URL للـ Backend
- [ ] حددت VITE_API_BASE_URL للـ Frontend
- [ ] حددت جميع متغيرات Anthropic
- [ ] وليدت SESSION_SECRET و ENCRYPTION_KEY الآمنة

### الاختبار
- [ ] اختبرت Build محلياً: `npm run build`
- [ ] تحققت من CORS settings
- [ ] اختبرت GitHub OAuth flow
- [ ] اختبرت Chat messaging

### الأداء
- [ ] فعّلت Minification
- [ ] فعّلت Gzip Compression
- [ ] استخدمت CDN إن أمكن

---

## روابط مفيدة

- [Netlify Docs](https://docs.netlify.com)
- [Heroku Node.js](https://devcenter.heroku.com/articles/nodejs-support)
- [Railway Docs](https://docs.railway.app)
- [Render Docs](https://render.com/docs)

---

## استكشاف الأخطاء الشائعة

### خطأ: Build failed
```
الحل: تأكد من وجود جميع المتطلبات في package.json
```

### خطأ: CORS error
```
الحل: تحديث CORS_ORIGIN في Backend
```

### خطأ: Database connection
```
الحل: تحديث DATABASE_URL بشكل صحيح
```

### خطأ: GitHub OAuth
```
الحل: تحديث Callback URL في GitHub وفي المتغيرات
```

---

**تم التحضير! المشروع جاهز للنشر الآن! 🎉**
