// JX-IDLE Paperdoll Render Engine
"use strict";
(function () {
  const DOLL_ORIGIN = "";
  const DOLL_DIR = "models/characters/doll/";
  const PART_NAME = { 0: "helm", 1: "hair", 5: "armor", 6: "lhand", 7: "rhand", 8: "lweapon", 9: "rweapon" };
  const PART_BY_NAME = { helm: 0, hair: 1, armor: 5, lhand: 6, rhand: 7, lweapon: 8, rweapon: 9 };
  const DOLL_DEFAULT_ORDER = [0, 1, 5, 6, 7, 8, 9];
  const DOLL_PART_ORDER = [0, 1, 5, 6, 7, 8, 9];
  const DOLL_ONCE = { at: 1, mag: 1, hurt: 1, die: 1 };
  const DOLL_FB = new WeakMap();
  const DOLL_IMG = {};

  function getDollImg(src) {
    if (!src) return null;
    if (typeof window.m0 === "function") return window.m0(src);
    let im = DOLL_IMG[src];
    if (!im) {
      im = new Image();
      im.decoding = "async";
      im.src = src;
      DOLL_IMG[src] = im;
    }
    return im;
  }

  function dollSortOrder(tab, dir, frame, def) {
    const k = dir | 0;
    const get = (o, i) => o && (o[i] !== undefined ? o[i] : o[String(i)]);
    const line = tab && get(tab.lines, frame);
    const own = tab && get(tab.dirs, k);
    const dd = def && get(def.dirs, k);
    return Array.isArray(line) ? line : own || dd || DOLL_DEFAULT_ORDER;
  }

  function dollActionFallback0(cellMap, sheets, requested) {
    const prefix = ["MeleeW", "RangeW", "DoubleW", "Free"].find(p => requested.startsWith(p)) || "";
    const suffix = requested.slice(prefix.length);
    const nearby = /Magic/.test(suffix)
      ? ["Stand", "Attack", "Cut", "Puncture", "Pound", "Pull", "Run"]
      : /Die/.test(suffix)
      ? ["Wound", "Stand", "Run"]
      : /Wound/.test(suffix)
      ? ["Stand", "Run"]
      : /Run|Walk/.test(suffix)
      ? ["Stand", "Cut", "Attack", "Puncture", "Pound", "Pull"]
      : ["Stand", "Run", "Cut", "Attack", "Puncture", "Pound", "Pull"];
    const names = [requested, ...nearby.map(s => prefix + (s === "Stand" && prefix === "Free" ? "Stand3" : s))];
    for (const name of names) {
      const id = cellMap[name];
      if (id && sheets[id]) return { id: id, action: name };
    }
    return null;
  }

  function dollActionFallback(cellMap, sheets, requested) {
    if (!cellMap || !sheets) return null;
    let fm = DOLL_FB.get(cellMap);
    if (!fm) {
      fm = {};
      DOLL_FB.set(cellMap, fm);
    }
    if (requested in fm) return fm[requested];
    return (fm[requested] = dollActionFallback0(cellMap, sheets, requested));
  }

  function dollOn() {
    return typeof window !== "undefined" && !!window.JDOLL && !!window.JDOLL.sheets && window.DOLL_OFF !== true;
  }

  function dollEquipIdx(kind, it) {
    const D = window.JDOLL;
    const tbl = D && D.res && D.res[kind];
    if (!tbl || !it) return null;
    const want = kind === "armor" ? 2 : kind === "helm" ? 7 : null;
    if (want !== null && it.d !== want) return null;
    const rawName = String(it.n || "").replace(/^\[(Bạch Kim|Hoàng Kim)\]\s*/, "");
    const gold = D.gold && (D.gold[it.n] || D.gold[rawName]);
    if (gold && gold.length >= 2) return gold[1];
    if (kind === "weapon" && it.d !== 0 && it.d !== 1) return null;
    const key = it.d + ":" + it.k + ":" + Math.min(10, Math.max(1, it.lvl || 1));
    return tbl[key] !== undefined ? tbl[key] : null;
  }

  function dollWornParts0(S2, eq) {
    const out = {}, item = {};
    const put = (part, kind, it) => {
      if (!it) return;
      const idx = dollEquipIdx(kind, it);
      if (idx !== null && idx !== undefined) {
        out[part] = idx;
        item[part] = it;
      }
    };
    put(0, "helm", eq.helm);
    put(1, "helm", eq.helm);
    put(5, "armor", eq.armor);
    put(6, "armor", eq.armor);
    put(7, "armor", eq.armor);
    put(8, "weapon", eq.weapon);
    put(9, "weapon", eq.weapon);
    const D = window.JDOLL;
    const dres = (D && D.res) || {};
    const fill = (part, kind) => {
      const v = dres[kind] && dres[kind].def;
      if (out[part] === undefined && v !== undefined && v !== null) out[part] = v;
    };
    fill(0, "helm");
    fill(1, "helm");
    fill(5, "armor");
    fill(6, "armor");
    fill(7, "armor");
    fill(8, "weapon");
    fill(9, "weapon");
    return { parts: out, items: item };
  }

  function dollWornParts(S2) {
    const eq = (S2 && S2.eq) || {};
    const c = S2 && S2.__dw;
    const jr = window.JDOLL && window.JDOLL.res;
    if (
      c &&
      c.r === jr &&
      c.h === eq.helm &&
      c.a === eq.armor &&
      c.w === eq.weapon &&
      c.hl === (eq.helm && eq.helm.lvl) &&
      c.al === (eq.armor && eq.armor.lvl) &&
      c.wl === (eq.weapon && eq.weapon.lvl)
    ) {
      return c.v;
    }
    const v = dollWornParts0(S2, eq);
    if (S2 && typeof S2 === "object" && Object.isExtensible(S2)) {
      Object.defineProperty(S2, "__dw", {
        value: {
          r: jr,
          h: eq.helm,
          a: eq.armor,
          w: eq.weapon,
          hl: eq.helm && eq.helm.lvl,
          al: eq.armor && eq.armor.lvl,
          wl: eq.weapon && eq.weapon.lvl,
          v: v
        },
        writable: true,
        configurable: true,
        enumerable: false
      });
    }
    return v;
  }

  const dollWorn = S2 => dollWornParts(S2).parts;

  function dollWeaponIdx(S2) {
    if (S2 && S2.rows && S2.rows.weapon !== undefined) {
      return S2.rows.weapon >= 0 ? S2.rows.weapon : 0;
    }
    const wep = (S2 && S2.eq && S2.eq.weapon) || null;
    const idx = wep ? dollEquipIdx("weapon", wep) : null;
    const D = window.JDOLL;
    const sd = D && D[S2 && (S2.sex || S2.sx === "f") ? "lady" : "man"];
    if (sd && sd.nohorse) {
      if (idx !== null && idx !== undefined && (sd.nohorse[idx] || sd.nohorse[String(idx)])) return idx;
      const dw = D.res && D.res.weapon && D.res.weapon.def;
      if (dw !== undefined && dw !== null && (sd.nohorse[dw] || sd.nohorse[String(dw)])) return dw;
      return sd.nohorse[0] ? 0 : Number(Object.keys(sd.nohorse)[0] || 0);
    }
    return idx === null || idx === undefined ? (D && D.res && D.res.weapon && D.res.weapon.def) || 0 : idx;
  }

  function dollAction(S2, act) {
    if (typeof act !== "string" || !act) act = (S2 && typeof S2.act === "string" && S2.act) || "st";
    if (act === "mg") act = "mag";
    const D = window.JDOLL;
    const isFemale = !!(S2 && (S2.sex || S2.sx === "f"));
    const sd = D && D[isFemale ? "lady" : "man"];
    const wIdx = dollWeaponIdx(S2);
    const acts = sd && sd.nohorse && (sd.nohorse[wIdx] || sd.nohorse[String(wIdx)] || sd.nohorse[0]);
    const fallback = act === "st" ? "FreeStand3" : "Free" + act.charAt(0).toUpperCase() + act.slice(1);
    return (acts && acts[act]) || fallback;
  }

  const dollRow = (dir, d) => {
    d = d | 0;
    if (d <= 1) return 0;
    const g = (((dir | 0) % 8) + 8) % 8;
    const r = Math.floor((g * 8 + Math.floor(32 / d)) / Math.floor(64 / d));
    return r >= d ? r - d : r;
  };

  function dollActLen(S2, act) {
    const D = window.JDOLL;
    const isFemale = !!(S2 && (S2.sex || S2.sx === "f"));
    const du = D && D.dur && D.dur[isFemale ? "lady" : "man"];
    const k = act === "mg" ? "mag" : act;
    const fr = du && du[k];
    const fps = (D && D.dur && D.dur.fps) || 18;
    return fr > 0 ? fr / fps : 0;
  }

  function dollCol(s, S2, act, t) {
    const n = Math.max(1, s.n | 0);
    const k = act === "mg" ? "mag" : act;
    const T = dollActLen(S2, k);
    if (T > 0) {
      const p = DOLL_ONCE[k] ? Math.min(Math.max(t, 0) / T, 0.9999) : ((Math.max(t, 0) / T) % 1 + 1) % 1;
      return Math.min(n - 1, Math.floor(p * n));
    }
    return Math.floor((t * 1000) / Math.max(1, s.ms || 100)) % n;
  }

  function dollCellBySex(isFemale, part, eqIdx, actName) {
    const D = window.JDOLL;
    const sd = D && D[isFemale ? "lady" : "man"];
    if (!sd || !sd.parts) return null;
    const per = sd.parts[part];
    if (!per) return null;
    const cellMap = per[eqIdx] !== undefined ? per[eqIdx] : per[String(eqIdx)];
    if (!cellMap) return null;
    const found = dollActionFallback(cellMap, D.sheets, actName);
    if (!found) return null;
    return D.sheets[found.id] || null;
  }

  function dollCell(S2, part, eqIdx, act, nm) {
    const isFemale = !!(S2 && (S2.sex || S2.sx === "f"));
    const name = nm || dollAction(S2, act);
    return dollCellBySex(isFemale, part, eqIdx, name);
  }

  function dollShadowCellBySex(isFemale, actName) {
    const D = window.JDOLL;
    const sd = D && D[isFemale ? "lady" : "man"];
    const id = sd && sd.shadow && sd.shadow[actName];
    return (id && D.sheets[id]) || null;
  }

  function dollShadowCell(S2, act) {
    const isFemale = !!(S2 && (S2.sex || S2.sx === "f"));
    return dollShadowCellBySex(isFemale, dollAction(S2, act));
  }

  function dollHasShadow(S2, act) {
    if (!dollOn()) return false;
    const s = dollShadowCell(S2, act);
    const im = s && getDollImg(DOLL_ORIGIN + s.f);
    return !!(im && im.complete && im.naturalWidth);
  }

  function dollEffScale(scale) {
    const D = window.JDOLL;
    const sc = (scale * 0.6) / ((D && D.src) || 1);
    return Math.abs(sc - 1) < 0.08 ? 1 : sc;
  }

  function drawDollCoreWithWorn(c, x, y, actKey, actName, dir, t, scale, alpha, isFemale, worn, drawShadow) {
    const D = window.JDOLL;
    const sd = D && D[isFemale ? "lady" : "man"];
    if (!sd || !sd.parts) return 0;

    const S2 = { sex: isFemale ? 1 : 0 };
    const tab = (sd.sort && (sd.sort[actName] || sd.sort.DEFAULT)) || null;
    const defTab = (sd.sort && sd.sort.DEFAULT) || null;
    let dirNo = Math.max(0, dir | 0) % 8;
    let abs = -1;

    for (const part of DOLL_PART_ORDER) {
      if (worn[part] === undefined || worn[part] < 0) continue;
      const s0 = dollCellBySex(isFemale, part, worn[part], actName);
      if (!s0 || !s0.f) continue;
      const d0 = s0.d > 0 ? s0.d : 8;
      const per = Math.max(1, s0.per || 1);
      dirNo = dollRow(dir, d0);
      abs = dirNo * per + Math.min(per - 1, dollCol(s0, S2, actKey, t) * Math.max(1, s0.step || 1));
      break;
    }

    const order = dollSortOrder(tab, dirNo, abs, defTab);
    const a0 = alpha === undefined || alpha === null ? 1 : alpha;
    const crisp = Math.abs(scale - 1) < 0.02;
    const prevAlpha = c.globalAlpha;

    if (drawShadow !== false && scale <= 1.6) {
      const sh = dollShadowCellBySex(isFemale, actName);
      if (sh && sh.f) {
        const im = getDollImg(DOLL_ORIGIN + sh.f);
        const row = dollRow(dir, sh.d);
        if (im && im.complete && im.naturalWidth && row < (sh.d > 0 ? sh.d : 8)) {
          const dx = crisp ? Math.round(x - sh.ax) : x - sh.ax * scale;
          const dy = crisp ? Math.round(y - sh.ay) : y - sh.ay * scale;
          c.globalAlpha = a0;
          c.drawImage(im, dollCol(sh, S2, actKey, t) * sh.w, row * sh.h, sh.w, sh.h, dx, dy, sh.w * scale, sh.h * scale);
        }
      }
    }

    let top = Infinity;
    let drawn = 0;
    for (const part of order) {
      const idx = worn[part];
      if (idx === undefined || idx < 0) continue;
      const s = dollCellBySex(isFemale, part, idx, actName);
      if (!s || !s.f) continue;
      const want = s.d > 0 ? s.d : 8;
      const row = dollRow(dir, s.d);
      if (row >= want) continue;
      const im = getDollImg(DOLL_ORIGIN + s.f);
      if (!im || !im.complete || !im.naturalWidth) continue;
      const col = dollCol(s, S2, actKey, t);
      const dx = crisp ? Math.round(x - s.ax) : x - s.ax * scale;
      const dy = crisp ? Math.round(y - s.ay) : y - s.ay * scale;
      c.globalAlpha = a0;
      c.drawImage(im, col * s.w, row * s.h, s.w, s.h, dx, dy, s.w * scale, s.h * scale);
      drawn++;
      if (dy < top) top = dy;
    }

    c.globalAlpha = prevAlpha;
    return drawn ? Math.abs(y - top) : 0;
  }

  function dollDrawCore(c, x, y, act, dir, t, scale, alpha, S2) {
    if (!dollOn()) return 0;
    const isFemale = !!(S2 && (S2.sex || S2.sx === "f"));
    const actKey = act === "mg" ? "mag" : typeof act === "string" && act ? act : "st";
    const actName = dollAction(S2, actKey);
    const worn = dollWornParts(S2).parts;
    const effScale = dollEffScale(scale || 1.55);
    return drawDollCoreWithWorn(c, x, y, actKey, actName, dir, t, effScale, alpha, isFemale, worn, true);
  }

  function drawDoll(c, x, y, act, dir, t, scale, alpha, S2) {
    if (!dollOn()) return 0;
    return dollDrawCore(c, x, y, act, dir, t, scale, alpha, S2);
  }

  // Direct bridge for app.js u2(A, n, t, e, a, i, w, c, D) and preview_arena.js
  function drawDollFromLook(c, l, act, dir, t, x, y, i, alpha, drawShadow) {
    if (!dollOn() || !l || l.ride) return 0;
    const D = window.JDOLL;
    const isFemale = l.sx === "f" || !!l.sex;
    const sd = D && D[isFemale ? "lady" : "man"];
    if (!sd || !sd.parts) return 0;

    const rows = l.rows || {};
    const wRow = rows.weapon !== undefined && rows.weapon >= 0 ? rows.weapon : 0;
    const hRow = rows.helm !== undefined ? rows.helm : 19;
    const aRow = rows.armor !== undefined && rows.armor >= 0 ? rows.armor : 19;
    const isMag = act === "at" && l.asc && l.asc.mg && (l.mg !== undefined ? !!l.mg : !!(window.r && window.r.P && window.r.P.main && !window.r.P.main.phys));
    const actKey = isMag || act === "mg" ? "mag" : act || "st";
    const acts = sd.nohorse && (sd.nohorse[wRow] || sd.nohorse[String(wRow)] || sd.nohorse[0]);
    const actName =
      (acts && acts[actKey]) ||
      (l.asc && (l.asc[isMag ? "mg" : act] || l.asc.st)) ||
      (actKey === "st" ? "FreeStand3" : "Free" + actKey.charAt(0).toUpperCase() + actKey.slice(1));

    const worn = {
      0: hRow,
      1: hRow,
      5: aRow,
      6: aRow,
      7: aRow,
      8: wRow,
      9: wRow
    };

    const effScale = dollEffScale(i || 1.55);
    return drawDollCoreWithWorn(c, x, y, actKey, actName, dir, t, effScale, alpha, isFemale, worn, drawShadow);
  }

  function preloadDollLook(l) {
    if (!dollOn() || !l || l.ride) return 0;
    const D = window.JDOLL;
    const isFemale = l.sx === "f" || !!l.sex;
    const sd = D && D[isFemale ? "lady" : "man"];
    if (!sd || !sd.parts) return 0;
    const rows = l.rows || {};
    const wRow = rows.weapon !== undefined && rows.weapon >= 0 ? rows.weapon : 0;
    const hRow = rows.helm !== undefined ? rows.helm : 19;
    const aRow = rows.armor !== undefined && rows.armor >= 0 ? rows.armor : 19;
    const worn = { 0: hRow, 1: hRow, 5: aRow, 6: aRow, 7: aRow, 8: wRow, 9: wRow };
    const acts = sd.nohorse && (sd.nohorse[wRow] || sd.nohorse[String(wRow)] || sd.nohorse[0]);
    let count = 0;
    for (const actKey of ["st", "run", "at", "mag", "hurt", "die"]) {
      const actName = (acts && acts[actKey]) || (actKey === "st" ? "FreeStand3" : "Free" + actKey.charAt(0).toUpperCase() + actKey.slice(1));
      const sh = dollShadowCellBySex(isFemale, actName);
      if (sh && sh.f) getDollImg(DOLL_ORIGIN + sh.f);
      for (const p of DOLL_PART_ORDER) {
        if (worn[p] === undefined || worn[p] < 0) continue;
        const s = dollCellBySex(isFemale, p, worn[p], actName);
        if (s && s.f) {
          getDollImg(DOLL_ORIGIN + s.f);
          count++;
        }
      }
    }
    return count;
  }

  window.dollOn = dollOn;
  window.dollEquipIdx = dollEquipIdx;
  window.dollWornParts = dollWornParts;
  window.dollWorn = dollWorn;
  window.dollWeaponIdx = dollWeaponIdx;
  window.dollAction = dollAction;
  window.dollActLen = dollActLen;
  window.dollCell = dollCell;
  window.dollShadowCell = dollShadowCell;
  window.dollHasShadow = dollHasShadow;
  window.drawDoll = drawDoll;
  window.drawDollFromLook = drawDollFromLook;
  window.preloadDollLook = preloadDollLook;
})();
