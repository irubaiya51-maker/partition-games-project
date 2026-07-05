// rit_report.js — report engine for RIT.
// Board/move logic mirrors games/rit/rit_script.js: a move shortens a
// selectable row (bottom row, or a row strictly longer than the one below it)
// to any length from the required minimum up to one less than its current length.

const ritGrundyMemo = new Map();
const ritUptimalityMemo = new Map();
const ritGameDepthMemo = new Map();
const ritMisereMemo = new Map();

class RitBoard {
    constructor(rows) { this.rows = [...rows]; }
    clone() { return new RitBoard(this.rows); }
    isEmpty() { return this.rows.length === 0; }
    key() { return JSON.stringify(this.rows); }
    legalMoves() {
        const moves = [];
        const last = this.rows.length - 1;
        for (let r = 0; r <= last; r++) {
            const len = this.rows[r];
            const below = (r < last) ? this.rows[r + 1] : 0;
            if (r < last && len <= below) continue;
            const minKeep = (r === last) ? 0 : Math.max(below, 1);
            for (let newLen = minKeep; newLen <= len - 1; newLen++) moves.push({ r, newLen });
        }
        return moves;
    }
    applyMove({ r, newLen }) {
        const next = this.clone();
        next.rows[r] = newLen;
        while (next.rows.length && next.rows[next.rows.length - 1] === 0) next.rows.pop();
        return next;
    }
}

function ritGrundy(board) {
    const k = board.key();
    if (ritGrundyMemo.has(k)) return ritGrundyMemo.get(k);
    if (board.isEmpty()) { ritGrundyMemo.set(k, 0); return 0; }
    const childVals = new Set(board.legalMoves().map(m => ritGrundy(board.applyMove(m))));
    let g = 0;
    while (childVals.has(g)) g++;
    ritGrundyMemo.set(k, g);
    return g;
}

function ritUptimality(board) {
    const k = board.key();
    if (board.isEmpty()) return 0;
    if (ritUptimalityMemo.has(k)) return ritUptimalityMemo.get(k);
    const g = ritGrundy(board);
    const moves = board.legalMoves();
    let value;
    if (g > 0) {
        const winning = moves.map(m => {
            const child = board.applyMove(m);
            return ritGrundy(child) === 0 ? ritUptimality(child) : Infinity;
        });
        value = 1 + Math.min(...winning);
    } else {
        const all = moves.map(m => ritUptimality(board.applyMove(m)));
        value = 1 + (all.length > 0 ? Math.max(...all) : -1);
    }
    ritUptimalityMemo.set(k, value);
    return value;
}

function ritGameDepth(board) {
    const k = board.key();
    if (board.isEmpty()) return 0;
    if (ritGameDepthMemo.has(k)) return ritGameDepthMemo.get(k);
    const childDepths = board.legalMoves().map(m => ritGameDepth(board.applyMove(m)));
    const value = 1 + (childDepths.length > 0 ? Math.max(...childDepths) : -1);
    ritGameDepthMemo.set(k, value);
    return value;
}

function ritReversibleMoves(board) {
    const originalKey = board.key();
    let count = 0;
    for (const move of board.legalMoves()) {
        const child = board.applyMove(move);
        for (const counter of child.legalMoves()) {
            if (child.applyMove(counter).key() === originalKey) { count++; break; }
        }
    }
    return count;
}

function ritOptimalMoves(board) {
    const g = ritGrundy(board);
    if (g === 0) return "N/A (P-Position)";
    const moves = [];
    for (const m of board.legalMoves()) {
        if (ritGrundy(board.applyMove(m)) === 0) moves.push(`[Row ${m.r} → ${m.newLen}]`);
    }
    return moves.join(' / ') || "No winning moves found.";
}

function ritMisere(board) {
    const k = board.key();
    if (board.isEmpty()) return 1;
    if (ritMisereMemo.has(k)) return ritMisereMemo.get(k);
    for (const m of board.legalMoves()) {
        if (ritMisere(board.applyMove(m)) === 0) { ritMisereMemo.set(k, 1); return 1; }
    }
    ritMisereMemo.set(k, 0);
    return 0;
}

function ritPerformAnalysis(partition) {
    const board = new RitBoard(partition);
    const g = ritGrundy(board);
    return {
        gValue: g,
        pnStatus: g > 0 ? 'N-Position' : 'P-Position',
        uptimality: ritUptimality(board),
        gameDepth: ritGameDepth(board),
        reachableMoves: board.legalMoves().length,
        reversibleMoves: ritReversibleMoves(board),
        optimalMoves: ritOptimalMoves(board),
    };
}

function ritCreateReportCard(stateStr, analysis) {
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

function ritCreateErrorCard(stateStr, errorMessage) {
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

window.RitReport = {
    parseInput(rawInput) {
        return rawInput.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    },
    render(container, inputText, mode = 'normal') {
        container.innerHTML = '';
        ritGrundyMemo.clear();
        ritUptimalityMemo.clear();
        ritGameDepthMemo.clear();
        ritMisereMemo.clear();
        const states = this.parseInput(inputText);
        if (states.length === 0) {
            container.innerHTML = '<p>Please enter at least one valid game state.</p>';
            return;
        }
        states.forEach(stateStr => {
            try {
                const partition = stateStr.split(/\s+/).map(Number);
                if (partition.some(isNaN)) throw new Error(`Invalid characters in state: "${stateStr}"`);
                let analysis;
                if (mode === 'misere') {
                    const board = new RitBoard(partition);
                    const val = ritMisere(board);
                    const moves = board.legalMoves();
                    analysis = {
                        isMisere: true,
                        valueLabel: 'Misere Value',
                        gValue: val,
                        pnStatus: val === 1 ? 'N-Position' : 'P-Position',
                        reachableMoves: moves.length,
                        optimalMoves: (() => {
                            const winning = [];
                            for (const m of moves) {
                                if (ritMisere(board.applyMove(m)) === 0) winning.push(`[Row ${m.r} → ${m.newLen}]`);
                            }
                            return winning.join(' / ') || 'No winning moves found.';
                        })()
                    };
                } else {
                    analysis = { valueLabel: 'Grundy Value (g)', ...ritPerformAnalysis(partition) };
                }
                container.appendChild(ritCreateReportCard(stateStr, analysis));
            } catch (error) {
                container.appendChild(ritCreateErrorCard(stateStr, error.message));
            }
        });
    }
};
