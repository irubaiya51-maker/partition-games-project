// sato_welter_report.js — report engine for Sato-Welter (the hook game).
// Board/move logic mirrors games/sato-welter/sato_welter_script.js: a move
// picks ANY filled cell (r,c) and removes its whole hook — everything to the
// right in row r, and everything below in column c — then the remaining
// cells compact back into a Young diagram.

const swGrundyMemo = new Map();
const swUptimalityMemo = new Map();
const swGameDepthMemo = new Map();
const swMisereMemo = new Map();

class SWBoard {
    constructor(rows) { this.rows = [...rows].filter(r => r > 0).sort((a, b) => b - a); }
    isEmpty() { return this.rows.length === 0; }
    asTuple() { return JSON.stringify(this.rows); }
    width() { return this.rows.length ? Math.max(...this.rows) : 0; }

    // Enumerate every filled cell (r,c) as a legal hook-removal move.
    squares() {
        const coords = [];
        for (let r = 0; r < this.rows.length; r++) {
            for (let c = 0; c < this.rows[r]; c++) coords.push({ r, c });
        }
        return coords;
    }

    removeHook(r, c) {
        const next = [...this.rows];
        next[r] = Math.min(next[r], c); // row r loses everything from column c onward
        for (let row = r + 1; row < next.length; row++) {
            if (next[row] > c) next[row] -= 1; // rows below lose only their single cell in column c
        }
        const compacted = next.filter(len => len > 0).sort((a, b) => b - a);
        return new SWBoard(compacted);
    }
}

function swGrundy(position) {
    if (position === '[]') return 0;
    if (swGrundyMemo.has(position)) return swGrundyMemo.get(position);
    const board = new SWBoard(JSON.parse(position));
    const moves = board.squares();
    if (moves.length === 0) { swGrundyMemo.set(position, 0); return 0; }
    const childValues = new Set();
    for (const { r, c } of moves) childValues.add(swGrundy(board.removeHook(r, c).asTuple()));
    let g = 0;
    while (childValues.has(g)) g++;
    swGrundyMemo.set(position, g);
    return g;
}

function swUptimality(position) {
    if (position === '[]') return 0;
    if (swUptimalityMemo.has(position)) return swUptimalityMemo.get(position);
    const g = swGrundy(position);
    const board = new SWBoard(JSON.parse(position));
    const moves = board.squares();
    let value;
    if (g > 0) {
        const winning = moves.map(({ r, c }) => {
            const cp = board.removeHook(r, c).asTuple();
            return swGrundy(cp) === 0 ? swUptimality(cp) : Infinity;
        });
        value = 1 + Math.min(...winning);
    } else {
        const all = moves.map(({ r, c }) => swUptimality(board.removeHook(r, c).asTuple()));
        value = 1 + (all.length > 0 ? Math.max(...all) : -1);
    }
    swUptimalityMemo.set(position, value);
    return value;
}

function swGameDepth(position) {
    if (position === '[]') return 0;
    if (swGameDepthMemo.has(position)) return swGameDepthMemo.get(position);
    const board = new SWBoard(JSON.parse(position));
    const childDepths = board.squares().map(({ r, c }) => swGameDepth(board.removeHook(r, c).asTuple()));
    const value = 1 + (childDepths.length > 0 ? Math.max(...childDepths) : -1);
    swGameDepthMemo.set(position, value);
    return value;
}

function swReversibleMoves(board) {
    const originalTuple = board.asTuple();
    let count = 0;
    for (const { r, c } of board.squares()) {
        const child = board.removeHook(r, c);
        for (const m2 of child.squares()) {
            if (child.removeHook(m2.r, m2.c).asTuple() === originalTuple) { count++; break; }
        }
    }
    return count;
}

function swOptimalMoves(board) {
    const g = swGrundy(board.asTuple());
    if (g === 0) return "N/A (P-Position)";
    const moves = [];
    for (const { r, c } of board.squares()) {
        if (swGrundy(board.removeHook(r, c).asTuple()) === 0) moves.push(`[R${r}C${c}]`);
    }
    return moves.join(' / ') || "No winning moves found.";
}

function swMisere(position) {
    if (position === '[]') return 1;
    if (swMisereMemo.has(position)) return swMisereMemo.get(position);
    const board = new SWBoard(JSON.parse(position));
    const moves = board.squares();
    if (moves.length === 0) { swMisereMemo.set(position, 1); return 1; }
    for (const { r, c } of moves) {
        if (swMisere(board.removeHook(r, c).asTuple()) === 0) { swMisereMemo.set(position, 1); return 1; }
    }
    swMisereMemo.set(position, 0);
    return 0;
}

function swPerformAnalysis(partition) {
    const board = new SWBoard(partition);
    const tuple = board.asTuple();
    const g = swGrundy(tuple);
    return {
        gValue: g,
        pnStatus: g > 0 ? 'N-Position' : 'P-Position',
        uptimality: swUptimality(tuple),
        gameDepth: swGameDepth(tuple),
        reachableMoves: board.squares().length,
        reversibleMoves: swReversibleMoves(board),
        optimalMoves: swOptimalMoves(board),
    };
}

function swCreateReportCard(stateStr, analysis) {
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

function swCreateErrorCard(stateStr, errorMessage) {
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

window.SatoWelterReport = {
    parseInput(rawInput) {
        return rawInput.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    },
    render(container, inputText, mode = 'normal') {
        container.innerHTML = '';
        swGrundyMemo.clear();
        swUptimalityMemo.clear();
        swGameDepthMemo.clear();
        swMisereMemo.clear();
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
                    const board = new SWBoard(partition);
                    const tuple = board.asTuple();
                    const val = swMisere(tuple);
                    const moves = board.squares();
                    analysis = {
                        isMisere: true,
                        valueLabel: 'Misere Value',
                        gValue: val,
                        pnStatus: val === 1 ? 'N-Position' : 'P-Position',
                        reachableMoves: moves.length,
                        optimalMoves: (() => {
                            const winning = [];
                            for (const { r, c } of moves) {
                                if (swMisere(board.removeHook(r, c).asTuple()) === 0) winning.push(`[R${r}C${c}]`);
                            }
                            return winning.join(' / ') || 'No winning moves found.';
                        })()
                    };
                } else {
                    analysis = { valueLabel: 'Grundy Value (g)', ...swPerformAnalysis(partition) };
                }
                container.appendChild(swCreateReportCard(stateStr, analysis));
            } catch (error) {
                container.appendChild(swCreateErrorCard(stateStr, error.message));
            }
        });
    }
};
