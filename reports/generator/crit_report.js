// crit_report.js — report engine for CRIT.
// Board/move logic mirrors games/crit/crit_script.js: extends RIT with both
// row-shortening and column-shortening moves over a Young diagram.

const critGrundyMemo = new Map();
const critUptimalityMemo = new Map();
const critGameDepthMemo = new Map();
const critMisereMemo = new Map();

class CritBoard {
    constructor(rows) { this.rows = [...rows]; }
    isEmpty() { return this.rows.length === 0; }
    clone() { return new CritBoard(this.rows); }
    key() { return this.rows.join(","); }
    width() { return this.rows.length ? Math.max(...this.rows) : 0; }

    getColumnHeights() {
        const width = this.width();
        const colHeights = new Array(width).fill(0);
        for (let c = 0; c < width; c++) {
            for (let r = 0; r < this.rows.length; r++) {
                if (this.rows[r] > c) colHeights[c] = r + 1;
            }
        }
        return colHeights;
    }

    legalMoves() {
        const moves = [];
        const last = this.rows.length - 1;
        for (let r = 0; r <= last; r++) {
            const len = this.rows[r];
            const below = (r < last) ? this.rows[r + 1] : 0;
            if (r < last && len <= below) continue;
            const minKeep = (r === last) ? 0 : Math.max(below, 1);
            for (let newLen = minKeep; newLen <= len - 1; newLen++) moves.push({ type: 'row', r, newLen });
        }
        const colHeights = this.getColumnHeights();
        const width = this.width();
        for (let c = 0; c < width; c++) {
            const currentHeight = colHeights[c];
            if (currentHeight === 0) continue;
            const rightHeight = (c < width - 1) ? colHeights[c + 1] : 0;
            const minKeep = (c === width - 1) ? 0 : Math.max(rightHeight, 1);
            for (let newHeight = minKeep; newHeight <= currentHeight - 1; newHeight++) moves.push({ type: 'col', c, newHeight });
        }
        return moves;
    }

    applyMove(move) {
        const next = this.clone();
        if (move.type === 'row') {
            next.rows[move.r] = move.newLen;
            while (next.rows.length && next.rows[next.rows.length - 1] === 0) next.rows.pop();
        } else if (move.type === 'col') {
            const colHeights = next.getColumnHeights();
            const currentHeight = colHeights[move.c];
            const blocksToRemove = currentHeight - move.newHeight;
            for (let removeCount = 0; removeCount < blocksToRemove; removeCount++) {
                for (let r = next.rows.length - 1; r >= 0; r--) {
                    if (next.rows[r] > move.c) { next.rows[r] = move.c; break; }
                }
            }
            while (next.rows.length && next.rows[next.rows.length - 1] === 0) next.rows.pop();
            for (let r = next.rows.length - 2; r >= 0; r--) {
                if (next.rows[r] < next.rows[r + 1]) next.rows[r] = next.rows[r + 1];
            }
        }
        return next;
    }
}

function critGrundy(board) {
    const k = board.key();
    if (critGrundyMemo.has(k)) return critGrundyMemo.get(k);
    if (board.isEmpty()) { critGrundyMemo.set(k, 0); return 0; }
    const childVals = new Set(board.legalMoves().map(m => critGrundy(board.applyMove(m))));
    let g = 0;
    while (childVals.has(g)) g++;
    critGrundyMemo.set(k, g);
    return g;
}

function critUptimality(board) {
    const k = board.key();
    if (board.isEmpty()) return 0;
    if (critUptimalityMemo.has(k)) return critUptimalityMemo.get(k);
    const g = critGrundy(board);
    const moves = board.legalMoves();
    let value;
    if (g > 0) {
        const winning = moves.map(m => {
            const child = board.applyMove(m);
            return critGrundy(child) === 0 ? critUptimality(child) : Infinity;
        });
        value = 1 + Math.min(...winning);
    } else {
        const all = moves.map(m => critUptimality(board.applyMove(m)));
        value = 1 + (all.length > 0 ? Math.max(...all) : -1);
    }
    critUptimalityMemo.set(k, value);
    return value;
}

function critGameDepth(board) {
    const k = board.key();
    if (board.isEmpty()) return 0;
    if (critGameDepthMemo.has(k)) return critGameDepthMemo.get(k);
    const childDepths = board.legalMoves().map(m => critGameDepth(board.applyMove(m)));
    const value = 1 + (childDepths.length > 0 ? Math.max(...childDepths) : -1);
    critGameDepthMemo.set(k, value);
    return value;
}

function critReversibleMoves(board) {
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

function critMoveLabel(m) { return m.type === 'row' ? `Row ${m.r} → ${m.newLen}` : `Col ${m.c} → ${m.newHeight}`; }

function critOptimalMoves(board) {
    const g = critGrundy(board);
    if (g === 0) return "N/A (P-Position)";
    const moves = [];
    for (const m of board.legalMoves()) {
        if (critGrundy(board.applyMove(m)) === 0) moves.push(`[${critMoveLabel(m)}]`);
    }
    return moves.join(' / ') || "No winning moves found.";
}

function critMisere(board) {
    const k = board.key();
    if (board.isEmpty()) return 1;
    if (critMisereMemo.has(k)) return critMisereMemo.get(k);
    for (const m of board.legalMoves()) {
        if (critMisere(board.applyMove(m)) === 0) { critMisereMemo.set(k, 1); return 1; }
    }
    critMisereMemo.set(k, 0);
    return 0;
}

function critPerformAnalysis(partition) {
    const board = new CritBoard(partition);
    const g = critGrundy(board);
    return {
        gValue: g,
        pnStatus: g > 0 ? 'N-Position' : 'P-Position',
        uptimality: critUptimality(board),
        gameDepth: critGameDepth(board),
        reachableMoves: board.legalMoves().length,
        reversibleMoves: critReversibleMoves(board),
        optimalMoves: critOptimalMoves(board),
    };
}

function critCreateReportCard(stateStr, analysis) {
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

function critCreateErrorCard(stateStr, errorMessage) {
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

window.CritReport = {
    parseInput(rawInput) {
        return rawInput.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    },
    render(container, inputText, mode = 'normal') {
        container.innerHTML = '';
        critGrundyMemo.clear();
        critUptimalityMemo.clear();
        critGameDepthMemo.clear();
        critMisereMemo.clear();
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
                    const board = new CritBoard(partition);
                    const val = critMisere(board);
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
                                if (critMisere(board.applyMove(m)) === 0) winning.push(`[${critMoveLabel(m)}]`);
                            }
                            return winning.join(' / ') || 'No winning moves found.';
                        })()
                    };
                } else {
                    analysis = { valueLabel: 'Grundy Value (g)', ...critPerformAnalysis(partition) };
                }
                container.appendChild(critCreateReportCard(stateStr, analysis));
            } catch (error) {
                container.appendChild(critCreateErrorCard(stateStr, error.message));
            }
        });
    }
};
