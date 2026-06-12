// TryVII LP — reveal / 固定subheadスロット切替
(function () {
  "use strict";

  /* ---- スクロール出現アニメ ---- */
  var targets = document.querySelectorAll(".reveal, .stagger");
  if (location.search.indexOf("shot") !== -1) {
    targets.forEach(function (el) { el.classList.add("is-visible"); });
  } else if ("IntersectionObserver" in window && targets.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
    targets.forEach(function (el) { io.observe(el); });
  } else {
    targets.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---- 固定subhead（ヒーロー通過後に出現・セクションでスロット切替）---- */
  var bar  = document.querySelector(".subhead-bar");
  var reel = document.querySelector(".subhead-reel");
  var hero = document.querySelector(".hero");
  var secs = Array.prototype.slice.call(document.querySelectorAll(".sec"));
  if (!bar || !reel || !hero || !secs.length) return;

  var BAR_H = 124;        // セル高さ（リール送り量）
  var TOP_OFFSET = 28;    // 貼り付き時に画面外へ出る上端
  var VISIBLE_H = BAR_H - TOP_OFFSET; // 画面に見えるバー高さ
  var current = -1;
  var ticking = false;

  function setReel(i) {
    if (i === current) return;
    current = i;
    reel.style.transform = "translateY(" + (-i * BAR_H) + "px)";
  }

  function update() {
    ticking = false;
    // 各セクションの見出し(head)が画面の中央より上に来たら、その節を「現在地」に
    var line = window.innerHeight / 2;
    var active = 0;
    for (var i = 0; i < secs.length; i++) {
      var head = secs[i].querySelector(".sec-head");
      var top = (head || secs[i]).getBoundingClientRect().top;
      if (top <= line) active = i; else break;
    }
    setReel(active);
  }

  // 検証用：?pin=N でバーを上端固定＆指定セクションを強制再現
  var force = location.search.match(/pin=(\d+)/);
  if (force) {
    bar.style.position = "fixed";
    bar.style.top = "-28px";
    bar.style.left = "50%";
    bar.style.width = "min(calc(100% - 20px), 412px)";
    bar.style.transform = "translateX(-50%)";
    setReel(Math.min(+force[1], secs.length - 1));
    return;
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  window.addEventListener("load", onScroll);
  update();
})();

/* ===== メンバー紹介カルーセル（左右ボタン／ドット／スワイプ）===== */
(function () {
  "use strict";
  var root = document.querySelector(".members");
  if (!root) return;
  var track  = root.querySelector(".members__track");
  var slides = root.querySelectorAll(".member-slide");
  var prev   = root.querySelector(".members__nav--prev");
  var next   = root.querySelector(".members__nav--next");
  var dotsW  = root.querySelector(".members__dots");
  var n = slides.length;
  if (!track || !n) return;
  var i = 0, dots = [];
  // メンバーカラー（コメント枠から抽出）
  var COLORS = ["#e81c53", "#e6b815", "#02c6f2", "#afbae3", "#4b45e7", "#e7289a"];

  if (dotsW) {
    for (var k = 0; k < n; k++) {
      var b = document.createElement("button");
      b.className = "members__dot";
      b.type = "button";
      b.style.backgroundColor = COLORS[k % COLORS.length];
      b.setAttribute("aria-label", (k + 1) + "人目");
      (function (idx) { b.addEventListener("click", function () { go(idx); }); })(k);
      dotsW.appendChild(b);
      dots.push(b);
    }
  }
  function go(idx) {
    i = (idx + n) % n;
    track.style.transform = "translateX(" + (-i * 100) + "%)";
    for (var k = 0; k < n; k++) if (dots[k]) dots[k].classList.toggle("is-active", k === i);
  }
  if (prev) prev.addEventListener("click", function () { go(i - 1); });
  if (next) next.addEventListener("click", function () { go(i + 1); });

  // スワイプ（タッチ）
  var x0 = null;
  root.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  root.addEventListener("touchend", function (e) {
    if (x0 == null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) go(dx < 0 ? i + 1 : i - 1);
    x0 = null;
  }, { passive: true });

  go(0);
})();

/* ===== 応募方法：縦スクロールで固定→STEPカードを横送り ===== */
(function () {
  "use strict";
  var pin    = document.querySelector(".howto-pin");
  var stage  = pin && pin.querySelector(".howto-stage");
  var pwin   = pin && pin.querySelector(".howto-frame__window");
  var photos = pin && pin.querySelector(".howto-photos");
  var lwin   = pin && pin.querySelector(".howto-labels");
  var labels = pin && pin.querySelector(".howto-ltrack");
  if (!pin || !stage || !photos || !labels) return;

  // モーション低減設定：固定・横送りはせず1枚目を表示
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    pin.classList.add("howto-pin--static");
    return;
  }

  var ticking = false, photoShift = 0, labelShift = 0, stickyTop = 96;

  function measure() {
    stickyTop = parseFloat(getComputedStyle(stage).top) || 0;
    // 各トラック全幅 − 表示窓幅 ＝ 横に送れる距離
    photoShift = Math.max(0, photos.scrollWidth - pwin.clientWidth);
    labelShift = Math.max(0, labels.scrollWidth - lwin.clientWidth);
  }
  function apply(p) {
    photos.style.transform = "translate3d(" + (-p * photoShift).toFixed(1) + "px,0,0)";
    labels.style.transform = "translate3d(" + (-p * labelShift).toFixed(1) + "px,0,0)";
  }

  // スクロール量 → 横送り量。STEPごとの区間内をイージングして「端は重く・中央で速く」STEPへ引き寄せる
  var STEPS  = 3;        // STEP枚数
  var SMOOTH = 0.14;     // 追従の重み（小さいほど重い／ヌルッと遅れて効く）
  function easedProgress() {
    var rect  = pin.getBoundingClientRect();
    var range = pin.offsetHeight - stage.offsetHeight;   // 固定中に進める縦距離
    var p = range > 0 ? (stickyTop - rect.top) / range : 0;
    if (p < 0) p = 0; else if (p > 1) p = 1;
    var seg = 1 / (STEPS - 1);
    var i = Math.floor(p / seg);
    if (i > STEPS - 2) i = STEPS - 2;
    var t = (p - i * seg) / seg;             // 区間内 0..1
    if (t < 0) t = 0; else if (t > 1) t = 1;
    var e = t * t * t * (t * (t * 6 - 15) + 10);   // smootherstep（端でほぼ静止＝重み）
    return (i + e) * seg;
  }

  // 検証用：?howto=N(0-100) で横送り量を固定（固定解除＋px高さで静止撮影しやすく）
  var force = location.search.match(/howto=(\d+)/);
  if (force) {
    pin.style.height = "auto";
    stage.style.position = "static";
    stage.style.height = "600px";
    measure();
    apply(Math.min(+force[1], 100) / 100);
    return;
  }

  // rAFで表示値を目標値へ滑らかに寄せ続ける（＝慣性・重み）
  var displayed = 0, target = 0, rafId = null;
  function tick() {
    displayed += (target - displayed) * SMOOTH;
    if (Math.abs(target - displayed) < 0.0004) {
      displayed = target;
      apply(displayed);
      rafId = null;
      return;
    }
    apply(displayed);
    rafId = requestAnimationFrame(tick);
  }
  function kick() { if (rafId == null) rafId = requestAnimationFrame(tick); }

  function onScroll()  { target = easedProgress(); kick(); }
  function remeasure() { measure(); target = easedProgress(); kick(); }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", remeasure, { passive: true });
  window.addEventListener("load", remeasure);
  measure();
  target = displayed = easedProgress();
  apply(displayed);
})();

/* ===== 応募条件：封筒から手紙が出るスクロールギミック ===== */
(function () {
  "use strict";
  var mail = document.querySelector(".mail");
  if (!mail) return;
  var paper = mail.querySelector(".mail__paper");
  var ticking = false;

  function setP(p) {
    paper.style.setProperty("--mail-p", p.toFixed(3));
  }

  // 検証用：?mail=N(0-100) で進捗を固定
  var force = location.search.match(/mail=(\d+)/);
  if (force) {
    setP(Math.min(+force[1], 100) / 100);
    return;
  }

  function update() {
    ticking = false;
    var vh = window.innerHeight;
    var r = mail.getBoundingClientRect();
    // 封筒が画面下85% → 上25% を通過する間で 0→1
    var p = (0.85 * vh - r.top) / (0.60 * vh);
    p = Math.max(0, Math.min(1, p));
    setP(0.8 + 0.2 * p);     // 初期8割出 → スクロールで完全に(1.0)
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  window.addEventListener("load", onScroll);
  update();
})();

/* ===== スケジュール帯：中央に来たら白帯がキランと横断 ===== */
(function () {
  "use strict";
  var el = document.querySelector(".schedule");
  if (!el || !("IntersectionObserver" in window)) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  // ほぼ画面中央の帯にいるときだけ intersecting になる
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        el.classList.remove("is-shine");
        // reflow を挟んでアニメを確実に再生
        void el.offsetWidth;
        el.classList.add("is-shine");
      } else {
        el.classList.remove("is-shine");
      }
    });
  }, { rootMargin: "-42% 0px -42% 0px", threshold: 0 });
  io.observe(el);
})();

/* ===== キラキラ：ページ全体のスクロール進捗(0→1)で上下に横断 =====
   左：下→上 ／ 右：上→下。position:fixed＋scrollYのみ参照で滑らか（レイアウト読み取りなし）*/
(function () {
  "use strict";
  var L = document.querySelector(".sparkle--l");
  var R = document.querySelector(".sparkle--r");
  if (!L && !R) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var hero = document.querySelector(".hero");
  var maxScroll = 1, Lr = 0, Rr = 0, heroH = 0, on = false, ticking = false;
  function measure() {
    var vh = window.innerHeight || 1;
    maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
    Lr = L ? (vh - L.offsetHeight) : 0;   // 移動可能な縦幅
    Rr = R ? (vh - R.offsetHeight) : 0;
    heroH = hero ? hero.offsetHeight : 0;
  }
  function render() {
    ticking = false;
    var sy = window.scrollY || window.pageYOffset || 0;
    var p = sy / maxScroll;
    if (p < 0) p = 0; else if (p > 1) p = 1;
    // -50% で枠線の中心に乗せたまま縦移動
    if (L) L.style.transform = "translate3d(-50%," + ((1 - p) * Lr).toFixed(1) + "px, 0)"; // 下→上
    if (R) R.style.transform = "translate3d(-50%," + (p * Rr).toFixed(1) + "px, 0)";        // 上→下
    // ヒーローを通過したら（ABOUTが上に着いたら）表示
    var show = sy >= (heroH - 40);
    if (show !== on) {
      on = show;
      if (L) L.classList.toggle("is-on", on);
      if (R) R.classList.toggle("is-on", on);
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(render); } }
  function remeasure() { measure(); render(); }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", remeasure, { passive: true });
  window.addEventListener("load", remeasure);
  measure();
  render();
})();
