// ichess_report.js — report engine for the 7 iChess games (Rook, Bishop,
// Queen, King, Knight, Pawn, General). Move logic mirrors assets/js/ichess.js
// exactly (legalMoves()/PIECES) — copied rather than re-derived, since that
// file already ships correct, memoised Sprague-Grundy analysis for these
// exact rules. This file stays independent of assets/js/ichess.js itself
// (which boots a full board UI on load) so it can't affect the report page.
//
// A state here is a partition (the diagram, longest row first) plus the
// piece's current cell, written as: "6 5 4 3 2 @ 2,1"  (rows @ col,row).

function ichessInBoard(c, r, rows) { return r >= 0 && r < rows.length && c >= 0 && c < rows[r]; }

function ichessRookMoves(c, r, rows) {
    const m = [];
    for (let k = 1; ichessInBoard(c + k, r, rows); k++) m.push([c + k, r]);
    for (let k = 1; ichessInBoard(c, r + k, rows); k++) m.push([c, r + k]);
    return m;
}
function ichessBishopMoves(c, r, rows) {
    const m = [];
    for (let k = 1; ichessInBoard(c + k, r + k, rows); k++) m.push([c + k, r + k]);
    return m;
}
function ichessQueenMoves(c, r, rows) { return ichessRookMoves(c, r, rows).concat(ichessBishopMoves(c, r, rows)); }
function ichessStepMoves(c, r, rows, deltas) {
    const m = [];
    for (const [dc, dr] of deltas) if (ichessInBoard(c + dc, r + dr, rows)) m.push([c + dc, r + dr]);
    return m;
}
const ICHESS_KING_D = [[1, 0], [0, 1], [1, 1]];
const ICHESS_KNIGHT_D = [[1, 2], [2, 1]];
const ICHESS_PAWN_D = [[0, 1], [1, 1]];
function ichessKingMoves(c, r, rows) { return ichessStepMoves(c, r, rows, ICHESS_KING_D); }
function ichessKnightMoves(c, r, rows) { return ichessStepMoves(c, r, rows, ICHESS_KNIGHT_D); }
function ichessPawnMoves(c, r, rows) { return ichessStepMoves(c, r, rows, ICHESS_PAWN_D); }
function ichessGeneralMoves(c, r, rows) { return ichessKingMoves(c, r, rows).concat(ichessKnightMoves(c, r, rows)); }

const ICHESS_PIECES = {
    rook: { name: 'Rook', gen: ichessRookMoves },
    bishop: { name: 'Bishop', gen: ichessBishopMoves },
    queen: { name: 'Queen', gen: ichessQueenMoves },
    king: { name: 'King', gen: ichessKingMoves },
    knight: { name: 'Knight', gen: ichessKnightMoves },
    pawn: { name: 'Pawn', gen: ichessPawnMoves },
    general: { name: 'General', gen: ichessGeneralMoves },
};

function ichessLegalMoves(piece, c, r, rows) { return ICHESS_PIECES[piece].gen(c, r, rows); }

// One fresh, memoised solver per (piece, rows) — mirrors makeSolver() in ichess.js.
function ichessMakeSolver(piece, rows) {
    const gMemo = new Map(), mMemo = new Map(), upMemo = new Map(), depthMemo = new Map();
    const key = (c, r) => c + "," + r;

    function grundy(c, r) {
        const k = key(c, r);
        if (gMemo.has(k)) return gMemo.get(k);
        const seen = new Set();
        for (const [nc, nr] of ichessLegalMoves(piece, c, r, rows)) seen.add(grundy(nc, nr));
        let mex = 0; while (seen.has(mex)) mex++;
        gMemo.set(k, mex);
        return mex;
    }
    function misereWin(c, r) {
        const k = key(c, r);
        if (mMemo.has(k)) return mMemo.get(k);
        const moves = ichessLegalMoves(piece, c, r, rows);
        let res;
        if (moves.length === 0) res = true;
        else { res = false; for (const [nc, nr] of moves) if (!misereWin(nc, nr)) { res = true; break; } }
        mMemo.set(k, res);
        return res;
    }
    function uptimality(c, r) {
        const k = key(c, r);
        if (upMemo.has(k)) return upMemo.get(k);
        const moves = ichessLegalMoves(piece, c, r, rows);
        if (moves.length === 0) { upMemo.set(k, 0); return 0; }
        const g = grundy(c, r);
        let value;
        if (g > 0) {
            const winning = moves.map(([nc, nr]) => grundy(nc, nr) === 0 ? uptimality(nc, nr) : Infinity);
            value = 1 + Math.min(...winning);
        } else {
            value = 1 + Math.max(...moves.map(([nc, nr]) => uptimality(nc, nr)));
        }
        upMemo.set(k, value);
        return value;
    }
    function gameDepth(c, r) {
        const k = key(c, r);
        if (depthMemo.has(k)) return depthMemo.get(k);
        const moves = ichessLegalMoves(piece, c, r, rows);
        const value = 1 + (moves.length ? Math.max(...moves.map(([nc, nr]) => gameDepth(nc, nr))) : -1);
        depthMemo.set(k, value);
        return value;
    }
    function reversibleMoves(c, r) {
        const moves = ichessLegalMoves(piece, c, r, rows);
        let count = 0;
        for (const [nc, nr] of moves) {
            for (const [nc2, nr2] of ichessLegalMoves(piece, nc, nr, rows)) {
                if (nc2 === c && nr2 === r) { count++; break; }
            }
        }
        return count;
    }
    return { grundy, misereWin, uptimality, gameDepth, reversibleMoves, legal: (c, r) => ichessLegalMoves(piece, c, r, rows) };
}

function ichessParsePartition(str) {
    let r = str.trim().split(/\s+/).map(Number).filter(n => Number.isFinite(n) && n >= 1);
    r.sort((a, b) => b - a);
    return r;
}

function ichessParseState(stateStr) {
    const atIdx = stateStr.lastIndexOf('@');
    if (atIdx === -1) throw new Error(`Missing "@ col,row" position in "${stateStr}"`);
    const rowsPart = stateStr.slice(0, atIdx).trim();
    const posPart = stateStr.slice(atIdx + 1).trim();
    const rows = ichessParsePartition(rowsPart);
    if (rows.length === 0) throw new Error(`No valid row lengths in "${stateStr}"`);
    const m = /^(\d+)\s*,\s*(\d+)$/.exec(posPart);
    if (!m) throw new Error(`Invalid position "${posPart}" — expected "col,row" (e.g. 2,1)`);
    const c = parseInt(m[1], 10), r = parseInt(m[2], 10);
    if (!ichessInBoard(c, r, rows)) throw new Error(`Position (${c},${r}) is off the diagram [${rows.join(' ')}]`);
    return { rows, c, r };
}

function ichessCellLabel(c, r) { return String.fromCharCode(97 + c) + (r + 1); }

function ichessPerformAnalysis(piece, rows, c, r) {
    const solver = ichessMakeSolver(piece, rows);
    const g = solver.grundy(c, r);
    const moves = solver.legal(c, r);
    const optimalMoves = g === 0 ? "N/A (P-Position)"
        : (moves.filter(([nc, nr]) => solver.grundy(nc, nr) === 0).map(([nc, nr]) => `[${ichessCellLabel(nc, nr)}]`).join(' / ') || "No winning moves found.");
    return {
        gValue: g,
        pnStatus: g > 0 ? 'N-Position' : 'P-Position',
        uptimality: solver.uptimality(c, r),
        gameDepth: solver.gameDepth(c, r),
        reachableMoves: moves.length,
        reversibleMoves: solver.reversibleMoves(c, r),
        optimalMoves,
    };
}

function ichessCreateReportCard(stateStr, analysis) {
    const card = document.createElement('div');
    card.className = 'report-card';
    const pnClass = analysis.pnStatus === 'N-Position' ? 'n-position' : 'p-position';
    const valueLabel = analysis.valueLabel || 'Grundy Value (g)';
    let content = `
        <div class="report-header">
            <h3>[${stateStr}]</h3>
            <span class="p-n-status ${pnClass}">${analysis.pnStatus}</span>
        </div>
        <p><span class="label">${valueLabel}:</span> <span class="value">${analysis.gValue}</span></p>
    `;
    const addRow = (label, value) => {
        if (value !== undefined && value !== 'N/A') content += `<p><span class="label">${label}:</span> <span class="value">${value}</span></p>`;
    };
    addRow('Uptimality', analysis.uptimality);
    addRow('Max Game Depth', analysis.gameDepth);
    addRow('Reachable Moves', analysis.reachableMoves);
    addRow('Reversible Moves', analysis.reversibleMoves);
    if (analysis.optimalMoves !== undefined && analysis.optimalMoves !== 'N/A') {
        content += `
            <div class="optimal-moves-container">
                <span class="label">Optimal Moves (to g=0):</span>
                <div class="optimal-moves-list">${analysis.optimalMoves}</div>
            </div>
        `;
    }
    card.innerHTML = content;
    return card;
}

function ichessCreateErrorCard(stateStr, errorMessage) {
    const card = document.createElement('div');
    card.className = 'report-card';
    card.innerHTML = `
        <div class="report-header">
            <h3>[${stateStr}]</h3>
            <span class="p-n-status p-position">Error</span>
        </div>
        <p>Could not analyze this state.</p>
        <p><span class="label">Reason:</span> <span class="value">${errorMessage}</span></p>
    `;
    return card;
}

window.IChessReport = {
    parseInput(rawInput) {
        return rawInput.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    },
    render(container, inputText, mode, piece) {
        container.innerHTML = '';
        if (!ICHESS_PIECES[piece]) {
            container.innerHTML = '<p>Unknown iChess piece.</p>';
            return;
        }
        const states = this.parseInput(inputText);
        if (states.length === 0) {
            container.innerHTML = '<p>Please enter at least one valid game state (e.g. "6 5 4 3 2 @ 2,1").</p>';
            return;
        }
        states.forEach(stateStr => {
            try {
                const { rows, c, r } = ichessParseState(stateStr);
                let analysis;
                if (mode === 'misere') {
                    const solver = ichessMakeSolver(piece, rows);
                    const win = solver.misereWin(c, r);
                    const moves = solver.legal(c, r);
                    analysis = {
                        isMisere: true,
                        valueLabel: 'Misere Value',
                        gValue: win ? 1 : 0,
                        pnStatus: win ? 'N-Position' : 'P-Position',
                        reachableMoves: moves.length,
                        optimalMoves: (() => {
                            const winning = moves.filter(([nc, nr]) => !solver.misereWin(nc, nr)).map(([nc, nr]) => `[${ichessCellLabel(nc, nr)}]`);
                            return winning.join(' / ') || 'No winning moves found.';
                        })()
                    };
                } else {
                    analysis = { valueLabel: 'Grundy Value (g)', ...ichessPerformAnalysis(piece, rows, c, r) };
                }
                container.appendChild(ichessCreateReportCard(stateStr, analysis));
            } catch (error) {
                container.appendChild(ichessCreateErrorCard(stateStr, error.message));
            }
        });
    }
};
