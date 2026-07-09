/* ============================================================
   PARTITION GAMES — 3D Landing interactions
   Three.js hero · theme · motion · tilt · partition glyphs
   ============================================================ */
import * as THREE from "three";

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------------------------------------------------- */
/* Theme (shares localStorage 'theme' with the rest of site)  */
/* Landing is dark-first: light => data-theme="light"          */
/* ---------------------------------------------------------- */
(function theme() {
    const btn = document.getElementById("theme-toggle");
    const sun = `<svg class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>`;
    const moon = `<svg class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.6 6.6 0 0 0 21 12.8z"/></svg>`;

    function apply(t) {
        if (t === "light") document.documentElement.setAttribute("data-theme", "light");
        else document.documentElement.removeAttribute("data-theme");
        if (btn) btn.innerHTML = (t === "light" ? moon : sun) + `<span>${t === "light" ? "dark" : "light"}</span>`;
        localStorage.setItem("theme", t);
        window.dispatchEvent(new CustomEvent("pg-theme", { detail: { theme: t } }));
    }

    apply(localStorage.getItem("theme") || "dark");
    btn && btn.addEventListener("click", () => {
        const cur = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
        apply(cur === "light" ? "dark" : "light");
    });
})();

/* ---------------------------------------------------------- */
/* Header scroll state + mobile menu + about popover           */
/* ---------------------------------------------------------- */
(function chrome() {
    const header = document.getElementById("site-header");
    const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const menuBtn = document.getElementById("menu-toggle");
    const nav = document.querySelector(".main-nav");
    menuBtn && menuBtn.addEventListener("click", () => {
        const open = nav.classList.toggle("open");
        menuBtn.setAttribute("aria-expanded", String(open));
    });
    nav && nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
        nav.classList.remove("open");
        menuBtn && menuBtn.setAttribute("aria-expanded", "false");
    }));

    const aboutBtn = document.getElementById("about-btn");
    const pop = document.getElementById("about-popover");
    const close = document.getElementById("close-about");
    const toggle = (show) => {
        pop.classList.toggle("hidden", !show);
        aboutBtn.setAttribute("aria-expanded", String(show));
    };
    aboutBtn && aboutBtn.addEventListener("click", (e) => { e.stopPropagation(); toggle(pop.classList.contains("hidden")); });
    close && close.addEventListener("click", () => toggle(false));
    document.addEventListener("click", (e) => { if (pop && !pop.contains(e.target) && e.target !== aboutBtn) toggle(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggle(false); });
})();

/* ---------------------------------------------------------- */
/* Scroll progress bar + scroll-linked parallax                */
/* ---------------------------------------------------------- */
(function scrollFx() {
    const bar = document.createElement("div");
    bar.className = "scroll-progress";
    document.body.appendChild(bar);

    const heroCopy = document.querySelector(".hero-copy");
    const cue = document.querySelector(".scroll-cue");
    const parallax = [...document.querySelectorAll("[data-parallax]")];

    let ticking = false;
    function update() {
        const y = window.scrollY;
        const docH = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = `scaleX(${docH > 0 ? y / docH : 0})`;

        if (!prefersReduced) {
            const vh = window.innerHeight;
            if (heroCopy && y < vh) {
                heroCopy.style.transform = `translateY(${y * 0.22}px)`;
                heroCopy.style.opacity = String(Math.max(0, 1 - y / (vh * 0.85)));
            }
            if (cue) cue.style.opacity = String(Math.max(0, 1 - y / 240));
            parallax.forEach(el => {
                const speed = parseFloat(el.dataset.parallax) || 0.15;
                const r = el.getBoundingClientRect();
                const offset = (r.top + r.height / 2 - window.innerHeight / 2);
                el.style.transform = `translateY(${offset * -speed}px)`;
            });
        }
        ticking = false;
    }
    window.addEventListener("scroll", () => {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", update);
    update();
})();

/* ---------------------------------------------------------- */
/* Scroll reveals (staggered)                                  */
/* ---------------------------------------------------------- */
(function reveals() {
    const items = [...document.querySelectorAll("[data-reveal]")];
    items.forEach(el => {
        if (el.dataset.delay) el.style.setProperty("--reveal-d", el.dataset.delay);
    });
    // stagger game cards by their order
    document.querySelectorAll("#games-grid .game-card").forEach((c, i) => {
        c.style.setProperty("--reveal-d", (i % 6));
    });

    if (prefersReduced || !("IntersectionObserver" in window)) {
        items.forEach(el => el.classList.add("in"));
        return;
    }
    const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
        });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    items.forEach(el => io.observe(el));
})();

/* ---------------------------------------------------------- */
/* Game filtering                                              */
/* ---------------------------------------------------------- */
(function filters() {
    const chips = [...document.querySelectorAll(".filter-chip")];
    const cards = [...document.querySelectorAll("#games-grid .game-card")];
    chips.forEach(chip => chip.addEventListener("click", () => {
        chips.forEach(c => { c.classList.remove("is-active"); c.setAttribute("aria-selected", "false"); });
        chip.classList.add("is-active");
        chip.setAttribute("aria-selected", "true");
        const f = chip.dataset.filter;
        cards.forEach(card => {
            const show = f === "all" || card.dataset.category === f;
            card.classList.toggle("filtered-out", !show);
        });
    }));
})();

/* ---------------------------------------------------------- */
/* Partition glyphs (isometric mini Young diagrams on cards)   */
/* ---------------------------------------------------------- */
(function glyphs() {
    const U = 11;
    document.querySelectorAll(".card-shape").forEach(el => {
        const rows = (el.closest("[data-partition]")?.dataset.partition || "3 2 1")
            .trim().split(/\s+/).map(Number);
        const maxC = Math.max(...rows), nR = rows.length;
        const offX = 36 - (maxC * U) / 2;
        const offY = 28 - (nR * U) / 2;
        rows.forEach((len, r) => {
            for (let c = 0; c < len; c++) {
                const cell = document.createElement("div");
                cell.className = "iso-cell";
                cell.style.left = (offX + c * U) + "px";
                cell.style.top = (offY + r * U) + "px";
                el.appendChild(cell);
            }
        });
    });

    // flat mini board in the multiplayer mock
    document.querySelectorAll(".mp-mini-board").forEach(el => {
        const rows = (el.dataset.partition || "4 3 2").trim().split(/\s+/).map(Number);
        el.style.display = "flex";
        el.style.flexDirection = "column";
        el.style.gap = "4px";
        rows.forEach(len => {
            const row = document.createElement("div");
            row.style.display = "flex";
            row.style.gap = "4px";
            for (let c = 0; c < len; c++) {
                const s = document.createElement("span");
                s.style.cssText = "width:18px;height:18px;border-radius:4px;background:color-mix(in srgb,var(--cyan) 28%,transparent);border:1px solid color-mix(in srgb,var(--cyan) 70%,transparent);";
                row.appendChild(s);
            }
            el.appendChild(row);
        });
    });
})();

/* ---------------------------------------------------------- */
/* Card 3D tilt + sheen follow                                 */
/* ---------------------------------------------------------- */
(function tilt() {
    if (prefersReduced || matchMedia("(pointer: coarse)").matches) return;
    const MAX = 9;
    document.querySelectorAll(".game-card").forEach(card => {
        let raf = null;
        const move = (e) => {
            const r = card.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width;
            const py = (e.clientY - r.top) / r.height;
            card.style.setProperty("--mx", (px * 100) + "%");
            card.style.setProperty("--my", (py * 100) + "%");
            if (raf) return;
            raf = requestAnimationFrame(() => {
                card.style.transform =
                    `rotateY(${(px - 0.5) * MAX}deg) rotateX(${(0.5 - py) * MAX}deg) translateZ(6px)`;
                raf = null;
            });
        };
        card.addEventListener("pointermove", move);
        card.addEventListener("pointerleave", () => { card.style.transform = ""; });
    });
})();

/* ---------------------------------------------------------- */
/* Three.js hero — a 3D partition (plane-partition corner)     */
/* ---------------------------------------------------------- */
(function hero3d() {
    const canvas = document.getElementById("hero-canvas");
    if (!canvas) return;

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch (err) {
        canvas.style.display = "none";
        return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 17);

    const group = new THREE.Group();
    scene.add(group);

    // ---- build the 3D partition (cubes stacked in a corner) ----
    const N = 6, SIZE = 0.92, STEP = 1.0;
    const box = new THREE.BoxGeometry(SIZE, SIZE, SIZE);
    const edgeGeo = new THREE.EdgesGeometry(box);
    const cOrange = new THREE.Color("#FF6B35");
    const cCyan = new THREE.Color("#2DD4BF");

    // every cube is a permanent child of `group` — one shared transform means the
    // whole stack moves/shrinks/spins perfectly in sync, with no per-cube lag.
    for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
            const h = N - i - j;
            for (let k = 0; k < h; k++) {
                const t = THREE.MathUtils.clamp((k + (i + j) * 0.18) / N, 0, 1);
                const col = cOrange.clone().lerp(cCyan, t * 0.9);
                const mesh = new THREE.Mesh(box, new THREE.MeshStandardMaterial({
                    color: col, metalness: 0.25, roughness: 0.42,
                    emissive: col.clone().multiplyScalar(0.18), transparent: true, opacity: 1,
                }));
                mesh.position.set(i * STEP, k * STEP, j * STEP);
                const edges = new THREE.LineSegments(edgeGeo,
                    new THREE.LineBasicMaterial({ color: col.clone().lerp(new THREE.Color("#fff"), 0.4), transparent: true, opacity: 0.55 }));
                edges.position.copy(mesh.position);
                group.add(mesh); group.add(edges);
            }
        }
    }
    // center on bounding box
    const c = (N - 1) * STEP / 2;
    group.children.forEach(o => o.position.sub(new THREE.Vector3(c, c * 0.5, c)));

    const mainMats = [];
    group.traverse(o => { if (o.material) mainMats.push(o.material); });

    // ---- lights ----
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(6, 10, 8); scene.add(key);
    const rimO = new THREE.PointLight(0xff6b35, 60, 60); rimO.position.set(-8, 2, 6); scene.add(rimO);
    const rimC = new THREE.PointLight(0x2dd4bf, 50, 60); rimC.position.set(8, -4, -6); scene.add(rimC);

    // ---- keyframes for the main mass: hero pose → resting pose over "Choose your games" ----
    let wide = true;
    const KP = { hero: new THREE.Vector3(), games: new THREE.Vector3() };
    let gamesTopY = 0;   // scrollY at which the mass should have fully arrived at KP.games
    // Guard against environments that report a bogus (0/1) viewport width.
    function cw() { var w = canvas.clientWidth || window.innerWidth || 0; return w > 2 ? w : 1280; }
    function ch() { var h = canvas.clientHeight || window.innerHeight || 0; return h > 2 ? h : 800; }
    function layout() {
        const w = cw();
        wide = w > 820;
        const f = wide ? 1 : 0.45;
        KP.hero.set(3.4 * f, 0.4, 0);
        KP.games.set(5.0 * f, 2.4, -2);
        camera.position.z = wide ? 17 : 22;
        camera.aspect = w / ch();
        camera.updateProjectionMatrix();
        const gamesEl = document.getElementById("games");
        gamesTopY = gamesEl ? gamesEl.offsetTop : (document.documentElement.scrollHeight - window.innerHeight) * 0.33;
    }
    function resize() {
        // size the drawing buffer to the canvas's actual rendered box (CSS keeps display = viewport)
        renderer.setSize(cw(), ch(), false);
        layout();
    }
    resize();
    window.addEventListener("resize", resize);
    // re-size once the fixed canvas gets its real dimensions from layout
    if (window.ResizeObserver) { try { new ResizeObserver(resize).observe(canvas); } catch (e) {} }
    setTimeout(resize, 100);
    window.addEventListener("load", resize);

    // ---- pointer parallax (subtle) ----
    const ptr = { x: 0, y: 0 }, ptrCur = { x: 0, y: 0 };
    if (!prefersReduced) window.addEventListener("pointermove", (e) => {
        ptr.x = (e.clientX / window.innerWidth) * 2 - 1;
        ptr.y = (e.clientY / window.innerHeight) * 2 - 1;
    });

    // ---- scroll progress ----
    // `p`    — fraction of the whole page scrolled; drives the continuous shrink + spin.
    // `posP` — fraction of the way to the "Choose your games" section; drives the
    //          hero → resting-pose move, then holds once that section is reached.
    let p = 0, pCur = 0, posP = 0, posPCur = 0;
    function readProgress() {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        p = max > 0 ? THREE.MathUtils.clamp(window.scrollY / max, 0, 1) : 0;
        posP = gamesTopY > 0 ? THREE.MathUtils.clamp(window.scrollY / gamesTopY, 0, 1) : 0;
    }
    window.addEventListener("scroll", readProgress, { passive: true });
    readProgress();

    const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    // ---- per-frame update (also callable on demand for envs that throttle rAF) ----
    const clock = new THREE.Clock();
    const tmp = new THREE.Vector3();

    function frame(prog, posProg, time) {
        // position: travel from the hero pose toward the "high mid" resting spot as you
        // approach "Choose your games", then hold there for the rest of the scroll
        tmp.copy(KP.hero).lerp(KP.games, ease(posProg));
        group.position.copy(tmp);
        group.position.y += Math.sin(time * 0.7) * 0.06;

        // shrink further the more of the page you scroll through
        group.scale.setScalar(Math.max(0.18, 1 - prog * 0.82));

        // spin forward scrolling down, unwind scrolling back up
        group.rotation.y = -0.9 + prog * Math.PI * 1.6 + (prefersReduced ? 0 : time * 0.07) + ptrCur.x * 0.25;
        group.rotation.x = -0.18 - ptrCur.y * 0.18;

        for (let m = 0; m < mainMats.length; m++) mainMats[m].opacity = (mainMats[m].isLineBasicMaterial ? 0.55 : 1);
        renderer.render(scene, camera);
    }

    let running = true;
    document.addEventListener("visibilitychange", () => { running = !document.hidden; });
    function tick() {
        requestAnimationFrame(tick);
        if (!running) return;
        pCur += (p - pCur) * 0.08;
        posPCur += (posP - posPCur) * 0.08;
        ptrCur.x += (ptr.x - ptrCur.x) * 0.05;
        ptrCur.y += (ptr.y - ptrCur.y) * 0.05;
        frame(prefersReduced ? 0 : pCur, prefersReduced ? 0 : posPCur, clock.getElapsedTime());
    }
    tick();
})();
