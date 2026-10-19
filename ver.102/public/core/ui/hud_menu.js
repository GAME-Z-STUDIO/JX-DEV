/**
 * Jx-IDLE UI Enhancer: Orientation Switcher, 9 FontAwesome Action Buttons, Bag Icon Replacer
 */
(function() {
  'use strict';

  // 1. Strictly Enforce Horizontal / Landscape UI Mode & Proportional Stage Scaling
  const BASE_STAGE_W = 1280;
  const BASE_STAGE_H = 720;
  const MIN_LANDSCAPE_ASPECT = 1.333;

  function updateLandscapeStage() {}

  function enforceLandscapeMode() {
    const orientBtn = document.getElementById('orientBtn');
    if (orientBtn) orientBtn.remove();
    try {
      localStorage.removeItem('vli_orient_pref');
    } catch (e) {}
    document.body.classList.remove('layout-vertical', 'u2m', 'u2s', 'mob');
    if (!document.body.classList.contains('u20')) {
      document.body.classList.add('u20');
    }
    if (!document.body.classList.contains('layout-horizontal')) {
      document.body.classList.add('layout-horizontal');
    }
  }

  // 2. High-Priority Universal Close Button Listener
  document.addEventListener('click', (e) => {
    const wx = e.target.closest('#u20wx');
    if (wx) {
      e.preventDefault();
      e.stopPropagation();
      document.body.classList.remove('u20win');
      document.querySelectorAll('#u20menu .u20mi').forEach(b => b.classList.remove('on'));
      const panel = document.getElementById('panel');
      if (panel) panel.style.removeProperty('display');
      return;
    }

    const mx = e.target.closest('#mClose, .mx');
    if (mx) {
      e.preventDefault();
      e.stopPropagation();
      const modal = document.getElementById('modal');
      if (modal) modal.classList.add('hidden');
      return;
    }
  }, true);

  // 3. Reliable Native Dragging is handled centrally via En in app.js
  function initDraggablePanel() {
    // Delegated to unified En handler in app.js to prevent multi-listener flickers
  }

  // 4. THE 9 BOTTOM-RIGHT ACTION BUTTONS WITH CLEAN ICONS ONLY
  function toggleGameTab(tabId) {
    if (typeof window.openTab === 'function') {
      window.openTab(tabId);
      return;
    }
    const tabBtn = document.querySelector(`#tabs button[data-t="${tabId}"]`);
    if (tabBtn) {
      tabBtn.click();
      document.body.classList.add('u20win');
    }
  }

  const MENU_9_ITEMS = [
    { id: 'char', name: 'Nhân vật', icon: 'fa-user-ninja', action: () => toggleGameTab('char') },
    { id: 'inv', name: 'Hành trang', icon: 'fa-sack-dollar', action: () => toggleGameTab('inv') },
    { id: 'skill', name: 'Võ công', icon: 'fa-hand-sparkles', action: () => toggleGameTab('skill') },
    { id: 'team', name: 'Tổ đội', icon: 'fa-users', action: () => { if (typeof window.toggleTeam === 'function') window.toggleTeam(); else toggleGameTab('team'); } },
    { id: 'friend', name: 'Hảo hữu', icon: 'fa-handshake', action: () => { if (typeof window.toggleChat === 'function') window.toggleChat(); else if (window.gameToast) window.gameToast('Hảo Hữu'); } },
    { id: 'forge', name: 'Lò rèn', icon: 'fa-hammer', action: () => toggleGameTab('forge') },
    { id: 'quest', name: 'Nhiệm vụ', icon: 'fa-scroll', action: () => toggleGameTab('quest') },
    { id: 'guild', name: 'Bang phái', icon: 'fa-flag', action: () => { if (typeof window.openAct === 'function') window.openAct('dg'); else if (window.gameToast) window.gameToast('Bang Phái'); } },
    { id: 'more', name: 'Hệ thống', icon: 'fa-gear', action: () => toggleGameTab('more') }
  ];

  function upgradeBottomRightMenu() {
    const menu = document.getElementById('u20menu');
    if (!menu) return;

    if (menu.dataset.vliCustomMenu !== '2') {
      menu.dataset.vliCustomMenu = '2';
      menu.innerHTML = '';

      MENU_9_ITEMS.forEach(it => {
        const btn = document.createElement('button');
        btn.className = 'u20mi';
        btn.dataset.u = it.id;
        btn.setAttribute('aria-label', it.name);
        btn.innerHTML = `
          <i class="fa-solid ${it.icon}"></i>
          <i class="dot"></i>
        `;
        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          it.action();
        };
        menu.appendChild(btn);
      });
    }

    // Update active highlight
    const curActive = document.body.dataset.u2t;
    const isWinOpen = document.body.classList.contains('u20win');
    menu.querySelectorAll('.u20mi').forEach(b => {
      b.classList.toggle('on', isWinOpen && b.dataset.u === curActive);
    });
  }

  // 5. Upgrade Bag Buttons & Top-Right Buttons
  function upgradeBagAndUtilityButtons() {
    // Top-Right Circular Buttons
    const gift = document.getElementById('u20gift');
    if (gift && !gift.querySelector('i')) {
      gift.innerHTML = '<i class="fa-solid fa-gift"></i><span class="rb-lbl">Thưởng</span>';
    }
    const ktc = document.getElementById('u20ktc');
    if (ktc && !ktc.querySelector('i')) {
      ktc.innerHTML = '<i class="fa-solid fa-shop"></i><span class="rb-lbl">Kỳ Trân</span>';
    }
    const mkt = document.getElementById('u20mkt');
    if (mkt && !mkt.querySelector('i')) {
      mkt.innerHTML = '<i class="fa-solid fa-scale-balanced"></i><span class="rb-lbl">Chợ</span>';
    }

    // Bag Utility Buttons
    const isTool = (el) => el && el.closest('.u2bag-tools');

    const bBest = document.getElementById('bBest');
    if (bBest) {
      if (isTool(bBest)) {
        if (!bBest.querySelector('i') || bBest.childNodes.length > 1) {
          bBest.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i>';
        }
      } else if (!bBest.querySelector('i')) {
        bBest.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Mặc đồ tốt';
      }
    }

    const bDonKho = document.getElementById('bDonKho');
    if (bDonKho) {
      if (isTool(bDonKho)) {
        if (!bDonKho.querySelector('i') || bDonKho.childNodes.length > 1) {
          bDonKho.innerHTML = '<i class="fa-solid fa-broom"></i>';
        }
      } else if (!bDonKho.querySelector('i')) {
        bDonKho.innerHTML = '<i class="fa-solid fa-broom"></i> Dọn kho';
      }
    }

    const bStash = document.getElementById('bStash');
    if (bStash) {
      if (isTool(bStash)) {
        if (!bStash.querySelector('i') || bStash.childNodes.length > 1) {
          bStash.innerHTML = '<i class="fa-solid fa-box-archive"></i>';
        }
      } else if (!bStash.querySelector('i')) {
        bStash.innerHTML = '<i class="fa-solid fa-box-archive"></i> Kho';
      }
    }

    const u2kren = document.getElementById('u2kren');
    if (u2kren) {
      const small = u2kren.querySelector('small');
      const count = small ? small.textContent : '';
      if (isTool(u2kren)) {
        if (!u2kren.querySelector('i') || u2kren.childNodes.length > 2) {
          u2kren.innerHTML = `<i class="fa-solid fa-hammer"></i>${count ? '<small class="u2badge">' + count + '</small>' : ''}`;
        }
      } else if (!u2kren.querySelector('i')) {
        u2kren.innerHTML = `<i class="fa-solid fa-hammer"></i> Kho Rèn ${count ? '<small>' + count + '</small>' : ''}`;
      }
    }

    const bSellAll = document.getElementById('bSellAll');
    if (bSellAll) {
      const small = bSellAll.querySelector('small');
      const count = small ? small.textContent : '';
      if (isTool(bSellAll)) {
        if (!bSellAll.querySelector('i') || bSellAll.childNodes.length > 2) {
          bSellAll.innerHTML = `<i class="fa-solid fa-coins"></i>${count ? '<small class="u2badge">' + count + '</small>' : ''}`;
        }
      } else if (!bSellAll.querySelector('i')) {
        bSellAll.innerHTML = `<i class="fa-solid fa-coins"></i> Bán thừa ${count ? '<small>' + count + '</small>' : ''}`;
      }
    }

    const u2filt = document.getElementById('u2filt');
    if (u2filt) {
      if (isTool(u2filt)) {
        if (!u2filt.querySelector('i') || u2filt.childNodes.length > 1) {
          u2filt.innerHTML = '<i class="fa-solid fa-filter"></i>';
        }
      } else if (!u2filt.querySelector('i')) {
        u2filt.innerHTML = '<i class="fa-solid fa-filter"></i> Nhặt đồ';
      }
    }
  }

  // 6. Element Badges & Colors
  const ELEMENT_MAP = {
    0: { name: 'Kim', icon: 'fa-coins', cls: 'elem-kim' },
    1: { name: 'Mộc', icon: 'fa-leaf', cls: 'elem-moc' },
    2: { name: 'Thủy', icon: 'fa-droplet', cls: 'elem-thuy' },
    3: { name: 'Hỏa', icon: 'fa-fire-flame-curved', cls: 'elem-hoa' },
    4: { name: 'Thổ', icon: 'fa-mountain', cls: 'elem-tho' }
  };

  function upgradeElementBadges() {
    document.querySelectorAll('.serpick button:not(.fa-upgraded)').forEach(btn => {
      btn.classList.add('fa-upgraded');
      const bTag = btn.querySelector('b');
      if (bTag) {
        const text = bTag.textContent.trim();
        for (let k in ELEMENT_MAP) {
          const el = ELEMENT_MAP[k];
          if (text === el.name || text.includes(el.name)) {
            bTag.innerHTML = `<i class="fa-solid ${el.icon} ${el.cls}"></i> ${text}`;
            break;
          }
        }
      }
    });

    document.querySelectorAll('.sdot:not(.fa-upgraded)').forEach(dot => {
      dot.classList.add('fa-upgraded');
      const style = dot.getAttribute('style') || '';
      for (let k in ELEMENT_MAP) {
        const el = ELEMENT_MAP[k];
        if (style.includes('f3d35b')) dot.className = `sdot ${el.cls}`;
        else if (style.includes('6fd46a')) dot.className = `sdot ${el.cls}`;
        else if (style.includes('5fb8ff')) dot.className = `sdot ${el.cls}`;
        else if (style.includes('ff6a3a')) dot.className = `sdot ${el.cls}`;
        else if (style.includes('c8965a')) dot.className = `sdot ${el.cls}`;
      }
    });
  }

  // Periodic DOM enhancer. Do not re-run landscape/canvas resize here: that
  // reset the arena buffer every 200ms and made sprites hitch.
  setInterval(() => {
    initDraggablePanel();
    upgradeBottomRightMenu();
    upgradeBagAndUtilityButtons();
    upgradeElementBadges();
  }, 500);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      enforceLandscapeMode();
      initDraggablePanel();
      upgradeBottomRightMenu();
      upgradeBagAndUtilityButtons();
    });
  } else {
    enforceLandscapeMode();
    initDraggablePanel();
    upgradeBottomRightMenu();
    upgradeBagAndUtilityButtons();
  }
})();
