// Mycelial growth background animation
(function () {
  'use strict';

  var canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:0;';
  document.body.insertBefore(canvas, document.body.firstChild);

  var ctx = canvas.getContext('2d');
  var W, H;
  var BG_FILL = 'rgba(9,17,29,1)';
  var BG_FADE = 'rgba(9,17,29,0.009)';
  var resizeTimer;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    ctx.fillStyle = BG_FILL;
    ctx.fillRect(0, 0, W, H);
  }

  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 110);
  });

  resize();

  // Green palette matching the app theme
  var COLORS = ['#22c55e', '#16a34a', '#4ade80', '#15803d', '#22c55e', '#22c55e'];

  var filaments = [];
  var nodes = [];
  var MAX_FILAMENTS = 26;
  var MAX_NODES = 28;
  var globalPhase = 0;

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function hexRgba(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a.toFixed(3) + ')';
  }

  function spawnFilament(x, y, angle, parentMaxOpacity) {
    var mo = parentMaxOpacity != null
      ? clamp(parentMaxOpacity * rnd(0.7, 0.92), 0.08, 0.55)
      : rnd(0.18, 0.5);
    var totalLife = Math.floor(rnd(200, 420));
    var fadeAge = Math.floor(totalLife * rnd(0.55, 0.72));
    filaments.push({
      x: x != null ? x : rnd(0.05, 0.95) * W,
      y: y != null ? y : rnd(0.05, 0.95) * H,
      angle: angle != null ? angle : rnd(0, Math.PI * 2),
      angleVel: 0,
      speed: rnd(0.56, 1.24),
      opacity: 0,
      maxOpacity: mo,
      fadeAge: fadeAge,
      totalLife: totalLife,
      branchAge: Math.floor(rnd(50, 135)),
      branched: false,
      life: 0,
      width: rnd(0.4, 1.05),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      px: null,
      py: null,
    });
  }

  function spawnNode(x, y) {
    if (nodes.length >= MAX_NODES) return;
    nodes.push({
      x: x,
      y: y,
      radius: rnd(0.9, 2.0),
      opacity: 0,
      life: 0,
      totalLife: Math.floor(rnd(350, 750)),
    });
  }

  // Seed initial filaments at staggered ages
  for (var i = 0; i < 14; i++) {
    spawnFilament(null, null, null, null);
    filaments[i].life = Math.floor(rnd(0, 55));
  }

  var rafId = null;
  var running = false;
  var lastTime = 0;
  var INTERVAL = 1000 / 25; // ~25 fps

  function update() {
    globalPhase += 0.00032;

    // Top up the pool with new seed filaments
    while (filaments.length < MAX_FILAMENTS) {
      spawnFilament(null, null, null, null);
    }

    var margin = 110;

    for (var i = filaments.length - 1; i >= 0; i--) {
      var f = filaments[i];
      f.life++;

      // Smooth random-walk angle change
      f.angleVel += (Math.random() - 0.5) * 0.0075;
      f.angleVel = clamp(f.angleVel, -0.024, 0.024);
      f.angleVel *= 0.965; // gentle damping keeps curves soft
      f.angle += f.angleVel;

      f.px = f.x;
      f.py = f.y;
      f.x += f.speed * Math.cos(f.angle);
      f.y += f.speed * Math.sin(f.angle);

      // Opacity: fade in, hold, fade out
      if (f.life < 30) {
        f.opacity = f.maxOpacity * (f.life / 30);
      } else if (f.life > f.fadeAge) {
        var decay = 1 - (f.life - f.fadeAge) / (f.totalLife - f.fadeAge);
        f.opacity = f.maxOpacity * Math.max(0, decay);
      } else {
        f.opacity = f.maxOpacity;
      }

      // Branch point: spawn node + child filaments
      if (!f.branched && f.life >= f.branchAge) {
        f.branched = true;
        spawnNode(f.x, f.y);
        var numChildren = Math.random() < 0.6 ? 2 : 1;
        for (var c = 0; c < numChildren; c++) {
          if (filaments.length < MAX_FILAMENTS + 4) {
            var dev = rnd(0.18, 0.68) * (Math.random() < 0.5 ? 1 : -1);
            spawnFilament(f.x, f.y, f.angle + dev, f.maxOpacity);
          }
        }
      }

      // Kill if aged out or off-screen
      if (f.life >= f.totalLife || f.x < -margin || f.x > W + margin || f.y < -margin || f.y > H + margin) {
        filaments.splice(i, 1);
      }
    }

    for (var j = nodes.length - 1; j >= 0; j--) {
      var nd = nodes[j];
      nd.life++;
      // Brief bright pulse, then settle to a gentle fading glow
      if (nd.life < 25) {
        nd.opacity = nd.life / 25;
      } else if (nd.life < 70) {
        nd.opacity = 1.0;
      } else {
        nd.opacity = Math.max(0, 1 - (nd.life - 70) / (nd.totalLife - 70));
      }
      if (nd.life >= nd.totalLife) {
        nodes.splice(j, 1);
      }
    }
  }

  function draw() {
    // Slow global breath: intensity rises and falls over ~30s
    var breathe = 0.5 + 0.5 * Math.sin(globalPhase);

    // Fade overlay — erases old marks very gradually, creating trailing effect
    ctx.fillStyle = BG_FADE;
    ctx.fillRect(0, 0, W, H);

    ctx.lineCap = 'round';

    // Filament strokes
    for (var i = 0; i < filaments.length; i++) {
      var f = filaments[i];
      if (f.px === null || f.opacity < 0.005) continue;
      var a = f.opacity * (0.5 + 0.5 * breathe);
      ctx.strokeStyle = hexRgba(f.color, a);
      ctx.lineWidth = f.width;
      ctx.beginPath();
      ctx.moveTo(f.px, f.py);
      ctx.lineTo(f.x, f.y);
      ctx.stroke();
    }

    // Node glows
    for (var j = 0; j < nodes.length; j++) {
      var nd = nodes[j];
      if (nd.opacity < 0.005) continue;
      var na = nd.opacity * (0.45 + 0.55 * breathe);

      // Outer soft halo
      ctx.beginPath();
      ctx.arc(nd.x, nd.y, nd.radius * 3.8, 0, Math.PI * 2);
      ctx.fillStyle = hexRgba('#22c55e', na * 0.07);
      ctx.fill();

      // Mid glow ring
      ctx.beginPath();
      ctx.arc(nd.x, nd.y, nd.radius * 2.1, 0, Math.PI * 2);
      ctx.fillStyle = hexRgba('#4ade80', na * 0.18);
      ctx.fill();

      // Bright core
      ctx.beginPath();
      ctx.arc(nd.x, nd.y, nd.radius, 0, Math.PI * 2);
      ctx.fillStyle = hexRgba('#86efac', na * 0.72);
      ctx.fill();
    }
  }

  function tick(ts) {
    if (!running) return;
    rafId = requestAnimationFrame(tick);
    var delta = ts - lastTime;
    if (delta < INTERVAL) return;
    lastTime = ts - (delta % INTERVAL);
    update();
    draw();
  }

  function start() {
    if (running) return;
    running = true;
    lastTime = 0;
    rafId = requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  // Pause when tab is hidden to save resources
  document.addEventListener('visibilitychange', function () {
    document.hidden ? stop() : start();
  });

  start();
}());
