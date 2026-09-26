/* ==========================================================
   Casa 2.0 — Shared site behavior
   - Nav scroll state
   - Mobile burger overlay + overlay-close
   - IntersectionObserver reveal (.visible)
   - Parallax hero, card tilt, magnetic buttons
   - Contact form validation
   - Edit-mode (Tweaks) protocol bridge
   ========================================================== */
(function(){
  'use strict';

  /* ---------- NAV SCROLL STATE ---------- */
  const nav = document.getElementById('nav');
  if(nav){
    const isSolid = nav.classList.contains('solid');
    const setNav = () => { if(!isSolid) nav.classList.toggle('scrolled', window.scrollY > 40); };
    setNav();
    window.addEventListener('scroll', setNav, {passive:true});
  }

  /* ---------- BURGER / MOBILE OVERLAY ---------- */
  const burger  = document.getElementById('burger');
  const overlay = document.getElementById('nav-overlay');
  if(burger && overlay){
    const closeOverlay = () => {
      burger.classList.remove('open');
      overlay.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    };
    burger.addEventListener('click', ()=>{
      const open = !burger.classList.contains('open');
      burger.classList.toggle('open', open);
      overlay.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    document.getElementById('overlay-close')?.addEventListener('click', closeOverlay);
    overlay.querySelectorAll('a').forEach(a => a.addEventListener('click', closeOverlay));
  }

  /* ---------- REVEAL OBSERVER (base + direzionali + stagger + line) ---------- */
  const REVEAL_SEL = '.reveal, .reveal--left, .reveal--right, .reveal--up, .reveal--scale, .stagger, .line-reveal';
  if('IntersectionObserver' in window){
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll(REVEAL_SEL).forEach(el => io.observe(el));
  } else {
    document.querySelectorAll(REVEAL_SEL).forEach(el => el.classList.add('visible'));
  }

  /* ---------- PARALLAX HERO ---------- */
  const heroBg = document.querySelector('.hero__bg');
  if(heroBg){
    let ticking = false;
    window.addEventListener('scroll', ()=>{
      if(ticking) return;
      requestAnimationFrame(()=>{
        const y = window.scrollY;
        if(y < window.innerHeight * 1.2)
          heroBg.style.transform = `scale(1.06) translateY(${y * 0.22}px)`;
        ticking = false;
      });
      ticking = true;
    }, {passive:true});
  }

  /* ---------- MAGNETIC BUTTONS ---------- */
  document.querySelectorAll('.btn--lg').forEach(btn=>{
    btn.addEventListener('mousemove', e=>{
      const r = btn.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width/2);
      const dy = e.clientY - (r.top  + r.height/2);
      btn.style.transform = `translateY(-2px) translate(${dx*0.12}px,${dy*0.12}px)`;
    });
    btn.addEventListener('mouseleave', ()=>{ btn.style.transform = ''; });
  });

  /* ---------- CARD TILT ---------- */
  document.querySelectorAll('.pillar').forEach(card=>{
    card.addEventListener('mousemove', e=>{
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width  - 0.5;
      const y = (e.clientY - r.top)  / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateY(${x*4}deg) rotateX(${-y*3}deg) translateZ(4px)`;
    });
    card.addEventListener('mouseleave', ()=>{
      card.style.transform = '';
      card.style.transition = 'transform 500ms cubic-bezier(0.16,1,0.3,1)';
      setTimeout(()=>{ card.style.transition = ''; }, 500);
    });
  });

  /* ---------- CONTACT FORM ----------
     Lead delivery without a backend:
     1. If WEB3FORMS_KEY is set → POST to web3forms (free, no server). Lead arrives by email.
     2. Otherwise → fall back to mailto: so a lead is NEVER silently lost.
     To go live: create a free key at https://web3forms.com and paste it below. */
  const WEB3FORMS_KEY = ''; // <-- incolla qui la access key di web3forms per l'invio automatico
  const LEAD_EMAIL    = 'info@casaduepuntozero.net';

  const form    = document.getElementById('contact-form');
  const fstatus = document.getElementById('form-status');
  if(form && fstatus){
    const readFields = () => {
      const f = new FormData(form);
      return {
        nome:    (f.get('nome')    || '').trim(),
        cognome: (f.get('cognome') || '').trim(),
        email:   (f.get('email')   || '').trim(),
        tel:     (f.get('telefono')|| '').trim(),
        msg:     (f.get('messaggio')|| '').trim(),
        news:    f.get('newsletter') ? 'Sì' : 'No',
        privacy: f.get('privacy')
      };
    };
    const validate = (d) => {
      fstatus.className = 'form-status'; fstatus.textContent = '';
      if(!d.nome || !d.cognome){ fstatus.classList.add('error'); fstatus.textContent = 'Inserisci nome e cognome.'; return false; }
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)){ fstatus.classList.add('error'); fstatus.textContent = 'Inserisci un’email valida.'; return false; }
      if(!d.privacy){ fstatus.classList.add('error'); fstatus.textContent = 'Accetta la privacy policy per continuare.'; return false; }
      return true;
    };

    form.addEventListener('submit', async e=>{
      e.preventDefault();
      const d = readFields();
      if(!validate(d)) return;
      const btn = form.querySelector('[type="submit"]');
      const reset = () => { if(btn){ btn.disabled = false; btn.innerHTML = btn.dataset.label; } };
      if(btn){ btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.textContent = 'Invio…'; }

      // Webhook routing parallelo (n8n/Make) — best-effort
      if(window.Casa20 && window.Casa20.sendLead){
        window.Casa20.sendLead({ form:'contatti', ...d });
      }

      // Path 1 — web3forms (no backend, recapito email automatico)
      if(WEB3FORMS_KEY){
        try{
          const res = await fetch('https://api.web3forms.com/submit', {
            method:'POST', headers:{'Content-Type':'application/json', Accept:'application/json'},
            body: JSON.stringify({
              access_key: WEB3FORMS_KEY,
              subject: `Nuova richiesta dal sito — ${d.nome} ${d.cognome}`,
              from_name: `${d.nome} ${d.cognome}`,
              email: d.email, telefono: d.tel, newsletter: d.news, messaggio: d.msg
            })
          });
          if(res.ok){
            fstatus.classList.add('success');
            fstatus.textContent = '✓ Richiesta inviata! Ti ricontattiamo entro 24 ore.';
            form.reset();
          } else throw new Error('bad response');
        }catch(err){
          fstatus.classList.add('error');
          fstatus.textContent = 'Invio non riuscito. Scrivici su WhatsApp o chiama il 338 844 9030.';
        }
        reset();
        return;
      }

      // Path 2 — mailto fallback (il lead non si perde mai)
      const body = `Nome: ${d.nome} ${d.cognome}%0D%0AEmail: ${d.email}%0D%0ATelefono: ${d.tel || '—'}%0D%0ANewsletter: ${d.news}%0D%0A%0D%0AMessaggio:%0D%0A${encodeURIComponent(d.msg || '—')}`;
      window.location.href = `mailto:${LEAD_EMAIL}?subject=${encodeURIComponent('Richiesta dal sito — '+d.nome+' '+d.cognome)}&body=${body}`;
      fstatus.classList.add('success');
      fstatus.textContent = '✓ Si aprirà il tuo programma di posta: invia l’email già compilata. Oppure scrivici su WhatsApp.';
      reset();
    });

    // WhatsApp quick-send: porta i dati del form direttamente in chat
    const wa = document.getElementById('form-whatsapp');
    if(wa){
      wa.addEventListener('click', (e)=>{
        const d = readFields();
        const text = `Ciao Casa 2.0! Sono ${d.nome||''} ${d.cognome||''}.%0A${d.msg ? d.msg : 'Vorrei informazioni.'}%0A(email: ${d.email||'—'}, tel: ${d.tel||'—'})`;
        wa.href = `https://wa.me/393388449030?text=${text}`;
      });
    }
  }

  /* ---------- TWEAKS / EDIT-MODE PROTOCOL ---------- */
  const tweaks = document.getElementById('tweaks');
  if(tweaks){
    window.addEventListener('message', (ev)=>{
      const t = ev.data && ev.data.type;
      if(t === '__activate_edit_mode')   tweaks.classList.add('open');
      if(t === '__deactivate_edit_mode') tweaks.classList.remove('open');
    });
    const closer = document.getElementById('tweaks-close');
    if(closer) closer.addEventListener('click', ()=>{
      tweaks.classList.remove('open');
      try{ window.parent.postMessage({type:'__edit_mode_dismissed'}, '*'); }catch(e){}
    });
    try{ window.parent.postMessage({type:'__edit_mode_available'}, '*'); }catch(e){}
  }

  /* ---------- SCROLL PROGRESS BAR ---------- */
  (function(){
    const bar = document.createElement('div');
    bar.className = 'scroll-progress';
    document.body.appendChild(bar);
    let tick=false;
    const upd = ()=>{
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const p = max>0 ? h.scrollTop/max : 0;
      bar.style.transform = `scaleX(${p})`;
      tick=false;
    };
    window.addEventListener('scroll', ()=>{ if(!tick){ tick=true; requestAnimationFrame(upd); } }, {passive:true});
    upd();
  })();

  /* ---------- CUSTOM CURSOR (desktop fine pointer) ---------- */
  (function(){
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine   = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    if(reduce || !fine) return;
    document.body.classList.add('has-custom-cursor');
    const dot = document.createElement('div');  dot.className='cursor-dot';
    const ring= document.createElement('div');  ring.className='cursor-ring';
    document.body.appendChild(dot); document.body.appendChild(ring);
    let mx=innerWidth/2, my=innerHeight/2, rx=mx, ry=my, raf=null;
    function loop(){
      rx += (mx-rx)*0.18; ry += (my-ry)*0.18;
      ring.style.left=rx+'px'; ring.style.top=ry+'px';
      if(Math.abs(mx-rx) > 0.4 || Math.abs(my-ry) > 0.4){ raf = requestAnimationFrame(loop); }
      else { raf = null; }
    }
    window.addEventListener('mousemove', e=>{
      mx=e.clientX; my=e.clientY;
      dot.style.left=mx+'px'; dot.style.top=my+'px';
      if(raf === null) raf = requestAnimationFrame(loop);
    }, {passive:true});
    const hov = 'a, button, .btn, .pillar, .pcard, .vmember, .lf-btn, label, [role="button"]';
    const txt = 'input:not([type=checkbox]):not([type=radio]):not([type=submit]):not([type=button]), textarea, [contenteditable]';
    document.addEventListener('mouseover', e=>{
      if(e.target.closest(hov)) document.body.classList.add('cursor-hover');
      if(e.target.closest(txt)) document.body.classList.add('cursor-text');
    });
    document.addEventListener('mouseout',  e=>{
      if(e.target.closest(hov)) document.body.classList.remove('cursor-hover');
      if(e.target.closest(txt)) document.body.classList.remove('cursor-text');
    });
  })();

  /* ---------- CLICK RIPPLE su pulsanti e card ---------- */
  (function(){
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduce) return;
    // SKIP ripple sugli <a> di navigazione/CTA — il primo click deve arrivare al link senza interferenze
    document.addEventListener('pointerdown', e=>{
      const t = e.target.closest('.pcard, .vmember, .lf-btn');  // NO .btn / NO .immo__cta / NO .boss__btn (sono <a>)
      if(!t) return;
      const r = t.getBoundingClientRect();
      const span = document.createElement('span');
      span.className = 'ripple';
      const size = Math.max(r.width, r.height)*1.1;
      span.style.width = span.style.height = size+'px';
      span.style.left = (e.clientX - r.left)+'px';
      span.style.top  = (e.clientY - r.top)+'px';
      const pos = getComputedStyle(t).position;
      if(pos === 'static') t.style.position = 'relative';
      t.style.overflow = 'hidden';
      t.appendChild(span);
      setTimeout(()=>span.remove(), 650);
    }, {passive:true});
  })();

  /* ---------- FLOATING CTA DUAL — SEMPRE VISIBILE su tutte le pagine
     eccetto valuta + contattaci (dove l'utente è già in conversione) */
  (function(){
    const path = location.pathname;
    if(/\/(valuta|contattaci)\.html$/i.test(path)) return;
    if(document.querySelector('.fab')) return; // idempotente
    const fab = document.createElement('div');
    fab.className = 'fab is-expanded is-visible';   // visibile da subito
    const waMsg = encodeURIComponent('Ciao Casa 2.0, vorrei più informazioni.');
    fab.innerHTML = `
      <a class="fab--primary" href="valuta.html" aria-label="Valutazione gratuita">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12 L12 4 L21 12 M5 10 L5 20 L19 20 L19 10"/></svg>
        Valutazione gratuita
      </a>
      <a class="fab--wa" href="https://wa.me/393388449030?text=${waMsg}" target="_blank" rel="noopener" aria-label="Scrivici su WhatsApp">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.06c-.24.68-1.42 1.31-1.96 1.36-.5.05-.96.23-3.23-.67-2.72-1.07-4.45-3.84-4.58-4.02-.13-.18-1.1-1.46-1.1-2.79s.7-1.98.94-2.25c.24-.27.53-.34.7-.34h.5c.16.01.38-.06.59.45.24.58.81 2 .88 2.15.07.14.12.31.02.49-.09.18-.14.29-.27.45-.14.16-.29.36-.41.48-.14.14-.28.29-.12.56.16.27.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.21 1.37.27.14.43.12.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.23.61-.14.25.09 1.6.75 1.87.89.27.14.45.2.52.31.07.12.07.66-.17 1.34z"/></svg>
        WhatsApp
      </a>`;
    document.body.appendChild(fab);
  })();

  /* ---------- EXIT-INTENT MODAL — discreto ----------
     Mostra UNA SOLA volta per sessione, e solo se:
       - desktop fine pointer (no mobile, no touch — non c'è "exit intent" valido)
       - utente è da almeno 30s sulla pagina
       - sposta il mouse rapidamente verso l'alto fuori dal viewport
       - non ha già accettato cookie + non ha già visto il modal
     E non lo mostriamo nella pagina /valuta.html (sarebbe contraddittorio). */
  (function(){
    const fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    if(!fine) return;
    if(sessionStorage.getItem('casa2_exit_shown')) return;
    if(/\/valuta\.html$/i.test(location.pathname)) return;
    let armed = false; setTimeout(()=>{ armed = true; }, 30000);
    let shown = false;
    function build(){
      const m = document.createElement('div'); m.id='exit-modal';
      m.innerHTML = `
        <div class="em-card" role="dialog" aria-labelledby="em-title">
          <button type="button" class="em-close" aria-label="Chiudi">&times;</button>
          <p class="em-eyebrow">Prima di andare</p>
          <h3 id="em-title">Sai quanto vale<br/>la tua <em>casa</em>?</h3>
          <p>Ti diamo una stima professionale e gratuita entro 24 ore. Basata sui dati reali del mercato di Tivoli. Senza obblighi.</p>
          <div class="em-cta">
            <a class="btn btn--lg" href="valuta.html">Valutazione gratuita</a>
            <a class="btn btn--outline btn--lg" href="https://wa.me/393388449030" target="_blank" rel="noopener">WhatsApp</a>
          </div>
          <p class="em-note">Risposta entro 24 ore · nessun obbligo</p>
        </div>`;
      document.body.appendChild(m);
      requestAnimationFrame(()=> m.classList.add('is-visible'));
      const dismiss = ()=>{ m.classList.remove('is-visible'); setTimeout(()=> m.remove(), 500); };
      m.querySelector('.em-close').addEventListener('click', dismiss);
      m.addEventListener('click', e=>{ if(e.target === m) dismiss(); });
      document.addEventListener('keydown', e=>{ if(e.key==='Escape') dismiss(); }, {once:true});
    }
    document.addEventListener('mouseleave', (e)=>{
      if(!armed || shown) return;
      if(e.clientY <= 4){ shown = true; sessionStorage.setItem('casa2_exit_shown','1'); build(); }
    });
  })();

  /* ---------- COOKIE BANNER GDPR ----------
     Mostra il banner solo se non c'è ancora consenso registrato.
     Eventi: window.__casa2_loadAnalytics() viene chiamato solo dopo accept. */
  (function(){
    if(localStorage.getItem('casa2_cookie') ) return;
    const banner = document.createElement('div');
    banner.id = 'cookie-banner';
    banner.innerHTML = `
      <p>Usiamo cookie tecnici essenziali per il funzionamento del sito e, con il tuo consenso, cookie di analisi anonimi per migliorare l'esperienza. Nessun dato di profilazione. <a href="cookie.html">Cookie Policy</a> · <a href="privacy.html">Privacy</a>.</p>
      <div class="cb-actions">
        <button type="button" data-cb="decline">Solo essenziali</button>
        <button type="button" class="is-primary" data-cb="accept">Accetta tutti</button>
      </div>`;
    document.body.appendChild(banner);
    document.body.classList.add('cookie-active');
    requestAnimationFrame(()=> banner.classList.add('is-visible'));
    const finish = (val)=>{
      localStorage.setItem('casa2_cookie', val);
      localStorage.setItem('casa2_cookie_at', new Date().toISOString());
      banner.classList.remove('is-visible');
      document.body.classList.remove('cookie-active');
      setTimeout(()=> banner.remove(), 600);
      if(val === 'accept' && typeof window.__casa2_loadAnalytics === 'function'){
        window.__casa2_loadAnalytics();
      }
    };
    banner.querySelector('[data-cb="accept"]').addEventListener('click', ()=> finish('accept'));
    banner.querySelector('[data-cb="decline"]').addEventListener('click', ()=> finish('decline'));
  })();

  /* ---------- NUMBER TICKER (conteggio su scroll) — adattato da MagicUI ---------- */
  (function(){
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const nums = document.querySelectorAll('.trust__num em');
    if(!nums.length) return;
    const ease = t => 1 - Math.pow(1 - t, 3);
    const run = (el)=>{
      const target = parseInt(el.dataset.target ?? el.textContent, 10);
      if(isNaN(target)) return;
      if(reduce){ el.textContent = target; return; }
      const dur = 1500; const t0 = performance.now();
      const tick = (now)=>{
        const p = Math.min((now - t0)/dur, 1);
        el.textContent = Math.round(ease(p) * target);
        if(p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if('IntersectionObserver' in window){
      const io = new IntersectionObserver((es)=>{
        es.forEach(e=>{ if(e.isIntersecting){ run(e.target); io.unobserve(e.target); } });
      }, { threshold: 0.6 });
      nums.forEach(n=>{ n.dataset.target = parseInt(n.textContent,10); n.textContent='0'; io.observe(n); });
    }
  })();

  window.Casa20 = {
    persistTweak(edits){
      try{ window.parent.postMessage({type:'__edit_mode_set_keys', edits}, '*'); }catch(e){}
    },
    /* WEBHOOK LEAD ROUTING — quando tu metti l'URL n8n/Make qui sotto,
       OGNI lead viene anche replicato a quel webhook (oltre a web3forms/mailto).
       Esempi:
         window.CASA2_WEBHOOK = 'https://hook.eu1.make.com/abc123';   // Make.com
         window.CASA2_WEBHOOK = 'https://n8n.tuo-dominio.com/webhook/casa2'; // n8n
       Vedi src/N8N_SETUP.md per la guida workflow. */
    async sendLead(payload){
      const url = window.CASA2_WEBHOOK || '';
      if(!url) return false;
      try{
        await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({
          ...payload,
          source: location.pathname,
          page_title: document.title,
          timestamp: new Date().toISOString(),
          referrer: document.referrer || null
        })});
        return true;
      }catch(e){ return false; }
    }
  };

  /* ---------- ANALYTICS GATED (carica solo dopo consenso esplicito) ----------
     Quando hai i ti tuoi ID, rimpiazza ANALYTICS_ID / CLARITY_ID.
     I cookie banner accept → richiama questa funzione automaticamente. */
  window.__casa2_loadAnalytics = function(){
    const GA4_ID = '';         // es: 'G-XXXXXXXXXX'  -- mettilo dopo
    const CLARITY_ID = '';     // es: 'abcdef1234'    -- mettilo dopo
    if(GA4_ID){
      const s1 = document.createElement('script'); s1.async=true; s1.src='https://www.googletagmanager.com/gtag/js?id='+GA4_ID;
      document.head.appendChild(s1);
      window.dataLayer = window.dataLayer || [];
      function gtag(){ dataLayer.push(arguments); }
      window.gtag = gtag;
      gtag('js', new Date()); gtag('config', GA4_ID, { anonymize_ip:true });
    }
    if(CLARITY_ID){
      (function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, 'clarity', 'script', CLARITY_ID);
    }
  };
  // Se già acconsentito in sessione precedente, carica subito
  if(localStorage.getItem('casa2_cookie') === 'accept'){
    requestAnimationFrame(()=> window.__casa2_loadAnalytics && window.__casa2_loadAnalytics());
  }
})();
