/* =====================================================================
   Bitácora de un Observador — interacciones
   ===================================================================== */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =====================================================================
     Navegación por capítulos
     ===================================================================== */
  var chapters = $$('.chapter');
  var STATUS = { inicio: 'observando', matrix: 'leyendo el código', hardware: 'auditando el chasis', software: 'modo admin', universo: 'zoom out', vida: 'reciclando materia', amor: 'en resonancia', teoria: 'compilando', manual: 'cortando leña', bitacora: 'archivando' };
  var current = null;
  var ticker = { fns: [], id: null, active: null };

  function go(id, opts) {
    opts = opts || {};
    var target = document.getElementById(id);
    if (!target || !target.classList.contains('chapter')) return;
    if (current === id && !opts.force) { if (!opts.noScroll) scrollTop(); return; }
    current = id;
    chapters.forEach(function (c) { c.classList.toggle('is-active', c.id === id); });
    $$('[data-go]').forEach(function (b) {
      if (b.classList.contains('rail-btn')) { if (b.getAttribute('data-go') === id) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }
    });
    var rb = $('.rail-btn[data-go="' + id + '"]');
    if (rb && rb.scrollIntoView && window.innerWidth < 1040) rb.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    $('#status').textContent = STATUS[id] || 'observando';
    if (!opts.noHash) { try { history.replaceState(null, '', '#' + id); } catch (e) {} }
    if (!opts.noScroll) scrollTop();
    ticker.active = id;
    if (window.Scenes) window.Scenes.activate(window.Scenes.sceneOf(target));
    if (id === 'universo') playBang();
    if (id !== 'manual' && binaural.playing) binaural.stop();
    document.title = (id === 'inicio' ? '' : (target.querySelector('.rail-btn') ? '' : '')) + 'Bitácora de un Observador';
  }
  function scrollTop() { window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' }); }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-go]'); if (!b) return;
    e.preventDefault(); go(b.getAttribute('data-go'));
  });
  window.addEventListener('hashchange', function () { var id = location.hash.replace('#', ''); if (id) go(id, { noHash: true }); });

  /* =====================================================================
     Ticker para lienzos 2D (solo corre el capítulo activo)
     ===================================================================== */
  function tick(now) {
    ticker.id = null;
    var any = false;
    ticker.fns.forEach(function (f) { if (f.chapter === ticker.active || f.always) { f.fn(now / 1000); any = true; } });
    ticker.id = requestAnimationFrame(tick);
  }
  function addTick(chapter, fn, always) { ticker.fns.push({ chapter: chapter, fn: fn, always: !!always }); }
  function fit2d(canvas) {
    var r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.floor(r.width)), h = Math.max(1, Math.floor(r.height));
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
    var ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }

  /* =====================================================================
     00 · texto escrito
     ===================================================================== */
  (function typed() {
    var el = $('#typed'); if (!el) return;
    var lines = ['wake up, observador…', 'the matrix has you.', 'sigue al conejo blanco.', 'knock, knock.', 'estás vivo. lo sabes.'];
    if (REDUCED) { el.textContent = lines[4]; return; }
    var li = 0, ci = 0, del = false;
    function step() {
      var s = lines[li];
      if (!del) { ci++; el.textContent = s.slice(0, ci); if (ci === s.length) { del = true; return setTimeout(step, 1700); } return setTimeout(step, 45 + Math.random() * 50); }
      ci--; el.textContent = s.slice(0, ci);
      if (ci === 0) { del = false; li = (li + 1) % lines.length; return setTimeout(step, 500); }
      setTimeout(step, 22);
    }
    setTimeout(step, 600);
  })();

  /* =====================================================================
     01 · pastillas
     ===================================================================== */
  (function pills() {
    var out = $('#pillOut'); if (!out) return;
    var TXT = {
      blue: '<p class="eyebrow cold">pastilla azul · aceptada</p><p>Sistema estable. El drama de la tribu sigue siendo el centro del universo. Tus problemas importan porque el ego necesita que importen. El semáforo rojo es una ley cósmica, el likes cuenta como estatus, y mañana hay que ir a la oficina.</p><p>Es comodísima: si te va mal es culpa del gobierno, de la industria o de la mala suerte. Nadie te pide que muevas piezas. Puedes volver a dormir.</p>',
      red: '<p class="eyebrow alert">pastilla roja · procesando</p><p>Vas a temblar. Vas a querer despertar a todos para no sentirte solo, y nadie te va a entender la primera vez. Vas a mirar a tu familia en la mesa y ver primates intercambiando sonidos para confirmar que son de la misma tribu. Vas a sentir un duelo por tu antigua identidad.</p><p>Y después, ligereza. Los obstáculos se vuelven bugs técnicos en vez de dramas emocionales. La consciencia te hace 100&nbsp;% responsable: ya no puedes hacerte el tonto. Pero tampoco necesitas que nadie lo entienda para que sea real.</p>'
    };
    $$('.pill-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.pill-btn').forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        out.innerHTML = TXT[b.getAttribute('data-pill')];
      });
    });
  })();

  /* =====================================================================
     02 · mapa del cerebro
     ===================================================================== */
  (function brain() {
    var detail = $('#brainDetail'); if (!detail) return;
    var DATA = {
      rep: { h: 'Cerebro reptiliano · el BIOS', p: 'Tallo cerebral y cerebelo, en la nuca. Mantiene la máquina encendida: respiración, latidos, equilibrio, digestión. Código puro de supervivencia que compartimos con los lagartos. Cero consciencia, cero emociones. Aquí vive el SARA, la aduana que filtra el 99&nbsp;% de la realidad.' },
      lim: { h: 'Sistema límbico · el usuario estándar', p: 'La amígdala (tu radar de amenazas, la que te hace temblar y dispara cortisol), el hipocampo (el disco duro de la memoria) y el hipotálamo (la fábrica química: hambre, temperatura, impulso sexual). Es la Matrix emocional: instinto de tribu, validación social, ego primitivo. La parte que quiere impresionar a los demás y que te levanta de la cama a medianoche con dopamina.' },
      neo: { h: 'Neocórtex · alta resolución', p: 'La capa gris y arrugada que cubre todo lo demás, el 80&nbsp;% del cerebro. Procesa lenguaje, visión, oído y razonamiento general. Aquí se renderiza la interfaz simplificada del mundo: colores y formas sólidas en lugar de átomos y vacío, para que puedas operar sin quemar el CPU.' },
      pre: { h: 'Corteza prefrontal · modo admin', p: 'Justo detrás de la frente. La estructura más nueva de la evolución; termina de mielinizarse alrededor de los 25 años. Aquí ocurre el libre albedrío, la planificación, la filosofía. Es la única estructura capaz de hackear al sistema límbico: cuando la amígdala entra en pánico, la corteza prefrontal la observa, la neutraliza y ordena un abrazo para inyectar oxitocina. Pesa el 2&nbsp;% del cuerpo y cobra el 20&nbsp;% de la energía.' }
    };
    function pick(id) {
      $$('.brain-svg .region').forEach(function (r) { r.classList.toggle('is-on', r.getAttribute('data-region') === id); });
      $$('#brainList button').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-region') === id); });
      detail.innerHTML = '<h3>' + DATA[id].h + '</h3><p>' + DATA[id].p + '</p>';
    }
    $$('.brain-svg .region, #brainList button').forEach(function (el) { el.addEventListener('click', function () { pick(el.getAttribute('data-region')); }); });
    pick('pre');
  })();

  /* =====================================================================
     02 · reloj de ayuno
     ===================================================================== */
  (function fasting() {
    var r = $('#fastRange'); if (!r) return;
    var out = $('#fastH'), desc = $('#fastDesc'), phases = $$('.fast-phase');
    var TXT = [
      function (h) { return '<b>Procesamiento activo.</b> Estómago e intestino a tope, insulina alta. Cero ayuno real: pura digestión. La sangre está en la panza, no en la corteza prefrontal.'; },
      function (h) { return '<b>Vaciando el tanque.</b> La digestión mecánica terminó. El cuerpo consume el azúcar (glucógeno) almacenada en el hígado y los músculos. El cosquilleo que sientes es ghrelina por costumbre; desaparece en veinte minutos si la ignoras.'; },
      function (h) { return '<b>Modo admin metabólico.</b> Se acabó el azúcar del hígado. Insulina al mínimo, RAM digestiva liberada, el cuerpo quema grasa y produce cetonas (combustible premium para las neuronas). Empieza la autofagia: recicla células viejas y proteínas rotas. El rango perfecto para tener la mañana afilada sin perder masa muscular.'; },
      function (h) { return h >= 72 ? '<b>Línea roja.</b> Más de 72 horas el ayuno deja de ser un hack y es una emergencia: el cortisol se dispara y el sistema empieza a canibalizar músculo para fabricar glucosa. Aquí se termina el experimento.' : '<b>Reseteo profundo.</b> Cetosis total, pico de autofagia, el sistema inmune se reinicia. Ocasional, no diario, y con electrolitos (sodio, potasio, magnesio) en el agua para que el corazón y el cerebro no pierdan conductividad.'; }
    ];
    function update() {
      var h = +r.value; out.textContent = h;
      var idx = h < 4 ? 0 : h < 12 ? 1 : h < 24 ? 2 : 3;
      phases.forEach(function (p, i) { p.classList.toggle('is-on', i === idx); p.classList.toggle('was', i < idx); });
      desc.innerHTML = TXT[idx](h);
    }
    r.addEventListener('input', update); update();
  })();

  /* =====================================================================
     03 · administrador de tareas (RAM)
     ===================================================================== */
  (function ram() {
    var box = $('#ram'); if (!box) return;
    var ranges = $$('input[type="range"]', box), ego = $('#ramEgo'), free = $('#ramFree'), pct = $('#ramPct'), msg = $('#ramMsg');
    function update() {
      var sum = 0;
      ranges.forEach(function (r) { sum += +r.value; $('.val[data-for="' + r.id + '"]', box).textContent = r.value + ' %'; });
      var used = Math.min(100, Math.round(sum / ranges.length * 1.15));
      var libre = 100 - used;
      ego.style.width = used + '%'; free.style.width = libre + '%';
      pct.textContent = libre + ' %';
      msg.textContent = libre < 15 ? 'El antivirus consume todo el procesador. El observador sigue ahí, pero sin ancho de banda: reaccionas en piloto automático y cualquier cosa se siente como un ataque.'
        : libre < 40 ? 'El ego todavía manda. Puedes ver el problema desde afuera a ratos, pero cuesta cerrar ventanas. Aquí no se resuelve la vida a las once de la noche.'
        : libre < 70 ? 'Hay espacio. La consciencia ocupa lo que el ego suelta. Empiezas a observar tus propias alarmas sin obedecerlas.'
        : 'RAM liberada. No es que fabriques más consciencia: es que dejaste de gastarla defendiendo una imagen. Aquí se toman las decisiones del arquitecto.';
    }
    ranges.forEach(function (r) { r.addEventListener('input', update); }); update();
  })();

  /* =====================================================================
     04 · big bang (deslizador) + animación automática
     ===================================================================== */
  var bang = { touched: false, anim: null };
  (function bangInit() {
    var s = $('#bangT'); if (!s) return;
    s.addEventListener('input', function () { bang.touched = true; if (window.Scenes) window.Scenes.params.bangT = +s.value / 1000; });
    s.addEventListener('pointerdown', function () { bang.touched = true; if (bang.anim) cancelAnimationFrame(bang.anim); });
  })();
  function playBang() {
    var s = $('#bangT'); if (!s || bang.touched || REDUCED) return;
    var t0 = performance.now(), D = 7000;
    function f(now) { var k = Math.min(1, (now - t0) / D); s.value = Math.round(k * 1000); if (window.Scenes) window.Scenes.params.bangT = k; if (k < 1) bang.anim = requestAnimationFrame(f); }
    s.value = 0; if (window.Scenes) window.Scenes.params.bangT = 0;
    bang.anim = requestAnimationFrame(f);
  }

  /* =====================================================================
     04 · entropía (tinta en agua)
     ===================================================================== */
  (function entropy() {
    var c = $('#entropy'); if (!c) return;
    var N = 1400, P = [], dropped = false, read = $('#entropyRead');
    function reset() { P = []; dropped = false; for (var i = 0; i < N; i++) { var a = Math.random() * Math.PI * 2, r = Math.random() * 6; P.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, vx: 0, vy: 0 }); } read.textContent = '100 %'; }
    $('#entropyDrop').addEventListener('click', function () { if (!dropped) { dropped = true; P.forEach(function (p) { var a = Math.random() * Math.PI * 2, s = 20 + Math.random() * 60; p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s; }); } });
    $('#entropyReset').addEventListener('click', reset);
    reset();
    var last = 0;
    addTick('universo', function (t) {
      var f = fit2d(c), ctx = f.ctx, w = f.w, h = f.h, dt = Math.min(0.05, t - (last || t)); last = t;
      ctx.fillStyle = '#11141b'; ctx.fillRect(0, 0, w, h);
      var cx = w / 2, cy = h / 2, sum = 0, maxR = Math.min(w, h) / 2;
      for (var i = 0; i < N; i++) {
        var p = P[i];
        if (dropped) {
          p.vx += (Math.random() - 0.5) * 120 * dt; p.vy += (Math.random() - 0.5) * 120 * dt;
          p.vx *= 0.995; p.vy *= 0.995;
          p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.x < -w / 2 + 4) { p.x = -w / 2 + 4; p.vx *= -0.9; } if (p.x > w / 2 - 4) { p.x = w / 2 - 4; p.vx *= -0.9; }
          if (p.y < -h / 2 + 4) { p.y = -h / 2 + 4; p.vy *= -0.9; } if (p.y > h / 2 - 4) { p.y = h / 2 - 4; p.vy *= -0.9; }
        } else { p.x += Math.sin(t * 2 + i) * 0.05; p.y += Math.cos(t * 1.7 + i) * 0.05; }
        sum += Math.min(1, Math.hypot(p.x, p.y) / maxR);
        ctx.fillStyle = 'rgba(94,193,217,0.55)'; ctx.fillRect(cx + p.x, cy + p.y, 2, 2);
      }
      var order = Math.max(0, Math.round((1 - sum / N / 0.62) * 100));
      read.textContent = order + ' %';
      ctx.font = '11px "IBM Plex Mono", monospace'; ctx.fillStyle = 'rgba(115,111,102,1)';
      ctx.fillText(dropped ? (order < 10 ? 'equilibrio termodinámico: nada se mueve, todo es gris. muerte térmica.' : 'la tinta no quiere pintar el agua. es estadística: hay trillones de estados desordenados y uno ordenado.') : 'una gota concentrada = energía bajo tensión (baja entropía)', 14, h - 14);
    });
  })();

  /* =====================================================================
     04 · energía cero (inversión de fase)
     ===================================================================== */
  (function phase() {
    var c = $('#phase'); if (!c) return;
    var inv = true, btn = $('#phaseInvert'), read = $('#phaseRead');
    btn.addEventListener('click', function () { inv = !inv; btn.setAttribute('aria-pressed', String(inv)); btn.classList.toggle('is-on', inv); btn.textContent = inv ? 'Invertir fase (−1)' : 'Misma fase (+1)'; });
    btn.classList.add('is-on');
    addTick('universo', function (t) {
      var f = fit2d(c), ctx = f.ctx, w = f.w, h = f.h; ctx.clearRect(0, 0, w, h);
      var amp = h * 0.1, ph = REDUCED ? 0 : t * 2;
      function wave(y0, fn, color) { ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 1.6; for (var x = 0; x <= w; x += 2) { var y = y0 + fn(x / w); x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
      ctx.strokeStyle = 'rgba(233,228,216,0.08)'; [0.25, 0.5, 0.8].forEach(function (k) { ctx.beginPath(); ctx.moveTo(0, h * k); ctx.lineTo(w, h * k); ctx.stroke(); });
      var s1 = function (u) { return Math.sin(u * Math.PI * 2 * 3 - ph) * amp; };
      var s2 = function (u) { return (inv ? -1 : 1) * Math.sin(u * Math.PI * 2 * 3 - ph) * amp; };
      wave(h * 0.25, s1, 'rgba(226,168,90,0.95)'); wave(h * 0.5, s2, 'rgba(94,193,217,0.95)'); wave(h * 0.8, function (u) { return s1(u) + s2(u); }, 'rgba(233,228,216,1)');
      ctx.font = '11px "IBM Plex Mono", monospace'; ctx.fillStyle = 'rgba(115,111,102,1)';
      ctx.fillText('materia, luz, calor  (+1)', 14, h * 0.25 - amp - 8); ctx.fillText(inv ? 'gravedad  (−1)' : 'otra onda igual  (+1)', 14, h * 0.5 - amp - 8); ctx.fillText(inv ? 'suma = 0 · el universo no creó energía: dividió el cero' : 'suma = 2 · así NO funciona el universo', 14, h * 0.8 - amp * 2 - 8);
      read.textContent = inv ? '0.00' : '2.00';
    });
  })();

  /* =====================================================================
     04 · fractal
     ===================================================================== */
  (function fractal() {
    var c = $('#fractal'); if (!c) return;
    var depthEl = $('#fractalDepth'), angEl = $('#fractalAngle'), read = $('#fractalRead');
    addTick('universo', function (t) {
      var f = fit2d(c), ctx = f.ctx, w = f.w, h = f.h; ctx.clearRect(0, 0, w, h);
      var depth = +depthEl.value, ang = +angEl.value * Math.PI / 180, sway = REDUCED ? 0 : Math.sin(t * 0.7) * 0.03, n = 0;
      function branch(x, y, len, a, d) {
        if (d === 0 || len < 1.2) return; n++;
        var x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
        var k = d / depth;
        ctx.strokeStyle = 'rgba(' + Math.round(226 * k + 94 * (1 - k)) + ',' + Math.round(168 * k + 193 * (1 - k)) + ',' + Math.round(90 * k + 217 * (1 - k)) + ',' + (0.35 + k * 0.6) + ')';
        ctx.lineWidth = Math.max(0.6, k * 5);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
        branch(x2, y2, len * 0.72, a - ang + sway, d - 1); branch(x2, y2, len * 0.72, a + ang + sway, d - 1);
      }
      branch(w / 2, h - 10, h * 0.28, -Math.PI / 2, depth);
      read.textContent = n;
    });
  })();

  /* =====================================================================
     06 · ondas (deslizador)
     ===================================================================== */
  (function waveCtl() {
    var s = $('#waveDetune'); if (!s) return;
    var apply = function () { if (window.Scenes) window.Scenes.params.waveDetune = +s.value / 100; };
    s.addEventListener('input', apply); apply();
  })();

  /* =====================================================================
     08 · generador binaural (Web Audio)
     ===================================================================== */
  var binaural = { playing: false, ctx: null, nodes: null, stop: function () {} };
  (function bin() {
    var box = $('#binaural'); if (!box) return;
    var play = $('#binPlay'), beat = $('#binBeat'), base = $('#binBase'), noise = $('#binNoise'), vol = $('#binVol');
    var BASES = [['C3', 65.41], ['G3', 98.00], ['C4', 130.81], ['E4', 164.81]];
    var scope = $('#binScope'), analyser = null;
    function readout() {
      var b = BASES[+base.value], fl = b[1], fr = fl + +beat.value;
      $('#binBeatV').textContent = (+beat.value).toFixed(1) + ' Hz';
      $('#binBaseV').textContent = b[0] + ' · ' + fl.toFixed(2) + ' Hz';
      $('#binNoiseV').textContent = noise.value + ' %'; $('#binVolV').textContent = vol.value + ' %';
      $('#binL').textContent = fl.toFixed(2) + ' Hz'; $('#binR').textContent = fr.toFixed(2) + ' Hz';
      $('#binCents').textContent = '+' + Math.round(1200 * Math.log2(fr / fl)) + ' cents';
      var bt = +beat.value, band = bt < 4 ? 'delta' : bt < 8 ? 'theta' : bt < 12 ? 'alpha' : 'beta';
      $$('#brainWaves div').forEach(function (d) { d.classList.toggle('is-on', d.getAttribute('data-w') === band); });
      if (binaural.nodes) {
        var n = binaural.nodes, now = binaural.ctx.currentTime;
        n.oL.frequency.setTargetAtTime(fl, now, 0.05); n.oR.frequency.setTargetAtTime(fr, now, 0.05);
        n.gNoise.gain.setTargetAtTime((+noise.value / 100) * 0.35, now, 0.05);
        n.master.gain.setTargetAtTime((+vol.value / 100) * 0.5, now, 0.05);
      }
    }
    [beat, base, noise, vol].forEach(function (el) { el.addEventListener('input', readout); });
    readout();

    function pinkBuffer(ctx) {
      var len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (var i = 0; i < len; i++) {
        var w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.96900 * b2 + w * 0.1538520;
        b3 = 0.86650 * b3 + w * 0.3104856; b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
      }
      return buf;
    }
    function start() {
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) { play.textContent = 'Sin audio en este navegador'; play.disabled = true; return; }
      var ctx = binaural.ctx || new AC(); binaural.ctx = ctx; if (ctx.state === 'suspended') ctx.resume();
      var master = ctx.createGain(); master.gain.value = 0;
      var oL = ctx.createOscillator(), oR = ctx.createOscillator(); oL.type = 'sine'; oR.type = 'sine';
      var pL = ctx.createStereoPanner ? ctx.createStereoPanner() : null, pR = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      var gTone = ctx.createGain(); gTone.gain.value = 0.28;
      if (pL && pR) { pL.pan.value = -1; pR.pan.value = 1; oL.connect(pL).connect(gTone); oR.connect(pR).connect(gTone); }
      else { var m = ctx.createChannelMerger(2); oL.connect(m, 0, 0); oR.connect(m, 0, 1); m.connect(gTone); }
      var src = ctx.createBufferSource(); src.buffer = pinkBuffer(ctx); src.loop = true;
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1600; lp.Q.value = 0.5;
      var gNoise = ctx.createGain(); gNoise.gain.value = 0;
      src.connect(lp).connect(gNoise).connect(master);
      gTone.connect(master);
      analyser = ctx.createAnalyser(); analyser.fftSize = 2048; master.connect(analyser).connect(ctx.destination);
      oL.start(); oR.start(); src.start();
      binaural.nodes = { oL: oL, oR: oR, src: src, gNoise: gNoise, master: master };
      binaural.playing = true; readout();
      master.gain.setTargetAtTime((+vol.value / 100) * 0.5, ctx.currentTime, 0.6);
      play.textContent = '■ Detener'; play.classList.add('is-on');
      $('#status').textContent = 'underclocking · ' + (+beat.value).toFixed(1) + ' Hz';
    }
    function stop() {
      if (!binaural.nodes) return;
      var n = binaural.nodes, ctx = binaural.ctx, now = ctx.currentTime;
      n.master.gain.setTargetAtTime(0, now, 0.25);
      setTimeout(function () { try { n.oL.stop(); n.oR.stop(); n.src.stop(); } catch (e) {} n.master.disconnect(); }, 1200);
      binaural.nodes = null; binaural.playing = false; analyser = null;
      play.textContent = '▶ Iniciar'; play.classList.remove('is-on');
      if (current) $('#status').textContent = STATUS[current] || 'observando';
    }
    binaural.stop = stop;
    play.addEventListener('click', function () { binaural.playing ? stop() : start(); });

    var data = new Uint8Array(2048);
    addTick('manual', function (t) {
      var f = fit2d(scope), ctx = f.ctx, w = f.w, h = f.h; ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(233,228,216,0.08)'; ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
      ctx.lineWidth = 1.5;
      if (analyser) {
        analyser.getByteTimeDomainData(data);
        ctx.strokeStyle = 'rgba(226,168,90,0.95)'; ctx.beginPath();
        for (var i = 0; i < data.length; i++) { var x = i / data.length * w, y = h / 2 + (data[i] - 128) / 128 * h * 0.45; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke();
      } else {
        var b = BASES[+base.value][1], bt = +beat.value;
        ctx.strokeStyle = 'rgba(94,193,217,0.5)'; ctx.beginPath();
        for (var k = 0; k <= w; k += 2) { var u = k / w * 1.6, env = Math.abs(Math.cos(u * Math.PI * bt / 2)), y2 = h / 2 + Math.sin(u * Math.PI * 2 * 40) * h * 0.4 * env; k ? ctx.lineTo(k, y2) : ctx.moveTo(k, y2); }
        ctx.stroke();
        ctx.font = '11px "IBM Plex Mono", monospace'; ctx.fillStyle = 'rgba(115,111,102,1)';
        ctx.fillText('vista previa del pulso que renderiza tu cerebro · ' + b.toFixed(2) + ' + ' + bt.toFixed(1) + ' Hz', 12, 16);
      }
    });
  })();

  /* =====================================================================
     arranque
     ===================================================================== */
  try { history.scrollRestoration = 'manual'; } catch (e) {}
  var first = location.hash.replace('#', '');
  go(document.getElementById(first) && first ? first : 'inicio', { noHash: !first, noScroll: true, force: true });
  requestAnimationFrame(function () { window.scrollTo(0, 0); });
  ticker.id = requestAnimationFrame(tick);
})();
