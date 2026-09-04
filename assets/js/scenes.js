/* =====================================================================
   Bitácora de un Observador — artefactos (Three.js r128 + canvas 2D)
   Un solo artefacto activo a la vez; el resto duerme.
   ===================================================================== */
(function () {
  'use strict';

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var HAS_THREE = typeof THREE !== 'undefined';
  var COLORS = { warm: 0xe2a85a, cold: 0x5ec1d9, ink: 0xe9e4d8, alert: 0xd97a6c, dim: 0x736f66 };

  var registry = {};
  var instances = {};       // sceneName -> instance
  var activeName = null;
  var rafId = null;
  var lastT = 0;
  var params = { bangT: 1, waveDetune: 0.12 };

  /* ---------- utilidades ---------- */
  function rand(a, b) { return a + Math.random() * (b - a); }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function randDir() { var z = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - z * z); return new THREE.Vector3(r * Math.cos(a), r * Math.sin(a), z); }
  function sizeCanvas(canvas) {
    var r = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.floor(r.width)), h = Math.max(1, Math.floor(r.height));
    return { w: w, h: h, dpr: dpr };
  }
  /* etiquetas HTML ancladas a puntos 3D */
  function mkLabel(canvas, text, cls) {
    var host = canvas.parentNode.querySelector('.artefact-labels'); if (!host) return null;
    var el = document.createElement('span'); el.className = 'a-label ' + (cls || ''); el.textContent = text; host.appendChild(el); return el;
  }
  var _pv = null;
  function place(el, v3, camera, w, h, dx, dy) {
    if (!el) return;
    _pv = _pv || new THREE.Vector3();
    _pv.copy(v3).project(camera);
    if (_pv.z > 1 || _pv.z < -1) { el.classList.add('is-hidden'); return; }
    el.classList.remove('is-hidden');
    el.style.transform = 'translate(-50%,-50%) translate(' + ((_pv.x + 1) / 2 * w + (dx || 0)).toFixed(1) + 'px,' + ((1 - _pv.y) / 2 * h + (dy || 0)).toFixed(1) + 'px)';
  }
  function hide(el) { if (el) el.classList.add('is-hidden'); }
  /* en pantallas verticales la cámara se aleja para que la escena entera quepa */
  function fitCam(camera, aspect) {
    if (camera.userData.z === undefined) camera.userData.z = camera.position.z;
    var f = aspect < 1 ? Math.min(2.1, 0.92 / aspect) : 1;
    camera.position.z = camera.userData.z * f;
  }
  function makeRenderer(canvas) {
    var r = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    r.setClearColor(0x000000, 0);
    return r;
  }
  function pointerTracker(canvas) {
    var p = { x: 0, y: 0, inside: false, sx: 0, sy: 0 };
    function set(e) {
      var r = canvas.getBoundingClientRect();
      var cx = (e.touches ? e.touches[0].clientX : e.clientX);
      var cy = (e.touches ? e.touches[0].clientY : e.clientY);
      p.sx = cx - r.left; p.sy = cy - r.top;
      p.x = (p.sx / r.width) * 2 - 1;
      p.y = -((p.sy / r.height) * 2 - 1);
      p.inside = true;
    }
    canvas.addEventListener('pointermove', set);
    canvas.addEventListener('pointerdown', set);
    canvas.addEventListener('pointerleave', function () { p.inside = false; });
    return p;
  }

  /* =====================================================================
     00 · LATTICE — red de puntos que responde al observador
     ===================================================================== */
  registry.lattice = function (canvas) {
    var renderer = makeRenderer(canvas);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    camera.position.set(0, 0, 26);
    var N = 17, spacing = 1.15, count = N * N * N;
    var base = new Float32Array(count * 3), pos = new Float32Array(count * 3), col = new Float32Array(count * 3);
    var i = 0, off = (N - 1) / 2;
    var cw = new THREE.Color(COLORS.warm), cc = new THREE.Color(COLORS.ink);
    for (var x = 0; x < N; x++) for (var y = 0; y < N; y++) for (var z = 0; z < N; z++) {
      base[i * 3] = (x - off) * spacing; base[i * 3 + 1] = (y - off) * spacing; base[i * 3 + 2] = (z - off) * spacing;
      var m = Math.random();
      var c = m < 0.85 ? cc : cw;
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      i++;
    }
    pos.set(base);
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    var mat = new THREE.PointsMaterial({ size: 0.11, vertexColors: true, transparent: true, opacity: 0.85, sizeAttenuation: true, depthWrite: false });
    var points = new THREE.Points(geo, mat);
    var group = new THREE.Group(); group.add(points); scene.add(group);
    group.rotation.x = 0.35; group.rotation.y = 0.6;
    var ptr = pointerTracker(canvas);
    var ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3(), target = new THREE.Vector3(999, 999, 0), inv = new THREE.Matrix4();
    var lbl = mkLabel(canvas, 'aquí estás observando', 'w'), lblW = new THREE.Vector3(), W = 1, H = 1;
    return {
      resize: function (w, h, dpr) { W = w; H = h; renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); camera.aspect = w / h; fitCam(camera, w / h); camera.updateProjectionMatrix(); },
      update: function (t, dt) {
        group.rotation.y += dt * 0.05;
        group.rotation.x = 0.35 + Math.sin(t * 0.1) * 0.15;
        if (ptr.inside) {
          ray.setFromCamera({ x: ptr.x, y: ptr.y }, camera);
          plane.normal.set(0, 0, 1).applyQuaternion(group.quaternion);
          if (ray.ray.intersectPlane(plane, hit)) { inv.copy(group.matrixWorld).invert(); hit.applyMatrix4(inv); target.lerp(hit, 0.15); }
          lblW.copy(target).applyMatrix4(group.matrixWorld); place(lbl, lblW, camera, W, H, 0, -36);
        } else { target.lerp(new THREE.Vector3(999, 999, 0), 0.02); hide(lbl); }
        var p = geo.attributes.position.array;
        for (var k = 0; k < count; k++) {
          var bx = base[k * 3], by = base[k * 3 + 1], bz = base[k * 3 + 2];
          var breathe = Math.sin(t * 0.8 + bx * 0.4 + by * 0.3 + bz * 0.2) * 0.12;
          var dx = bx - target.x, dy = by - target.y, dz = bz - target.z;
          var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          var ripple = Math.sin(d * 1.6 - t * 4) * Math.exp(-d * 0.28) * 1.1;
          var s = 1 + breathe * 0.1 + ripple * 0.12;
          p[k * 3] = bx * s; p[k * 3 + 1] = by * s; p[k * 3 + 2] = bz * s;
        }
        geo.attributes.position.needsUpdate = true;
        renderer.render(scene, camera);
      },
      dispose: function () { geo.dispose(); mat.dispose(); renderer.dispose(); }
    };
  };

  /* =====================================================================
     01 · CAGE — barrotes que se disuelven donde miras
     ===================================================================== */
  registry.cage = function (canvas) {
    var renderer = makeRenderer(canvas);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 1.5, 16);
    var group = new THREE.Group(); scene.add(group);
    var bars = [], BAR = 44, R = 5.2, H = 7;
    for (var i = 0; i < BAR; i++) {
      var a = (i / BAR) * Math.PI * 2;
      var g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(Math.cos(a) * R, -H / 2, Math.sin(a) * R), new THREE.Vector3(Math.cos(a) * R, H / 2, Math.sin(a) * R)]);
      var m = new THREE.LineBasicMaterial({ color: COLORS.cold, transparent: true, opacity: 0.7 });
      var line = new THREE.Line(g, m); line.userData.a = a; group.add(line); bars.push(line);
    }
    var rings = [];
    [-H / 2, 0, H / 2].forEach(function (y) {
      var pts = [];
      for (var k = 0; k <= 96; k++) { var a = (k / 96) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * R, y, Math.sin(a) * R)); }
      var rg = new THREE.BufferGeometry().setFromPoints(pts);
      var rl = new THREE.Line(rg, new THREE.LineBasicMaterial({ color: COLORS.cold, transparent: true, opacity: 0.35 }));
      group.add(rl); rings.push(rl);
    });
    // el observador: una nube cálida en el centro
    var n = 500, arr = new Float32Array(n * 3);
    for (var j = 0; j < n; j++) { var v = randDir().multiplyScalar(Math.pow(Math.random(), 0.5) * 1.6); arr[j * 3] = v.x; arr[j * 3 + 1] = v.y; arr[j * 3 + 2] = v.z; }
    var pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    var cloud = new THREE.Points(pg, new THREE.PointsMaterial({ color: COLORS.warm, size: 0.08, transparent: true, opacity: 0.9, depthWrite: false }));
    group.add(cloud);
    var ptr = pointerTracker(canvas), tmp = new THREE.Vector3(), w = 1, h = 1;
    var lblYou = mkLabel(canvas, 'tú · la consciencia', 'w'), lblBar = mkLabel(canvas, 'una creencia instalada', 'c'), origin = new THREE.Vector3(), barP = new THREE.Vector3();
    return {
      resize: function (W, H2, dpr) { w = W; h = H2; renderer.setPixelRatio(dpr); renderer.setSize(W, H2, false); camera.aspect = W / H2; fitCam(camera, W / H2); camera.updateProjectionMatrix(); },
      update: function (t, dt) {
        group.rotation.y += dt * 0.12;
        cloud.rotation.y -= dt * 0.3; cloud.rotation.x += dt * 0.1;
        cloud.material.size = 0.08 + Math.sin(t * 2) * 0.02;
        group.updateMatrixWorld();
        place(lblYou, origin, camera, w, h, 0, 42);
        barP.set(Math.cos(bars[3].userData.a) * R, 2.2, Math.sin(bars[3].userData.a) * R).applyMatrix4(group.matrixWorld);
        if (bars[3].material.opacity < 0.15) hide(lblBar); else place(lblBar, barP, camera, w, h, 0, -22);
        for (var i = 0; i < bars.length; i++) {
          var b = bars[i];
          tmp.set(Math.cos(b.userData.a) * R, 0, Math.sin(b.userData.a) * R).applyMatrix4(group.matrixWorld).project(camera);
          var sx = (tmp.x + 1) / 2 * w, sy = (1 - tmp.y) / 2 * h;
          var front = tmp.z < 0.985 ? 1 : 0.35;
          var target = 0.75 * front;
          if (ptr.inside) {
            var d = Math.hypot(sx - ptr.sx, sy - ptr.sy);
            var fade = Math.max(0, 1 - d / 140);
            target *= (1 - fade * 0.97);
          }
          b.material.opacity += (target - b.material.opacity) * Math.min(1, dt * 6);
        }
        renderer.render(scene, camera);
      },
      dispose: function () { renderer.dispose(); }
    };
  };

  /* =====================================================================
     02 · NEURONS — red que dispara pulsos
     ===================================================================== */
  registry.neurons = function (canvas) {
    var renderer = makeRenderer(canvas);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0, 17);
    var group = new THREE.Group(); scene.add(group);
    var N = 260, nodes = [];
    for (var i = 0; i < N; i++) {
      var v = randDir().multiplyScalar(Math.pow(Math.random(), 0.45) * 7.5);
      v.x *= 1.5; nodes.push(v);
    }
    var edges = [];
    for (i = 0; i < N; i++) {
      var d = [];
      for (var j = 0; j < N; j++) if (j !== i) d.push([nodes[i].distanceTo(nodes[j]), j]);
      d.sort(function (a, b) { return a[0] - b[0]; });
      var k = 2 + (Math.random() < 0.4 ? 1 : 0);
      for (var q = 0; q < k; q++) if (d[q][1] > i) edges.push([i, d[q][1]]); else if (Math.random() < 0.5) edges.push([i, d[q][1]]);
    }
    var npos = new Float32Array(N * 3), ncol = new Float32Array(N * 3), heat = new Float32Array(N);
    for (i = 0; i < N; i++) { npos[i * 3] = nodes[i].x; npos[i * 3 + 1] = nodes[i].y; npos[i * 3 + 2] = nodes[i].z; }
    var ng = new THREE.BufferGeometry(); ng.setAttribute('position', new THREE.BufferAttribute(npos, 3)); ng.setAttribute('color', new THREE.BufferAttribute(ncol, 3));
    var nodesObj = new THREE.Points(ng, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false }));
    group.add(nodesObj);
    var E = edges.length, epos = new Float32Array(E * 6), ecol = new Float32Array(E * 6);
    for (i = 0; i < E; i++) { var a = nodes[edges[i][0]], b = nodes[edges[i][1]]; epos.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6); }
    var eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(epos, 3)); eg.setAttribute('color', new THREE.BufferAttribute(ecol, 3));
    var lines = new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55 }));
    group.add(lines);
    var P = 120, pulses = [], ppos = new Float32Array(P * 3);
    for (i = 0; i < P; i++) pulses.push({ e: Math.floor(Math.random() * E), t: Math.random(), s: rand(0.4, 1.1) });
    var pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(ppos, 3));
    var pulsesObj = new THREE.Points(pg, new THREE.PointsMaterial({ color: COLORS.warm, size: 0.14, transparent: true, opacity: 1, depthWrite: false }));
    group.add(pulsesObj);
    var cDim = new THREE.Color(0x3a4150), cHot = new THREE.Color(COLORS.warm), cEdge = new THREE.Color(0x2a3140), tmpc = new THREE.Color();
    var ptr = pointerTracker(canvas);
    var lblN = mkLabel(canvas, 'una neurona', 'g'), lblS = mkLabel(canvas, 'sinapsis · el cable', 'l'), lblP = mkLabel(canvas, 'impulso eléctrico', 'w');
    var lp = new THREE.Vector3(), W = 1, H = 1, e0 = edges[0];
    return {
      resize: function (w, h, dpr) { W = w; H = h; renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); camera.aspect = w / h; fitCam(camera, w / h); camera.updateProjectionMatrix(); },
      update: function (t, dt) {
        group.rotation.y += dt * 0.08 + (ptr.inside ? ptr.x * dt * 0.4 : 0);
        group.rotation.x = lerp(group.rotation.x, ptr.inside ? -ptr.y * 0.35 : Math.sin(t * 0.2) * 0.15, dt * 2);
        group.updateMatrixWorld();
        place(lblN, lp.copy(nodes[0]).applyMatrix4(group.matrixWorld), camera, W, H, 0, -22);
        place(lblS, lp.copy(nodes[e0[0]]).lerp(nodes[e0[1]], 0.5).applyMatrix4(group.matrixWorld), camera, W, H, 0, 20);
        place(lblP, lp.set(ppos[0], ppos[1], ppos[2]).applyMatrix4(group.matrixWorld), camera, W, H, 0, -22);
        for (var i = 0; i < N; i++) { heat[i] *= (1 - dt * 2.2); if (Math.random() < dt * 0.35) heat[i] = 1; }
        for (i = 0; i < N; i++) { tmpc.copy(cDim).lerp(cHot, heat[i]); ncol[i * 3] = tmpc.r; ncol[i * 3 + 1] = tmpc.g; ncol[i * 3 + 2] = tmpc.b; }
        ng.attributes.color.needsUpdate = true;
        for (i = 0; i < E; i++) {
          var h = Math.max(heat[edges[i][0]], heat[edges[i][1]]) * 0.8;
          tmpc.copy(cEdge).lerp(cHot, h);
          ecol[i * 6] = tmpc.r; ecol[i * 6 + 1] = tmpc.g; ecol[i * 6 + 2] = tmpc.b; ecol[i * 6 + 3] = tmpc.r; ecol[i * 6 + 4] = tmpc.g; ecol[i * 6 + 5] = tmpc.b;
        }
        eg.attributes.color.needsUpdate = true;
        for (i = 0; i < P; i++) {
          var p = pulses[i]; p.t += dt * p.s;
          if (p.t >= 1) { heat[edges[p.e][1]] = 1; p.t = 0; p.e = Math.floor(Math.random() * E); }
          var a = nodes[edges[p.e][0]], b = nodes[edges[p.e][1]];
          ppos[i * 3] = lerp(a.x, b.x, p.t); ppos[i * 3 + 1] = lerp(a.y, b.y, p.t); ppos[i * 3 + 2] = lerp(a.z, b.z, p.t);
        }
        pg.attributes.position.needsUpdate = true;
        renderer.render(scene, camera);
      },
      dispose: function () { renderer.dispose(); }
    };
  };

  /* =====================================================================
     03 · RINGS — cuerpo · ego · consciencia · observador
     ===================================================================== */
  registry.rings = function (canvas) {
    var renderer = makeRenderer(canvas);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 2, 18);
    var group = new THREE.Group(); scene.add(group);
    var defs = [
      { r: 2.2, color: COLORS.warm, n: 260, speed: [0.6, 0.2, 0.4], size: 0.11 },   // cuerpo
      { r: 3.6, color: COLORS.cold, n: 420, speed: [-0.3, 0.5, 0.1], size: 0.09 },  // ego
      { r: 5.1, color: COLORS.ink, n: 600, speed: [0.2, -0.25, 0.3], size: 0.07 },  // consciencia
      { r: 6.7, color: COLORS.dim, n: 800, speed: [-0.1, 0.12, -0.2], size: 0.05 }  // observador
    ];
    var rings = defs.map(function (d) {
      var arr = new Float32Array(d.n * 3);
      for (var i = 0; i < d.n; i++) {
        var a = (i / d.n) * Math.PI * 2, jitter = (Math.random() - 0.5) * 0.25;
        arr[i * 3] = Math.cos(a) * (d.r + jitter); arr[i * 3 + 1] = (Math.random() - 0.5) * 0.15; arr[i * 3 + 2] = Math.sin(a) * (d.r + jitter);
      }
      var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      var pts = new THREE.Points(g, new THREE.PointsMaterial({ color: d.color, size: d.size, transparent: true, opacity: 0.9, depthWrite: false }));
      var holder = new THREE.Group(); holder.add(pts); holder.rotation.set(Math.random(), Math.random(), Math.random());
      group.add(holder); return { obj: holder, d: d };
    });
    // el observador: un punto central quieto
    var core = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3)), new THREE.PointsMaterial({ color: COLORS.ink, size: 0.35, transparent: true, opacity: 1 }));
    group.add(core);
    var ptr = pointerTracker(canvas);
    var names = ['cuerpo · hardware', 'ego · software', 'consciencia · usuario', 'el Todo · la red'], cls = ['w', 'c', 'i', 'g'];
    var lbls = names.map(function (n, i) { return mkLabel(canvas, n, cls[i]); }), lblCore = mkLabel(canvas, 'tú · el observador', 'i big');
    var lp = new THREE.Vector3(), origin = new THREE.Vector3(), W = 1, H = 1;
    return {
      resize: function (w, h, dpr) { W = w; H = h; renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); camera.aspect = w / h; fitCam(camera, w / h); camera.updateProjectionMatrix(); },
      update: function (t, dt) {
        rings.forEach(function (r) { r.obj.rotation.x += r.d.speed[0] * dt; r.obj.rotation.y += r.d.speed[1] * dt; r.obj.rotation.z += r.d.speed[2] * dt; });
        group.rotation.y = lerp(group.rotation.y, ptr.inside ? ptr.x * 0.5 : 0, dt * 2);
        group.rotation.x = lerp(group.rotation.x, ptr.inside ? -ptr.y * 0.3 : 0.2, dt * 2);
        core.material.size = 0.3 + Math.sin(t * 1.5) * 0.08;
        group.updateMatrixWorld();
        rings.forEach(function (r, i) { place(lbls[i], lp.set(r.d.r, 0, 0).applyMatrix4(r.obj.matrixWorld), camera, W, H, 0, i % 2 ? 18 : -18); });
        place(lblCore, origin, camera, W, H, 0, 30);
        renderer.render(scene, camera);
      },
      dispose: function () { renderer.dispose(); }
    };
  };

  /* =====================================================================
     04 · BIGBANG — de la singularidad a las galaxias (params.bangT 0..1)
     ===================================================================== */
  registry.bigbang = function (canvas) {
    var renderer = makeRenderer(canvas);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    camera.position.set(0, 6, 30);
    camera.lookAt(0, 0, 0);
    var N = 9000, G = 7, centers = [];
    for (var g = 0; g < G; g++) centers.push(new THREE.Vector3(rand(-14, 14), rand(-5, 5), rand(-14, 14)));
    var finalPos = new Float32Array(N * 3), dir = new Float32Array(N * 3), pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    var cw = new THREE.Color(COLORS.warm), cc = new THREE.Color(COLORS.cold), ci = new THREE.Color(COLORS.ink), tmp = new THREE.Color();
    for (var i = 0; i < N; i++) {
      var c = centers[i % G];
      var a = Math.random() * Math.PI * 2, r = Math.pow(Math.random(), 0.6) * 4.5, arm = Math.floor(Math.random() * 2) * Math.PI;
      var x = c.x + Math.cos(a + arm + r * 0.9) * r, z = c.z + Math.sin(a + arm + r * 0.9) * r, y = c.y + (Math.random() - 0.5) * (0.8 - r * 0.1);
      finalPos[i * 3] = x; finalPos[i * 3 + 1] = y; finalPos[i * 3 + 2] = z;
      var d = randDir(); dir[i * 3] = d.x; dir[i * 3 + 1] = d.y; dir[i * 3 + 2] = d.z;
      tmp.copy(i % G % 3 === 0 ? cc : cw).lerp(ci, Math.random() * 0.6);
      col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
    }
    var geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    var mat = new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false });
    var points = new THREE.Points(geo, mat); scene.add(points);
    var ptr = pointerTracker(canvas);
    var lblS = mkLabel(canvas, 'singularidad · todo en un punto', 'w big'), lblG = mkLabel(canvas, 'una galaxia', 'c'), lblU = mkLabel(canvas, 'sopa de partículas enfriándose', 'i');
    var lp = new THREE.Vector3(), origin = new THREE.Vector3(), W = 1, H = 1;
    return {
      resize: function (w, h, dpr) { W = w; H = h; renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); camera.aspect = w / h; fitCam(camera, w / h); camera.updateProjectionMatrix(); },
      update: function (t, dt) {
        var T = params.bangT; // 0..1
        var e = ease(Math.min(1, T * 1.15));
        var burst = Math.min(1, T * 6);            // inflación: los primeros milisegundos
        points.updateMatrixWorld();
        if (T < 0.05) { place(lblS, origin, camera, W, H, 0, -34); hide(lblU); hide(lblG); }
        else if (e < 0.7) { hide(lblS); hide(lblG); place(lblU, lp.set(dir[0] * 9 * burst, dir[1] * 9 * burst, dir[2] * 9 * burst).lerp(lp.set(finalPos[0], finalPos[1], finalPos[2]), e).applyMatrix4(points.matrixWorld), camera, W, H, 0, -22); }
        else { hide(lblS); hide(lblU); place(lblG, lp.copy(centers[0]).applyMatrix4(points.matrixWorld), camera, W, H, 0, -30); }
        var p = geo.attributes.position.array;
        for (var i = 0; i < N; i++) {
          var bx = dir[i * 3] * 9 * burst, by = dir[i * 3 + 1] * 9 * burst, bz = dir[i * 3 + 2] * 9 * burst;
          p[i * 3] = lerp(bx, finalPos[i * 3], e); p[i * 3 + 1] = lerp(by, finalPos[i * 3 + 1], e); p[i * 3 + 2] = lerp(bz, finalPos[i * 3 + 2], e);
        }
        geo.attributes.position.needsUpdate = true;
        mat.size = lerp(0.35, 0.09, e); mat.opacity = lerp(1, 0.85, e);
        points.rotation.y += dt * 0.04;
        camera.position.x = lerp(camera.position.x, ptr.inside ? ptr.x * 6 : 0, dt);
        camera.position.y = lerp(camera.position.y, 6 + (ptr.inside ? ptr.y * 3 : 0), dt);
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
      },
      dispose: function () { renderer.dispose(); }
    };
  };

  /* =====================================================================
     05 · OCEAN — el vaso (esfera) que regresa al océano (plano)
     ===================================================================== */
  registry.ocean = function (canvas) {
    var renderer = makeRenderer(canvas);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 5, 17); camera.lookAt(0, 0, 0);
    var N = 5200, sph = new Float32Array(N * 3), sea = new Float32Array(N * 3), pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    var W = 22;
    for (var i = 0; i < N; i++) {
      var v = randDir().multiplyScalar(2.6 * Math.pow(Math.random(), 0.3));
      sph[i * 3] = v.x; sph[i * 3 + 1] = v.y + 2.2; sph[i * 3 + 2] = v.z;
      sea[i * 3] = rand(-W / 2, W / 2); sea[i * 3 + 1] = -2.5; sea[i * 3 + 2] = rand(-W / 2, W / 2);
    }
    var cw = new THREE.Color(COLORS.warm), cc = new THREE.Color(COLORS.cold), tmp = new THREE.Color();
    var geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    var mat = new THREE.PointsMaterial({ size: 0.08, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false });
    scene.add(new THREE.Points(geo, mat));
    // el océano siempre está ahí, tenue, esperando al vaso
    var M = 2600, seaPos = new Float32Array(M * 3), seaBase = new Float32Array(M * 2);
    for (var q = 0; q < M; q++) { seaBase[q * 2] = rand(-W / 2, W / 2); seaBase[q * 2 + 1] = rand(-W / 2, W / 2); }
    var seaGeo = new THREE.BufferGeometry(); seaGeo.setAttribute('position', new THREE.BufferAttribute(seaPos, 3));
    scene.add(new THREE.Points(seaGeo, new THREE.PointsMaterial({ color: COLORS.cold, size: 0.06, transparent: true, opacity: 0.35, depthWrite: false })));
    var morph = 0, target = 0, flip = function () { target = target > 0.5 ? 0 : 1; };
    canvas.addEventListener('pointerdown', flip);
    var ptr = pointerTracker(canvas), spin = 0;
    var lblV = mkLabel(canvas, 'el vaso · tu cuerpo, con nombre', 'w big'), lblO = mkLabel(canvas, 'el océano · la consciencia sin bordes', 'c big'), lblD = mkLabel(canvas, 'el agua regresa · nada se pierde', 'i');
    var lp = new THREE.Vector3(), W = 1, H = 1;
    return {
      setTarget: function (v) { target = v; },
      resize: function (w, h, dpr) { W = w; H = h; renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); camera.aspect = w / h; fitCam(camera, w / h); camera.updateProjectionMatrix(); },
      update: function (t, dt) {
        morph += (target - morph) * Math.min(1, dt * 1.4);
        var m = ease(Math.max(0, Math.min(1, morph)));
        if (m < 0.15) { place(lblV, lp.set(0, 5.2, 0), camera, W, H, 0, 0); hide(lblO); hide(lblD); }
        else if (m > 0.85) { hide(lblV); hide(lblD); place(lblO, lp.set(0, -2.5, 6), camera, W, H, 0, 0); }
        else { hide(lblV); hide(lblO); place(lblD, lp.set(0, 0, 0), camera, W, H, 0, 0); }
        var p = geo.attributes.position.array;
        spin += dt * 0.25;
        for (var i = 0; i < N; i++) {
          var sx = sph[i * 3], sy = sph[i * 3 + 1], sz = sph[i * 3 + 2];
          var rx = sx * Math.cos(spin) - sz * Math.sin(spin), rz = sx * Math.sin(spin) + sz * Math.cos(spin);
          var ox = sea[i * 3], oz = sea[i * 3 + 2];
          var oy = -2.5 + Math.sin(ox * 0.6 + t * 1.2) * 0.25 + Math.cos(oz * 0.5 + t * 0.9) * 0.25;
          var drop = Math.sin(m * Math.PI) * 1.2 * (i % 7 === 0 ? 1 : 0.3);
          p[i * 3] = lerp(rx, ox, m); p[i * 3 + 1] = lerp(sy, oy, m) - drop; p[i * 3 + 2] = lerp(rz, oz, m);
          tmp.copy(cw).lerp(cc, m);
          col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
        }
        geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
        for (var q = 0; q < M; q++) { var qx = seaBase[q * 2], qz = seaBase[q * 2 + 1]; seaPos[q * 3] = qx; seaPos[q * 3 + 1] = -2.6 + Math.sin(qx * 0.6 + t * 1.2) * 0.25 + Math.cos(qz * 0.5 + t * 0.9) * 0.25; seaPos[q * 3 + 2] = qz; }
        seaGeo.attributes.position.needsUpdate = true;
        camera.position.x = lerp(camera.position.x, ptr.inside ? ptr.x * 4 : 0, dt);
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
      },
      dispose: function () { renderer.dispose(); }
    };
  };

  /* =====================================================================
     06 · WAVES — resonancia (canvas 2D)
     ===================================================================== */
  registry.waves = function (canvas) {
    var ctx = canvas.getContext('2d'), w = 1, h = 1, dpr = 1;
    return {
      resize: function (W, H, D) { w = W; h = H; dpr = D; canvas.width = W * D; canvas.height = H * D; ctx.setTransform(D, 0, 0, D, 0, 0); },
      update: function (t) {
        ctx.clearRect(0, 0, w, h);
        var detune = params.waveDetune; // 0..1
        var f1 = 3, f2 = 3 + detune * 3;
        var amp = h * 0.11;
        function wave(y0, fn, color, width) {
          ctx.beginPath(); ctx.lineWidth = width; ctx.strokeStyle = color;
          for (var x = 0; x <= w; x += 2) { var y = y0 + fn(x / w); x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
          ctx.stroke();
        }
        var ph = t * 1.4;
        var s1 = function (u) { return Math.sin(u * Math.PI * 2 * f1 - ph) * amp; };
        var s2 = function (u) { return Math.sin(u * Math.PI * 2 * f2 - ph * (f2 / f1)) * amp; };
        ctx.strokeStyle = 'rgba(233,228,216,0.08)'; ctx.lineWidth = 1;
        [0.28, 0.5, 0.78].forEach(function (k) { ctx.beginPath(); ctx.moveTo(0, h * k); ctx.lineTo(w, h * k); ctx.stroke(); });
        wave(h * 0.28, s1, 'rgba(226,168,90,0.9)', 2);
        wave(h * 0.5, s2, 'rgba(94,193,217,0.9)', 2);
        wave(h * 0.78, function (u) { return (s1(u) + s2(u)) * 0.9; }, 'rgba(233,228,216,0.95)', 2.6);
        var small = w < 520, fs = small ? 11 : 13;
        ctx.font = '500 ' + fs + 'px "IBM Plex Mono", monospace';
        function tag(text, y, color) { var tw = ctx.measureText(text).width + 16; ctx.fillStyle = 'rgba(11,13,18,0.8)'; ctx.fillRect(12, y - fs - 6, tw, fs + 12); ctx.fillStyle = color; ctx.fillText(text, 20, y); }
        tag('TÚ · ' + f1.toFixed(1) + ' Hz', h * 0.28 - amp - 12, 'rgba(226,168,90,1)');
        tag('LA OTRA PERSONA · ' + f2.toFixed(1) + ' Hz', h * 0.5 - amp - 12, 'rgba(94,193,217,1)');
        var label = detune < 0.06 ? 'RESONANCIA · las crestas se suman' : detune < 0.45 ? 'FRICCIÓN · hay batimiento, hay acuerdos por hacer' : 'CANCELACIÓN · la energía se anula';
        tag('LA RELACIÓN (SUMA) · ' + label, h * 0.78 - amp * 1.8 - 12, 'rgba(233,228,216,1)');
      },
      dispose: function () {}
    };
  };

  /* =====================================================================
     gestor
     ===================================================================== */
  function figureFor(name) { return document.querySelector('.artefact[data-scene="' + name + '"]'); }

  function ensure(name) {
    if (instances[name]) return instances[name];
    var fig = figureFor(name); if (!fig) return null;
    var canvas = fig.querySelector('canvas');
    var factory = registry[name]; if (!factory) return null;
    if (name !== 'waves' && !HAS_THREE) { fig.classList.add('is-static'); return null; }
    var inst;
    try { inst = factory(canvas); } catch (e) { fig.classList.add('is-static'); return null; }
    inst.canvas = canvas; inst.fig = fig;
    var s = sizeCanvas(canvas); inst.resize(s.w, s.h, s.dpr);
    if (window.ResizeObserver) new ResizeObserver(function () { var s2 = sizeCanvas(canvas); inst.resize(s2.w, s2.h, s2.dpr); if (REDUCED) inst.update(1, 0); }).observe(fig);
    instances[name] = inst;
    return inst;
  }

  function loop(now) {
    rafId = null;
    var inst = activeName && instances[activeName]; if (!inst) return;
    var t = now / 1000, dt = Math.min(0.05, t - (lastT || t)); lastT = t;
    if (document.visibilityState === 'visible') inst.update(t, dt);
    rafId = requestAnimationFrame(loop);
  }

  window.Scenes = {
    params: params,
    activate: function (name) {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      activeName = null;
      if (!name) return;
      var inst = ensure(name); if (!inst) return;
      activeName = name; lastT = 0;
      if (REDUCED) { inst.fig.classList.add('is-static'); inst.update(2, 0); return; }
      rafId = requestAnimationFrame(loop);
    },
    get: function (name) { return ensure(name); },
    sceneOf: function (chapterEl) { var f = chapterEl && chapterEl.querySelector('.artefact[data-scene]'); return f ? f.getAttribute('data-scene') : null; }
  };
})();
