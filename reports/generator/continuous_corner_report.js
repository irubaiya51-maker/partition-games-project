// continuous_corner_report.js — report engine for Continuous Corner.
// Board/move logic mirrors games/continuous-corner/continuous_corner_script.js
// (like Corner, but only *consecutive* runs of selectable last-pieces are legal).

const ccGrundyMemo = new Map();
const ccUptimalityMemo = new Map();
const ccGameDepthMemo = new Map();
const ccMisereMemo = new Map();

class CCBoard {
    constructor(rows) { this.rows = [...rows].filter(r => r > 0).sort((a, b) => b - a); }
    isEmpty() { return this.rows.length === 0; }
    asTuple() { return JSON.stringify(this.rows); }
    makeCornerMoveWithSelection(selectedPieces) {
        if (this.isEmpty() || selectedPieces.length === 0) return;
        for (const piece of selectedPieces) {
            if (piece.row < this.rows.length && piece.col === this.rows[piece.row] - 1) {
                this.rows[piece.row]--;
            }
        }
        this.rows = this.rows.filter(r => r > 0);
    }
    getSelectableLastPieces() {
        if (this.isEmpty()) return [];
        const groups = [];
        let currentGroup = [0];
        for (let i = 1; i < this.rows.length; i++) {
            if (this.rows[i] === this.rows[i - 1]) currentGroup.push(i);
            else { groups.push(currentGroup); currentGroup = [i]; }
        }
        groups.push(currentGroup);
        const pieces = [];
        for (const group of groups) {
            const lastRowInGroup = group[group.length - 1];
            if (this.rows[lastRowInGroup] > 0) pieces.push({ row: lastRowInGroup, col: this.rows[lastRowInGroup] - 1 });
        }
        return pieces;
    }
}

// Only *consecutive* runs of selectable pieces are legal moves.
function* allCCMoves(board) {
    const selectable = board.getSelectableLastPieces();
    const n = selectable.length;
    for (let start = 0; start < n; start++) {
        for (let end = start; end < n; end++) {
            const move = [];
            for (let i = start; i <= end; i++) move.push(selectable[i]);
            yield move;
        }
    }
}

function ccGrundy(position) {
    if (position === '[]') return 0;
    if (ccGrundyMemo.has(position)) return ccGrundyMemo.get(position);
    const board = new CCBoard(JSON.parse(position));
    if (board.getSelectableLastPieces().length === 0) { ccGrundyMemo.set(position, 0); return 0; }
    const childValues = new Set();
    for (const move of allCCMoves(board)) {
        const child = new CCBoard([...board.rows]);
        child.makeCornerMoveWithSelection(move);
        childValues.add(ccGrundy(child.asTuple()));
    }
    let g = 0;
    while (childValues.has(g)) g++;
    ccGrundyMemo.set(position, g);
    return g;
}

function ccUptimality(position) {
    if (position === '[]') return 0;
    if (ccUptimalityMemo.has(position)) return ccUptimalityMemo.get(position);
    const g = ccGrundy(position);
    const board = new CCBoard(JSON.parse(position));
    const moves = [...allCCMoves(board)];
    let value;
    if (g > 0) {
        const winning = moves.map(move => {
            const child = new CCBoard([...board.rows]);
            child.makeCornerMoveWithSelection(move);
            const cp = child.asTuple();
            return ccGrundy(cp) === 0 ? ccUptimality(cp) : Infinity;
        });
        value = 1 + Math.min(...winning);
    } else {
        const all = moves.map(move => {
            const child = new CCBoard([...board.rows]);
            child.makeCornerMoveWithSelection(move);
            return ccUptimality(child.asTuple());
        });
        value = 1 + (all.length > 0 ? Math.max(...all) : -1);
    }
    ccUptimalityMemo.set(position, value);
    return value;
}

function ccGameDepth(position) {
    if (position === '[]') return 0;
    if (ccGameDepthMemo.has(position)) return ccGameDepthMemo.get(position);
    const board = new CCBoard(JSON.parse(position));
    const childDepths = [...allCCMoves(board)].map(move => {
        const child = new CCBoard([...board.rows]);
        child.makeCornerMoveWithSelection(move);
        return ccGameDepth(child.asTuple());
    });
    const value = 1 + (childDepths.length > 0 ? Math.max(...childDepths) : -1);
    ccGameDepthMemo.set(position, value);
    return value;
}

function ccReversibleMoves(board) {
    const originalTuple = board.asTuple();
    let count = 0;
    for (const move of allCCMoves(board)) {
        const child = new CCBoard([...board.rows]);
        child.makeCornerMoveWithSelection(move);
        for (const counterMove of allCCMoves(child)) {
            const grandchild = new CCBoard([...child.rows]);
            grandchild.makeCornerMoveWithSelection(counterMove);
            if (grandchild.asTuple() === originalTuple) { count++; break; }
        }
    }
    return count;
}

function ccOptimalMoves(board) {
    const g = ccGrundy(board.asTuple());
    if (g === 0) return "N/A (P-Position)";
    const moves = [];
    for (const move of allCCMoves(board)) {
        const child = new CCBoard([...board.rows]);
        child.makeCornerMoveWithSelection(move);
        if (ccGrundy(child.asTuple()) === 0) {
            moves.push(`[${move.map(p => `R${p.row}C${p.col}`).join(', ')}]`);
        }
    }
    return moves.join(' / ') || "No winning moves found.";
}

function ccMisere(position) {
    if (position === '[]') return 1;
    if (ccMisereMemo.has(position)) return ccMisereMemo.get(position);
    const board = new CCBoard(JSON.parse(position));
    if (board.getSelectableLastPieces().length === 0) { ccMisereMemo.set(position, 1); return 1; }
    for (const move of allCCMoves(board)) {
        const child = new CCBoard([...board.rows]);
        child.makeCornerMoveWithSelection(move);
        if (ccMisere(child.asTuple()) === 0) { ccMisereMemo.set(position, 1); return 1; }
    }
    ccMisereMemo.set(position, 0);
    return 0;
}

function ccPerformAnalysis(partition) {
    const board = new CCBoard(partition);
    const tuple = board.asTuple();
    const g = ccGrundy(tuple);
    return {
        gValue: g,
        pnStatus: g > 0 ? 'N-Position' : 'P-Position',
        uptimality: ccUptimality(tuple),
        gameDepth: ccGameDepth(tuple),
        reachableMoves: [...allCCMoves(board)].length,
        reversibleMoves: ccReversibleMoves(board),
        optimalMoves: ccOptimalMoves(board),
    };
}

function ccCreateReportCard(stateStr, analysis) {
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

function ccCreateErrorCard(stateStr, errorMessage) {
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

window.ContinuousCornerReport = {
    parseInput(rawInput) {
        return rawInput.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    },
    render(container, inputText, mode = 'normal') {
        container.innerHTML = '';
        ccGrundyMemo.clear();
        ccUptimalityMemo.clear();
        ccGameDepthMemo.clear();
        ccMisereMemo.clear();
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
                    const board = new CCBoard(partition);
                    const tuple = board.asTuple();
                    const val = ccMisere(tuple);
                    const moves = [...allCCMoves(board)];
                    analysis = {
                        isMisere: true,
                        valueLabel: 'Misere Value',
                        gValue: val,
                        pnStatus: val === 1 ? 'N-Position' : 'P-Position',
                        reachableMoves: moves.length,
                        optimalMoves: (() => {
                            const winning = [];
                            for (const move of moves) {
                                const child = new CCBoard([...board.rows]);
                                child.makeCornerMoveWithSelection(move);
                                if (ccMisere(child.asTuple()) === 0) winning.push(`[${move.map(p => `R${p.row}C${p.col}`).join(', ')}]`);
                            }
                            return winning.join(' / ') || 'No winning moves found.';
                        })()
                    };
                } else {
                    analysis = { valueLabel: 'Grundy Value (g)', ...ccPerformAnalysis(partition) };
                }
                container.appendChild(ccCreateReportCard(stateStr, analysis));
            } catch (error) {
                container.appendChild(ccCreateErrorCard(stateStr, error.message));
            }
        });
    }
};
