/* ============================================================
   PARTITION GAMES 3D · iChess — Impartial Chess games
   Single-piece combinatorial games (move away from the start
   corner, last move wins / misère = last move loses). Perfect
   play via Sprague–Grundy values computed by memoised
   recursion, so the AI is provably optimal for the defined
   move set.

   Reference: impartial chess / "iChess" (arXiv:2501.14640).
   Coordinates: (c, r), c=0 leftmost column, r=0 TOP row.
   The piece always begins at (0, 0) — the upper-left corner —
   and every move strictly increases a well-founded potential
   (column and/or row index), guaranteeing the game terminates
   at one of the diagram's "outer corners" (a cell with no
   legal move left).
   ============================================================ */
(function () {
    "use strict";

    /* ---------------- board = arbitrary partition (Young diagram) ----------------
       rows[r] = width of row r; rows non-increasing; rows[0] is the TOP row
       (widest, English notation: longest row at top, shortest at bottom). A
       cell (c, r) exists iff 0<=r<rows.length and 0<=c<rows[r]. The piece
       starts at (0,0), the upper-left corner, and a rectangle is just the
       special case rows = [n, n, …, n]. Sliding pieces stop at the first
       cell that is off the partition, so play is confined to the shape. */
    function inBoard(c, r, rows) { return r >= 0 && r < rows.length && c >= 0 && c < rows[r]; }

    function rookMoves(c, r, rows) {
        const m = [];
        for (let k = 1; inBoard(c + k, r, rows); k++) m.push([c + k, r]);   // right
        for (let k = 1; inBoard(c, r + k, rows); k++) m.push([c, r + k]);   // down
        return m;
    }
    function bishopMoves(c, r, rows) {
        const m = [];
        for (let k = 1; inBoard(c + k, r + k, rows); k++) m.push([c + k, r + k]); // down-right
        return m;
    }
    function queenMoves(c, r, rows) { return rookMoves(c, r, rows).concat(bishopMoves(c, r, rows)); }
    function stepMoves(c, r, rows, deltas) {
        const m = [];
        for (const [dc, dr] of deltas) if (inBoard(c + dc, r + dr, rows)) m.push([c + dc, r + dr]);
        return m;
    }
    const KING_D = [[1, 0], [0, 1], [1, 1]];
    // Corner-the-Knight: only deltas where both column and row are non-decreasing
    // (never backwards, never left) are legal.
    const KNIGHT_D = [[1, 2], [2, 1]];
    const PAWN_D = [[0, 1], [1, 1]];
    function kingMoves(c, r, rows) { return stepMoves(c, r, rows, KING_D); }
    function knightMoves(c, r, rows) { return stepMoves(c, r, rows, KNIGHT_D); }
    function pawnMoves(c, r, rows) { return stepMoves(c, r, rows, PAWN_D); }
    function generalMoves(c, r, rows) { return kingMoves(c, r, rows).concat(knightMoves(c, r, rows)); }

    const PIECES = {
        rook:    { name: "Rook",    glyph: "♜", family: "line", gen: rookMoves,
                   tagline: "Slides right or down from the corner.",
                   theory: "On a rectangle the Rook game is <strong>two-pile Nim</strong> with Grundy value <strong>column XOR row</strong>; on a partition the engine confines the slides to the Young diagram and recomputes Grundy values directly.",
                   win: "Move to a position with <strong>Grundy value 0</strong> (on a full board, column XOR row = 0)." },
        bishop:  { name: "Bishop",  glyph: "♝", family: "line", gen: bishopMoves,
                   tagline: "Slides down-right along its diagonal.",
                   theory: "A lone Bishop rides one diagonal — a <strong>single Nim heap</strong> of length min(column, row) on a rectangle. On a partition the diagonal stops at the edge of the diagram.",
                   win: "Force your opponent off the diagonal first — leave a <strong>Grundy-0</strong> position." },
        queen:   { name: "Queen",   glyph: "♛", family: "line", gen: queenMoves,
                   tagline: "Rook + Bishop moves away from the corner.",
                   theory: "On a rectangle the Queen game is exactly <strong>Wythoff’s game</strong> (golden-ratio losing positions). On a partition the engine computes Grundy values over the diagram’s cells.",
                   win: "Move to a <strong>Grundy-0</strong> position (a Wythoff P-position on a full board)." },
        king:    { name: "King",    glyph: "♚", family: "step", gen: kingMoves,
                   tagline: "One step right, down, or down-right.",
                   theory: "The King steps one cell away from the corner. On a rectangle the safe squares are where column and row are both even; on a partition the engine recomputes them by recursion.",
                   win: "Leave your opponent on a <strong>Grundy-0</strong> cell." },
        knight:  { name: "Knight",  glyph: "♞", family: "leap", gen: knightMoves,
                   tagline: "L-shaped leaps that march toward the corners.",
                   theory: "“Corner the Knight” — only the knight leaps where both column and row strictly increase are legal (and only onto cells of the partition), so the game is finite. No closed form, so the engine computes <strong>Grundy values by memoised recursion</strong>.",
                   win: "Hand your opponent a <strong>Grundy-0</strong> cell; analysis mode highlights the safe ones." },
        pawn:    { name: "Pawn",    glyph: "♟", family: "march", gen: pawnMoves,
                   tagline: "Marches down one rank (straight or diagonal).",
                   theory: "The Pawn always drops one rank — onto cells that exist in the partition — while the column drifts. The engine evaluates the tree with <strong>Grundy values</strong>.",
                   win: "Control the <strong>parity of the row</strong> while steering the column so your opponent runs out of cells first." },
        general: { name: "General", glyph: "✦", family: "leap", gen: generalMoves,
                   tagline: "A King that can also leap like a Knight.",
                   theory: "The General combines <strong>King and Knight</strong> moves — a richer game with no closed form, solved by <strong>memoised Grundy recursion</strong> over the partition.",
                   win: "Move to a <strong>Grundy-0</strong> position and keep returning your opponent to one." }
    };

    function legalMoves(piece, c, r, rows) { return PIECES[piece].gen(c, r, rows); }

    /* ---------------- Sprague–Grundy over the partition's cells ---------------- */
    function makeSolver(piece, rows) {
        const gMemo = new Map();   // normal-play Grundy value
        const mMemo = new Map();   // misère: does the player to move win?
        function key(c, r) { return c + "," + r; }

        function grundy(c, r) {
            const k = key(c, r);
            if (gMemo.has(k)) return gMemo.get(k);
            const seen = new Set();
            for (const [nc, nr] of legalMoves(piece, c, r, rows)) seen.add(grundy(nc, nr));
            let mex = 0; while (seen.has(mex)) mex++;
            gMemo.set(k, mex);
            return mex;
        }
        // misère: terminal (no move) is a WIN for the player to move (opponent made the last, losing, move)
        function misereWin(c, r) {
            const k = key(c, r);
            if (mMemo.has(k)) return mMemo.get(k);
            const moves = legalMoves(piece, c, r, rows);
            let res;
            if (moves.length === 0) res = true;
            else { res = false; for (const [nc, nr] of moves) if (!misereWin(nc, nr)) { res = true; break; } }
            mMemo.set(k, res);
            return res;
        }
        return { grundy, misereWin, legal: (c, r) => legalMoves(piece, c, r, rows) };
    }

    /* ---------------- AI: perfect play with a difficulty dial ---------------- */
    // returns { move:[c,r]|null, winning:boolean }
    function chooseMove(solver, c, r, mode, difficulty) {
        const moves = solver.legal(c, r);
        if (moves.length === 0) return { move: null, winning: false };
        const best = (mode === "misere")
            ? moves.filter(([nc, nr]) => !solver.misereWin(nc, nr))   // leave opponent losing
            : moves.filter(([nc, nr]) => solver.grundy(nc, nr) === 0); // leave opponent Grundy-0
        const winning = best.length > 0;
        const pool = winning ? best : moves;            // if losing, any move (stall)
        const playOptimal = (Math.random() * 100) <= difficulty;
        const pick = (playOptimal && winning) ? best[(Math.random() * best.length) | 0]
                                              : pool[(Math.random() * pool.length) | 0];
        return { move: pick, winning };
    }

    /* ---------------- partition helpers ---------------- */
    function parsePartition(str) {
        let r = (str || "").trim().split(/\s+/).map(Number)
            .filter(n => Number.isFinite(n) && n >= 1).map(n => Math.min(Math.round(n), 16));
        r.sort((a, b) => b - a);                       // a partition is non-increasing
        return r.length ? r.slice(0, 16) : [6, 5, 4, 3, 2];
    }
    function genPartition(type, n, cols) {
        if (type === "rectangle") {
            const rows = Math.max(1, Math.round(n || 6));
            const c = Math.max(1, Math.round(cols || 6));
            return Array(rows).fill(c);
        }
        if (type === "staircase") {
            const k0 = Math.max(1, Math.round(n || 6));
            const r = []; for (let k = k0; k >= 1; k--) r.push(k); return r;
        }
        // random: a genuine random partition of n total cells — unlimited rows,
        // each row at most as wide as the one above it.
        const total = Math.max(1, Math.round(n || 14));
        const r = []; let remaining = total, maxPart = total;
        while (remaining > 0) {
            const w = 1 + Math.floor(Math.random() * Math.min(remaining, maxPart));
            r.push(w); remaining -= w; maxPart = w;
        }
        return r;
    }
    function startCell(rows, mode) {
        // The piece always begins at the upper-left corner of the diagram.
        return [0, 0];
    }

    /* ---------------- node export (for the test harness) ---------------- */
    if (typeof module !== "undefined" && module.exports) {
        module.exports = { PIECES, legalMoves, makeSolver, chooseMove, inBoard, parsePartition, genPartition, startCell };
    }
    if (typeof document === "undefined") return;   // running under Node — no DOM below

    /* ================================================================
       BROWSER UI
       ================================================================ */
    const prefersReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

    function applyTheme() {
        const dark = (function () { try { return localStorage.getItem("theme") !== "light"; } catch (e) { return true; } })();
        if (dark) document.documentElement.setAttribute("data-theme", "dark");
        else document.documentElement.removeAttribute("data-theme");
        return dark;
    }

    const ICON = {
        right: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
        left: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:5px"><path d="M15 18l-6-6 6-6"/></svg>'
    };

    function buildChrome(piece) {
        applyTheme();
        ["pg-bg-grid", "pg-bg-aurora", "pg-bg-grain"].forEach(c => document.body.insertBefore(el("div", "pg-bg " + c), document.body.firstChild));

        const P = PIECES[piece];
        const header = el("header");
        header.innerHTML =
            '<div class="container"><div class="header-content">' +
              '<div class="header-left"><div class="logo-section">' +
                '<a href="../../index.html" class="logo">partition-games</a>' +
                '<span class="game-title"> /' + P.name + '</span>' +
              '</div></div>' +
              '<div class="header-center"><div class="game-title-section"><h1>' + P.name + '</h1></div>' +
                '<div class="status-container"><p id="status-label">your move</p></div></div>' +
              '<div class="header-right"><nav>' +
                '<a class="nav-button" href="../../wiki.html">wiki</a>' +
                '<button id="ic-help" class="nav-button">? help</button>' +
                '<button id="ic-analysis" class="nav-button" title="Toggle analysis">analysis</button>' +
                '<a id="ic-quit" class="nav-button" href="../../index.html#games" title="Leave this game and return to the games list">' +
                  ICON.left + ' quit</a>' +
                '<button id="theme-toggle" class="theme-toggle nav-button"></button>' +
              '</nav></div>' +
            '</div></div>';
        document.body.insertBefore(header, document.body.children[3] || null);

        const helpPop = el("div");
        helpPop.id = "ic-help-popover";
        helpPop.innerHTML = '<h3>how to play</h3><p>' + P.tagline + '</p><p>' + P.win + '</p>';
        document.body.appendChild(helpPop);
        const helpBtn = header.querySelector("#ic-help");
        const showHelp = () => helpPop.classList.add("visible");
        const hideHelp = () => helpPop.classList.remove("visible");
        helpBtn.addEventListener("mouseenter", showHelp);
        helpBtn.addEventListener("mouseleave", hideHelp);
        helpBtn.addEventListener("click", () => helpPop.classList.toggle("visible"));

        const themeBtn = header.querySelector("#theme-toggle");
        const setLabel = () => {
            const dark = document.documentElement.getAttribute("data-theme") === "dark";
            themeBtn.innerHTML = (dark ? "☀ " : "☾ ") + "[" + (dark ? "light" : "dark") + "]";
        };
        setLabel();
        themeBtn.addEventListener("click", () => {
            const dark = document.documentElement.getAttribute("data-theme") === "dark";
            if (dark) document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", "dark");
            try { localStorage.setItem("theme", dark ? "light" : "dark"); } catch (e) {}
            setLabel();
        });
        return header;
    }

    function start(piece) {
        if (!PIECES[piece]) piece = "rook";
        const P = PIECES[piece];
        buildChrome(piece);

        const root = document.getElementById("ichess-root") || (function () { const m = el("main"); const c = el("div", "container"); const r = el("div"); r.id = "ichess-root"; c.appendChild(r); m.appendChild(c); document.body.appendChild(m); return r; })();
        root.innerHTML =
            '<div class="ic-wrap">' +
              '<div class="ic-stage"><div id="ic-board" class="ic-board"></div></div>' +
              '<aside class="ic-panel">' +
                '<div class="pg-card ic-hero"><div class="ic-glyph">' + P.glyph + '</div>' +
                  '<div><div class="ic-piece-name">' + P.name + ' game</div><div class="ic-tagline">' + P.tagline + '</div></div></div>' +
                '<div class="pg-card"><div class="pg-card-title">match</div>' +
                  '<div class="ic-turn" id="ic-turn"><span class="pip"></span><span id="ic-turntext">—</span></div>' +
                  '<div class="ic-stat-row">' +
                    '<div class="ic-stat"><div class="v" id="ic-moves">0</div><div class="k">moves</div></div>' +
                    '<div class="ic-stat"><div class="v" id="ic-pos">—</div><div class="k">square</div></div>' +
                    '<div class="ic-stat"><div class="v" id="ic-status">—</div><div class="k">analysis</div></div>' +
                  '</div></div>' +
                '<div class="pg-card"><div class="pg-card-title">how to win</div><p class="pg-text">' + P.win + '</p>' +
                  '<div class="ic-log" id="ic-log"></div></div>' +
                '<div class="pg-card"><div class="pg-card-title">the mathematics</div><p class="pg-text">' + P.theory + '</p></div>' +
                '<button id="ic-new" class="modal-btn ic-new">new game</button>' +
              '</aside>' +
            '</div>' +
            setupModalHTML() + overModalHTML();

        const refs = {
            board: document.getElementById("ic-board"),
            turn: document.getElementById("ic-turn"), turnText: document.getElementById("ic-turntext"),
            moves: document.getElementById("ic-moves"), pos: document.getElementById("ic-pos"),
            status: document.getElementById("ic-status"), log: document.getElementById("ic-log"),
            statusLabel: document.getElementById("status-label"),
            setup: document.getElementById("ic-setup"), over: document.getElementById("ic-over"),
        };

        const state = { piece, rows: [6, 5, 4, 3, 2], c: 0, r: 0, mode: "normal", ai: "B", diff: 60,
                        turn: "A", moveCount: 0, solver: null, busy: false, analysis: false, over: false };

        /* ---- analysis toggle ---- */
        document.getElementById("ic-analysis").addEventListener("click", () => {
            state.analysis = !state.analysis;
            document.getElementById("ic-analysis").classList.toggle("on", state.analysis);
            render();
        });
        document.getElementById("ic-new").addEventListener("click", () => openSetup());
        refs.over.querySelector("#ic-again").addEventListener("click", () => openSetup());

        wireSetup(state, refs, begin);
        openSetup();

        function openSetup() { refs.over.classList.remove("visible"); refs.setup.classList.add("visible"); }

        function begin(cfg) {
            Object.assign(state, cfg);
            state.solver = makeSolver(state.piece, state.rows);
            state.moveCount = 0; state.over = false; state.busy = false;
            state.turn = "A";
            refs.setup.classList.remove("visible");
            refs.over.classList.remove("visible");
            refs.log.innerHTML = "";
            buildBoard();
            render();
            maybeAI();
        }

        /* ---- board (renders only the partition's cells) ---- */
        function buildBoard() {
            const b = refs.board;
            b.innerHTML = "";
            const rows = state.rows, H = rows.length, maxW = Math.max.apply(null, rows);
            b.style.setProperty("--w", maxW);
            b.style.setProperty("--h", H);
            for (let r = 0; r < H; r++) {              // r=0 (widest row) at the TOP
                for (let c = 0; c < maxW; c++) {
                    if (c >= rows[r]) { b.appendChild(el("div", "ic-sq empty")); continue; } // off the partition
                    const sq = el("div", "ic-sq " + (((c + r) % 2 === 0) ? "dark" : "light"));
                    sq.dataset.c = c; sq.dataset.r = r;
                    // an "outer corner" is any cell from which this piece has no
                    // legal move left — the game-ending cells for the current piece.
                    if (state.solver && state.solver.legal(c, r).length === 0) sq.classList.add("corner");
                    sq.addEventListener("click", () => onSquare(c, r));
                    b.appendChild(sq);
                }
            }
            placePiece();
        }
        function squareAt(c, r) { return refs.board.querySelector('.ic-sq[data-c="' + c + '"][data-r="' + r + '"]'); }
        function placePiece() {
            const old = refs.board.querySelector(".ic-piece");
            const sq = squareAt(state.c, state.r);
            if (!sq) return;
            if (old) {
                // animate by moving the existing node
                old.parentElement && old.parentElement.removeChild(old);
                sq.appendChild(old);
            } else {
                sq.appendChild(el("div", "ic-piece", PIECES[state.piece].glyph));
            }
        }

        function clearHints() { refs.board.querySelectorAll(".ic-sq.move,.ic-sq.win,.ic-sq.from").forEach(s => s.classList.remove("move", "win", "from")); }
        function showHints() {
            clearHints();
            if (state.over) return;
            const human = humanTurn();
            squareAt(state.c, state.r) && squareAt(state.c, state.r).classList.add("from");
            if (!human) return;
            const moves = state.solver.legal(state.c, state.r);
            for (const [c, r] of moves) {
                const sq = squareAt(c, r); if (!sq) continue;
                sq.classList.add("move");
                if (state.analysis) {
                    const good = state.mode === "misere" ? !state.solver.misereWin(c, r) : state.solver.grundy(c, r) === 0;
                    if (good) sq.classList.add("win");
                }
            }
        }

        function humanTurn() {
            if (state.ai === "None") return true;
            return state.turn !== state.ai;
        }

        function onSquare(c, r) {
            if (state.busy || state.over || !humanTurn()) return;
            const legal = state.solver.legal(state.c, state.r).some(m => m[0] === c && m[1] === r);
            if (!legal) return;
            doMove(c, r, "you");
        }

        function doMove(c, r, who) {
            state.busy = true;
            clearHints();
            playSound("move");
            state.c = c; state.r = r; state.moveCount++;
            placePiece();
            logMove(who, c, r);
            const finished = state.solver.legal(c, r).length === 0;
            const delay = prefersReduced ? 0 : 260;
            setTimeout(() => {
                if (finished) { endGame(who); return; }
                state.turn = (state.turn === "A") ? "B" : "A";
                state.busy = false;
                render();
                maybeAI();
            }, delay);
        }

        function maybeAI() {
            if (state.over || humanTurn()) { showHints(); return; }
            state.busy = true;
            refs.statusLabel.textContent = "thinking…";
            refs.turnText.textContent = "computer is thinking…";
            refs.turn.classList.add("cpu");
            const think = prefersReduced ? 60 : 520;
            setTimeout(() => {
                const { move } = chooseMove(state.solver, state.c, state.r, state.mode, state.diff);
                if (!move) { endGame("you"); return; }   // shouldn't happen (turn implies a move exists)
                doMove(move[0], move[1], "ai");
            }, think);
        }

        function endGame(mover) {
            state.over = true; state.busy = false;
            clearHints();
            refs.moves.textContent = state.moveCount;
            refs.pos.textContent = sqName(state.c, state.r);
            // normal: the player who moved into the terminal square WINS; misère: that player LOSES
            const moverWon = state.mode === "misere" ? false : true;
            const youAreMover = (mover === "you");
            const youWin = moverWon ? youAreMover : !youAreMover;
            playSound(youWin ? "win" : "lose");
            const title = (state.ai === "None")
                ? ((mover === "you") === moverWon ? "Player A wins" : "Player B wins")
                : (youWin ? "You win!" : "Computer wins");
            const msg = state.mode === "misere"
                ? "The piece is cornered — in misère the last mover loses."
                : "The piece is cornered — the last mover wins.";
            refs.over.querySelector("#ic-over-title").textContent = title;
            refs.over.querySelector("#ic-over-msg").textContent = msg;
            refs.over.classList.add("visible");
            refs.statusLabel.textContent = "game over";
            refs.turnText.textContent = title;
        }

        function logMove(who, c, r) {
            const item = el("div", "ic-log-item",
                '<span class="tag ' + (who === "you" ? "you" : "cpu") + '">' + (who === "you" ? "you" : "ai") + '</span>' +
                '<span>→ ' + sqName(c, r) + '</span><span style="margin-left:auto;color:var(--pg-dim)">#' + state.moveCount + '</span>');
            refs.log.insertBefore(item, refs.log.firstChild);
            while (refs.log.children.length > 30) refs.log.removeChild(refs.log.lastChild);
        }
        function sqName(c, r) { return String.fromCharCode(97 + c) + (r + 1); }

        function render() {
            refs.pos.textContent = sqName(state.c, state.r);
            refs.moves.textContent = state.moveCount;
            const human = humanTurn();
            refs.turn.classList.toggle("cpu", !human && state.ai !== "None");
            if (state.over) { /* handled in endGame */ }
            else if (state.ai === "None") { refs.turnText.textContent = "Player " + state.turn + " to move"; refs.statusLabel.textContent = "Player " + state.turn + " to move"; }
            else if (human) { refs.turnText.textContent = "your move"; refs.statusLabel.textContent = "your move"; }
            // analysis read-out
            if (state.analysis) {
                const g = state.solver.grundy(state.c, state.r);
                const winning = state.mode === "misere" ? state.solver.misereWin(state.c, state.r) : g !== 0;
                refs.status.textContent = state.mode === "misere" ? (winning ? "win" : "loss") : ("g=" + g);
                refs.status.style.color = winning ? "var(--pg-cyan)" : "var(--pg-orange)";
            } else { refs.status.textContent = "—"; refs.status.style.color = ""; }
            showHints();
        }
    }

    /* ---------------- setup / game-over modal markup + wiring ---------------- */
    function setupModalHTML() {
        return '<div id="ic-setup" class="modal-backdrop"><div class="modal">' +
            '<div class="modal-header"><h2>game setup</h2></div>' +
            '<p>The piece begins in the upper-left corner and moves right or down across the cells of a partition. The last legal move wins.</p>' +
            '<label>Partition — row lengths (longest first)</label>' +
            '<div class="input-group"><input type="text" id="ic-rows" value="6 5 4 3 2" placeholder="e.g. 6 5 4 3 2"></div>' +
            '<label>…or generate one</label>' +
            '<label>Shape</label>' +
            '<select id="ic-gentype">' +
              '<option value="staircase">staircase</option>' +
              '<option value="rectangle">rectangle</option>' +
              '<option value="random">random</option>' +
            '</select>' +
            '<div class="partition-dims" id="ic-partition-dims">' +
              '<div class="dim-box"><label id="ic-genn-label" for="ic-genn">partitions</label>' +
                '<input type="number" id="ic-genn" min="1" value="14"></div>' +
              '<div class="dim-box" id="ic-gencols-box" style="display:none"><label for="ic-gencols">columns</label>' +
                '<input type="number" id="ic-gencols" min="1" value="6"></div>' +
            '</div>' +
            '<button type="button" id="ic-genbtn" class="secondary-button">generate</button>' +
            '<label>Mode</label>' +
            '<div class="input-group"><select id="ic-mode"><option value="normal" selected>Normal (last move wins)</option>' +
              '<option value="misere">Misère (last move loses)</option></select></div>' +
            '<label>Computer player</label>' +
            '<div class="input-group"><select id="ic-ai"><option value="B" selected>Bob (you start)</option>' +
              '<option value="A">Alice (computer starts)</option><option value="None">Two players</option></select></div>' +
            '<label>AI difficulty: <span id="ic-difflabel">Hard (60)</span></label>' +
            '<input type="range" id="ic-diff" min="1" max="100" value="60" class="ic-range">' +
            '<button id="ic-start-btn" class="modal-btn">start game</button>' +
        '</div></div>';
    }
    function overModalHTML() {
        return '<div id="ic-over" class="modal-backdrop"><div class="modal">' +
            '<h2 id="ic-over-title">Game over</h2><p id="ic-over-msg"></p>' +
            '<button id="ic-again" class="modal-btn">play again</button>' +
            '<a href="../../index.html#games" class="secondary-button" style="display:block;text-align:center;margin-top:10px;text-decoration:none">&larr; back to games</a>' +
        '</div></div>';
    }
    function wireSetup(state, refs, begin) {
        const diff = document.getElementById("ic-diff"), lbl = document.getElementById("ic-difflabel");
        const name = v => v >= 85 ? "Perfect" : v >= 60 ? "Hard" : v >= 35 ? "Medium" : "Easy";
        diff.addEventListener("input", () => lbl.textContent = name(+diff.value) + " (" + diff.value + ")");
        const rowsInput = document.getElementById("ic-rows");
        const genType = document.getElementById("ic-gentype");
        const genNLabel = document.getElementById("ic-genn-label"), genColsBox = document.getElementById("ic-gencols-box");
        const GEN_LABELS = { staircase: "rows", rectangle: "rows", random: "partitions" };
        const updateGenUI = () => {
            const type = genType.value;
            genNLabel.textContent = GEN_LABELS[type] || "rows";
            genColsBox.style.display = type === "rectangle" ? "" : "none";
        };
        genType.addEventListener("change", updateGenUI);
        updateGenUI();
        document.getElementById("ic-genbtn").addEventListener("click", () => {
            const type = document.getElementById("ic-gentype").value;
            const n = +document.getElementById("ic-genn").value;
            const cols = +document.getElementById("ic-gencols").value;
            rowsInput.value = genPartition(type, n, cols).join(" ");
        });
        document.getElementById("ic-start-btn").addEventListener("click", () => {
            const rows = parsePartition(rowsInput.value);
            begin({
                rows, c: 0, r: 0,                       // always begin in the upper-left corner
                mode: document.getElementById("ic-mode").value,
                ai: document.getElementById("ic-ai").value,
                diff: +diff.value,
            });
        });
    }

    /* ---------------- tiny sound (optional, fails silently) ---------------- */
    let actx;
    function playSound(type) {
        if (prefersReduced) return;
        try {
            actx = actx || new (window.AudioContext || window.webkitAudioContext)();
            const o = actx.createOscillator(), g = actx.createGain();
            const f = type === "win" ? 660 : type === "lose" ? 180 : 320;
            o.frequency.value = f; o.type = "triangle";
            g.gain.value = 0.04; o.connect(g); g.connect(actx.destination);
            o.start(); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.18); o.stop(actx.currentTime + 0.2);
        } catch (e) {}
    }

    /* ---------------- boot ---------------- */
    function boot() { start((document.body && document.body.dataset.piece) || "rook"); }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
    window.IChess = { start, PIECES };
})();
