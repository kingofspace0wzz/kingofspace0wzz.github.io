/* The open-domain globe in the hero and the three research drawings.
   Adapted from the Agent Frontier site (https://agentfrontier-ai.github.io). No dependencies. */
(function () {
  'use strict';

  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var stills = [], stillQueued = false;
  function redrawStills() {
    if (stillQueued) return;
    stillQueued = true;
    requestAnimationFrame(function () { stillQueued = false; stills.forEach(function (f) { f(); }); });
  }
  function on(t, e, f, o) { t.addEventListener(e, f, o); }
  // a 2D canvas sized to its CSS box at device pixel ratio; read st.w / st.h (CSS px) each frame
  function canvas(cv) {
    var st = { ctx: cv.getContext('2d'), w: 0, h: 0 };
    var fit = function () {
      var r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      var w = Math.max(1, r.width), h = Math.max(1, r.height), pw = Math.round(w * dpr), ph = Math.round(h * dpr);
      st.w = w; st.h = h;
      if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
      st.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduced) redrawStills();
    };
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(cv); else on(window, 'resize', fit);
    return st;
  }
  // true while the element is near the viewport, so offscreen canvases are skipped
  function near(node) {
    var s = { v: true };
    if (window.IntersectionObserver) new IntersectionObserver(function (es) { s.v = es[0].isIntersecting; }, { rootMargin: '120px' }).observe(node);
    return function () { return s.v; };
  }
  // per-frame callback fn(tSeconds, dtSeconds); with reduced motion it draws one still frame (and again on resize)
  function loop(fn) {
    if (reduced) { stills.push(function () { fn(2.4, 0); }); redrawStills(); return; }
    var last = performance.now(), t0 = last;
    var step = function (now) {
      var dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      fn(Math.max(0, (now - t0) / 1000), dt);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  var TAU = Math.PI * 2, C30 = Math.cos(Math.PI / 6), INK = '13,16,20', BLUE = '43,75,255';
  var HUE = {
    cua: '43,75,255', mobile: '9,138,118', arm: '104,74,228', lab: '150,104,0', swe: '34,52,120',
    radar: '224,86,10', game: '208,48,104', collab: '12,124,176', beam: '84,124,22'
  };
  function sm(a, b, x) { var u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); }
  function mix(a, b, u) { a = a.split(','); b = b.split(','); return Math.round(+a[0] + (b[0] - a[0]) * u) + ',' + Math.round(+a[1] + (b[1] - a[1]) * u) + ',' + Math.round(+a[2] + (b[2] - a[2]) * u); }
  var seed = 7;
  function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }

  // ---------- the isometric drawing language
  function P(o, x, y, z) { return [o.x + (x - y) * C30 * o.s, o.y + (x + y) * 0.5 * o.s - z * o.s]; }
  function poly(c, pts) { c.beginPath(); for (var i = 0; i < pts.length; i++) { if (i) c.lineTo(pts[i][0], pts[i][1]); else c.moveTo(pts[i][0], pts[i][1]); } }
  function seg(c, o, a, b) { var p = P(o, a[0], a[1], a[2]), q = P(o, b[0], b[1], b[2]); c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.stroke(); }
  function quad(c, o, y, xa, xb, za, zb) { poly(c, [P(o, xa, y, za), P(o, xb, y, za), P(o, xb, y, zb), P(o, xa, y, zb)]); c.closePath(); }
  function slab(c, o, rgb, glow, ghost) {
    var a = 2, th = .34, t0 = P(o, -a, -a, 0), t1 = P(o, a, -a, 0), t2 = P(o, a, a, 0), t3 = P(o, -a, a, 0), b1 = P(o, a, -a, -th), b2 = P(o, a, a, -th), b3 = P(o, -a, a, -th);
    if (ghost) { c.setLineDash([4, 5]); c.lineWidth = 1.1; c.strokeStyle = 'rgba(' + INK + ',.3)'; poly(c, [t0, t1, t2, t3]); c.closePath(); c.stroke(); poly(c, [t3, b3, b2, b1, t1]); c.stroke(); c.setLineDash([]); return; }
    c.fillStyle = '#E4E7ED'; poly(c, [t3, t2, b2, b3]); c.closePath(); c.fill(); c.fillStyle = '#D9DDE5'; poly(c, [t1, t2, b2, b1]); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(' + INK + ',.85)'; c.lineWidth = 1.1; c.lineJoin = 'round';
    poly(c, [t3, b3, b2, b1, t1]); c.stroke(); c.beginPath(); c.moveTo(t2[0], t2[1]); c.lineTo(b2[0], b2[1]); c.stroke();
    var g = c.createLinearGradient(t0[0], t0[1], t2[0], t2[1]); g.addColorStop(0, 'rgba(' + rgb + ',' + (0.16 + glow * 0.16) + ')'); g.addColorStop(1, 'rgba(' + rgb + ',.03)');
    poly(c, [t0, t1, t2, t3]); c.closePath(); c.fillStyle = '#FFFFFF'; c.fill(); c.fillStyle = g; c.fill(); c.stroke();
    c.strokeStyle = 'rgba(' + INK + ',.07)'; c.lineWidth = 1; for (var i = -1; i <= 1; i++) { seg(c, o, [i, -a, 0], [i, a, 0]); seg(c, o, [-a, i, 0], [a, i, 0]); }
  }
  function box(c, o, x0, y0, x1, y1, z0, h, top, side, stroke) {
    var z1 = z0 + h, A = P(o, x0, y0, z1), B = P(o, x1, y0, z1), C = P(o, x1, y1, z1), D = P(o, x0, y1, z1), Cb = P(o, x1, y1, z0), Db = P(o, x0, y1, z0), Bb = P(o, x1, y0, z0);
    c.strokeStyle = stroke; c.lineWidth = 1.1; c.lineJoin = 'round';
    poly(c, [D, C, Cb, Db]); c.closePath(); c.fillStyle = side; c.fill(); c.stroke();
    poly(c, [B, C, Cb, Bb]); c.closePath(); c.fillStyle = side; c.fill(); c.stroke();
    poly(c, [A, B, C, D]); c.closePath(); c.fillStyle = top; c.fill(); c.stroke();
  }
  function cursor(c, cp, k) {
    c.beginPath(); c.moveTo(cp[0], cp[1]); c.lineTo(cp[0] + 9.5 * k, cp[1] + 4.8 * k); c.lineTo(cp[0] + 4.4 * k, cp[1] + 5.8 * k); c.lineTo(cp[0] + 2.3 * k, cp[1] + 10.5 * k); c.closePath();
    c.fillStyle = 'rgb(' + INK + ')'; c.fill(); c.lineWidth = 1; c.strokeStyle = '#fff'; c.stroke();
  }
  function ripple(c, p, q, rgb, size) {
    c.strokeStyle = 'rgba(' + rgb + ',' + (1 - q) + ')'; c.lineWidth = 1.4; c.beginPath(); c.arc(p[0], p[1], 4 + q * size, 0, TAU); c.stroke();
  }

  // ---------- one small world per domain
  function cua(c, o, rgb, t) {
    // a desktop app: the agent clicks into a form, types, and submits it
    var y = .25, x0 = -1.7, x1 = 1.7, z0 = .62, z1 = 2.5, i, q, cyc = (t % 7) / 7, k = Math.max(.55, o.s / 23);
    c.lineCap = 'round'; c.lineWidth = Math.max(2, o.s * .14); c.strokeStyle = 'rgba(' + INK + ',.85)'; seg(c, o, [0, 0, .02], [0, 0, z0]);
    c.lineWidth = Math.max(1.6, o.s * .1); seg(c, o, [-.55, 0, .02], [.55, 0, .02]); c.lineCap = 'butt';
    quad(c, o, y, x0, x1, z0, z1); c.fillStyle = 'rgba(255,255,255,.97)'; c.fill(); c.strokeStyle = 'rgba(' + INK + ',.9)'; c.lineWidth = 1.2; c.stroke();
    c.strokeStyle = 'rgba(' + INK + ',.35)'; c.lineWidth = 1; seg(c, o, [x0, y, z1 - .3], [x1, y, z1 - .3]); seg(c, o, [x0 + .95, y, z1 - .3], [x0 + .95, y, z0]);
    c.fillStyle = 'rgba(' + INK + ',.35)';
    for (i = 0; i < 3; i++) { q = P(o, x0 + .2 + i * .18, y, z1 - .15); c.beginPath(); c.arc(q[0], q[1], Math.max(1, o.s * .05), 0, TAU); c.fill(); }
    c.lineCap = 'round'; c.lineWidth = Math.max(1.4, o.s * .1); c.strokeStyle = 'rgba(' + INK + ',.16)';
    for (i = 0; i < 3; i++) seg(c, o, [x0 + .22, y, z1 - .62 - i * .32], [x0 + .7, y, z1 - .62 - i * .32]);
    c.lineCap = 'butt';
    var f1 = sm(.14, .3, cyc), f2 = sm(.44, .58, cyc), sent = cyc > .72, focus = cyc < .4 ? 1 : cyc < .62 ? 2 : 0;
    function field(za, fill, active) {
      quad(c, o, y, -.55, 1.45, za, za + .3); c.fillStyle = '#fff'; c.fill(); c.lineWidth = active ? 1.4 : 1; c.strokeStyle = active ? 'rgba(' + rgb + ',1)' : 'rgba(' + INK + ',.35)'; c.stroke();
      if (fill > 0) { c.lineCap = 'round'; c.lineWidth = Math.max(1.4, o.s * .09); c.strokeStyle = 'rgba(' + INK + ',.55)'; seg(c, o, [-.42, y, za + .15], [-.42 + 1.5 * fill, y, za + .15]); c.lineCap = 'butt'; }
    }
    field(1.68, f1, focus === 1 && cyc > .1); field(1.2, f2, focus === 2 && cyc > .4);
    quad(c, o, y, .45, 1.45, .74, 1.02); c.fillStyle = sent ? 'rgba(' + rgb + ',1)' : 'rgba(' + rgb + ',.14)'; c.fill(); c.lineWidth = 1.3; c.strokeStyle = 'rgba(' + rgb + ',1)'; c.stroke();
    if (sent) { c.strokeStyle = '#fff'; c.lineWidth = Math.max(1.4, o.s * .08); c.lineJoin = 'round'; c.beginPath(); var a1 = P(o, .78, y, .88), a2 = P(o, .92, y, .8), a3 = P(o, 1.14, y, .96); c.moveTo(a1[0], a1[1]); c.lineTo(a2[0], a2[1]); c.lineTo(a3[0], a3[1]); c.stroke(); }
    // the cursor's route: field one, field two, then the button
    var K = [[1.4, 2.05], [-.3, 1.83], [-.3, 1.83], [-.3, 1.35], [-.3, 1.35], [.95, .88], [.95, .88]], T = [0, .12, .32, .42, .6, .7, 1], s2 = 0;
    while (s2 < T.length - 2 && cyc > T[s2 + 1]) s2++;
    var u = sm(0, 1, (cyc - T[s2]) / (T[s2 + 1] - T[s2])), cx = K[s2][0] + (K[s2 + 1][0] - K[s2][0]) * u, cz = K[s2][1] + (K[s2 + 1][1] - K[s2][1]) * u;
    var cp = P(o, cx, y - .02, cz);
    if (cyc > .7 && cyc < .86) ripple(c, cp, (cyc - .7) / .16, rgb, 18 * k);
    cursor(c, cp, k);
  }
  function mobile(c, o, rgb, t) {
    // a phone: the agent opens an app from the home screen, then taps through the page it opens
    var x0 = -.8, x1 = .8, y0 = -.12, y1 = .08, z0 = .06, h = 2.85, sy = y1 + .001, i, q, cyc = (t % 6) / 6, k = Math.max(.6, o.s / 22);
    var zt = z0 + h - .22, zb = z0 + .3, sx0 = x0 + .12, sx1 = x1 - .12;
    box(c, o, x0, y0, x1, y1, z0, h, '#fff', '#E4E7ED', 'rgba(' + INK + ',.9)');
    quad(c, o, sy, sx0, sx1, zb, zt); c.fillStyle = '#fff'; c.fill(); c.strokeStyle = 'rgba(' + INK + ',.4)'; c.lineWidth = 1; c.stroke();
    c.lineCap = 'round'; c.lineWidth = Math.max(1.4, o.s * .08); c.strokeStyle = 'rgba(' + INK + ',.5)'; seg(c, o, [-.22, sy, z0 + .15], [.22, sy, z0 + .15]); c.lineCap = 'butt';
    var pick = Math.floor(t / 6) % 9, home = cyc < .5, fx, fz, tap = -1;
    if (home) {
      for (i = 0; i < 9; i++) {
        var ix = -.43 + (i % 3) * .43, iz = 2.3 - Math.floor(i / 3) * .46, lit = i === pick && cyc > .32;
        quad(c, o, sy, ix - .15, ix + .15, iz - .15, iz + .15); c.fillStyle = lit ? 'rgba(' + rgb + ',1)' : 'rgba(' + (i === pick ? rgb : INK) + ',' + (i === pick ? .22 : .1) + ')'; c.fill();
        c.lineWidth = 1; c.strokeStyle = 'rgba(' + (i === pick ? rgb : INK) + ',' + (i === pick ? 1 : .3) + ')'; c.stroke();
      }
      var e = sm(.04, .3, cyc), tx = -.43 + (pick % 3) * .43, tz = 2.3 - Math.floor(pick / 3) * .46;
      fx = tx * e; fz = .62 + (tz - .62) * e; if (cyc > .3 && cyc < .46) tap = (cyc - .3) / .16;
    } else {
      quad(c, o, sy, sx0, sx1, zt - .36, zt); c.fillStyle = 'rgba(' + rgb + ',.85)'; c.fill();
      for (i = 0; i < 3; i++) {
        var rz = zt - .66 - i * .42, done = i === 1 && cyc > .74;
        quad(c, o, sy, sx0 + .08, sx1 - .08, rz - .3, rz); c.fillStyle = done ? 'rgba(' + rgb + ',.18)' : '#fff'; c.fill(); c.lineWidth = 1; c.strokeStyle = done ? 'rgba(' + rgb + ',1)' : 'rgba(' + INK + ',.25)'; c.stroke();
        c.lineCap = 'round'; c.lineWidth = Math.max(1.3, o.s * .07); c.strokeStyle = 'rgba(' + INK + ',.3)'; seg(c, o, [sx0 + .26, sy, rz - .15], [sx0 + .8, sy, rz - .15]); c.lineCap = 'butt';
      }
      var e2 = sm(.54, .72, cyc); fx = .1 * e2; fz = 1.62 + (zt - .66 - .42 - .15 - 1.62) * e2; if (cyc > .72 && cyc < .88) tap = (cyc - .72) / .16;
    }
    q = P(o, fx, sy, fz);
    if (tap >= 0) ripple(c, q, tap, rgb, 14 * k);
    c.fillStyle = 'rgba(' + INK + ',.85)'; c.beginPath(); c.arc(q[0], q[1], Math.max(2.6, o.s * .16), 0, TAU); c.fill(); c.lineWidth = 1.2; c.strokeStyle = '#fff'; c.stroke();
  }
  function radar(c, o, rgb, t) {
    var i, k, n = 40, th, p; c.lineWidth = 1;
    for (k = 1; k <= 3; k++) { c.strokeStyle = 'rgba(' + rgb + ',' + (0.3 + k * 0.12) + ')'; c.beginPath(); for (i = 0; i <= n; i++) { th = i / n * TAU; p = P(o, k * 0.6 * Math.cos(th), k * 0.6 * Math.sin(th), .02); if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); } c.stroke(); }
    var ang = t * 1.5;
    for (i = 0; i < 16; i++) { th = ang - i * 0.055; c.strokeStyle = 'rgba(' + rgb + ',' + (1 - i / 16) + ')'; c.lineWidth = i ? 1 : 2; seg(c, o, [0, 0, .02], [1.8 * Math.cos(th), 1.8 * Math.sin(th), .02]); }
    var bl = [[1.1, 0.7], [1.5, 2.6], [0.8, 4.1], [1.6, 5.3]];
    for (i = 0; i < bl.length; i++) {
      var d = ((ang - bl[i][1]) % TAU + TAU) % TAU, al = Math.max(0, 1 - d / 3.8); p = P(o, bl[i][0] * Math.cos(bl[i][1]), bl[i][0] * Math.sin(bl[i][1]), .04);
      c.fillStyle = 'rgba(' + INK + ',' + al + ')'; c.beginPath(); c.arc(p[0], p[1], Math.max(1.6, o.s * .12), 0, TAU); c.fill();
      if (al > .55) { c.lineWidth = 1.2; c.strokeStyle = 'rgba(' + rgb + ',' + (al - .55) * 2 + ')'; c.beginPath(); c.arc(p[0], p[1], 3 + (1 - al) * o.s, 0, TAU); c.stroke(); }
    }
  }
  function beam(c, o, rgb, t) {
    var d = 0.30 + 0.26 * Math.sin(t * 1.25), i, n = 14, u, u2, z1, z2, lw = Math.max(2, o.s * .13);
    c.lineCap = 'round'; c.lineWidth = lw; c.strokeStyle = 'rgba(' + INK + ',.9)'; seg(c, o, [-1.3, 0, 0], [-1.3, 0, 1.55]);
    c.lineWidth = 1; c.strokeStyle = 'rgba(' + INK + ',.4)'; seg(c, o, [-1.6, -.5, 0], [-1.0, .5, 0]); seg(c, o, [-1.6, .5, 0], [-1.0, -.5, 0]);
    c.setLineDash([3, 4]); c.strokeStyle = 'rgba(' + INK + ',.45)'; seg(c, o, [-1.3, 0, 1.55], [1.5, 0, 1.55]); c.setLineDash([]);
    c.lineWidth = lw;
    for (i = 0; i < n; i++) { u = i / n; u2 = (i + 1) / n; z1 = 1.55 - d * u * u * (3 - u) / 2; z2 = 1.55 - d * u2 * u2 * (3 - u2) / 2; var hot = (1 - u) > .55 && d > .44; c.strokeStyle = 'rgba(' + (hot ? HUE.game : rgb) + ',1)'; seg(c, o, [-1.3 + 2.8 * u, 0, z1], [-1.3 + 2.8 * u2, 0, z2]); }
    c.lineCap = 'butt'; c.lineWidth = 1.2; c.strokeStyle = 'rgba(' + INK + ',.8)'; seg(c, o, [1.5, 0, 1.55 - d], [1.5, 0, 1.0 - d]);
    var wq = P(o, 1.5, 0, .82 - d), ws = Math.max(3, o.s * .22); c.fillStyle = 'rgba(' + INK + ',.92)'; c.fillRect(wq[0] - ws, wq[1] - ws, ws * 2, ws * 2);
  }
  function swe(c, o, rgb, t) {
    var y = .2, x0 = -1.6, x1 = 1.6, z0 = .12, z1 = 2.3, i, q;
    quad(c, o, y, x0, x1, z0, z1); c.fillStyle = 'rgba(255,255,255,.97)'; c.fill(); c.strokeStyle = 'rgba(' + INK + ',.9)'; c.lineWidth = 1.2; c.stroke();
    c.strokeStyle = 'rgba(' + INK + ',.35)'; c.lineWidth = 1; seg(c, o, [x0, y, z1 - .3], [x1, y, z1 - .3]);
    var rows = [1.3, 2.2, 1.7]; c.lineWidth = Math.max(1.6, o.s * .12); c.lineCap = 'round';
    for (i = 0; i < rows.length; i++) { c.strokeStyle = 'rgba(' + INK + ',.18)'; seg(c, o, [x0 + .3, y, z1 - .62 - i * .26], [x0 + .3 + rows[i], y, z1 - .62 - i * .26]); }
    c.lineCap = 'butt';
    var cyc = (t % 7) / 7, fixed = cyc > .55, col = fixed ? rgb : HUE.game, bx0 = x0 + .3, bx1 = fixed ? x0 + 1.7 : x0 + 2.75 + .05 * Math.sin(t * 22), bz0 = .36, bz1 = 1.0;
    quad(c, o, y, bx0, bx1, bz0, bz1); c.fillStyle = 'rgba(' + col + ',.18)'; c.fill(); c.lineWidth = 1.4; c.strokeStyle = 'rgba(' + col + ',1)'; c.stroke();
    c.strokeStyle = 'rgba(' + INK + ',.3)'; c.lineWidth = 1; quad(c, o, y, x0 + 1.95, x1 - .25, bz0, bz1); c.stroke();
    var cu = cyc < .55 ? cyc / .55 : 1, e = cu * cu * (3 - 2 * cu), cp = P(o, x0 + 2.9 - 1.5 * e, y - .02, 1.9 - 1.2 * e), k = Math.max(.55, o.s / 23);
    cursor(c, cp, k);
    if (cyc > .52 && cyc < .7) { q = (cyc - .52) / .18; ripple(c, cp, q, rgb, 18 * k); }
  }
  function arm(c, o, rgb, t, w, dt) {
    var i, y, best = 9, target = 0, ys = [];
    c.lineWidth = 1; c.strokeStyle = 'rgba(' + INK + ',.4)'; seg(c, o, [.62, -1.9, .02], [.62, 1.9, .02]); seg(c, o, [1.5, -1.9, .02], [1.5, 1.9, .02]);
    for (i = 0; i < 4; i++) { y = ((t * .55 + i) % 4) - 2; ys.push(y); if (Math.abs(y) < best) { best = Math.abs(y); target = y; } }
    for (i = 0; i < 4; i++) { y = ys[i]; var hot = y === target && best < .9; poly(c, [P(o, .84, y - .2, .02), P(o, 1.28, y - .2, .02), P(o, 1.28, y + .2, .02), P(o, .84, y + .2, .02)]); c.closePath(); c.fillStyle = 'rgba(' + rgb + ',' + (hot ? .7 : .2) + ')'; c.fill(); c.strokeStyle = 'rgba(' + rgb + ',1)'; c.stroke(); }
    w.r = (w.r || 0) + ((best < .9 ? 1 : .25) - (w.r || 0)) * Math.min(1, (dt || 0.016) * 7);
    var r = w.r, sh = [-.9, 0, 1.0], tg = [1.06 * r - .25 * (1 - r), target * r, .32 + 1.0 * (1 - r)], el = [(sh[0] + tg[0]) / 2, (sh[1] + tg[1]) / 2, Math.max(sh[2], tg[2]) + .78], lw = Math.max(2, o.s * .15);
    c.lineCap = 'round'; c.strokeStyle = 'rgba(' + INK + ',.92)'; c.lineWidth = lw; seg(c, o, [-.9, 0, 0], sh); seg(c, o, sh, el); c.lineWidth = lw * .72; seg(c, o, el, tg); c.lineCap = 'butt';
    [sh, el].forEach(function (j) { var q = P(o, j[0], j[1], j[2]); c.fillStyle = '#fff'; c.beginPath(); c.arc(q[0], q[1], Math.max(2.2, o.s * .17), 0, TAU); c.fill(); c.lineWidth = 1.5; c.strokeStyle = 'rgba(' + rgb + ',1)'; c.stroke(); });
    var g = P(o, tg[0], tg[1], tg[2]); c.fillStyle = 'rgba(' + rgb + ',1)'; c.beginPath(); c.arc(g[0], g[1], Math.max(1.8, o.s * .12), 0, TAU); c.fill();
  }
  function game(c, o, rgb, t) {
    function tri(v) { v = ((v % 4) + 4) % 4; return v < 2 ? v - 1 : 3 - v; }
    c.lineWidth = 1; c.strokeStyle = 'rgba(' + INK + ',.35)'; poly(c, [P(o, -1.6, -1.6, .02), P(o, 1.6, -1.6, .02), P(o, 1.6, 1.6, .02), P(o, -1.6, 1.6, .02)]); c.closePath(); c.stroke();
    c.setLineDash([3, 4]); seg(c, o, [0, -1.6, .02], [0, 1.6, .02]); c.setLineDash([]);
    var bx = tri(t * 1.3) * 1.45, by = tri(t * 0.9 + .7) * 1.3, bz = .14 + Math.abs(Math.sin(t * 5)) * .4;
    c.lineWidth = Math.max(2, o.s * .15); c.lineCap = 'round'; c.strokeStyle = 'rgba(' + rgb + ',1)'; seg(c, o, [-1.6, by * .85 - .38, .06], [-1.6, by * .85 + .38, .06]); seg(c, o, [1.6, by * .7 - .38, .06], [1.6, by * .7 + .38, .06]); c.lineCap = 'butt';
    var sh = P(o, bx, by, .02); c.fillStyle = 'rgba(' + INK + ',.14)'; c.beginPath(); c.ellipse(sh[0], sh[1], o.s * .24, o.s * .12, 0, 0, TAU); c.fill();
    var b = P(o, bx, by, bz); c.fillStyle = 'rgb(' + INK + ')'; c.beginPath(); c.arc(b[0], b[1], Math.max(2, o.s * .14), 0, TAU); c.fill();
  }
  function lab(c, o, rgb, t) {
    // an instrument's screen with a spectrum being traced, and the sample it is measuring
    var y = -.3, x0 = -1.6, x1 = 1.6, z0 = .12, z1 = 2.2, i, n = 46, cyc = (t % 6) / 6, pr = Math.min(1, cyc / .7), p;
    quad(c, o, y, x0, x1, z0, z1); c.fillStyle = 'rgba(255,255,255,.97)'; c.fill(); c.strokeStyle = 'rgba(' + INK + ',.9)'; c.lineWidth = 1.2; c.stroke();
    c.strokeStyle = 'rgba(' + INK + ',.4)'; c.lineWidth = 1; seg(c, o, [x0 + .3, y, z1 - .3], [x0 + .3, y, z0 + .3]); seg(c, o, [x0 + .3, y, z0 + .3], [x1 - .25, y, z0 + .3]);
    function f(u) { return .08 + .95 * Math.exp(-Math.pow((u - .36) / .075, 2)) + .5 * Math.exp(-Math.pow((u - .7) / .11, 2)) + .03 * Math.sin(u * 60); }
    c.strokeStyle = 'rgba(' + rgb + ',1)'; c.lineWidth = Math.max(1.4, o.s * .09); c.lineJoin = 'round'; c.beginPath();
    for (i = 0; i <= n * pr; i++) { var u = i / n; p = P(o, x0 + .3 + u * 2.6, y, z0 + .3 + f(u) * 1.25); if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }
    c.stroke(); if (p) { c.fillStyle = 'rgb(' + INK + ')'; c.beginPath(); c.arc(p[0], p[1], Math.max(1.8, o.s * .12), 0, TAU); c.fill(); }
    box(c, o, .1, .9, .8, 1.5, 0, .3, 'rgba(' + rgb + ',.3)', 'rgba(' + rgb + ',.14)', 'rgba(' + INK + ',.85)');
    c.setLineDash([3, 3]); c.lineDashOffset = -t * 14; c.strokeStyle = 'rgba(' + rgb + ',1)'; c.lineWidth = 1.3; seg(c, o, [-1.7, 1.2, .5], [.3, 1.2, .5]); c.setLineDash([]); c.lineDashOffset = 0;
    box(c, o, -1.9, 1.0, -1.6, 1.4, .3, .4, '#fff', '#E4E7ED', 'rgba(' + INK + ',.85)');
  }
  // an agent is angular and solid, with a diamond head; its colour says which agent
  function pawn(c, x, y, k, rgb) {
    c.fillStyle = 'rgba(' + INK + ',.13)'; c.beginPath(); c.ellipse(x, y, 6.4 * k, 2.7 * k, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgb(' + rgb + ')'; c.strokeStyle = '#fff'; c.lineWidth = 1.2; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(x - 4.8 * k, y); c.lineTo(x - 2.5 * k, y - 8.4 * k); c.lineTo(x + 2.5 * k, y - 8.4 * k); c.lineTo(x + 4.8 * k, y); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(x, y - 17.6 * k); c.lineTo(x + 4.4 * k, y - 13.2 * k); c.lineTo(x, y - 8.8 * k); c.lineTo(x - 4.4 * k, y - 13.2 * k); c.closePath(); c.fill(); c.stroke();
  }
  function collab(c, o, rgb, t) {
    // one shared piece of work, changed from two sides at once, then reconciled
    var y = -.55, x0 = -1.25, x1 = 1.25, z0 = .12, z1 = 2.0, cyc = (t % 6) / 6, m = sm(.05, .45, cyc) * (1 - sm(.9, 1, cyc)), other = HUE.arm, k = Math.max(.62, o.s / 19), q;
    quad(c, o, y, x0, x1, z0, z1); c.fillStyle = 'rgba(255,255,255,.97)'; c.fill(); c.strokeStyle = 'rgba(' + INK + ',.9)'; c.lineWidth = 1.2; c.stroke();
    c.strokeStyle = 'rgba(' + INK + ',.35)'; c.lineWidth = 1; seg(c, o, [x0, y, z1 - .3], [x1, y, z1 - .3]);
    function blk(a, b, za, zb, col) { quad(c, o, y, a, b, za, zb); c.fillStyle = 'rgba(' + col + ',.22)'; c.fill(); c.lineWidth = 1.3; c.strokeStyle = 'rgba(' + col + ',1)'; c.stroke(); }
    blk(x0 + .18, x0 + .18 + 1.25 * m, 1.0, 1.5, rgb); blk(x1 - .18 - 1.25 * m, x1 - .18, .34, .84, other);
    var ok = cyc > .5 && cyc < .9; c.setLineDash([2, 3]); c.strokeStyle = 'rgba(' + INK + ',' + (ok ? .75 : .3) + ')'; c.lineWidth = 1; seg(c, o, [0, y, .34], [0, y, 1.5]); c.setLineDash([]);
    c.setLineDash([3, 3]); c.lineDashOffset = -t * 14; c.lineWidth = 1.3;
    c.strokeStyle = 'rgba(' + rgb + ',1)'; seg(c, o, [-1.15, 1.25, .75], [-.75, y, 1.25]); c.strokeStyle = 'rgba(' + other + ',1)'; seg(c, o, [1.35, .85, .75], [.75, y, .6]);
    c.setLineDash([]); c.lineDashOffset = 0;
    q = P(o, -1.15, 1.25, 0); pawn(c, q[0], q[1], k, rgb); q = P(o, 1.35, .85, 0); pawn(c, q[0], q[1], k, other);
  }
  var DRAW = { cua: cua, mobile: mobile, radar: radar, beam: beam, swe: swe, arm: arm, game: game, lab: lab, collab: collab };

  function ghost(c, o) {
    slab(c, o, INK, 0, true);
    c.strokeStyle = 'rgb(' + BLUE + ')'; c.lineWidth = 1.9; c.lineCap = 'round'; seg(c, o, [-.66, 0, 0], [.66, 0, 0]); seg(c, o, [0, -.66, 0], [0, .66, 0]); c.lineCap = 'butt';
  }
  function tag(c, text, cx, y, rgb, maxW, size) {
    c.font = '500 ' + size + "px 'Geist Mono', monospace"; c.textBaseline = 'top'; c.textAlign = 'left';
    var lines = [text], k;
    if (c.measureText(text).width + 13 > maxW && text.indexOf(' ') > 0) {
      var parts = text.split(' '), best = 1, bd = 1e9;
      for (k = 1; k < parts.length; k++) { var d = Math.abs(c.measureText(parts.slice(0, k).join(' ')).width - c.measureText(parts.slice(k).join(' ')).width); if (d < bd) { bd = d; best = k; } }
      lines = [parts.slice(0, best).join(' '), parts.slice(best).join(' ')];
    }
    var w0 = c.measureText(lines[0]).width, x0 = cx - (w0 + 13) / 2;
    c.fillStyle = 'rgba(' + rgb + ',1)'; c.fillRect(x0, y + 1.5, 7, 7); c.fillStyle = 'rgba(' + INK + ',.88)'; c.fillText(lines[0], x0 + 13, y);
    if (lines[1]) c.fillText(lines[1], cx - c.measureText(lines[1]).width / 2 + 6.5, y + size + 3);
  }

  // ---------- hero: a globe of open domains that can be turned any way round. The frontier line stays where it is
  // and the globe moves under it: a domain arrives as a dashed outline and becomes a built world as it crosses.
  // The dashed slots that never fill in are the open problems still to come.
  function globe(cv) {
    var st = canvas(cv), isNear = near(cv);
    var DEG = Math.PI / 180, N = 2600, BX = new Float32Array(N), BY = new Float32Array(N), BZ = new Float32Array(N), GK = new Uint8Array(N), i;
    for (i = 0; i < N; i++) { var gy = 1 - (i + .5) / N * 2, gr = Math.sqrt(1 - gy * gy), gl = i * 2.399963229728653; BX[i] = gr * Math.sin(gl); BY[i] = gy; BZ[i] = gr * Math.cos(gl); GK[i] = rnd() < .055 ? 1 : 0; }
    var B = [0, 1, 2, 3, 4].map(function () { return { xy: new Float32Array(N * 2), n: 0 }; });
    var STYLE = ['rgba(13,16,20,.2)', 'rgba(13,16,20,.4)', 'rgba(13,16,20,.72)', 'rgba(43,75,255,1)', 'rgba(13,16,20,1)'], SIZE = [1.4, 1.6, 1.8, 2.3, 2.5];
    var TILT = 20 * DEG, CT = Math.cos(TILT), SN = Math.sin(TILT), LF = 32 * DEG, SLF = Math.sin(LF), CLF = Math.cos(LF), PERIOD = 84, ROT0 = 84 * DEG;
    var SLOTS = [
      { k: 'collab', label: 'HUMAN–AGENT TEAMS', lat: 34 },
      { k: 'swe', label: 'SOFTWARE ENGINEERING', lat: -22 },
      { k: 'cua', label: 'COMPUTER USE', lat: 8 },
      { k: 'mobile', label: 'MOBILE USE', lat: 34 },
      { k: 'arm', label: 'EMBODIED AGENTS', lat: -24 },
      { k: '', label: 'OPEN PROBLEM', lat: 4 },
      { k: 'lab', label: 'SCIENTIFIC RESEARCH', lat: 33 },
      { k: 'radar', label: 'REAL-TIME OPERATIONS', lat: -24 },
      { k: '', label: 'NEXT DOMAIN', lat: 5 },
      { k: 'game', label: 'GAMES', lat: 35 },
      { k: 'beam', label: 'DESIGN AND MANUFACTURING', lat: -22 },
      { k: '', label: 'OPEN PROBLEM', lat: 3 },
      { k: '', label: 'NEXT DOMAIN', lat: -26 }
    ];
    SLOTS.forEach(function (w, n) { var lon = n * TAU / SLOTS.length, cl = Math.cos(w.lat * DEG); w.v = [cl * Math.sin(lon), Math.sin(w.lat * DEG), cl * Math.cos(lon)]; w.w = {}; });
    var PAWNS = [{ cur: null, from: null, u: 1, rgb: BLUE, nth: 0 }, { cur: null, from: null, u: 1, rgb: INK, nth: 2 }];
    // the reader's own turn of the globe, kept as a rotation matrix so it can go any way round
    var U = [1, 0, 0, 0, 1, 0, 0, 0, 1], drag = null, tch = null, Rnow = 260;
    function mul(a, b) { var o = [], r, k2; for (r = 0; r < 3; r++) for (k2 = 0; k2 < 3; k2++) o.push(a[r * 3] * b[k2] + a[r * 3 + 1] * b[3 + k2] + a[r * 3 + 2] * b[6 + k2]); return o; }
    function rotY(a) { var c2 = Math.cos(a), s2 = Math.sin(a); return [c2, 0, s2, 0, 1, 0, -s2, 0, c2]; }
    function rotX(a) { var c2 = Math.cos(a), s2 = Math.sin(a); return [1, 0, 0, 0, c2, -s2, 0, s2, c2]; }
    function turn(dx, dy) {
      U = mul(mul(rotY(dx), rotX(dy)), U);
      var a = U.slice(0, 3), b = U.slice(3, 6), n1 = Math.hypot(a[0], a[1], a[2]); a = a.map(function (v) { return v / n1; });
      var d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; b = b.map(function (v, k2) { return v - d * a[k2]; }); var n2 = Math.hypot(b[0], b[1], b[2]); b = b.map(function (v) { return v / n2; });
      U = a.concat(b, [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]);
      if (reduced) frame(2.4, 0);
    }
    on(cv, 'pointerdown', function (e) { if (e.pointerType === 'touch') return; drag = { x: e.clientX, y: e.clientY }; cv.style.cursor = 'grabbing'; if (cv.setPointerCapture) try { cv.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } });
    on(cv, 'pointermove', function (e) { if (!drag) return; turn((e.clientX - drag.x) / Rnow, (e.clientY - drag.y) / Rnow); drag.x = e.clientX; drag.y = e.clientY; });
    function drop() { drag = null; cv.style.cursor = ''; }
    on(cv, 'pointerup', drop); on(cv, 'pointercancel', drop);
    // touch: a swipe that starts sideways turns the globe (then any way); one that starts up or down scrolls the page
    on(cv, 'touchstart', function (e) { var p = e.touches[0]; tch = e.touches.length === 1 ? { x: p.clientX, y: p.clientY, mode: '' } : null; }, { passive: true });
    on(cv, 'touchmove', function (e) {
      if (!tch) return; var p = e.touches[0], dx = p.clientX - tch.x, dy = p.clientY - tch.y;
      if (!tch.mode) { if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return; tch.mode = Math.abs(dx) >= Math.abs(dy) ? 'rot' : 'scroll'; }
      if (tch.mode === 'rot') { if (e.cancelable) e.preventDefault(); turn(dx / Rnow, dy / Rnow); tch.x = p.clientX; tch.y = p.clientY; }
    }, { passive: false });
    on(cv, 'touchend', function () { tch = null; }); on(cv, 'touchcancel', function () { tch = null; });

    function frame(t, dt) {
      var c = st.ctx, W = st.w, H = st.h, small = W < 460, k, j, p, q, pen;
      var R = small ? Math.min(W * .44, (H - 110) / 2.2) : Math.min(W / 2.5, (H - 70) / 2.35, 300), cx = W / 2, cy = Math.min(H * .5 + R * .16, R * 1.12 + 84);
      Rnow = R;
      var M = mul(U, rotY(-(ROT0 + t * TAU / PERIOD))), m0 = M[0], m1 = M[1], m2 = M[2], m3 = M[3], m4 = M[4], m5 = M[5], m6 = M[6], m7 = M[7], m8 = M[8];
      // a point on the globe's own surface -> [screen x, screen y, depth toward the viewer, distance past the frontier line, side of that line]
      function pv(bx, by, bz, rad) { var x = m0 * bx + m1 * by + m2 * bz, y = m3 * bx + m4 * by + m5 * bz, z = m6 * bx + m7 * by + m8 * bz; return [cx + x * rad, cy - (y * CT - z * SN) * rad, y * SN + z * CT, x * CLF - z * SLF, x * SLF + z * CLF]; }
      // a point fixed in the view (the frontier line does not turn with the globe)
      function fixed(cl, sl, lon, rad) { var x = cl * Math.sin(lon), z0 = cl * Math.cos(lon); return [cx + x * rad, cy - (sl * CT - z0 * SN) * rad, sl * SN + z0 * CT]; }
      c.clearRect(0, 0, W, H);
      c.fillStyle = 'rgba(' + INK + ',.055)'; c.beginPath(); c.ellipse(cx, cy + R + 20, R * .8, R * .065, 0, 0, TAU); c.fill();
      var body = c.createRadialGradient(cx - R * .38, cy - R * .5, R * .08, cx, cy, R); body.addColorStop(0, '#FFFFFF'); body.addColorStop(1, '#EBEEF3');
      c.fillStyle = body; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fill();
      var fp = fixed(1, 0, LF, R), dg = c.createRadialGradient(fp[0], fp[1], 0, fp[0], fp[1], R * .62); dg.addColorStop(0, 'rgba(' + BLUE + ',.13)'); dg.addColorStop(1, 'rgba(' + BLUE + ',0)');
      c.save(); c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.clip(); c.fillStyle = dg; c.fillRect(fp[0] - R, fp[1] - R, R * 2, R * 2); c.restore();
      // the charted side has a grid; the side the line has not reached has none
      c.lineWidth = 1; c.strokeStyle = 'rgba(' + INK + ',.1)';
      for (k = -60; k <= 60; k += 20) {
        var cl = Math.cos(k * DEG), sl = Math.sin(k * DEG); pen = 0; c.beginPath();
        for (j = 0; j <= 72; j++) { var lo = j * 5 * DEG; p = pv(cl * Math.sin(lo), sl, cl * Math.cos(lo), R); if (p[2] > 0 && p[3] < 0) { if (pen) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); pen = 1; } else pen = 0; }
        c.stroke();
      }
      for (k = 0; k < 18; k++) {
        var lo2 = k * 20 * DEG, sl2 = Math.sin(lo2), cl2 = Math.cos(lo2); pen = 0; c.beginPath();
        for (j = 0; j <= 40; j++) { var ph = (-90 + j * 4.5) * DEG, cp2 = Math.cos(ph); p = pv(cp2 * sl2, Math.sin(ph), cp2 * cl2, R); if (p[2] > 0 && p[3] < 0) { if (pen) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); pen = 1; } else pen = 0; }
        c.stroke();
      }
      for (k = 0; k < 5; k++) B[k].n = 0;
      for (var n = 0; n < N; n++) {
        var bx = BX[n], by = BY[n], bz = BZ[n], x = m0 * bx + m1 * by + m2 * bz, y = m3 * bx + m4 * by + m5 * bz, z = m6 * bx + m7 * by + m8 * bz;
        if (y * SN + z * CT <= .03) continue;
        var d = x * CLF - z * SLF, e = x * SLF + z * CLF, bk;
        if (e > 0 && d > -.03 && d < .03) bk = 3; else if (d >= 0) { if (n % 3) continue; bk = 0; } else bk = GK[n] ? 4 : (e > 0 && d > -.42 ? 2 : 1);
        q = B[bk]; q.xy[q.n * 2] = cx + x * R; q.xy[q.n * 2 + 1] = cy - (y * CT - z * SN) * R; q.n++;
      }
      for (k = 0; k < 5; k++) { var sz = SIZE[k], hs = sz / 2, bb = B[k]; c.fillStyle = STYLE[k]; for (j = 0; j < bb.n; j++) c.fillRect(bb.xy[j * 2] - hs, bb.xy[j * 2 + 1] - hs, sz, sz); }
      c.strokeStyle = 'rgba(' + INK + ',.3)'; c.lineWidth = 1.2; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.stroke();
      [[7, .13], [1.7, 1]].forEach(function (lw) {
        pen = 0; c.strokeStyle = 'rgba(' + BLUE + ',' + lw[1] + ')'; c.lineWidth = lw[0]; c.lineCap = 'round'; c.beginPath();
        for (j = 0; j <= 60; j++) { var ph2 = (-90 + j * 3) * DEG; p = fixed(Math.cos(ph2), Math.sin(ph2), LF, R); if (p[2] > 0) { if (pen) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); pen = 1; } else pen = 0; }
        c.stroke(); c.lineCap = 'butt';
      });

      // the worlds: each one stands on a pin above its place on the globe
      var s0 = small ? Math.max(11, R / 14) : R / 13, list = [], fresh = [];
      for (k = 0; k < SLOTS.length; k++) {
        var w = SLOTS[k], sp = pv(w.v[0], w.v[1], w.v[2], R), z2 = sp[2], onSide = w.k && sp[3] < -.03 ? 1 : 0;
        w.b = (w.b === undefined || !dt) ? onSide : w.b + (onSide - w.b) * Math.min(1, dt * 2.6);
        w.sd = sp[3]; w.z = z2; w.vis = sm(-.1, .14, z2); if (w.vis <= 0) continue;
        var sc = s0 * (.62 + .38 * Math.max(0, z2)), out = pv(w.v[0], w.v[1], w.v[2], R * 1.07);
        w.sp = sp; w.o = { x: out[0], y: out[1] - sc * 4.5 + Math.sin(t * .9 + k * 1.7) * 2.5, s: sc }; list.push(w);
        if (onSide && z2 > .22) fresh.push(w);
      }
      list.sort(function (a2, b2) { return a2.z - b2.z; }); fresh.sort(function (a2, b2) { return b2.sd - a2.sd; });
      for (j = 0; j < list.length; j++) {
        var ww = list[j], ow = ww.o, rgb = ww.k ? HUE[ww.k] : INK, bq = ww.b, va = ww.vis;
        c.globalAlpha = va; c.fillStyle = 'rgba(' + INK + ',.08)'; c.beginPath(); c.ellipse(ww.sp[0], ww.sp[1] + 2, ow.s * 1.5, ow.s * .42, 0, 0, TAU); c.fill();
        c.setLineDash([2, 4]); c.strokeStyle = 'rgba(' + INK + ',.55)'; c.lineWidth = 1; c.beginPath(); c.moveTo(ww.sp[0], ww.sp[1]); c.lineTo(ow.x, ow.y + ow.s * 2.34); c.stroke(); c.setLineDash([]);
        c.fillStyle = 'rgb(' + (bq > .5 ? rgb : INK) + ')'; c.beginPath(); c.arc(ww.sp[0], ww.sp[1], 2.7, 0, TAU); c.fill();
        if (bq < .995) {
          c.globalAlpha = va * (1 - bq); slab(c, ow, INK, 0, true);
          if (!ww.k) { c.strokeStyle = 'rgb(' + BLUE + ')'; c.lineWidth = 1.8; c.lineCap = 'round'; seg(c, ow, [-.62, 0, 0], [.62, 0, 0]); seg(c, ow, [0, -.62, 0], [0, .62, 0]); c.lineCap = 'butt'; }
        }
        if (bq > .005) { c.globalAlpha = va * bq; slab(c, ow, rgb, bq < .97 ? 1 : 0, false); DRAW[ww.k](c, ow, rgb, t, ww.w, dt); }
        c.globalAlpha = 1;
        if (bq > .02 && bq < .98) { c.strokeStyle = 'rgba(' + BLUE + ',' + (1 - bq) + ')'; c.lineWidth = 1.6; c.beginPath(); c.ellipse(ow.x, ow.y, ow.s * (2.4 + 2.6 * bq), ow.s * (1.2 + 1.3 * bq), 0, 0, TAU); c.stroke(); }
        var la2 = va * sm(small ? .36 : .18, small ? .56 : .4, ww.z);
        if (la2 > .01) { var lp = P(ow, 2, 2, -.34); c.globalAlpha = la2 * (ww.k ? .55 + .45 * bq : .8); tag(c, ww.label, ow.x, lp[1] + 8, !ww.k ? BLUE : bq > .5 ? rgb : INK, small ? 100 : 140, small ? 9 : 10); c.globalAlpha = 1; }
      }
      // the agents: each moves to the next world as soon as it is built
      for (k = 0; k < PAWNS.length; k++) {
        var pw = PAWNS[k], want = fresh.length ? fresh[Math.min(pw.nth, fresh.length - 1)] : null;
        if (k && want === PAWNS[0].cur) want = null;
        if (want && want !== pw.cur && pw.u >= 1) { pw.from = pw.cur; pw.cur = want; pw.u = pw.from && dt ? 0 : 1; }
        if (!pw.cur || !pw.cur.o) continue;
        pw.u = Math.min(1, pw.u + (dt || 1) / 1.15);
        var e3 = pw.u * pw.u * (3 - 2 * pw.u), A = pw.u < 1 && pw.from && pw.from.o ? pw.from.o : pw.cur.o, Bo = pw.cur.o, al = Math.min(pw.cur.vis, sm(.1, .3, pw.cur.z));
        if (al <= 0) continue;
        var ax = A.x + (Bo.x - A.x) * e3, ay = A.y + A.s * 1.25 + (Bo.y + Bo.s * 1.25 - A.y - A.s * 1.25) * e3 - Math.sin(e3 * Math.PI) * R * .14;
        c.globalAlpha = al; pawn(c, ax, ay, Math.max(.95, Bo.s / 15), pw.rgb); c.globalAlpha = 1;
      }
    }
    return function (t, dt) { if (isNear()) frame(t, dt); };
  }

  // ---------- the three research directions, one small drawing each
  function card(cv) {
    var st = canvas(cv), isNear = near(cv), kind = cv.getAttribute('data-card');
    return function (t) {
      if (!isNear()) return;
      var c = st.ctx, W = st.w, H = st.h, s = Math.min(23, W / 8.6, H / 7.2), o = { x: W / 2, y: H * .6, s: s }, q, n, p;
      c.clearRect(0, 0, W, H);
      if (kind === 'open') {
        // a domain no agent has mastered yet, the ones already built behind it, and an agent on its way in
        var back = { x: o.x + s * 3.6, y: o.y - s * 1.9, s: s * .62 };
        slab(c, back, HUE.cua, 0, false); cua(c, back, HUE.cua, t);
        ghost(c, { x: o.x + s * .3, y: o.y + s * .4 + Math.sin(t * .9) * 3, s: s });
        var cyc = reduced ? .5 : (t % 3.2) / 3.2, hop = Math.sin(Math.min(1, cyc / .5) * Math.PI);
        q = P(o, -2.7, 1.9, 0); pawn(c, q[0] + s * 1.2 * sm(0, .5, cyc), q[1] - hop * s * .9, Math.max(.9, s / 15), BLUE);
      } else if (kind === 'rl') {
        // evaluation and post-training: a benchmark's checks on the floor, a reward curve on the screen, the agent in front of it
        var y0 = -.75, x0 = -1.55, x1 = 1.55, z0 = .12, z1 = 2.15, N2 = 40, pr = reduced ? 1 : Math.min(1, ((t % 6) / 6) / .7);
        slab(c, o, BLUE, 0, false);
        quad(c, o, y0, x0, x1, z0, z1); c.fillStyle = 'rgba(255,255,255,.97)'; c.fill(); c.strokeStyle = 'rgba(' + INK + ',.9)'; c.lineWidth = 1.2; c.stroke();
        c.strokeStyle = 'rgba(' + INK + ',.4)'; c.lineWidth = 1; seg(c, o, [x0 + .28, y0, z1 - .25], [x0 + .28, y0, z0 + .28]); seg(c, o, [x0 + .28, y0, z0 + .28], [x1 - .22, y0, z0 + .28]);
        c.strokeStyle = 'rgb(' + BLUE + ')'; c.lineWidth = Math.max(1.6, s * .1); c.lineJoin = 'round'; c.beginPath();
        for (n = 0; n <= N2 * pr; n++) { var u = n / N2; p = P(o, x0 + .28 + u * 2.5, y0, z0 + .3 + (.1 + .8 * (1 - Math.exp(-3.2 * u)) + .03 * Math.sin(u * 23)) * 1.45); if (n) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }
        c.stroke(); if (p) { c.fillStyle = 'rgb(' + INK + ')'; c.beginPath(); c.arc(p[0], p[1], Math.max(1.8, s * .12), 0, TAU); c.fill(); }
        for (n = 0; n < 3; n++) { var xa = .2 + n * .52; poly(c, [P(o, xa, 1.0, .02), P(o, xa + .38, 1.0, .02), P(o, xa + .38, 1.38, .02), P(o, xa, 1.38, .02)]); c.closePath(); c.fillStyle = pr > (n + 1) * .28 ? 'rgb(' + BLUE + ')' : '#fff'; c.fill(); c.lineWidth = 1.2; c.strokeStyle = 'rgb(' + BLUE + ')'; c.stroke(); }
        q = P(o, -1.25, 1.3, 0); pawn(c, q[0], q[1], Math.max(.9, s / 15), BLUE);
      } else {
        // recursive self-improvement: the loop that keeps going, and the agent climbing a step each round
        var cy3 = reduced ? .99 : (t % 6.4) / 6.4, stp = Math.min(3, Math.floor(cy3 * 4)), hf = reduced ? 1 : Math.min(1, ((cy3 * 4) % 1) / .45), ez = hf * hf * (3 - 2 * hf), th;
        slab(c, o, BLUE, .4, false);
        c.setLineDash([4, 4]); c.lineDashOffset = reduced ? 0 : -t * 16; c.strokeStyle = 'rgb(' + BLUE + ')'; c.lineWidth = 1.5; c.beginPath();
        for (n = 0; n <= 44; n++) { th = -.9 + n / 44 * 5.3; p = P(o, 1.72 * Math.cos(th), 1.72 * Math.sin(th), .03); if (n) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }
        c.stroke(); c.setLineDash([]); c.lineDashOffset = 0;
        th = -.9 + 5.3; p = P(o, 1.72 * Math.cos(th), 1.72 * Math.sin(th), .03); var p0 = P(o, 1.72 * Math.cos(th - .2), 1.72 * Math.sin(th - .2), .03), an = Math.atan2(p[1] - p0[1], p[0] - p0[0]);
        c.fillStyle = 'rgb(' + BLUE + ')'; c.beginPath(); c.moveTo(p[0] + Math.cos(an) * 7, p[1] + Math.sin(an) * 7); c.lineTo(p[0] + Math.cos(an + 2.4) * 6, p[1] + Math.sin(an + 2.4) * 6); c.lineTo(p[0] + Math.cos(an - 2.4) * 6, p[1] + Math.sin(an - 2.4) * 6); c.closePath(); c.fill();
        for (n = 0; n < 4; n++) box(c, o, -1.36 + n * .7, -.36, -1.36 + n * .7 + .6, .4, 0, .24 + n * .32, n <= stp ? 'rgb(' + mix('255,255,255', BLUE, .42) + ')' : '#fff', n <= stp ? 'rgb(' + mix('255,255,255', BLUE, .2) + ')' : '#E4E7ED', 'rgba(' + INK + ',.85)');
        var pv0 = Math.max(0, stp - 1), xa2 = -1.06 + pv0 * .7, xb2 = -1.06 + stp * .7, za2 = .24 + pv0 * .32, zb2 = .24 + stp * .32;
        q = P(o, xa2 + (xb2 - xa2) * ez, .02, za2 + (zb2 - za2) * ez + Math.sin(ez * Math.PI) * .5); pawn(c, q[0], q[1], Math.max(.9, s / 15), BLUE);
      }
    };
  }

  var painters = [];
  var hero = document.getElementById('frontier');
  if (hero && hero.getContext) painters.push(globe(hero));
  Array.prototype.forEach.call(document.querySelectorAll('canvas[data-card]'), function (cv) { if (cv.getContext) painters.push(card(cv)); });
  if (painters.length) loop(function (t, dt) { for (var g = 0; g < painters.length; g++) painters[g](t, dt); });
}());
