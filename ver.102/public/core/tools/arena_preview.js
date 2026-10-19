// Võ Trường — Interactive Character, Weapon, Armor, Helm & Skill Preview Arena (1.0x Native JDOLL)
(function () {
  "use strict";

  const DMG_COLORS = {
    phys: "#ffffff",
    crit: "#d868ff",
    poison: "#48e868",
    cold: "#58c8ff",
    fire: "#ff4d4d",
    light: "#ffa630"
  };

  const WEAPON_DEFS = {
    kiem:     { name: "Kiếm (1 tay)",                 d: 0, k: 0, rows: [1, 2, 3, 20, 21],     reach: 82,  arc: 0.95, fx: "slash" },
    dao:      { name: "Đao (1 tay)",                  d: 0, k: 1, rows: [4, 5, 6, 22, 23],     reach: 84,  arc: 1.05, fx: "slash" },
    con:      { name: "Côn (Trường côn)",             d: 0, k: 2, rows: [10, 11, 12, 26, 27],  reach: 96,  arc: 1.15, fx: "slash" },
    thuong:   { name: "Thương (Trường thương)",       d: 0, k: 3, rows: [7, 8, 9, 24, 25],     reach: 104, arc: 0.72, fx: "thrust" },
    songchuy: { name: "Song Chùy (2 tay)",            d: 0, k: 4, rows: [16, 17, 18, 30, 31],  reach: 78,  arc: 1.20, fx: "slash" },
    songdao:  { name: "Song Đao / Nga Mi Thích (2 tay)", d: 0, k: 5, rows: [13, 14, 15, 28, 29], reach: 80, arc: 1.10, fx: "slash" },
    quyen:    { name: "Quyền sáo (Tay không)",        d: 0, k: 6, rows: [0, 0, 0, 0, 0],       reach: 72,  arc: 0.90, fx: "slash" },
    amkhi:    { name: "Ám khí (Phi tiêu / Phi đao)",  d: 1, k: 0, rows: [19, 19, 19, 19, 19],  reach: 210, arc: 0.55, fx: "dart" }
  };

  const FACTIONS = {
    shaolin:  { name: "Thiếu Lâm",   defWep: "con",      wears: [1, 2, 3],    hkHelm: 20, hkArmor: 21, hkWep: 26 },
    tianwang: { name: "Thiên Vương", defWep: "thuong",   wears: [13, 14, 15], hkHelm: 23, hkArmor: 24, hkWep: 24 },
    tangmen:  { name: "Đường Môn",   defWep: "amkhi",    wears: [7, 8, 9],    hkHelm: 25, hkArmor: 26, hkWep: 19 },
    wudu:     { name: "Ngũ Độc",     defWep: "dao",      wears: [19, 20, 10], hkHelm: 24, hkArmor: 25, hkWep: 22 },
    emei:     { name: "Nga Mi",      defWep: "kiem",     wears: [4, 5, 6],    hkHelm: 21, hkArmor: 22, hkWep: 20 },
    cuiyan:   { name: "Thúy Yên",    defWep: "songdao",  wears: [19, 20, 6],  hkHelm: 22, hkArmor: 23, hkWep: 28 },
    gaibang:  { name: "Cái Bang",    defWep: "con",      wears: [10, 11, 12], hkHelm: 26, hkArmor: 27, hkWep: 27 },
    tianren:  { name: "Thiên Nhẫn",  defWep: "thuong",   wears: [7, 8, 9],    hkHelm: 27, hkArmor: 28, hkWep: 25 },
    wudang:   { name: "Võ Đang",     defWep: "kiem",     wears: [16, 17, 18], hkHelm: 28, hkArmor: 29, hkWep: 21 },
    kunlun:   { name: "Côn Lôn",     defWep: "dao",      wears: [4, 5, 6],    hkHelm: 29, hkArmor: 30, hkWep: 23 }
  };

  const imgCache = new Map();
  function getImg(src) {
    if (typeof window.m0 === "function") return window.m0(src);
    let im = imgCache.get(src);
    if (!im) {
      im = new Image();
      im.decoding = "async";
      im.src = src;
      imgCache.set(src, im);
    }
    return im;
  }
  function imgReady(im) {
    return !!(im && im.complete && im.naturalWidth > 0);
  }

  function dir8FromDelta(dx, dy) {
    return ((Math.round(Math.atan2(-dx, dy) / (Math.PI / 4)) % 8) + 8) % 8;
  }

  function resolvePreviewRows(cfg) {
    const fDef = FACTIONS[cfg.fac] || FACTIONS.shaolin;
    const wDef = WEAPON_DEFS[cfg.weapon] || WEAPON_DEFS.con;

    // 1. Weapon Row (0..102)
    let wRow = 0;
    if (cfg.customWepRow >= 0) {
      wRow = cfg.customWepRow;
    } else if (cfg.armorPreset === "sect" && cfg.tier >= 4) {
      wRow = wDef.rows[Math.min(4, cfg.tier - 1)] ?? fDef.hkWep;
    } else {
      wRow = wDef.rows[Math.min(4, Math.max(0, (cfg.tier | 0) - 1))] ?? 0;
    }

    // 2. Armor Row (0..67)
    let aRow = 19;
    if (cfg.customArmorRow >= 0) {
      aRow = cfg.customArmorRow;
    } else if (cfg.armorPreset === "tanthu") {
      aRow = 19;
    } else if (cfg.armorPreset === "sect") {
      aRow = fDef.hkArmor;
    } else if (cfg.armorPreset === "wear0") {
      aRow = fDef.wears[0];
    } else if (cfg.armorPreset === "wear2") {
      aRow = fDef.wears[2];
    } else {
      aRow = fDef.wears[1];
    }

    // 3. Helm Row (0..41)
    let hRow = 19;
    if (cfg.customHelmRow >= 0) {
      hRow = cfg.customHelmRow;
    } else if (cfg.armorPreset === "sect") {
      hRow = fDef.hkHelm;
    } else if (cfg.armorPreset === "tanthu") {
      hRow = 19;
    } else if (cfg.armorPreset === "wear2") {
      hRow = Math.min(18, aRow);
    } else {
      hRow = 19;
    }

    return { helm: hRow, armor: aRow, weapon: wRow, horse: -1 };
  }

  function drawArenaHero(ctx, cfg, act, dir, actT, x, y) {
    const rows = resolvePreviewRows(cfg);
    const look = {
      sx: cfg.sex || "m",
      fac: cfg.fac || "shaolin",
      rows: rows,
      ride: 0,
      mg: act === "mag"
    };
    if (typeof window.drawDollFromLook === "function") {
      const h = window.drawDollFromLook(ctx, look, act, dir, actT, x, y, 1.55, 1, true);
      if (h > 0) return h;
    }
    return 72;
  }

  function drawDummy(ctx, d) {
    const tr = window.JX_HD && window.JX_HD.training;
    ctx.save();
    ctx.fillStyle = "rgba(12,18,12,0.44)";
    ctx.beginPath();
    ctx.ellipse(d.x, d.y + 2, 18, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(8,12,8,0.24)";
    ctx.translate(d.x + 14, d.y - 4);
    ctx.rotate(-0.28);
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const isHit = d.hitT > 0;
    const key = isHit ? "enemy179_bat" : "enemy179_st";
    const meta = tr && tr[key];
    const im = getImg("models/arena/" + key + ".webp");
    if (meta && imgReady(im)) {
      const [frames, , rects] = meta;
      const fIdx = isHit ? Math.min(frames - 1, Math.floor(((0.24 - d.hitT) / 0.24) * frames)) : 0;
      const o = fIdx * 6;
      const sw = rects[o + 2], sh = rects[o + 3];
      ctx.drawImage(im, rects[o], rects[o + 1], sw, sh, Math.round(d.x - rects[o + 4]), Math.round(d.y - rects[o + 5]), sw, sh);
      if (d.hitT > 0.12) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.38;
        ctx.drawImage(im, rects[o], rects[o + 1], sw, sh, Math.round(d.x - rects[o + 4]), Math.round(d.y - rects[o + 5]), sw, sh);
        ctx.restore();
      }
    }

    const top = d.y - 78;
    ctx.save();
    ctx.textAlign = "center";
    ctx.shadowColor = "#0b120d";
    ctx.shadowBlur = 4;
    ctx.font = '10px "Noto Serif", system-ui, sans-serif';
    ctx.fillStyle = "#d8c79a";
    ctx.fillText(Math.ceil(d.hp) + " / " + d.maxHp, d.x, top - 20);
    ctx.font = '12.5px "Noto Serif", system-ui, sans-serif';
    ctx.fillStyle = "#f2e6cc";
    ctx.fillText(d.name, d.x, top - 7);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(16,22,18,0.85)";
    ctx.fillRect(d.x - 22, top - 3, 44, 6);
    ctx.fillStyle = "#c9584a";
    ctx.fillRect(d.x - 21, top - 2, 42 * Math.max(0, d.hp / d.maxHp), 4);
    ctx.restore();
  }

  let arenaRaf = 0;
  let arenaState = null;

  function stopPreviewArena() {
    if (arenaRaf) {
      cancelAnimationFrame(arenaRaf);
      arenaRaf = 0;
    }
    const modal = document.getElementById("voTruongModal");
    if (modal) modal.remove();
    arenaState = null;
  }

  function buildRowOptions(maxRow, prefix, currentVal) {
    let html = `<option value="-1" ${currentVal === -1 ? "selected" : ""}>Theo Bộ / Môn Phái</option>`;
    for (let i = 0; i <= maxRow; i++) {
      html += `<option value="${i}" ${currentVal === i ? "selected" : ""}>${prefix} #${i}</option>`;
    }
    return html;
  }

  function openPreviewArena() {
    stopPreviewArena();

    const curFac = (window.o && window.o.fac && FACTIONS[window.o.fac]) ? window.o.fac : "shaolin";
    const curSex = (window.o && window.o.sex) ? "f" : "m";
    let curWep = FACTIONS[curFac].defWep;
    let initCustomWep = -1, initCustomArmor = -1, initCustomHelm = -1;

    if (window.o && window.o.eq) {
      const w = window.o.eq.weapon;
      if (w) {
        curWep =
          w.d === 1 ? "amkhi" :
          w.k === 0 ? "kiem" :
          w.k === 1 ? "dao" :
          w.k === 2 ? "con" :
          w.k === 3 ? "thuong" :
          w.k === 4 ? "songchuy" :
          w.k === 5 ? "songdao" :
          w.k === 6 ? "quyen" : curWep;
        if (typeof window.dollEquipIdx === "function") {
          const idx = window.dollEquipIdx("weapon", w);
          if (idx !== null && idx !== undefined) initCustomWep = idx;
        }
      }
      if (window.o.eq.armor && typeof window.dollEquipIdx === "function") {
        const idx = window.dollEquipIdx("armor", window.o.eq.armor);
        if (idx !== null && idx !== undefined) initCustomArmor = idx;
      }
      if (window.o.eq.helm && typeof window.dollEquipIdx === "function") {
        const idx = window.dollEquipIdx("helm", window.o.eq.helm);
        if (idx !== null && idx !== undefined) initCustomHelm = idx;
      }
    }

    const W = 940, H = 540;
    const CX = W * 0.5, CY = H * 0.52;

    const modal = document.createElement("div");
    modal.id = "voTruongModal";
    modal.innerHTML = `
      <div class="vt-backdrop"></div>
      <div class="vt-dialog">
        <div class="vt-header">
          <div class="vt-title">⚔ VÕ TRƯỜNG · XEM NGOẠI TRANG, VŨ KHÍ 1-2 TAY & THỬ CHIÊU (1:1 HD)</div>
          <div class="vt-controls">
            <label>Giới tính
              <select id="vtSex">
                <option value="m" ${curSex === "m" ? "selected" : ""}>Nam</option>
                <option value="f" ${curSex === "f" ? "selected" : ""}>Nữ</option>
              </select>
            </label>
            <label>Môn phái
              <select id="vtFac">
                ${Object.entries(FACTIONS).map(([k, v]) => `<option value="${k}" ${k === curFac ? "selected" : ""}>${v.name}</option>`).join("")}
              </select>
            </label>
            <label>Loại Vũ Khí (Đủ 8 hệ)
              <select id="vtWep">
                ${Object.entries(WEAPON_DEFS).map(([k, v]) => `<option value="${k}" ${k === curWep ? "selected" : ""}>${v.name}</option>`).join("")}
              </select>
            </label>
            <label>Bậc VK
              <select id="vtTier">
                <option value="1">Bậc 1 (Sơ cấp)</option>
                <option value="2">Bậc 2 (Trung cấp)</option>
                <option value="3" selected>Bậc 3 (Cao cấp)</option>
                <option value="4">Bậc 4 (Hoàng Kim)</option>
                <option value="5">Bậc 5 (Bạch Kim)</option>
              </select>
            </label>
            <label>Bộ Giáp
              <select id="vtArmor">
                <option value="sect" selected>Hoàng Kim Môn Phái</option>
                <option value="wear1">Giáp Giang Hồ</option>
                <option value="wear2">Giáp Đại Thành</option>
                <option value="wear0">Giáp Sơ Cấp</option>
                <option value="tanthu">Áo Tân Thủ</option>
              </select>
            </label>
            <label>Mẫu VK (0-102)
              <select id="vtCustomWep">${buildRowOptions(102, "Vũ khí", initCustomWep)}</select>
            </label>
            <label>Mẫu Áo (0-67)
              <select id="vtCustomArmor">${buildRowOptions(67, "Áo giáp", initCustomArmor)}</select>
            </label>
            <label>Mẫu Mũ (0-41)
              <select id="vtCustomHelm">${buildRowOptions(41, "Mũ/Tóc", initCustomHelm)}</select>
            </label>
            <label>Hiệu ứng ST
              <select id="vtDmgMode">
                <option value="mix" selected>Ngũ hành kết hợp</option>
                <option value="phys">Đánh thường (Trắng)</option>
                <option value="crit">Chí mạng (Tím)</option>
                <option value="poison">Độc sát (Xanh lá)</option>
                <option value="cold">Băng sát (Xanh dương)</option>
                <option value="fire">Hỏa sát (Đỏ)</option>
                <option value="light">Lôi sát (Cam)</option>
              </select>
            </label>
            <button type="button" class="vt-btn" id="vtPrevWepBtn" title="Mẫu vũ khí trước">◀ VK</button>
            <button type="button" class="vt-btn" id="vtNextWepBtn" title="Mẫu vũ khí tiếp theo">VK ▶</button>
            <button type="button" class="vt-btn" id="vtPrevArmorBtn" title="Mẫu áo giáp trước">◀ Áo</button>
            <button type="button" class="vt-btn" id="vtNextArmorBtn" title="Mẫu áo giáp tiếp theo">Áo ▶</button>
            <button type="button" class="vt-btn" id="vtAutoBtn">⚡ Tự đánh: BẬT</button>
            <button type="button" class="vt-btn" id="vtResetBtn">↻ Hồi Mộc Nhân</button>
          </div>
          <button type="button" class="vt-close" id="vtCloseBtn" title="Đóng (Esc / V)">✕</button>
        </div>
        <div class="vt-stage-wrap">
          <canvas id="vtCanvas" width="${W}" height="${H}"></canvas>
          <div class="vt-legend">
            <span><i style="background:#ffffff"></i>Đánh thường</span>
            <span><i style="background:#d868ff"></i>Chí mạng</span>
            <span><i style="background:#48e868"></i>Độc</span>
            <span><i style="background:#58c8ff"></i>Băng</span>
            <span><i style="background:#ff4d4d"></i>Hỏa</span>
            <span><i style="background:#ffa630"></i>Lôi</span>
            <small id="vtLookInfo">💡 Click mặt sân để di chuyển · Click Mộc nhân để xuất chiêu · Phím V mở/đóng nhanh</small>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const canvas = document.getElementById("vtCanvas");
    const ctx = canvas.getContext("2d");

    arenaState = {
      clock: 0,
      lastTs: performance.now(),
      autoAtk: true,
      cfg: {
        sex: curSex,
        fac: curFac,
        weapon: curWep,
        tier: 3,
        armorPreset: "sect",
        customWepRow: initCustomWep,
        customArmorRow: initCustomArmor,
        customHelmRow: initCustomHelm,
        dmgMode: "mix"
      },
      hero: {
        x: CX - 210,
        y: CY + 10,
        tx: null,
        ty: null,
        dir: 6,
        aimA: -0.25,
        act: "st",
        actT: 0,
        atkCd: 0.35,
        target: null
      },
      marker: null,
      dummies: [
        { id: 1, name: "Mộc nhân 1", x: CX - 75,  y: CY - 105, hp: 1000, maxHp: 1000, hitT: 0 },
        { id: 2, name: "Mộc nhân 2", x: CX,       y: CY - 105, hp: 1000, maxHp: 1000, hitT: 0 },
        { id: 3, name: "Mộc nhân 3", x: CX + 75,  y: CY - 105, hp: 1000, maxHp: 1000, hitT: 0 },
        { id: 4, name: "Mộc nhân 4", x: CX + 70,  y: CY + 45,  hp: 1000, maxHp: 1000, hitT: 0 },
        { id: 5, name: "Mộc nhân 5", x: CX + 105, y: CY + 82,  hp: 1000, maxHp: 1000, hitT: 0 },
        { id: 6, name: "Mộc nhân 6", x: CX + 35,  y: CY + 82,  hp: 1000, maxHp: 1000, hitT: 0 },
        { id: 7, name: "Mộc nhân 7", x: CX + 295, y: CY - 25,  hp: 1000, maxHp: 1000, hitT: 0 }
      ],
      fx: [],
      floaters: []
    };

    getImg("models/arena/grass.webp");
    getImg("models/arena/paving.webp");
    getImg("models/arena/enemy179_st.webp");
    getImg("models/arena/enemy179_bat.webp");

    const updateInfoBadge = () => {
      if (!arenaState) return;
      const rows = resolvePreviewRows(arenaState.cfg);
      const infoEl = document.getElementById("vtLookInfo");
      if (infoEl) {
        infoEl.textContent = `Đang mặc: Vũ khí #${rows.weapon} · Áo giáp #${rows.armor} · Mũ/Tóc #${rows.helm} | Click mặt sân để di chuyển · Click Mộc nhân để đánh`;
      }
      if (typeof window.preloadDollLook === "function") {
        window.preloadDollLook({ sx: arenaState.cfg.sex, rows: rows, ride: 0 });
      }
    };

    const syncCfg = () => {
      if (!arenaState) return;
      arenaState.cfg.sex = document.getElementById("vtSex").value;
      arenaState.cfg.fac = document.getElementById("vtFac").value;
      arenaState.cfg.weapon = document.getElementById("vtWep").value;
      arenaState.cfg.tier = +document.getElementById("vtTier").value || 3;
      arenaState.cfg.armorPreset = document.getElementById("vtArmor").value;
      arenaState.cfg.customWepRow = +document.getElementById("vtCustomWep").value;
      arenaState.cfg.customArmorRow = +document.getElementById("vtCustomArmor").value;
      arenaState.cfg.customHelmRow = +document.getElementById("vtCustomHelm").value;
      arenaState.cfg.dmgMode = document.getElementById("vtDmgMode").value;
      updateInfoBadge();
    };

    ["vtSex", "vtDmgMode", "vtCustomWep", "vtCustomArmor", "vtCustomHelm"].forEach(id => {
      document.getElementById(id).addEventListener("change", syncCfg);
    });
    ["vtWep", "vtTier"].forEach(id => {
      document.getElementById(id).addEventListener("change", () => {
        document.getElementById("vtCustomWep").value = "-1";
        syncCfg();
      });
    });
    document.getElementById("vtArmor").addEventListener("change", () => {
      document.getElementById("vtCustomArmor").value = "-1";
      document.getElementById("vtCustomHelm").value = "-1";
      syncCfg();
    });
    document.getElementById("vtFac").addEventListener("change", e => {
      const f = FACTIONS[e.target.value];
      if (f) document.getElementById("vtWep").value = f.defWep;
      document.getElementById("vtCustomWep").value = "-1";
      document.getElementById("vtCustomArmor").value = "-1";
      document.getElementById("vtCustomHelm").value = "-1";
      syncCfg();
    });

    const stepSelect = (selId, maxVal, delta) => {
      const el = document.getElementById(selId);
      const cur = +el.value;
      const base = cur < 0 ? 0 : cur;
      const next = (base + delta + (maxVal + 1)) % (maxVal + 1);
      el.value = String(next);
      syncCfg();
    };
    document.getElementById("vtPrevWepBtn").addEventListener("click", () => stepSelect("vtCustomWep", 102, -1));
    document.getElementById("vtNextWepBtn").addEventListener("click", () => stepSelect("vtCustomWep", 102, 1));
    document.getElementById("vtPrevArmorBtn").addEventListener("click", () => stepSelect("vtCustomArmor", 67, -1));
    document.getElementById("vtNextArmorBtn").addEventListener("click", () => stepSelect("vtCustomArmor", 67, 1));

    document.getElementById("vtAutoBtn").addEventListener("click", e => {
      arenaState.autoAtk = !arenaState.autoAtk;
      e.currentTarget.textContent = "⚡ Tự đánh: " + (arenaState.autoAtk ? "BẬT" : "TẮT");
      e.currentTarget.classList.toggle("off", !arenaState.autoAtk);
    });
    document.getElementById("vtResetBtn").addEventListener("click", () => {
      for (const d of arenaState.dummies) {
        d.hp = d.maxHp;
        d.hitT = 0;
      }
    });
    document.getElementById("vtCloseBtn").addEventListener("click", stopPreviewArena);
    modal.querySelector(".vt-backdrop").addEventListener("click", stopPreviewArena);

    updateInfoBadge();

    canvas.addEventListener("pointerdown", e => {
      if (!arenaState) return;
      const rect = canvas.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * W;
      const my = ((e.clientY - rect.top) / rect.height) * H;
      let clickedDummy = null;
      for (const d of arenaState.dummies) {
        if (Math.abs(mx - d.x) < 28 && Math.abs(my - (d.y - 34)) < 44) {
          clickedDummy = d;
          break;
        }
      }
      if (clickedDummy) {
        arenaState.hero.target = clickedDummy;
        arenaState.hero.tx = null;
        arenaState.hero.ty = null;
      } else {
        arenaState.hero.tx = Math.max(80, Math.min(W - 80, mx));
        arenaState.hero.ty = Math.max(80, Math.min(H - 50, my));
        arenaState.marker = { x: arenaState.hero.tx, y: arenaState.hero.ty, t: arenaState.clock };
      }
    });

    canvas.addEventListener("pointermove", e => {
      if (!arenaState) return;
      const rect = canvas.getBoundingClientRect();
      arenaState.mouseX = ((e.clientX - rect.left) / rect.width) * W;
      arenaState.mouseY = ((e.clientY - rect.top) / rect.height) * H;
    });

    function triggerAttack(h, tgt, st) {
      const wDef = WEAPON_DEFS[st.cfg.weapon] || WEAPON_DEFS.con;
      const ang = Math.atan2(tgt.y - h.y, tgt.x - h.x);
      h.dir = dir8FromDelta(tgt.x - h.x, tgt.y - h.y);
      h.aimA = ang;
      h.act = "at";
      h.actT = 0;
      h.atkCd = 0.65;

      const mode = st.cfg.dmgMode;
      const pick = mode === "mix"
        ? ["phys", "crit", "poison", "cold", "fire", "light"][Math.floor(Math.random() * 6)]
        : mode;
      const isCrit = pick === "crit";
      const col = DMG_COLORS[pick] || "#ffffff";
      const dmg = Math.round((isCrit ? 260 : 135) * (0.9 + Math.random() * 0.22));

      if (wDef.fx === "dart") {
        st.fx.push({ k: "dart", x1: h.x, y1: h.y - 28, x2: tgt.x, y2: tgt.y - 28, angle: ang, color: col, life: 0.18, max: 0.18 });
      } else if (wDef.fx === "thrust") {
        st.fx.push({ k: "thrust", x: h.x, y: h.y, angle: ang, r: wDef.reach, color: col, life: 0.24, max: 0.24 });
      } else {
        st.fx.push({ k: "slash", x: h.x + Math.cos(ang) * 20, y: h.y + Math.sin(ang) * 12, angle: ang, r: wDef.reach * 0.68, color: col, life: 0.24, max: 0.24 });
      }

      for (const d of st.dummies) {
        const dist = Math.hypot(d.x - tgt.x, d.y - tgt.y);
        if (d === tgt || (wDef.fx !== "dart" && dist < 56)) {
          const dDmg = d === tgt ? dmg : Math.round(dmg * 0.65);
          d.hp = Math.max(0, d.hp - dDmg);
          d.hitT = 0.24;
          if (d.hp <= 0) setTimeout(() => { d.hp = d.maxHp; }, 900);
          st.fx.push({ k: "hitBurst", x: d.x, y: d.y - 28, angle: ang, color: col, life: 0.24, max: 0.24 });
          st.floaters.push({
            x: d.x + (Math.random() - 0.5) * 14,
            y: d.y - 68,
            text: (isCrit ? "✦ -" : "-") + dDmg + (isCrit ? "!" : ""),
            color: col,
            big: isCrit,
            life: 1.0,
            max: 1.0
          });
        }
      }
    }

    function drawCourtGround() {
      const grass = getImg("models/arena/grass.webp");
      const paving = getImg("models/arena/paving.webp");

      ctx.fillStyle = "#384728";
      ctx.fillRect(0, 0, W, H);
      if (imgReady(grass)) {
        const pat = ctx.createPattern(grass, "repeat");
        if (pat) {
          ctx.fillStyle = pat;
          ctx.fillRect(0, 0, W, H);
        }
      }

      const poly = [
        [CX, 24],
        [W - 40, CY],
        [CX, H - 22],
        [40, CY]
      ];
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(poly[0][0], poly[0][1]);
      for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
      ctx.closePath();
      ctx.clip();

      ctx.fillStyle = "#5b4837";
      ctx.fillRect(0, 0, W, H);
      if (imgReady(paving)) {
        const pPat = ctx.createPattern(paving, "repeat");
        if (pPat) {
          ctx.fillStyle = pPat;
          ctx.fillRect(0, 0, W, H);
        }
      }
      const rad = ctx.createRadialGradient(CX, CY, 60, CX, CY, 440);
      rad.addColorStop(0, "rgba(0,0,0,0)");
      rad.addColorStop(1, "rgba(20,16,10,0.32)");
      ctx.fillStyle = rad;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(poly[0][0], poly[0][1]);
      for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
      ctx.closePath();
      ctx.strokeStyle = "rgba(88, 76, 52, 0.78)";
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.strokeStyle = "rgba(42, 54, 28, 0.65)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    function step(now) {
      if (!arenaState) return;
      const dt = Math.min(0.05, (now - arenaState.lastTs) / 1000);
      arenaState.lastTs = now;
      arenaState.clock += dt;

      const st = arenaState;
      const h = st.hero;
      const wDef = WEAPON_DEFS[st.cfg.weapon] || WEAPON_DEFS.con;

      for (const d of st.dummies) {
        if (d.hitT > 0) d.hitT = Math.max(0, d.hitT - dt);
      }

      h.actT += dt;
      const atkDur = (typeof window.dollActLen === "function" && window.dollActLen({ sex: st.cfg.sex === "f" ? 1 : 0 }, "at")) || 0.44;
      if (h.act === "at" && h.actT >= atkDur) {
        h.act = "st";
        h.actT = 0;
      }
      if (h.atkCd > 0) h.atkCd = Math.max(0, h.atkCd - dt);

      if (!h.target && st.autoAtk) {
        let best = null, bestD = Infinity;
        for (const d of st.dummies) {
          const dist = Math.hypot(d.x - h.x, d.y - h.y);
          if (dist < bestD) { bestD = dist; best = d; }
        }
        h.target = best;
      }

      let moving = false;
      if (h.tx != null && h.ty != null) {
        const dx = h.tx - h.x, dy = h.ty - h.y, dist = Math.hypot(dx, dy);
        if (dist > 6) {
          const spd = 165;
          h.x += (dx / dist) * Math.min(dist, spd * dt);
          h.y += (dy / dist) * Math.min(dist, spd * dt);
          h.dir = dir8FromDelta(dx, dy);
          h.aimA = Math.atan2(dy, dx);
          moving = true;
        } else {
          h.tx = null;
          h.ty = null;
        }
      } else if (h.target && (st.autoAtk || h.atkCd <= 0)) {
        const dx = h.target.x - h.x, dy = h.target.y - h.y, dist = Math.hypot(dx, dy);
        if (dist > wDef.reach - 8) {
          const spd = 155;
          h.x += (dx / dist) * Math.min(dist, spd * dt);
          h.y += (dy / dist) * Math.min(dist, spd * dt);
          h.dir = dir8FromDelta(dx, dy);
          h.aimA = Math.atan2(dy, dx);
          moving = true;
        } else if (h.atkCd <= 0) {
          triggerAttack(h, h.target, st);
        }
      } else if (st.mouseX != null && st.mouseY != null) {
        const dx = st.mouseX - h.x, dy = st.mouseY - h.y;
        if (Math.hypot(dx, dy) > 12) {
          h.aimA = Math.atan2(dy, dx);
          h.dir = dir8FromDelta(dx, dy);
        }
      }

      if (h.act !== "at") {
        const want = moving ? "run" : "st";
        if (h.act !== want) { h.act = want; h.actT = 0; }
      }

      drawCourtGround();

      if (st.marker) {
        const mt = (st.clock - st.marker.t) / 0.6;
        if (mt < 1) {
          ctx.save();
          ctx.translate(st.marker.x, st.marker.y);
          ctx.globalAlpha = 1 - mt;
          ctx.strokeStyle = "#bfe9a0";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(0, 0, 18 * (1 - mt) + 4, 8 * (1 - mt) + 2, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else {
          st.marker = null;
        }
      }

      // Golden Aim Cone + Pointer Arrow at Hero's feet
      {
        const reach = Math.max(74, Math.min(115, wDef.reach));
        const half = Math.min(Math.PI * 0.9, Math.max(0.35, wDef.arc / 2));
        const pulse = 0.5 + 0.5 * Math.sin(st.clock * 4);
        const color = "240,212,140";
        ctx.save();
        ctx.translate(h.x, h.y + 2);
        ctx.scale(1, 0.62);
        const g = ctx.createRadialGradient(0, 0, 10, 0, 0, reach);
        g.addColorStop(0, `rgba(${color},0)`);
        g.addColorStop(0.5, `rgba(${color},0.13)`);
        g.addColorStop(1, `rgba(${color},0.32)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, reach, h.aimA - half, h.aimA + half);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = `rgba(${color},${0.72 + 0.24 * pulse})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, reach, h.aimA - half, h.aimA + half);
        ctx.stroke();
        const ax = Math.cos(h.aimA), ay = Math.sin(h.aimA), tip = reach + 16;
        ctx.fillStyle = `rgba(${color},${0.86 + 0.14 * pulse})`;
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.moveTo(ax * tip, ay * tip);
        ctx.lineTo(ax * (tip - 24) - ay * 12, ay * (tip - 24) + ax * 12);
        ctx.lineTo(ax * (tip - 16), ay * (tip - 16));
        ctx.lineTo(ax * (tip - 24) + ay * 12, ay * (tip - 24) - ax * 12);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      const ents = st.dummies.map(d => ({ y: d.y, dummy: d })).concat([{ y: h.y, hero: true }]).sort((a, b) => a.y - b.y);
      for (const ent of ents) {
        if (ent.dummy) {
          drawDummy(ctx, ent.dummy);
        } else {
          ctx.save();
          ctx.fillStyle = "rgba(12,18,12,0.42)";
          ctx.beginPath();
          ctx.ellipse(h.x, h.y + 2, 19, 7, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(232,215,150,0.62)";
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.ellipse(h.x, h.y + 3, 23, 9, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          const topH = drawArenaHero(ctx, st.cfg, h.act, h.dir, h.actT, h.x, h.y);
          const top = h.y - Math.max(76, Math.min(104, topH));
          const facName = (FACTIONS[st.cfg.fac] && FACTIONS[st.cfg.fac].name) || "Thiếu Lâm";
          const heroName = (window.o && window.o.name) || "Lãng khách";
          ctx.save();
          ctx.textAlign = "center";
          ctx.shadowColor = "#0b120d";
          ctx.shadowBlur = 4;
          ctx.font = '10.5px "Noto Serif", system-ui, sans-serif';
          ctx.fillStyle = "#e8d6a8";
          ctx.fillText(`${facName} · ${wDef.name}`, h.x, top - 22);
          ctx.font = 'bold 13px "Noto Serif", system-ui, sans-serif';
          ctx.fillStyle = "#fff0b8";
          ctx.fillText(heroName, h.x, top - 8);
          ctx.shadowBlur = 0;
          ctx.fillStyle = "rgba(16,22,18,0.85)";
          ctx.fillRect(h.x - 22, top - 3, 44, 6);
          ctx.fillStyle = "#b8c584";
          ctx.fillRect(h.x - 21, top - 2, 42, 4);
          ctx.restore();
        }
      }

      for (const a of st.fx) {
        a.life -= dt;
        const i = Math.max(0, Math.min(1, a.life / a.max));
        const t = 1 - i;
        ctx.save();
        ctx.globalAlpha = i;
        ctx.strokeStyle = a.color;
        ctx.fillStyle = a.color;
        if (a.k === "slash") {
          ctx.translate(a.x, a.y - 26);
          ctx.rotate(a.angle);
          ctx.scale(1, 0.75);
          ctx.shadowColor = a.color;
          ctx.shadowBlur = 14;
          ctx.lineWidth = 9 * i + 1;
          ctx.beginPath();
          ctx.arc(0, 0, a.r * (0.7 + t * 0.3), -1 + t * 0.25, 1 + t * 0.25);
          ctx.stroke();
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#ffffff";
          ctx.globalAlpha = i * 0.7;
          ctx.beginPath();
          ctx.arc(0, 0, a.r * 0.55, -0.8, 0.8);
          ctx.stroke();
        } else if (a.k === "thrust") {
          ctx.translate(a.x, a.y - 30);
          ctx.rotate(a.angle);
          ctx.shadowColor = a.color;
          ctx.shadowBlur = 12;
          ctx.lineWidth = 6 * i + 1;
          ctx.beginPath();
          ctx.moveTo(10, 0);
          ctx.lineTo(a.r * (0.6 + 0.4 * t), 0);
          ctx.stroke();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(14, -6);
          ctx.lineTo(a.r * 0.8, -2);
          ctx.moveTo(14, 6);
          ctx.lineTo(a.r * 0.8, 2);
          ctx.stroke();
        } else if (a.k === "dart") {
          const px = a.x1 + (a.x2 - a.x1) * t, py = a.y1 + (a.y2 - a.y1) * t;
          ctx.translate(px, py);
          ctx.rotate(a.angle);
          ctx.shadowColor = a.color;
          ctx.shadowBlur = 10;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-24, 0);
          ctx.lineTo(8, 0);
          ctx.stroke();
        } else if (a.k === "hitBurst") {
          ctx.translate(a.x, a.y);
          ctx.shadowColor = a.color;
          ctx.shadowBlur = 10;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(0, 0, 6 + t * 18, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
      st.fx = st.fx.filter(a => a.life > 0);

      for (const f of st.floaters) {
        f.life -= dt;
        const k = 1 - Math.max(0, f.life / f.max);
        const sc = f.big ? 1 + Math.max(0, 0.42 - k * 1.1) : 1;
        ctx.save();
        ctx.font = `bold ${f.big ? 21 : 15}px "Noto Serif", system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.globalAlpha = Math.min(1, f.life * 2.5);
        ctx.translate(f.x, f.y - k * 44);
        ctx.scale(sc, sc);
        ctx.lineWidth = 3.2;
        ctx.strokeStyle = "rgba(16,12,8,0.9)";
        if (f.big) { ctx.shadowColor = f.color; ctx.shadowBlur = 8; }
        ctx.strokeText(f.text, 0, 0);
        ctx.shadowBlur = 0;
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, 0, 0);
        ctx.restore();
      }
      st.floaters = st.floaters.filter(f => f.life > 0);

      arenaRaf = requestAnimationFrame(step);
    }

    arenaRaf = requestAnimationFrame(step);
  }

  window.openVoTruongPreview = openPreviewArena;

  function injectButtons() {
    // 1. Top-right circular bar (#u20r in UI 2.0)
    const u20r = document.getElementById("u20r");
    if (u20r && !document.getElementById("u20VoTruongBtn")) {
      const rb = document.createElement("button");
      rb.id = "u20VoTruongBtn";
      rb.className = "u20rb";
      rb.title = "Mở Võ Trường · Xem Ngoại Trang, Vũ Khí 1-2 Tay & Thử Đòn Đánh (Phím V)";
      rb.innerHTML = "🎯<br>Võ Trường";
      rb.addEventListener("click", openPreviewArena);
      u20r.insertBefore(rb, u20r.firstChild);
    }

    // 2. Right activity column (#u20side in UI 2.0)
    const u20side = document.getElementById("u20side");
    if (u20side && !document.getElementById("u20SideVoTruongBtn")) {
      const sq = document.createElement("button");
      sq.id = "u20SideVoTruongBtn";
      sq.className = "u20sq";
      sq.setAttribute("data-n", "Võ Trường · Thử Trang Bị & Vũ Khí (Phím V)");
      sq.innerHTML = "🎯";
      sq.addEventListener("click", openPreviewArena);
      u20side.insertBefore(sq, u20side.firstChild);
    }

    // 4. Classic header (#top)
    const top = document.getElementById("top");
    const actBtn = document.getElementById("actBtn");
    if (top && actBtn && !document.getElementById("voTruongTopBtn")) {
      const btn = document.createElement("button");
      btn.id = "voTruongTopBtn";
      btn.title = "Võ Trường · Xem Ngoại Trang & Thử Chiêu (Phím V)";
      btn.innerHTML = "🎯 Võ Trường";
      btn.addEventListener("click", openPreviewArena);
      top.insertBefore(btn, actBtn);
    }
  }

  // Hotkey [V] to toggle Võ Trường anytime
  window.addEventListener("keydown", e => {
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target.isContentEditable) return;
    if (e.key === "Escape" && arenaState) {
      stopPreviewArena();
      return;
    }
    if ((e.key === "v" || e.key === "V") && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      if (arenaState) stopPreviewArena();
      else openPreviewArena();
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      injectButtons();
      setInterval(injectButtons, 900);
    });
  } else {
    injectButtons();
    setInterval(injectButtons, 900);
  }
})();
