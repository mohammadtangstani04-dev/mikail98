(function () {
  const cfg = window.BLOXYMAX_SUPABASE || {};
  const css = `
  #bx-auth-launch{position:fixed;left:18px;bottom:18px;z-index:9998;border:0;border-radius:999px;padding:12px 18px;background:linear-gradient(120deg,#7c3aed,#0891b2);color:#fff;font:700 14px Vazirmatn, sans-serif;box-shadow:0 8px 30px #0008;cursor:pointer}
  #bx-auth-layer{position:fixed;inset:0;z-index:9999;background:#050711d9;display:none;align-items:center;justify-content:center;padding:18px;direction:rtl;font-family:Vazirmatn,sans-serif}
  #bx-auth-card{width:min(440px,100%);background:#111827;border:1px solid #ffffff20;border-radius:22px;padding:24px;color:#f8fafc;box-shadow:0 24px 80px #000a}
  #bx-auth-card h2{margin:0 0 8px;font-size:22px}#bx-auth-card p{color:#a5b4c8;font-size:13px;line-height:1.9}
  #bx-auth-card input,#bx-auth-card select{width:100%;box-sizing:border-box;margin:8px 0;padding:13px;border-radius:12px;border:1px solid #ffffff25;background:#0b1220;color:#fff;font:inherit}
  #bx-auth-card button{border:0;border-radius:12px;padding:12px 16px;font:700 14px Vazirmatn,sans-serif;cursor:pointer}
  #bx-auth-submit{width:100%;background:#8b5cf6;color:white;margin-top:8px}#bx-auth-close{background:#ffffff12;color:white;float:left}
  #bx-auth-message{min-height:24px;color:#67e8f9;font-size:13px;margin-top:8px}
  #bx-auth-user{position:fixed;left:18px;bottom:76px;z-index:9997;background:#111827;color:#fff;border:1px solid #ffffff22;border-radius:12px;padding:10px 14px;font:13px Vazirmatn,sans-serif;display:none}
  `;
  const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
  const launch=document.createElement('button');launch.id='bx-auth-launch';launch.textContent='ورود / حساب کاربری';document.body.appendChild(launch);
  const user=document.createElement('div');user.id='bx-auth-user';document.body.appendChild(user);
  const layer=document.createElement('div');layer.id='bx-auth-layer';
  layer.innerHTML=`<section id="bx-auth-card" role="dialog" aria-modal="true" aria-label="ورود به حساب">
    <button id="bx-auth-close" type="button">بستن</button><h2>حساب کاربری BLOXYMAX</h2>
    <p>برای ورود، شماره موبایل یا ایمیل خود را وارد کن. کد یک‌بارمصرف برایت ارسال می‌شود.</p>
    <select id="bx-auth-method"><option value="phone">شماره موبایل (پیامک)</option><option value="email">ایمیل</option></select>
    <input id="bx-auth-identity" autocomplete="username" placeholder="مثلاً 09123456789 یا name@example.com">
    <input id="bx-auth-code" inputmode="numeric" autocomplete="one-time-code" placeholder="کد تأیید ۶ رقمی" style="display:none">
    <button id="bx-auth-submit" type="button">ارسال کد تأیید</button><div id="bx-auth-message" aria-live="polite"></div>
  </section>`;
  document.body.appendChild(layer);
  const $=id=>document.getElementById(id);
  let client=null,step='send',method='phone';
  function message(t){$('bx-auth-message').textContent=t;}
  function open(){layer.style.display='flex';}
  function close(){layer.style.display='none';}
  launch.addEventListener('click',open);$('bx-auth-close').addEventListener('click',close);
  layer.addEventListener('click',e=>{if(e.target===layer)close();});
  $('bx-auth-method').addEventListener('change',e=>{method=e.target.value;$('bx-auth-identity').placeholder=method==='phone'?'مثلاً 09123456789':'name@example.com';});
  function refresh(session){
    if(session&&session.user){const label=session.user.phone||session.user.email||'کاربر';user.textContent='حساب: '+label+'  |  خروج';user.style.display='block';launch.style.display='none';user.onclick=async()=>{if(client){await client.auth.signOut();location.reload();}};}
    else{user.style.display='none';launch.style.display='block';}
  }
  if(cfg.url&&cfg.publishableKey&&window.supabase){client=window.supabase.createClient(cfg.url,cfg.publishableKey);window.BLOXYMAX_AUTH=client;client.auth.getSession().then(({data})=>refresh(data.session));client.auth.onAuthStateChange((_event,session)=>refresh(session));}
  else{launch.title='ابتدا تنظیمات Supabase در supabase-config.js وارد شود';}
  $('bx-auth-submit').addEventListener('click',async()=>{
    if(!client){message('اتصال Supabase هنوز تنظیم نشده است. راهنمای راه‌اندازی را ببین.');return;}
    const identity=$('bx-auth-identity').value.trim(),code=$('bx-auth-code').value.trim();
    if(step==='send'){
      if(!identity){message('شماره موبایل یا ایمیل را وارد کن.');return;}
      message('در حال ارسال کد…');
      const payload=method==='phone'?{phone:identity,options:{shouldCreateUser:true}}:{email:identity,options:{shouldCreateUser:true,emailRedirectTo:location.origin+location.pathname}};
      const {error}=await client.auth.signInWithOtp(payload);
      if(error){message(error.message);return;}
      step='verify';$('bx-auth-code').style.display='block';$('bx-auth-submit').textContent='تأیید و ورود';message('کد ارسال شد. کد را وارد کن.');
    }else{
      if(!/^\d{6}$/.test(code)){message('کد باید ۶ رقم باشد.');return;}
      message('در حال بررسی کد…');
      const payload=method==='phone'?{phone:identity,token:code,type:'sms'}:{email:identity,token:code,type:'email'};
      const {data,error}=await client.auth.verifyOtp(payload);
      if(error){message(error.message);return;}
      refresh(data.session);message('ورود موفق بود.');setTimeout(close,700);
    }
  });
})();
