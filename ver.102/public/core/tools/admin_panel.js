/**
 * Võ Lâm Idle - Dev Control Suite v4.0 (Offline Native Edition)
 * Tích hợp FontAwesome offline, kết nối trực tiếp state engine (window.o, window.r).
 */
(function() {
  'use strict';

  // 1. Helpers
  function getPlayer() {
    return window.o || window.S || null;
  }

  function getRuntime() {
    return window.r || window.R || null;
  }

  function notify(msg) {
    if (typeof window.gameToast === 'function') {
      window.gameToast(msg);
    } else {
      console.log('[DEV]', msg);
    }
  }

  function refreshGame() {
    if (typeof window.setDirty === 'function') window.setDirty();
    if (typeof window.gameSave === 'function') window.gameSave();
    if (typeof window.gameRender === 'function') window.gameRender();
    const p = getPlayer();
    if (p) {
      const goldEl = document.getElementById('gold');
      if (goldEl && p.gold !== undefined) goldEl.innerText = p.gold;
      const knbTopEl = document.getElementById('knbTop');
      if (knbTopEl && p.knb !== undefined) knbTopEl.innerText = p.knb;
      const lvEl = document.getElementById('lv');
      if (lvEl && p.lvl !== undefined) lvEl.innerText = p.lvl;
      const lvSEl = document.getElementById('lvS');
      if (lvSEl && p.lvl !== undefined) lvSEl.innerText = p.lvl;
    }
  }

  // 2. Hack State & Intervals
  window.__devGodMode = false;
  window.__devOneHit = false;
  window.__devSpeed = 1;

  // Combat loop monitor for God Mode & One Hit
  setInterval(() => {
    const r = getRuntime();
    if (!r) return;

    if (window.__devGodMode) {
      r.life = 1;
      r.mana = 1;
      if (r.P) {
        if (r.P.maxhp) r.P.hp = r.P.maxhp;
        if (r.P.maxmp) r.P.mp = r.P.maxmp;
      }
    }

    if (window.__devOneHit && r.enemies && r.enemies.length > 0) {
      for (let i = 0; i < r.enemies.length; i++) {
        const mon = r.enemies[i];
        if (mon && !mon.dead && mon.hp > 0) {
          mon.hp = 0;
          mon.dead = true;
          if (typeof mon.onDeath === 'function') {
            try { mon.onDeath(); } catch (e) {}
          }
        }
      }
    }
  }, 100);

  // Speed Hack via requestAnimationFrame
  const origRAF = window.requestAnimationFrame;
  window.requestAnimationFrame = function(cb) {
    return origRAF(function(time) {
      if (window.__devSpeed > 1) {
        const count = Math.min(window.__devSpeed, 10);
        for (let i = 0; i < count; i++) {
          try { cb(performance.now()); } catch (e) {}
        }
      } else {
        cb(time);
      }
    });
  };

  // 3. Item Creation Engine
  function createSetItem(kind, tmpl, level) {
    const J = window.JX;
    const o = getPlayer();
    if (!J || !tmpl || !o) return null;

    const s = Math.min(6, level || 10);
    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
    const h = () => clamp(Math.round(s + (10 - s) * Math.pow(Math.random(), 1.5)), 0, 10);

    function geValue(n, t) {
      const e = J.ge ? J.ge[n] : null;
      return e ? { a: e.a, p: e.p.map(([low, high]) => (low === -1 && high === -1 ? -1 : Math.round(low + (high - low) * t / 10))), pre: 1 } : null;
    }
    function geValueJX(n) {
      const t = J.ge ? J.ge[n] : null;
      return t ? { a: t.a, p: t.p.map(([low, high]) => (low === -1 && high === -1 ? -1 : Math.min(low, high) + Math.floor(Math.random() * (Math.abs(high - low) + 1)))), pre: 1 } : null;
    }

    const platName = (n) => (/^\[/.test(n) ? n : '[Bạch Kim] ' + n);
    const it = {
      uid: o.uid++,
      d: tmpl.d,
      k: tmpl.k,
      n: kind === 'platina' ? platName(tmpl.n) : tmpl.n,
      ic: tmpl.ic || '',
      lvl: tmpl.lvl,
      s: tmpl.s,
      price: tmpl.price,
      base: tmpl.base ? tmpl.base.map(i => i.slice()) : [],
      req: tmpl.req ? tmpl.req.map(i => i.slice()) : [],
      r: kind === 'gold' ? 4 : 5,
      set: { kind: kind, grp: tmpl.grp, n1: tmpl.n1 || 99, n2: tmpl.n2 || 99, sid: tmpl.sid }
    };

    const l = kind === 'gold' ? geValueJX : (i => geValue(i, h()));
    it.mag = (tmpl.mag || []).map(l).filter(Boolean);
    it.ext = (tmpl.ext || []).map(l).filter(Boolean);
    it.enh = 10;
    if (kind === 'platina') it.plv = 10;
    return it;
  }

  function addItemToPlayer(item) {
    const o = getPlayer();
    if (!o) {
      notify('Chưa nạp được dữ liệu nhân vật!');
      return false;
    }
    if (!o.inv) o.inv = [];
    if (o.inv.length >= 60) {
      notify('Hành trang đã đầy (60/60)!');
      return false;
    }
    o.inv.push(item);
    refreshGame();
    return true;
  }

  // 4. UI Injection: Floating Button & Modal
  function initDevUI() {
    if (document.getElementById('devFloatBtn')) return;

    // Floating Button
    const btn = document.createElement('div');
    btn.id = 'devFloatBtn';
    btn.innerHTML = `
      <i class="fa-solid fa-screwdriver-wrench dev-icon"></i>
      <span>DEV</span>
    `;
    document.body.appendChild(btn);

    // Draggable logic with position persistence
    const savedPos = localStorage.getItem('vli_dev_btn_pos');
    if (savedPos) {
      try {
        const { x, y } = JSON.parse(savedPos);
        btn.style.left = x + 'px';
        btn.style.top = y + 'px';
        btn.style.right = 'auto';
        btn.style.bottom = 'auto';
      } catch (e) {}
    }

    let isDragging = false, startX, startY, origLeft, origTop, hasMoved = false;

    function onPointerDown(e) {
      isDragging = true;
      hasMoved = false;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      startX = clientX;
      startY = clientY;
      const rect = btn.getBoundingClientRect();
      origLeft = rect.left;
      origTop = rect.top;
      document.addEventListener('mousemove', onPointerMove);
      document.addEventListener('mouseup', onPointerUp);
      document.addEventListener('touchmove', onPointerMove, { passive: false });
      document.addEventListener('touchend', onPointerUp);
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = clientX - startX;
      const dy = clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved = true;
      let newLeft = Math.max(10, Math.min(window.innerWidth - 65, origLeft + dx));
      let newTop = Math.max(10, Math.min(window.innerHeight - 65, origTop + dy));
      btn.style.left = newLeft + 'px';
      btn.style.top = newTop + 'px';
      btn.style.right = 'auto';
      btn.style.bottom = 'auto';
      if (e.cancelable) e.preventDefault();
    }

    function onPointerUp() {
      if (!isDragging) return;
      isDragging = false;
      document.removeEventListener('mousemove', onPointerMove);
      document.removeEventListener('mouseup', onPointerUp);
      document.removeEventListener('touchmove', onPointerMove);
      document.removeEventListener('touchend', onPointerUp);
      if (hasMoved) {
        const rect = btn.getBoundingClientRect();
        localStorage.setItem('vli_dev_btn_pos', JSON.stringify({ x: rect.left, y: rect.top }));
      } else {
        openDevModal();
      }
    }

    btn.addEventListener('mousedown', onPointerDown);
    btn.addEventListener('touchstart', onPointerDown, { passive: false });

    // Ensure FontAwesome offline link is active
    if (!document.querySelector('link[href*="fontawesome"]')) {
      const faLink = document.createElement('link');
      faLink.rel = 'stylesheet';
      faLink.href = 'core/lib/fontawesome.min.css';
      document.head.appendChild(faLink);
    }
  }

  // 5. Dev Modal Dialog
  function openDevModal() {
    let overlay = document.getElementById('devModalOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'devModalOverlay';
      overlay.className = 'dev-modal-overlay';
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="dev-panel">
        <div class="dev-panel-header">
          <div class="dev-panel-title">
            <i class="fa-solid fa-screwdriver-wrench" style="color: #ff9800; margin-right: 8px;"></i>
            VÕ LÂM IDLE — GM CONTROL SUITE
          </div>
          <button id="devModalClose" style="background:none;border:none;color:#aaa;font-size:18px;cursor:pointer;"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div style="display:flex; background:#1c221f; border-bottom:1px solid #3d3420; overflow-x:auto;">
          <button class="dev-tab-btn active" data-tab="tab-char"><i class="fa-solid fa-user-shield"></i> Nhân Vật</button>
          <button class="dev-tab-btn" data-tab="tab-combat"><i class="fa-solid fa-burst"></i> Hack Chiến Đấu</button>
          <button class="dev-tab-btn" data-tab="tab-gold"><i class="fa-solid fa-crown"></i> Hoàng Kim Phái</button>
          <button class="dev-tab-btn" data-tab="tab-platina"><i class="fa-solid fa-gem"></i> Bạch Kim</button>
          <button class="dev-tab-btn" data-tab="tab-items"><i class="fa-solid fa-horse-head"></i> Ngựa & Đạo Cụ</button>
        </div>
        <div class="dev-panel-body" id="devTabContent">
          <!-- Dynamically populated -->
        </div>
      </div>
    `;

    overlay.style.display = 'flex';

    overlay.querySelector('#devModalClose').onclick = () => {
      overlay.style.display = 'none';
    };

    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.style.display = 'none';
    };

    const tabBtns = overlay.querySelectorAll('.dev-tab-btn');
    tabBtns.forEach(b => {
      b.onclick = () => {
        tabBtns.forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        renderTab(b.dataset.tab);
      };
    });

    renderTab('tab-char');
  }

  // 6. Tab Content Renderers
  function renderTab(tabId) {
    const container = document.getElementById('devTabContent');
    if (!container) return;
    const o = getPlayer();

    if (tabId === 'tab-char') {
      container.innerHTML = `
        <div style="margin-bottom:14px; font-weight:bold; color:#ffc107;">
          <i class="fa-solid fa-coins"></i> Tiền Tệ & Điểm Thuộc Tính
        </div>
        <div class="dev-btn-grid">
          <button class="dev-action-btn" id="btnAddGold"><i class="fa-solid fa-coins"></i> +10,000,000 Lượng</button>
          <button class="dev-action-btn" id="btnAddKnb"><i class="fa-solid fa-gem"></i> +100,000 KNB</button>
          <button class="dev-action-btn" id="btnAddAttr"><i class="fa-solid fa-dumbbell"></i> +500 Tiềm Năng</button>
          <button class="dev-action-btn" id="btnAddSkill"><i class="fa-solid fa-book-sparkles"></i> +50 Kỹ Năng</button>
          <button class="dev-action-btn" id="btnMaxAllSkills" style="border-color:#00e676; color:#b9f6ca;"><i class="fa-solid fa-graduation-cap"></i> Max All Skill (90, 120, 150)</button>
          <button class="dev-action-btn" id="btnResetPts" style="border-color:#e65100;"><i class="fa-solid fa-rotate-left"></i> Tẩy Tủy / Hoàn Điểm</button>
        </div>

        <div style="margin: 18px 0 10px 0; font-weight:bold; color:#ffc107;">
          <i class="fa-solid fa-chart-line"></i> Thiết Lập Cấp Độ (Level)
        </div>
        <div class="dev-btn-grid">
          <button class="dev-action-btn" id="btnSetLv90"><i class="fa-solid fa-turn-up"></i> Cấp 90 (Nhập Môn)</button>
          <button class="dev-action-btn" id="btnSetLv120"><i class="fa-solid fa-shield"></i> Cấp 120 (Kỹ Năng 120)</button>
          <button class="dev-action-btn" id="btnSetLv150"><i class="fa-solid fa-dragon"></i> Cấp 150 (Kỹ Năng 150)</button>
          <button class="dev-action-btn" id="btnSetLv200"><i class="fa-solid fa-award"></i> Cấp 200 (Max Cap)</button>
        </div>
        <div style="display:flex; gap:10px; align-items:center; margin-top:8px;">
          <input type="number" id="inpCustomLv" placeholder="Cấp độ tùy chọn..." min="1" max="250" value="${o ? o.lvl : 1}" style="background:#252e2a; border:1px solid #485c54; color:#fff; padding:6px 10px; border-radius:4px; width:150px;">
          <button class="dev-action-btn" id="btnApplyCustomLv"><i class="fa-solid fa-check"></i> Đặt Cấp Độ</button>
        </div>

        <div style="margin: 18px 0 10px 0; font-weight:bold; color:#ffc107;">
          <i class="fa-solid fa-box-open"></i> Tiện Ích Hành Trang
        </div>
        <div class="dev-btn-grid">
          <button class="dev-action-btn" id="btnClearTrash"><i class="fa-solid fa-trash-can"></i> Dọn Đồ Rác Trắng/Xanh</button>
          <button class="dev-action-btn" id="btnClearAllInv" style="border-color:#d32f2f; color:#ff8a80;"><i class="fa-solid fa-bomb"></i> Xóa Hết Hành Trang</button>
        </div>
      `;

      // Handlers
      container.querySelector('#btnAddGold').onclick = () => {
        if (!o) return notify('Chưa có nhân vật');
        o.gold = (o.gold || 0) + 10000000;
        refreshGame();
        notify('Đã thêm 10.000.000 Lượng!');
      };
      container.querySelector('#btnAddKnb').onclick = () => {
        if (!o) return notify('Chưa có nhân vật');
        o.knb = (o.knb || 0) + 100000;
        refreshGame();
        notify('Đã thêm 100.000 KNB!');
      };
      container.querySelector('#btnAddAttr').onclick = () => {
        if (!o) return notify('Chưa có nhân vật');
        o.attrPts = (o.attrPts || 0) + 500;
        refreshGame();
        notify('Đã thêm 500 Điểm Tiềm Năng!');
      };
      container.querySelector('#btnAddSkill').onclick = () => {
        if (!o) return notify('Chưa có nhân vật');
        o.skPts = (o.skPts || 0) + 50;
        refreshGame();
        notify('Đã thêm 50 Điểm Kỹ Năng!');
      };
      container.querySelector('#btnResetPts').onclick = () => {
        if (!o) return notify('Chưa có nhân vật');
        let totalAttr = (o.attr ? (o.attr.str + o.attr.dex + o.attr.vit + o.attr.eng) : 0) + (o.attrPts || 0);
        o.attr = { str: 0, dex: 0, vit: 0, eng: 0 };
        o.attrPts = totalAttr;
        let totalSk = o.skPts || 0;
        if (o.sk) {
          for (let k in o.sk) {
            totalSk += (o.sk[k] || 0);
            o.sk[k] = 0;
          }
        }
        o.skPts = totalSk;
        refreshGame();
        notify('Đã Tẩy Tủy & Hoàn toàn bộ điểm!');
      };

      const maxAllSkills = () => {
        if (!o) return notify('Chưa có dữ liệu nhân vật');
        if (!o.bkOk) o.bkOk = {};
        if (!o.sk) o.sk = {};
        const SK = window.JX ? window.JX.skills : {};
        let count = 0;
        for (let skId in SK) {
          const sk = SK[skId];
          if (sk) {
            o.bkOk[skId] = 1;
            o.sk[skId] = sk.max || 20;
            count++;
          }
        }
        refreshGame();
        notify(`Đã kích hoạt và max cấp 20/20 toàn bộ ${count} kỹ năng (90, 120, 150)!`);
      };
      container.querySelector('#btnMaxAllSkills').onclick = maxAllSkills;

      const setLvl = (lvl) => {
        if (!o) return notify('Chưa có nhân vật');
        const oldLvl = o.lvl || 1;
        o.lvl = Math.max(1, Math.min(250, lvl));
        if (o.lvl > oldLvl) {
          o.attrPts = (o.attrPts || 0) + (o.lvl - oldLvl) * 5;
          o.skPts = (o.skPts || 0) + (o.lvl - oldLvl);
        }
        refreshGame();
        notify(`Đã đặt cấp độ nhân vật thành Lv ${o.lvl}!`);
      };

      container.querySelector('#btnSetLv90').onclick = () => setLvl(90);
      container.querySelector('#btnSetLv120').onclick = () => setLvl(120);
      container.querySelector('#btnSetLv150').onclick = () => setLvl(150);
      container.querySelector('#btnSetLv200').onclick = () => setLvl(200);
      container.querySelector('#btnApplyCustomLv').onclick = () => {
        const val = parseInt(container.querySelector('#inpCustomLv').value);
        if (!isNaN(val)) setLvl(val);
      };

      container.querySelector('#btnClearTrash').onclick = () => {
        if (!o || !o.inv) return;
        const initialCount = o.inv.length;
        o.inv = o.inv.filter(it => it && (it.r >= 3 || it.set || it.d === 10));
        refreshGame();
        notify(`Đã dọn ${initialCount - o.inv.length} món đồ rác!`);
      };
      container.querySelector('#btnClearAllInv').onclick = () => {
        if (!o || !o.inv) return;
        o.inv = [];
        refreshGame();
        notify('Đã làm trống toàn bộ hành trang!');
      };
    }

    else if (tabId === 'tab-combat') {
      container.innerHTML = `
        <div style="margin-bottom:14px; font-weight:bold; color:#ffc107;">
          <i class="fa-solid fa-shield-halved"></i> Hack Tính Năng Chiến Đấu
        </div>
        <div class="dev-btn-grid">
          <button class="dev-action-btn ${window.__devGodMode ? 'active' : ''}" id="btnGodMode" style="${window.__devGodMode ? 'background:#2e7d32; border-color:#81c784;' : ''}">
            <i class="fa-solid fa-heart-pulse"></i> Bất Tử (God Mode): ${window.__devGodMode ? 'BẬT' : 'TẮT'}
          </button>
          <button class="dev-action-btn ${window.__devOneHit ? 'active' : ''}" id="btnOneHit" style="${window.__devOneHit ? 'background:#c62828; border-color:#ef5350;' : ''}">
            <i class="fa-solid fa-skull"></i> 1-Hit Kill: ${window.__devOneHit ? 'BẬT' : 'TẮT'}
          </button>
          <button class="dev-action-btn" id="btnKillAllEnemies"><i class="fa-solid fa-wand-magic-sparkles"></i> Diệt Toàn Bộ Quái</button>
          <button class="dev-action-btn" id="btnLootAllGround"><i class="fa-solid fa-hand-holding-hand"></i> Nhặt Hết Đồ Rơi Đất</button>
        </div>

        <div style="margin: 18px 0 10px 0; font-weight:bold; color:#ffc107;">
          <i class="fa-solid fa-gauge-high"></i> Tốc Độ Game (Game Speed Multiplier)
        </div>
        <div class="dev-btn-grid">
          <button class="dev-action-btn ${window.__devSpeed === 1 ? 'active' : ''}" data-spd="1"><i class="fa-solid fa-person-walking"></i> Chuẩn (1x)</button>
          <button class="dev-action-btn ${window.__devSpeed === 2 ? 'active' : ''}" data-spd="2"><i class="fa-solid fa-person-running"></i> Tốc Độ (2x)</button>
          <button class="dev-action-btn ${window.__devSpeed === 5 ? 'active' : ''}" data-spd="5"><i class="fa-solid fa-bolt"></i> Siêu Tốc (5x)</button>
          <button class="dev-action-btn ${window.__devSpeed === 10 ? 'active' : ''}" data-spd="10"><i class="fa-solid fa-forward-fast"></i> Thần Tốc (10x)</button>
        </div>
      `;

      container.querySelector('#btnGodMode').onclick = () => {
        window.__devGodMode = !window.__devGodMode;
        renderTab('tab-combat');
        notify(`Bất tử (God Mode): ${window.__devGodMode ? 'ĐÃ BẬT' : 'ĐÃ TẮT'}`);
      };

      container.querySelector('#btnOneHit').onclick = () => {
        window.__devOneHit = !window.__devOneHit;
        renderTab('tab-combat');
        notify(`1-Hit Kill: ${window.__devOneHit ? 'ĐÃ BẬT' : 'ĐÃ TẮT'}`);
      };

      container.querySelector('#btnKillAllEnemies').onclick = () => {
        const r = getRuntime();
        if (r && r.enemies) {
          let count = 0;
          for (let mon of r.enemies) {
            if (mon && !mon.dead) {
              mon.hp = 0;
              mon.dead = true;
              count++;
            }
          }
          notify(`Đã tiêu diệt ${count} quái trên chiến trường!`);
        }
      };

      container.querySelector('#btnLootAllGround').onclick = () => {
        const r = getRuntime();
        if (!r || !r.ground || r.ground.length === 0) return notify('Không có đồ nào rơi trên mặt đất!');
        let count = 0;
        const groundItems = [...r.ground];
        r.ground = [];
        for (let g of groundItems) {
          if (g && g.it) {
            if (addItemToPlayer(g.it)) count++;
          }
        }
        notify(`Đã nhặt tự động ${count} món vào hành trang!`);
      };

      container.querySelectorAll('[data-spd]').forEach(b => {
        b.onclick = () => {
          window.__devSpeed = parseInt(b.dataset.spd);
          renderTab('tab-combat');
          notify(`Tốc độ game: ${window.__devSpeed}x`);
        };
      });
    }

    else if (tabId === 'tab-gold' || tabId === 'tab-platina') {
      const isPlat = (tabId === 'tab-platina');
      const setsData = (window.JX && window.JX.sets) ? (isPlat ? window.JX.sets.platina : window.JX.sets.gold) : [];

      if (!setsData || setsData.length === 0) {
        container.innerHTML = `<div style="padding:20px; color:#aaa;">Không tìm thấy dữ liệu bộ trang bị ${isPlat ? 'Bạch Kim' : 'Hoàng Kim'}!</div>`;
        return;
      }

      // Group sets by grp
      const groups = {};
      for (let item of setsData) {
        if (!groups[item.grp]) groups[item.grp] = [];
        groups[item.grp].push(item);
      }

      let html = `
        <div style="margin-bottom:12px; font-weight:bold; color:#ffc107;">
          <i class="fa-solid fa-${isPlat ? 'gem' : 'crown'}"></i> Danh Sách Trang Bị ${isPlat ? 'Bạch Kim (+10 Plv 10)' : 'Hoàng Kim Môn Phái (+10)'}
        </div>
        <div style="display:flex; flex-direction:column; gap:12px;">
      `;

      for (let grpId in groups) {
        const items = groups[grpId];
        const firstItem = items[0];
        const setName = firstItem ? firstItem.n.split(' ')[0] : `Set #${grpId}`;

        html += `
          <div style="background:#1b201d; border:1px solid #3d4a42; border-radius:6px; padding:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid #2e3b33; padding-bottom:6px;">
              <span style="font-weight:bold; color:${isPlat ? '#9fe8ff' : '#ffcc00'}; font-size:14px;">
                <i class="fa-solid fa-shield"></i> ${setName} (${items.length} món)
              </span>
              <button class="dev-action-btn" data-take-set="${grpId}" data-plat="${isPlat ? 1 : 0}" style="padding:4px 8px; font-size:12px;">
                <i class="fa-solid fa-plus"></i> Nhận Trọn Bộ
              </button>
            </div>
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:6px;">
        `;

        for (let it of items) {
          html += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#232b27; padding:5px 8px; border-radius:4px; font-size:12px;">
              <span style="color:#e0d8c3; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" title="${it.n}">${it.n}</span>
              <button class="dev-action-btn" data-take-one="${it.grp}_${it.d}_${it.k}" data-plat="${isPlat ? 1 : 0}" style="padding:2px 6px; font-size:11px; margin-left:6px;">
                Lấy
              </button>
            </div>
          `;
        }

        html += `</div></div>`;
      }

      html += `</div>`;
      container.innerHTML = html;

      // Click handlers
      container.querySelectorAll('[data-take-set]').forEach(b => {
        b.onclick = () => {
          const grp = parseInt(b.dataset.takeSet);
          const plat = b.dataset.plat === '1';
          const items = groups[grp];
          if (!items) return;
          let added = 0;
          for (let tmpl of items) {
            const it = createSetItem(plat ? 'platina' : 'gold', tmpl, 10);
            if (it && addItemToPlayer(it)) added++;
          }
          notify(`Đã nhận ${added} món thuộc bộ vào hành trang!`);
        };
      });

      container.querySelectorAll('[data-take-one]').forEach(b => {
        b.onclick = () => {
          const [grp, d, k] = b.dataset.takeOne.split('_').map(Number);
          const plat = b.dataset.plat === '1';
          const tmpl = (groups[grp] || []).find(x => x.d === d && x.k === k);
          if (tmpl) {
            const it = createSetItem(plat ? 'platina' : 'gold', tmpl, 10);
            if (it && addItemToPlayer(it)) notify(`Đã nhận: [${it.n}]!`);
          }
        };
      });
    }

    else if (tabId === 'tab-items') {
      container.innerHTML = `
        <div style="margin-bottom:12px; font-weight:bold; color:#ffc107;">
          <i class="fa-solid fa-horse"></i> Ngựa & Thần Mã
        </div>
        <div class="dev-btn-grid">
          <button class="dev-action-btn" data-horse="ChieuDa"><i class="fa-solid fa-horse"></i> Chiếu Dạ Ngọc Sư Tử</button>
          <button class="dev-action-btn" data-horse="XichTho"><i class="fa-solid fa-horse"></i> Xích Thố</button>
          <button class="dev-action-btn" data-horse="TuyetAnh"><i class="fa-solid fa-horse"></i> Tuyệt Ảnh</button>
          <button class="dev-action-btn" data-horse="PhiVan"><i class="fa-solid fa-horse"></i> Phi Vân (+10)</button>
          <button class="dev-action-btn" data-horse="BonTieu"><i class="fa-solid fa-horse"></i> Bôn Tiêu (+10)</button>
          <button class="dev-action-btn" data-horse="PhieuVu"><i class="fa-solid fa-horse"></i> Phiêu Vũ (+10)</button>
        </div>

        <div style="margin: 18px 0 10px 0; font-weight:bold; color:#ffc107;">
          <i class="fa-solid fa-book-journal-whills"></i> Bí Kíp Võ Công
        </div>
        <div class="dev-btn-grid">
          <button class="dev-action-btn" id="btnBooks90"><i class="fa-solid fa-book"></i> Full Bí Kíp 90 (Môn phái)</button>
          <button class="dev-action-btn" id="btnBooks120"><i class="fa-solid fa-book-bookmark"></i> Full Bí Kíp 120</button>
          <button class="dev-action-btn" id="btnBooks150"><i class="fa-solid fa-scroll"></i> Full Bí Kíp 150</button>
        </div>

        <div style="margin: 18px 0 10px 0; font-weight:bold; color:#ffc107;">
          <i class="fa-solid fa-gem"></i> Huyền Tinh & Nguyên Liệu
        </div>
        <div class="dev-btn-grid">
          <button class="dev-action-btn" id="btnHT10"><i class="fa-solid fa-gem"></i> +10 Huyền Tinh Cấp 10</button>
          <button class="dev-action-btn" id="btnFullMats"><i class="fa-solid fa-boxes-stacked"></i> +100 Toàn Bộ Khoáng Thạch</button>
        </div>
      `;

      // Horse generator
      container.querySelectorAll('[data-horse]').forEach(b => {
        b.onclick = () => {
          const horseType = b.dataset.horse;
          const horseNames = {
            ChieuDa: 'Chiếu Dạ Ngọc Sư Tử',
            XichTho: 'Xích Thố',
            TuyetAnh: 'Tuyệt Ảnh',
            PhiVan: 'Phi Vân',
            BonTieu: 'Bôn Tiêu',
            PhieuVu: 'Phiêu Vũ'
          };
          const name = horseNames[horseType] || 'Thần Mã';
          const horseItem = {
            uid: (o.uid++),
            d: 10,
            k: 0,
            n: name,
            lvl: 100,
            enh: 10,
            r: 5,
            base: [[1, 100]],
            mag: [
              { a: 'speed_p', p: [120, 150], pre: 1 },
              { a: 'lifemax_v', p: [1000, 1500], pre: 1 },
              { a: 'allres_p', p: [25, 35], pre: 1 }
            ]
          };
          if (addItemToPlayer(horseItem)) notify(`Đã nhận ngựa [${name} +10]!`);
        };
      });

      // Books generator
      const unlockBooks = (tier) => {
        if (!o) return;
        if (!o.bkOk) o.bkOk = {};
        if (!o.sk) o.sk = {};
        const SK = window.JX ? window.JX.skills : {};
        let count = 0;
        for (let skId in SK) {
          const sk = SK[skId];
          if (sk && (sk.tier === tier || (tier === 90 && sk.tier === 90))) {
            o.bkOk[skId] = 1;
            o.sk[skId] = sk.max || 20;
            count++;
          }
        }
        refreshGame();
        notify(`Đã học & max cấp 20/20 cho ${count} kỹ năng cấp ${tier}!`);
      };

      container.querySelector('#btnBooks90').onclick = () => unlockBooks(90);
      container.querySelector('#btnBooks120').onclick = () => unlockBooks(120);
      container.querySelector('#btnBooks150').onclick = () => unlockBooks(150);

      // Materials
      container.querySelector('#btnHT10').onclick = () => {
        if (!o) return;
        if (!o.mats) o.mats = {};
        if (!o.mats.ht) o.mats.ht = {};
        o.mats.ht['10'] = (o.mats.ht['10'] || 0) + 10;
        refreshGame();
        notify('Đã thêm 10 viên Huyền Tinh Cấp 10 vào Túi Nguyên Liệu!');
      };

      container.querySelector('#btnFullMats').onclick = () => {
        if (!o) return;
        if (!o.mats) o.mats = {};
        if (!o.mats.ore) o.mats.ore = {};
        for (let i = 1; i <= 10; i++) {
          o.mats.ore[i] = (o.mats.ore[i] || 0) + 100;
        }
        refreshGame();
        notify('Đã thêm 100 Khoáng Thạch các loại vào Túi Nguyên Liệu!');
      };
    }
  }

  // Auto initialize on DOM ready or immediately
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDevUI);
  } else {
    initDevUI();
  }
})();
