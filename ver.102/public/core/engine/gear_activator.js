// JX-IDLE Gear Activator & Equipment Converter Engine
(function () {
    "use strict";
    var s9 = document.currentScript,
        Pa = function (A) {
            const n = JX.sets[A.set.kind] || [],
                t = String(A.n).replace(/^\[(Bạch Kim)\]\s*/, "");
            return n.find((e) => e.n === t || e.n === A.n) || n.find((e) => e.grp === A.set.grp && e.d === A.d) || null;
        },
        S6 = function (A) {
            if (!A || !A.set) return !1;
            const n = Pa(A);
            return !!n && (!!n.fixed || n.d > 10);
        },
        kw = function (A) {
            if (A.fac < 0) {
                const e = (w) => (w.req.find((c) => c[0] === 36) || [0, 0])[1],
                    a = A.lv || 0,
                    i = (JX.sets.gold || []).filter((w) => A8(w) < 0 && !G6.has(w.grp) && (typeof u0 != "function" || u0(w)));
                for (const w of [i.filter((c) => c.d === A.d && c.k === A.k), i.filter((c) => c.d === A.d)])
                    if (w.length) return w.sort((c, D) => Math.abs(e(c) - a) - Math.abs(e(D) - a))[0];
                return null;
            }
            const n = (JX.sets.gold || []).filter((e) => A8(e) === A.fac && Ce.has(e.grp));
            if (!n.length) return null;
            const t = n.filter((e) => c9(e.n) === c9(A.n));
            for (const e of [t, n]) {
                const a = e.filter((w) => w.d === A.d && w.k === A.k);
                if (a.length) return a[0];
                const i = e.filter((w) => w.d === A.d);
                if (i.length) return i[0];
            }
            return null;
        },
        Zp = function (A) {
            if (!A || !A.set || A.set.kind !== "gold") return !1;
            const n = (A.req || []).find((i) => i[0] === 39),
                t = n ? n[1] : -1;
            if (!G6.has(A.set.grp)) {
                if (t < 0 || Ce.has(A.set.grp)) return !1;
            }
            const e = kw({ n: A.n, d: A.d, k: A.k, fac: t, lv: ((A.req || []).find((i) => i[0] === 36) || [0, 0])[1] });
            if (!e) return !1;
            const a = typeof c8 == "function" ? c8 : null;
            return a
                ? ((A.n = e.n),
                  (A.s = e.s),
                  (A.base = e.base.map((i) => i.slice())),
                  (A.req = e.req.map((i) => i.slice())),
                  (A.lvl = e.lvl),
                  (A.d = e.d),
                  (A.k = e.k),
                  e.ic ? (A.ic = e.ic) : delete A.ic,
                  (A.mag = e.mag.map(a).filter(Boolean)),
                  (A.ext = (e.ext || []).map(a).filter(Boolean)),
                  (A.set.grp = e.grp),
                  (A.set.sid = e.sid),
                  (A.set.n1 = e.n1),
                  (A.set.n2 = e.n2),
                  (window.HKMP_CONV = window.HKMP_CONV || []).push(e.n),
                  !0)
                : !1;
        },
        Av = function (A) {
            if (!A || !A.set || typeof j1 != "function" || !j1(A)) return !1;
            const n = (P) => ((P.req || []).find((g) => g[0] === 39) || [0, -1])[1],
                t = (P) => ((P.req || []).find((g) => g[0] === 36) || [0, P.lvl || 0])[1],
                e = n(A),
                a = t(A),
                i = A.set.kind === "platina" || A.r === 5 || A.plv != null,
                w = i ? (JX.sets.platina || []).filter((P) => P.vng === 2) : (JX.sets.gold || []).filter((P) => typeof u0 == "function" && u0(P) && !/Hạn Thời|kỳ hạn/i.test(P.n));
            let c = e;
            if (i && c < 0)
                try {
                    c = typeof window.GONE_FAC == "number" ? window.GONE_FAC : typeof o < "u" && o && typeof I < "u" && I[o.fac] ? I[o.fac].id : -1;
                } catch {
                    c = -1;
                }
            const D = w.filter((P) => n(P) === c);
            let l = null;
            for (const P of i
                ? [D.filter((g) => g.d === A.d && g.k === A.k), D.filter((g) => g.d === A.d), D, w.filter((g) => n(g) < 0 && g.d === A.d), w.filter((g) => g.d === A.d)]
                : [
                      D.filter((g) => g.d === A.d && g.k === A.k),
                      D.filter((g) => g.d === A.d),
                      w.filter((g) => n(g) < 0 && g.d === A.d && g.k === A.k),
                      w.filter((g) => n(g) < 0 && g.d === A.d),
                  ])
                if (P.length) {
                    l = P.slice().sort((g, h) => Math.abs(t(g) - a) - Math.abs(t(h) - a))[0];
                    break;
                }
            if (!l) return !1;
            const f = JSON.stringify(A);
            if (
                ((A.n = l.n),
                (A.s = l.s),
                (A.base = l.base.map((P) => P.slice())),
                (A.req = l.req.map((P) => P.slice())),
                (A.lvl = l.lvl),
                (A.d = l.d),
                (A.k = l.k),
                (A.price = l.price),
                l.ic ? (A.ic = l.ic) : delete A.ic,
                (A.set.grp = l.grp),
                (A.set.sid = l.sid),
                (A.set.n1 = l.n1),
                (A.set.n2 = l.n2),
                i)
            ) {
                if (((A.set.kind = "platina"), (A.r = 5), (A.plv = A.plv || 0), (A.mf = null), (A.ps = null), (A.ext = []), A.plv >= 5 && typeof _a == "function")) {
                    const P = A.plv;
                    ((A.plv = Math.min(9, P)), _a(A), (A.plv = P));
                }
                ((A.pv3 = 1), typeof w5 == "function" && w5(A));
            } else {
                const P = typeof c8 == "function" ? c8 : null;
                if (!P) return (Object.assign(A, JSON.parse(f)), !1);
                ((A.mag = l.mag.map(P).filter(Boolean)), (A.ext = (l.ext || []).map(P).filter(Boolean)));
            }
            if (j1(A)) {
                for (const P of Object.keys(A)) delete A[P];
                return (Object.assign(A, JSON.parse(f)), !1);
            }
            return ((window.GONE_CONV = window.GONE_CONV || []).push(l.n), !0);
        },
        r3 = function (A) {
            if (!A || !A.set) return !1;
            let n = Zp(A);
            if (A.vga !== 1) {
                for (const e of (A.mag || []).concat(A.ext || [])) e && (e.a === 65 || e.a === 70) && (e.a = e.a === 65 ? 66 : 71);
                ((A.vga = 1), (n = !0));
            }
            if ((A.set.kind === "platina" && !A.pv3 && typeof o5 == "function" && (o5(A), A.pv3 && (n = !0)), A.set.kind === "gold")) {
                const e = L6.get(A.n);
                e && e.grp !== A.set.grp && ((A.set.grp = e.grp), (A.set.sid = e.sid), (A.set.n1 = e.n1), (A.set.n2 = e.n2), (n = !0));
            }
            if (A.set.kind === "gold" && o9.has(A.n)) {
                const e = L6.get(A.n),
                    a = JX.ge,
                    i = (c, D) => {
                        const l = a[D];
                        if (!l || !c || c.a !== l.a) return !1;
                        const [f, P] = l.p[0];
                        return f === -1 || (c.p[0] >= Math.min(f, P) && c.p[0] <= Math.max(f, P));
                    };
                !((A.mag || []).length === e.mag.length && e.mag.every((c, D) => i(A.mag[D], c)) && JSON.stringify(A.base) === JSON.stringify(e.base)) &&
                    typeof c8 == "function" &&
                    ((A.base = e.base.map((c) => c.slice())),
                    (A.req = e.req.map((c) => c.slice())),
                    (A.lvl = e.lvl),
                    (A.d = e.d),
                    (A.k = e.k),
                    e.ic && (A.ic = e.ic),
                    (A.mag = e.mag.map(c8).filter(Boolean)),
                    (A.ext = (e.ext || []).map(c8).filter(Boolean)),
                    (A.set.grp = e.grp),
                    (A.set.sid = e.sid),
                    (A.set.n1 = e.n1),
                    (A.set.n2 = e.n2),
                    (n = !0));
            }
            Av(A) && (n = !0);
            const t = Pa(A);
            if (!t) return n;
            if (A.set.kind === "gold" && typeof c8 == "function") {
                const e = JX.ge,
                    a = (i, w) => {
                        const c = e[w];
                        if (!c || !i || i.a !== c.a) return !1;
                        const [D, l] = c.p[0];
                        return D === -1 || (i.p[0] >= Math.min(D, l) && i.p[0] <= Math.max(D, l));
                    };
                t.mag.every((i) => e[i]) &&
                    !((A.mag || []).length === t.mag.length && t.mag.every((i, w) => a(A.mag[w], i))) &&
                    ((A.mag = t.mag.map(c8).filter(Boolean)), (n = !0));
            }
            if (
                (t.s != null && A.s !== t.s && A.n.replace(/^\[[^\]]*\]\s*/, "") === t.n.replace(/^\[[^\]]*\]\s*/, "") && ((A.s = t.s), (n = !0)),
                (A.set.n2 > 0 && A.set.n2 < 99) || ((A.set.n1 = t.n1), (A.set.n2 = t.n2), (A.set.sid = A.set.sid || t.sid), (n = !0)),
                (A.mag || []).length < t.mag.length)
            ) {
                const e = () => 5 + Math.floor(Math.random() * 6);
                ((A.mag = t.mag.map((a) => Ba(a, e())).filter(Boolean)), (A.ext = (t.ext || []).map((a) => Ba(a, e())).filter(Boolean)), (n = !0));
            }
            return n;
        },
        i9 =
            /^(Hắc thần|Thương Khung Thiên Khởi|Long Tương Chi Lân|Độc Cô Cầu Bại|Thuần Tịnh Chi Giới|Thế Túc Toàn Giới|Thiên Hà Giới|Thiên tử chi giới|Đế hoàng chi giới|Hưng Bang Giới|Trấn Nhạc Giới|Thương Phương Giới|Lãnh Bá Nguyên Mộng|Vũ Liệt Chi)/i,
        nv = /^\s*\[|\((\s*mới\s*|kỳ hạn)\)|[ÄĐẫãệđ´óằð]{4}|^Dương Thần|^(Định Quốc Thanh sa Trường sam|An Bang Cúc hoa Thạch chỉ hoàn|An Bang Điền Hoàng thạch ngọc bội)$/,
        q6 = (s) => ((s = String(s || "")), i9.test(s.replace(/^\[[^\]]*\]\s*/, "")) || nv.test(s.replace(/^\[Bạch Kim\]\s*/, ""))),
        _w = (s) => !!s && typeof s == "object" && !s.set && (s.d === 3 || s.d === 4 || s.d === 9) && (!!s.vio || s.r === 3),
        zw = (s) => !!s && typeof s == "object" && s.d === 10 && !!s.vio,
        tv = (s) => !!s && typeof s == "object" && s.vio === !0,
        ev = 5e3,
        av = (s) =>
            !!s &&
            typeof s == "object" &&
            ["mag", "ext"].some((A) => Array.isArray(s[A]) && s[A].some((n) => n && typeof n == "object" && Array.isArray(n.p) && Math.abs(+n.p[0] || 0) > ev)),
        w9 = /^\[Hạn Thời Bạch Kim\]|^(Thiên|Long) Hoàng Long Khí|[ÄĐẫãệđ´óằð]{4}|ẽịấ/,
        Ow = (s) => !!s && typeof s == "object" && !!s.set && s.set.kind === "platina" && w9.test(String(s.n || "").replace(/^\[Bạch Kim\]\s*/, "")),
        z1 = (s) => _w(s) || zw(s) || tv(s) || av(s) || Ow(s) || (!!s && typeof s == "object" && !!s.set && s.set.kind !== "platina" && q6(s.n));
    JX.sets.gold && (JX.sets.gold = JX.sets.gold.filter((s) => !q6(s.n)));
    var L6 = new Map(),
        o9 = new Set();
    if (
        (JX.sets.gold && (JX.sets.gold = JX.sets.gold.filter((s) => (L6.has(s.n) ? (o9.add(s.n), !1) : (L6.set(s.n, s), !0)))),
        JX.sets.platina && (JX.sets.platina = JX.sets.platina.filter((s) => !i9.test(String(s.n || "").replace(/^\[[^\]]*\]\s*/, "")))),
        JX.sets.platina && (JX.sets.platina = JX.sets.platina.filter((s) => !w9.test(String(s.n || "")))),
        window.RCP && RCP.shards)
    )
        for (const s of Object.keys(RCP.shards)) q6(s) && delete RCP.shards[s];
    (function () {
        const s = JX.sets.gold,
            A = JX.sets.platina,
            n = JX.ge,
            t = (P, g) => (P.req.find((h) => h[0] === g) || [0, -1])[1],
            e = (P) => String(P).replace(/^\[[^\]]*\]\s*/, "");
        let a = 1e5;
        const i = (P, g) => {
                const h = n[P];
                if (!h) return null;
                if (Math.abs(g - 1) < 0.01) return P;
                const b = h.p.map(([u, p]) => (u === -1 && p === -1 ? [u, p] : [Math.round(u * g), Math.round(p * g)]));
                return ((n[++a] = { a: h.a, p: b }), a);
            },
            w = (P) => P.mag.length && P.mag.every((g) => n[g]),
            c = s.filter(w);
        for (const P of s) {
            if (w(P)) continue;
            const g = t(P, 36),
                h = t(P, 39),
                u =
                    c.filter((H) => H.d === P.d && t(H, 39) === h && t(H, 36) <= g).sort((H, C) => t(C, 36) - t(H, 36))[0] ||
                    c.filter((H) => H.d === P.d).sort((H, C) => t(C, 36) - t(H, 36))[0];
            if (!u) continue;
            const p = 1 + Math.max(0, g - t(u, 36)) / 400,
                M = P.mag.length ? P.mag : u.mag.map(() => -1);
            ((P.mag = M.map((H, C) => (n[H] ? H : i(u.mag[C % u.mag.length], p))).filter((H) => H != null)),
                (!P.ext || !P.ext.length) && (P.ext = (u.ext || []).map(() => -1)),
                (P.ext = (P.ext || []).map((H, C) => (n[H] ? H : u.ext && u.ext.length ? i(u.ext[C % u.ext.length], p) : null)).filter((H) => H != null)),
                (P.fixed = 1));
        }
        const D = new Set(s.filter((P) => P.fixed).map((P) => P.grp));
        for (const P of s) D.has(P.grp) && (P.fixed = 1);
        for (const P of A) D.has(P.grp) && (P.fixed = 1);
        const l = {};
        for (const P of s) (l[P.grp] = l[P.grp] || []).push(P);
        for (const P in l) {
            const g = l[P],
                h = g.find((b) => b.n2 > 0 && b.n2 < 99);
            for (const b of g)
                (b.n2 > 0 && b.n2 < 99) ||
                    ((b.n1 = h ? h.n1 : Math.max(2, Math.round(g.length * 0.4))),
                    (b.n2 = h ? h.n2 : Math.max(2, Math.round(g.length * 0.7))),
                    (b.sid = b.sid || (h && h.sid) || 1));
        }
        const f = {};
        for (const P of s) f[e(P.n)] = P;
        for (const P of A) {
            const g = f[e(P.n)] || (l[P.grp] || []).find((h) => h.d === P.d);
            if (
                (g &&
                    (!P.mag.length || !P.mag.every((h) => n[h])) &&
                    ((P.mag = g.mag.map((h) => i(h, 1.15)).filter((h) => h != null)),
                    (!P.ext || !P.ext.length || !P.ext.every((h) => n[h])) && (P.ext = (g.ext || []).map((h) => i(h, 1.15)).filter((h) => h != null)),
                    (P.fixed = 1)),
                !(P.n2 > 0 && P.n2 < 99))
            ) {
                const h = (l[P.grp] || [])[0];
                ((P.n1 = h ? h.n1 : 3), (P.n2 = h ? h.n2 : 5), (P.sid = P.sid || (h && h.sid) || 1));
            }
        }
    })();
    var Ce = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]),
        A8 = (s) => (s.req.find((A) => A[0] === 39) || [0, -1])[1],
        G6 = new Set([39, 41, 42, 45, 46, 52]),
        Cw = (s) => !G6.has(s.grp) && (A8(s) < 0 || Ce.has(s.grp)),
        c9 = (s) =>
            String(s || "")
                .replace(/^\[[^\]]*\]\s*/, "")
                .toLowerCase()
                .split(/\s+/)
                .slice(0, 2)
                .join(" ");

    // Global namespace export for game engine and devtools
    window.Pa = Pa;
    window.S6 = S6;
    window.kw = kw;
    window.Zp = Zp;
    window.Av = Av;
    window.r3 = r3;
    window.q6 = q6;
    window.z1 = z1;
    window.L6 = L6;
    window.o9 = o9;
    window.Ce = Ce;
    window.A8 = A8;
    window.G6 = G6;
    window.Cw = Cw;
    window.c9 = c9;
    window.GearActivator = { Pa, S6, kw, Zp, Av, r3, q6, z1, L6, o9, Ce, A8, G6, Cw, c9 };
})();
