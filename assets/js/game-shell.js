/* ============================================================
   PARTITION GAMES 3D — game shell
   Wraps every game in the modern layout: atmospheric bg,
   board "stage", and a live side panel (stats · report ·
   algorithm). Engine-agnostic: it observes the DOM the game
   engines already produce, so no game logic is touched.
   ============================================================ */
(function () {
    "use strict";
    if (window.__pgShell) return;
    window.__pgShell = true;

    var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* --- per-game algorithm copy --- */
    var ALGOS = {
        LCTR:   { fam: "impartial", how: "LCTR is an impartial game solved with the <strong>Sprague–Grundy theorem</strong>. Every position gets a Nim-value (its Grundy number); the engine searches and memoises these values, then plays toward any move that hands you a position with value 0.", win: "You win in normal play by always moving to a <strong>Grundy value of 0</strong>. If the current position is already 0, every move loses — the AI is in control." },
        CRIM:   { fam: "impartial", how: "CRIM merges fragments after each cut, so the engine evaluates the merged partition's <strong>Grundy value</strong> with memoised recursion over reachable positions.", win: "Steer the board toward a <strong>zero Grundy value</strong> after the merge; that leaves your opponent with no safe reply." },
        CRIS:   { fam: "impartial", how: "CRIS keeps fragments independent, so the position is a <strong>sum of games</strong>. The engine XORs the Grundy values of the fragments (Sprague–Grundy on a disjunctive sum).", win: "Make the <strong>XOR of all fragment values equal 0</strong>. Splitting into balanced independent pieces is the key idea." },
        "SATO-WELTER": { fam: "impartial", how: "The hook (Sato–Welter) game is analysed with <strong>Welter's function</strong> / mex-based Grundy values over hook removals.", win: "Aim for positions whose <strong>Welter value is 0</strong>; symmetric hook responses often preserve it." },
        RIT:    { fam: "impartial", how: "RIT trims row termini while keeping a valid Young diagram. The engine computes <strong>Grundy values</strong> across legal trims with memoisation.", win: "Move to a <strong>Grundy value of 0</strong> — keep the diagram balanced so no single trim helps your opponent." },
        CRIT:   { fam: "impartial", how: "CRIT extends RIT to rows and columns, doubling the move set. It still resolves to a single <strong>Grundy value</strong> via memoised search.", win: "Reach a <strong>zero Grundy value</strong> after your trim; mirroring row/column structure is a strong heuristic." },
        CORNER: { fam: "impartial", how: "Corner removes sets of corners from a partition. The engine enumerates corner subsets and evaluates each child's <strong>Grundy value</strong>.", win: "Leave a position with <strong>Grundy value 0</strong>; controlling corner parity decides the game." },
        ANTICORNER: { fam: "impartial", how: "AntiCorner targets L-shaped anticorners (or the last row/column). Grundy values are computed over the legal anticorner moves.", win: "Move to a <strong>Grundy value of 0</strong> — watch the rightmost column and bottom row, they flip control fast." },
        "CONSECUTIVE CORNER": { fam: "impartial", how: "Consecutive Corner restricts removals to runs of adjacent corners. The engine searches these connected moves for their <strong>Grundy values</strong>.", win: "Hand back a <strong>zero Grundy value</strong>; balancing the corner run lengths is the lever." },
        SICC:   { fam: "impartial", how: "SICC forces runs that include an extreme corner. The reduced move set is still solved by <strong>Sprague–Grundy</strong> search.", win: "Target a <strong>Grundy value of 0</strong> while denying your opponent the top-right / bottom-left corners." },
        CRPM:   { fam: "partizan", how: "CRPM is <strong>partizan</strong>: you and the AI have different moves (rows vs columns). The engine uses <strong>minimax</strong> over the merged partitions instead of a single Nim-value.", win: "There is no single 'zero' target — play minimax: pick the row/column that minimises your opponent's best reply." },
        CRPS:   { fam: "partizan", how: "CRPS is <strong>partizan</strong> with independent fragments. The engine runs <strong>minimax</strong> over the disjunctive sum of split partitions.", win: "Look several plies ahead — favour splits that starve your opponent of strong columns/rows." }
    };

    function gameCode() {
        var gt = document.querySelector(".game-title");
        var raw = (gt ? gt.textContent : (document.title || "")).replace(/[\/|].*$/, "");
        raw = (gt ? gt.textContent.replace(/^[\s\/]+/, "") : (document.title.split(/\s+game/i)[0]));
        var code = (raw || "").trim().toUpperCase();
        if (ALGOS[code]) return code;
        // fallbacks by keyword
        var t = (document.title || "").toUpperCase();
        var keys = Object.keys(ALGOS);
        for (var i = 0; i < keys.length; i++) { if (t.indexOf(keys[i]) === 0 || t.indexOf(keys[i]) > -1) return keys[i]; }
        return code || "LCTR";
    }

    function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

    function injectBackground() {
        ["pg-bg-grid", "pg-bg-aurora", "pg-bg-grain"].forEach(function (c) {
            var d = el("div", "pg-bg " + c); document.body.insertBefore(d, document.body.firstChild);
        });
    }

    /* Authoritative, landing-consistent theme: dark-first (data-theme="dark"),
       light = no attribute. Re-asserts to beat any late resets from other
       scripts so the game matches the landing page. */
    function alignTheme() {
        try {
            var saved = localStorage.getItem("theme");
            var dark = saved !== "light";        // default to dark
            var apply = function () {
                if (dark) document.documentElement.setAttribute("data-theme", "dark");
                else document.documentElement.removeAttribute("data-theme");
            };
            apply();
            setTimeout(apply, 60);
            setTimeout(apply, 260);
        } catch (e) {}
    }

    var refs = {};

    function buildPanel(code) {
        var card = document.getElementById("game-card");
        var container = card && card.closest(".container");
        if (!card || !container) return false;

        var wrap = el("div", "pg-stage-wrap");
        var stage = el("div", "pg-stage");
        card.parentNode.insertBefore(wrap, card);
        stage.appendChild(card);
        wrap.appendChild(stage);

        var info = ALGOS[code] || ALGOS.LCTR;
        var isPartizan = info.fam === "partizan";
        var youName = "You", cpuName = isPartizan ? "Opponent" : "Computer";

        var panel = el("aside"); panel.id = "pg-panel";
        panel.innerHTML =
            '<div class="pg-card">' +
                '<div class="pg-card-title"><svg class="ic" viewBox="0 0 24 24"><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/></svg>block count</div>' +
                '<div class="pg-vs">' +
                    '<div class="pg-side you"><span class="who">' + youName + '</span><div class="num" data-you>0</div><div class="lbl">cleared</div></div>' +
                    '<div class="pg-vs-mid">vs</div>' +
                    '<div class="pg-side cpu"><span class="who">' + cpuName + '</span><div class="num" data-cpu>0</div><div class="lbl">cleared</div></div>' +
                '</div>' +
                '<div class="pg-meter"><i class="mi-you" data-myou style="width:50%"></i><i class="mi-cpu" data-mcpu style="width:50%"></i></div>' +
                '<div class="pg-stat-row">' +
                    '<div class="pg-stat"><div class="v" data-remain>0</div><div class="k">remaining</div></div>' +
                    '<div class="pg-stat"><div class="v" data-cleared>0</div><div class="k">cleared</div></div>' +
                    '<div class="pg-stat"><div class="v" data-moves>0</div><div class="k">moves</div></div>' +
                '</div>' +
            '</div>' +
            '<div class="pg-card">' +
                '<div class="pg-card-title"><svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>turn</div>' +
                '<div class="pg-turn" data-turn><span class="pip"></span><span data-turntext>waiting for new game…</span></div>' +
            '</div>' +
            '<div class="pg-card">' +
                '<div class="pg-card-title"><svg class="ic" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>game report</div>' +
                '<p class="pg-text">' + info.win + '</p>' +
                '<div class="pg-chiprow">' +
                    '<button class="pg-chip" data-act="report">open full report</button>' +
                    '<button class="pg-chip" data-act="analysis">analysis mode</button>' +
                '</div>' +
                '<div class="pg-log" data-log style="margin-top:14px"></div>' +
            '</div>' +
            '<div class="pg-card">' +
                '<div class="pg-card-title"><svg class="ic" viewBox="0 0 24 24"><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="4"/></svg>how the AI thinks · ' + info.fam + '</div>' +
                '<p class="pg-text">' + info.how + '</p>' +
            '</div>';
        wrap.appendChild(panel);

        refs.you = panel.querySelector("[data-you]");
        refs.cpu = panel.querySelector("[data-cpu]");
        refs.remain = panel.querySelector("[data-remain]");
        refs.cleared = panel.querySelector("[data-cleared]");
        refs.moves = panel.querySelector("[data-moves]");
        refs.mYou = panel.querySelector("[data-myou]");
        refs.mCpu = panel.querySelector("[data-mcpu]");
        refs.turn = panel.querySelector("[data-turn]");
        refs.turnText = panel.querySelector("[data-turntext]");
        refs.log = panel.querySelector("[data-log]");

        panel.querySelector('[data-act="report"]').addEventListener("click", function () {
            click("report-btn-modal") || click("report-btn") || setTurnText("Finish a game to generate its full report.");
        });
        panel.querySelector('[data-act="analysis"]').addEventListener("click", function () {
            click("analysis-mode-toggle");
        });
        return true;
    }

    function click(id) { var b = document.getElementById(id); if (b) { b.click(); return true; } return false; }

    /* ---- live stats via DOM observation ---- */
    var state = { total: 0, prev: 0, moves: 0, you: 0, cpu: 0, firstHuman: true, started: false };

    function countTiles() {
        var ba = document.getElementById("board-area");
        if (!ba) return 0;
        return ba.querySelectorAll(".tile:not(.empty)").length;
    }

    function statusIsHuman() {
        var s = document.getElementById("status-label");
        var t = s ? s.textContent.toLowerCase() : "";
        if (t.indexOf("human") > -1 || t.indexOf("you") > -1) return true;
        if (t.indexOf("computer") > -1 || t.indexOf("thinking") > -1) return false;
        return null;
    }

    function setTurnText(txt, cpu) {
        if (!refs.turnText) return;
        refs.turnText.textContent = txt;
        if (refs.turn) refs.turn.classList.toggle("cpu", !!cpu);
    }

    function refreshTurn() {
        var s = document.getElementById("status-label");
        if (!s || !refs.turnText) return;
        var txt = s.textContent.trim();
        if (txt && txt.toLowerCase().indexOf("loading") < 0) {
            var human = statusIsHuman();
            setTurnText(txt, human === false);
        }
    }

    function logMove(human, n) {
        if (!refs.log) return;
        var item = el("div", "pg-log-item",
            '<span class="tag ' + (human ? "you" : "cpu") + '">' + (human ? "you" : "ai") + '</span>' +
            '<span>cleared ' + n + " block" + (n === 1 ? "" : "s") + '</span>' +
            '<span style="margin-left:auto;color:var(--pg-dim)">#' + state.moves + '</span>');
        refs.log.insertBefore(item, refs.log.firstChild);
        while (refs.log.children.length > 30) refs.log.removeChild(refs.log.lastChild);
    }

    function render() {
        if (!refs.you) return;
        var remaining = countTiles();
        refs.you.textContent = state.you;
        refs.cpu.textContent = state.cpu;
        refs.remain.textContent = remaining;
        refs.cleared.textContent = state.you + state.cpu;
        refs.moves.textContent = state.moves;
        var tot = Math.max(1, state.you + state.cpu);
        refs.mYou.style.width = (state.you / tot * 100) + "%";
        refs.mCpu.style.width = (state.cpu / tot * 100) + "%";
    }

    function onBoardChange() {
        var now = countTiles();
        if (now === state.prev) return;

        if (now > state.prev) {
            // board grew → a new game started
            state.total = now; state.prev = now; state.moves = 0; state.you = 0; state.cpu = 0;
            var h = statusIsHuman();
            state.firstHuman = (h === null ? true : h);
            state.started = true;
            if (refs.log) refs.log.innerHTML = "";
            render(); refreshTurn();
            return;
        }

        // board shrank → a move happened
        var delta = state.prev - now;
        state.prev = now;
        state.moves += 1;
        var moverHuman = (state.moves % 2 === 1) ? state.firstHuman : !state.firstHuman;
        if (moverHuman) state.you += delta; else state.cpu += delta;
        logMove(moverHuman, delta);
        render();
        // turn flips after the move resolves
        setTimeout(refreshTurn, 120);
    }

    /* ---- staggered "one by one" disappearance (human + AI) ----
       Assigned synchronously in the observer microtask (before paint) so the
       transition-delay actually applies to the just-added .removing tiles. */
    function staggerRemovals() {
        if (reduce) return;
        var ba = document.getElementById("board-area");
        if (!ba) return;
        var fresh = [].slice.call(ba.querySelectorAll(".tile.removing:not([data-pgd])"));
        if (!fresh.length) return;
        fresh.sort(function (a, b) {
            return (parseInt(a.style.top) || 0) - (parseInt(b.style.top) || 0) ||
                   (parseInt(a.style.left) || 0) - (parseInt(b.style.left) || 0);
        });
        var step = fresh.length > 6 ? 30 : 55;        // keep total within the engine's animation window
        fresh.forEach(function (t, i) {
            t.setAttribute("data-pgd", "1");
            t.style.setProperty("--pg-d", Math.min(i * step, 300) + "ms");
        });
    }

    function watchBoard() {
        // observe a STABLE container we control, not #board-area (the engine
        // replaces that node, which would silently detach the observer).
        var container = document.querySelector(".pg-stage") || document.getElementById("game-card");
        if (!container) return;

        var rafPending = false;
        function scheduleStats() {
            if (rafPending) return;
            rafPending = true;
            requestAnimationFrame(function () { rafPending = false; onBoardChange(); });
        }

        var mo = new MutationObserver(function (muts) {
            var sawAttr = false, sawChild = false;
            for (var i = 0; i < muts.length; i++) {
                if (muts[i].type === "attributes") sawAttr = true;
                else sawChild = true;
            }
            if (sawAttr) staggerRemovals();      // synchronous → before paint
            if (sawChild || sawAttr) scheduleStats();
        });
        mo.observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });

        // safety net: a light poll in case an engine mutates without us noticing
        setInterval(onBoardChange, 600);

        onBoardChange();
        var sl = document.getElementById("status-label");
        if (sl) new MutationObserver(refreshTurn).observe(sl, { childList: true, subtree: true, characterData: true });
        refreshTurn();
    }

    function injectQuitNav() {
        // Header: a clearly-labeled "quit" button, not just the small logo link.
        var nav = document.querySelector(".header-right nav");
        if (nav && !document.getElementById("pg-quit-header")) {
            var btn = el("a", "nav-button pg-quit-btn",
                '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:5px"><path d="M15 18l-6-6 6-6"/></svg>quit');
            btn.id = "pg-quit-header";
            btn.href = "../../index.html#games";
            btn.title = "Leave this game and return to the games list";
            nav.insertBefore(btn, nav.firstChild);
        }

        // Side panel: a persistent quit card, visible throughout play and after game over.
        var panel = document.getElementById("pg-panel");
        if (panel && !document.getElementById("pg-quit-panel")) {
            var card = el("div", "pg-card");
            card.innerHTML =
                '<a id="pg-quit-panel" class="pg-chip" href="../../index.html#games" style="display:block;text-align:center;text-decoration:none">' +
                    '&larr; back to games' +
                '</a>';
            panel.appendChild(card);
        }
    }

    function init() {
        try {
            alignTheme();
            injectBackground();
            var code = gameCode();
            if (buildPanel(code)) watchBoard();
            injectQuitNav();
        } catch (e) { /* never break the game */ if (window.console) console.warn("pg-shell:", e); }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
})();
