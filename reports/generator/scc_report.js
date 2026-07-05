// scc_report.js — report engine for SICC (Strict Continuous Corner).
// Board/move logic mirrors games/scc/scc_script.js: a move removes a
// contiguous run of corner pieces that must include the topmost or
// bottommost corner in the current corner sequence.

const siccGrundyMemo = new Map();
const siccUptimalityMemo = new Map();
const siccGameDepthMemo = new Map();
const siccMisereMemo = new Map();

class SiccBoard {
    constructor(rows) { this.rows = [...rows]; }
    clone() { return new SiccBoard([...this.rows]); }
    isEmpty() { return this.rows.length === 0 || this.rows.every(row => row === 0); }
    asTuple() { return JSON.stringify(this.rows.filter(row => row > 0)); }

    getCornerPieces() {
        const corners = [];
        for (let r = 0; r < this.rows.length; r++) {
            if (this.rows[r] > 0) {
                const last = this.rows.length - 1;
                const below = (r < last) ? this.rows[r + 1] : 0;
                if (r === last || this.rows[r] > below) corners.push({ row: r, col: this.rows[r] - 1 });
            }
        }
        return corners;
    }
    getTopmostCorner() { const c = this.getCornerPieces(); return c.length ? c[0] : null; }
    getBottommostCorner() { const c = this.getCornerPieces(); return c.length ? c[c.length - 1] : null; }

    isValidMove(selectedPieces) {
        if (selectedPieces.length === 0) return false;
        const corners = this.getCornerPieces();
        const isCorner = (row, col) => corners.some(c => c.row === row && c.col === col);
        for (const p of selectedPieces) if (!isCorner(p.row, p.col)) return false;
        const topmost = corners[0], bottommost = corners[corners.length - 1];
        const hasTopmost = selectedPieces.some(p => topmost && p.row === topmost.row && p.col === topmost.col);
        const hasBottommost = selectedPieces.some(p => bottommost && p.row === bottommost.row && p.col === bottommost.col);
        if (!hasTopmost && !hasBottommost) return false;
        if (selectedPieces.length === 1) return true;
        return this.areConnected(selectedPieces, corners);
    }

    areConnected(selectedPieces, corners) {
        const indexMap = new Map();
        corners.forEach((corner, index) => indexMap.set(`${corner.row},${corner.col}`, index));
        const selectedIndices = selectedPieces
            .map(p => indexMap.get(`${p.row},${p.col}`))
            .filter(i => i !== undefined)
            .sort((a, b) => a - b);
        if (selectedIndices.length !== selectedPieces.length) return false;
        for (let i = 1; i < selectedIndices.length; i++) {
            if (selectedIndices[i] !== selectedIndices[i - 1] + 1) return false;
        }
        return true;
    }

    executeMove(selectedPieces) {
        for (const piece of selectedPieces) {
            if (piece.row < this.rows.length && piece.col < this.rows[piece.row]) this.rows[piece.row] = piece.col;
        }
        while (this.rows.length > 0 && this.rows[this.rows.length - 1] === 0) this.rows.pop();
    }

    generateConnectedMoves(moves, corners, startCorner) {
        const startIndex = corners.findIndex(c => c.row === startCorner.row && c.col === startCorner.col);
        if (startIndex === -1) return;
        for (let start = 0; start <= startIndex; start++) {
            for (let end = startIndex; end < corners.length; end++) {
                if (start === end) continue;
                const subsequence = corners.slice(start, end + 1);
                if (this.isValidMove(subsequence)) moves.push([...subsequence]);
            }
        }
    }

    getAllValidMoves() {
        const moves = [];
        const corners = this.getCornerPieces();
        for (const corner of corners) if (this.isValidMove([corner])) moves.push([corner]);
        const topmost = this.getTopmostCorner();
        if (topmost) this.generateConnectedMoves(moves, corners, topmost);
        const bottommost = this.getBottommostCorner();
        if (bottommost) this.generateConnectedMoves(moves, corners, bottommost);
        return moves;
    }
}

function siccMoveLabel(move) { return `[${move.map(p => `R${p.row}C${p.col}`).join(', ')}]`; }

function siccGrundy(position) {
    if (siccGrundyMemo.has(position)) return siccGrundyMemo.get(position);
    const board = new SiccBoard(JSON.parse(position));
    const moves = board.getAllValidMoves();
    if (moves.length === 0) { siccGrundyMemo.set(position, 0); return 0; }
    const childValues = new Set();
    for (const move of moves) {
        const child = board.clone();
        child.executeMove(move);
        childValues.add(siccGrundy(child.asTuple()));
    }
    let g = 0;
    while (childValues.has(g)) g++;
    siccGrundyMemo.set(position, g);
    return g;
}

function siccUptimality(position) {
    if (siccUptimalityMemo.has(position)) return siccUptimalityMemo.get(position);
    const g = siccGrundy(position);
    const board = new SiccBoard(JSON.parse(position));
    const moves = board.getAllValidMoves();
    let value;
    if (moves.length === 0) { siccUptimalityMemo.set(position, 0); return 0; }
    if (g > 0) {
        const winning = moves.map(move => {
            const child = board.clone();
            child.executeMove(move);
            const cp = child.asTuple();
            return siccGrundy(cp) === 0 ? siccUptimality(cp) : Infinity;
        });
        value = 1 + Math.min(...winning);
    } else {
        const all = moves.map(move => {
            const child = board.clone();
            child.executeMove(move);
            return siccUptimality(child.asTuple());
        });
        value = 1 + (all.length > 0 ? Math.max(...all) : -1);
    }
    siccUptimalityMemo.set(position, value);
    return value;
}

function siccGameDepth(position) {
    if (siccGameDepthMemo.has(position)) return siccGameDepthMemo.get(position);
    const board = new SiccBoard(JSON.parse(position));
    const childDepths = board.getAllValidMoves().map(move => {
        const child = board.clone();
        child.executeMove(move);
        return siccGameDepth(child.asTuple());
    });
    const value = 1 + (childDepths.length > 0 ? Math.max(...childDepths) : -1);
    siccGameDepthMemo.set(position, value);
    return value;
}

function siccReversibleMoves(board) {
    const originalTuple = board.asTuple();
    let count = 0;
    for (const move of board.getAllValidMoves()) {
        const child = board.clone();
        child.executeMove(move);
        for (const counter of child.getAllValidMoves()) {
            const grandchild = child.clone();
            grandchild.executeMove(counter);
            if (grandchild.asTuple() === originalTuple) { count++; break; }
        }
    }
    return count;
}

function siccOptimalMoves(board) {
    const g = siccGrundy(board.asTuple());
    if (g === 0) return "N/A (P-Position)";
    const moves = [];
    for (const move of board.getAllValidMoves()) {
        const child = board.clone();
        child.executeMove(move);
        if (siccGrundy(child.asTuple()) === 0) moves.push(siccMoveLabel(move));
    }
    return moves.join(' / ') || "No winning moves found.";
}

function siccMisere(position) {
    if (siccMisereMemo.has(position)) return siccMisereMemo.get(position);
    const board = new SiccBoard(JSON.parse(position));
    const moves = board.getAllValidMoves();
    if (moves.length === 0) { siccMisereMemo.set(position, 1); return 1; }
    for (const move of moves) {
        const child = board.clone();
        child.executeMove(move);
        if (siccMisere(child.asTuple()) === 0) { siccMisereMemo.set(position, 1); return 1; }
    }
    siccMisereMemo.set(position, 0);
    return 0;
}

function siccPerformAnalysis(partition) {
    const board = new SiccBoard(partition);
    const tuple = board.asTuple();
    const g = siccGrundy(tuple);
    return {
        gValue: g,
        pnStatus: g > 0 ? 'N-Position' : 'P-Position',
        uptimality: siccUptimality(tuple),
        gameDepth: siccGameDepth(tuple),
        reachableMoves: board.getAllValidMoves().length,
        reversibleMoves: siccReversibleMoves(board),
        optimalMoves: siccOptimalMoves(board),
    };
}

function siccCreateReportCard(stateStr, analysis) {
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

function siccCreateErrorCard(stateStr, errorMessage) {
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

window.SiccReport = {
    parseInput(rawInput) {
        return rawInput.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    },
    render(container, inputText, mode = 'normal') {
        container.innerHTML = '';
        siccGrundyMemo.clear();
        siccUptimalityMemo.clear();
        siccGameDepthMemo.clear();
        siccMisereMemo.clear();
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
                    const board = new SiccBoard(partition);
                    const tuple = board.asTuple();
                    const val = siccMisere(tuple);
                    const moves = board.getAllValidMoves();
                    analysis = {
                        isMisere: true,
                        valueLabel: 'Misere Value',
                        gValue: val,
                        pnStatus: val === 1 ? 'N-Position' : 'P-Position',
                        reachableMoves: moves.length,
                        optimalMoves: (() => {
                            const winning = [];
                            for (const move of moves) {
                                const child = board.clone();
                                child.executeMove(move);
                                if (siccMisere(child.asTuple()) === 0) winning.push(siccMoveLabel(move));
                            }
                            return winning.join(' / ') || 'No winning moves found.';
                        })()
                    };
                } else {
                    analysis = { valueLabel: 'Grundy Value (g)', ...siccPerformAnalysis(partition) };
                }
                container.appendChild(siccCreateReportCard(stateStr, analysis));
            } catch (error) {
                container.appendChild(siccCreateErrorCard(stateStr, error.message));
            }
        });
    }
};
