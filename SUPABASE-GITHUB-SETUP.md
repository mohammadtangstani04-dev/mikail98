# راه‌اندازی BLOXYMAX روی GitHub Pages + Supabase

## وضعیت
این شاخه شامل پوسته ورود OTP و طرح اولیه دیتابیس است. تا زمان وارد کردن Project URL و Publishable Key و اجرای SQL، اتصال آنلاین فعال نمی‌شود. هیچ پرداخت واقعی در این نسخه فعال نیست.

## 1) ساخت Supabase
1. در https://supabase.com یک پروژه بساز.
2. از Project Settings > API مقدار Project URL و Publishable key را بردار.
3. در فایل supabase-config.js قرار بده. فقط کلید Publishable مجاز است؛ هرگز service_role/secret را در فایل‌های مرورگر قرار نده.
4. محتوای supabase/schema.sql را در SQL Editor اجرا کن.

## 2) ورود OTP
- در Authentication > Providers، Email و Phone را مطابق نیاز فعال کن.
- برای ایمیل OTP، قالب Email را طوری تنظیم کن که از {{ .Token }} استفاده کند.
- برای پیامک، SMS Provider و قالب OTP را پیکربندی کن.
- شماره تلفن‌ها را با کد کشور وارد کن، مانند +98912xxxxxxx. امکان ارسال پیامک به کشور/اپراتور به ارائه‌دهنده SMS بستگی دارد.

## 3) انتشار GitHub Pages
- Repository > Settings > Pages
- Build and deployment: Deploy from a branch
- Branch: شاخه bloxymax-supabase-migration و پوشه /(root)
- Save. برای URL پروژه‌ای، مسیر سایت شامل نام مخزن خواهد بود.
- پس از ادغام تغییرات به main، منبع Pages را روی main قرار بده.

## 4) امنیت
- RLS را خاموش نکن.
- نقش مدیر را فقط از app_metadata سمت سرور به حساب مورداعتماد اختصاص بده.
- پرداخت را فقط پس از پیاده‌سازی درگاه و تأیید server-to-server موفق اعلام کن.
- کلیدهای خصوصی، توکن‌ها و فایل .env را در GitHub commit نکن.

## 5) محدودیت فعلی
کد ورود OTP آماده اتصال است، اما سفارش‌های صفحات فعلی هنوز در حال انتقال از localStorage به RPC دیتابیس هستند. قبل از فروش واقعی باید کاتالوگ محصولات به جدول products وارد و checkout متصل و تست شود.
