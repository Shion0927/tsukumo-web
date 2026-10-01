// つくも Web の小さな補助。保存（localStorage）と、強化表の拡大縮小・スクロール。
window.tsukumo = {
  save: function (key, json) { try { localStorage.setItem('tsukumo.' + key, json); } catch (e) { } },
  load: function (key) { try { return localStorage.getItem('tsukumo.' + key); } catch (e) { return null; } },

  // 強化表：スマホは 2 本指のピンチ、PC はドラッグで移動・Ctrl+ホイールで拡大縮小。スクロールはブラウザ任せ（touch-action: pan-x pan-y）。
  // 倍率は wrap 要素の CSS 変数 --s に入れ、サイズと transform は CSS 側で計算する。
  initTree: function (wrap, initialScale) {
    if (!wrap) return;
    const MIN = 0.4, MAX = 1.6;
    const clamp = (s) => Math.min(MAX, Math.max(MIN, s));
    let scale = initialScale || (window.innerWidth >= 900 ? 1 : 0.8), start = 0, startScale = scale;
    const apply = () => { wrap.style.setProperty('--s', scale); };
    apply();

    // 画面上の点 (cx, cy) を固定したまま倍率を変える
    const zoomAt = (next, cx, cy) => {
      next = clamp(next);
      if (next === scale) return;
      const r = wrap.getBoundingClientRect();
      const px = (cx - r.left + wrap.scrollLeft) / scale, py = (cy - r.top + wrap.scrollTop) / scale;
      scale = next; apply();
      wrap.scrollLeft = px * scale - (cx - r.left);
      wrap.scrollTop = py * scale - (cy - r.top);
    };

    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    wrap.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) { start = dist(e.touches); startScale = scale; }
    }, { passive: true });
    wrap.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && start > 0) {
        e.preventDefault();
        scale = clamp(startScale * dist(e.touches) / start);
        apply();
      }
    }, { passive: false });
    wrap.addEventListener('touchend', () => { start = 0; }, { passive: true });

    // マウス：左ドラッグで盤面を動かす。動かしたときはクリックを武器の選択に流さない。
    let drag = null, moved = false;
    wrap.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      drag = { x: e.clientX, y: e.clientY, l: wrap.scrollLeft, t: wrap.scrollTop }; moved = false;
    });
    window.addEventListener('mousemove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!moved && Math.abs(dx) + Math.abs(dy) > 4) { moved = true; wrap.classList.add('dragging'); }
      if (moved) { wrap.scrollLeft = drag.l - dx; wrap.scrollTop = drag.t - dy; e.preventDefault(); }
    });
    window.addEventListener('mouseup', () => { drag = null; wrap.classList.remove('dragging'); });
    wrap.addEventListener('click', (e) => {
      if (moved) { moved = false; e.stopPropagation(); e.preventDefault(); }
    }, true);
    wrap.addEventListener('wheel', (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      zoomAt(scale * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX, e.clientY);
    }, { passive: false });

    wrap.__tsukumoSetScale = (s) => { scale = clamp(s); apply(); };
    wrap.__tsukumoGetScale = () => scale;
    wrap.__tsukumoZoomBy = (f) => {
      const r = wrap.getBoundingClientRect();
      zoomAt(scale * f, r.left + r.width / 2, r.top + r.height / 2);
    };
  },
  setTreeScale: function (wrap, s) { if (wrap && wrap.__tsukumoSetScale) wrap.__tsukumoSetScale(s); },
  getTreeScale: function (wrap) { return wrap && wrap.__tsukumoGetScale ? wrap.__tsukumoGetScale() : 1; },
  zoomTree: function (wrap, f) { if (wrap && wrap.__tsukumoZoomBy) wrap.__tsukumoZoomBy(f); },
  // 盤面全体が横幅に収まる倍率にする（上限・下限の範囲で）
  fitTree: function (wrap) {
    if (!wrap || !wrap.__tsukumoSetScale) return;
    const sizer = wrap.firstElementChild;
    const w = sizer ? parseFloat(sizer.style.getPropertyValue('--w')) : 0;
    if (w > 0) { wrap.__tsukumoSetScale((wrap.clientWidth - 8) / w); wrap.scrollLeft = 0; }
  },
  // 指定した盤面座標が横方向の中央、縦は上端に来るようにスクロールする
  scrollTreeTo: function (wrap, x, y) {
    if (!wrap) return;
    const s = wrap.__tsukumoGetScale ? wrap.__tsukumoGetScale() : 1;
    wrap.scrollLeft = x * s - wrap.clientWidth / 2;
    wrap.scrollTop = Math.max(0, y * s - 8);
  },
  copy: async function (text) { await navigator.clipboard.writeText(text); },
  paste: async function () { return await navigator.clipboard.readText(); },
  scrollToId: function (id) { const el = document.getElementById(id); if (el) el.scrollIntoView({ block: 'nearest' }); }
};
