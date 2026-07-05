// anticorners_report.js — report engine for the Anticorners game.
// Board/move logic mirrors games/anticorners/anticorners_script.js exactly
// (a move removes one "anticorner" hook: all cells (i,j) with i>=r, j>=c).

const anticornersGrundyMemo = new Map();
const anticornersUptimalityMemo = new Map();
const anticornersGameDepthMemo = new Map();
const anticornersMisereMemo = new Map();

class AnticornersBoard {
    constructor(rows) {
        this.rows = [...rows];
        this.initGrid();
    }
    initGrid() {
        if (this.rows.length === 0) { this.grid = []; return; }
        const height = this.rows.length;
        const width = Math.max(...this.rows);
        this.grid = [];
        for (let r = 0; r < height; r++) {
            this.grid[r] = [];
            for (let c = 0; c < width; c++) {
                this.grid[r][c] = (c < this.rows[r]) ? 1 : 0;
            }
        }
        this.updateAnticorners();
    }
    updateAnticorners() {
        for (let r = 0; r < this.grid.length; r++) {
            for (let c = 0; c < this.grid[r].length; c++) {
                if (this.grid[r][c] > 0) this.grid[r][c] = 1;
            }
        }
        const anticorners = this.findAnticorners();
        for (const [r, c] of anticorners) {
            if (r < this.grid.length && c < this.grid[r].length) this.grid[r][c] = 2;
        }
    }
    findAnticorners() {
        const partition = [];
        for (let r = 0; r < this.grid.length; r++) {
            let rowLength = 0;
            for (let c = 0; c < this.grid[r].length; c++) {
                if (this.grid[r][c] > 0) rowLength = c + 1;
            }
            if (rowLength > 0) partition.push(rowLength);
        }
        if (partition.length === 0) return [];
        const k = partition.length;
        const A = [];
        A.push([0, partition[0] - 1]);
        for (let i = 0; i < k - 1; i++) {
            if (partition[i + 1] < partition[i]) A.push([i, partition[i + 1] - 1]);
        }
        if (k > 1 || partition[0] > 1) A.push([k - 1, 0]);
        return A.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    }
    isEmpty() { return this.getTotalSum() === 0; }
    getTotalSum() {
        let sum = 0;
        for (let r = 0; r < this.grid.length; r++) for (let c = 0; c < this.grid[r].length; c++) sum += this.grid[r][c] > 0 ? 1 : 0;
        return sum;
    }
    removeHook(r, c) {
        for (let i = r; i < this.grid.length; i++) {
            for (let j = c; j < this.grid[i].length; j++) this.grid[i][j] = 0;
        }
        while (this.grid.length > 0) {
            const lastRow = this.grid[this.grid.length - 1];
            if (lastRow.every(cell => cell === 0)) this.grid.pop(); else break;
        }
        this.updateAnticorners();
    }
    getAnticorners() {
        const anticorners = [];
        for (let r = 0; r < this.grid.length; r++) {
            for (let c = 0; c < this.grid[r].length; c++) {
                if (this.grid[r][c] === 2) anticorners.push([r, c]);
            }
        }
        return anticorners;
    }
    hasMoves() { return this.getAnticorners().length > 0; }
    asTuple() { return JSON.stringify(this.grid); }
}

function boardFromGrid(grid) {
    const b = new AnticornersBoard([]);
    b.grid = grid.map(row => [...row]);
    b.updateAnticorners();
    return b;
}

function* allAnticornerMoves(board) {
    for (const [r, c] of board.getAnticorners()) yield [r, c];
}

function anticornersGrundy(position) {
    if (anticornersGrundyMemo.has(position)) return anticornersGrundyMemo.get(position);
    const board = boardFromGrid(JSON.parse(position));
    const anticorners = board.getAnticorners();
    if (anticorners.length === 0) { anticornersGrundyMemo.set(position, 0); return 0; }
    const childValues = new Set();
    for (const [r, c] of anticorners) {
        const child = boardFromGrid(board.grid);
        child.removeHook(r, c);
        childValues.add(anticornersGrundy(child.asTuple()));
    }
    let g = 0;
    while (childValues.has(g)) g++;
    anticornersGrundyMemo.set(position, g);
    return g;
}

function anticornersUptimality(position) {
    if (anticornersUptimalityMemo.has(position)) return anticornersUptimalityMemo.get(position);
    const g = anticornersGrundy(position);
    const board = boardFromGrid(JSON.parse(position));
    const moves = [...allAnticornerMoves(board)];
    let value;
    if (moves.length === 0) { anticornersUptimalityMemo.set(position, 0); return 0; }
    if (g > 0) {
        const winning = moves.map(([r, c]) => {
            const child = boardFromGrid(board.grid);
            child.removeHook(r, c);
            const cp = child.asTuple();
            return anticornersGrundy(cp) === 0 ? anticornersUptimality(cp) : Infinity;
        });
        value = 1 + Math.min(...winning);
    } else {
        const all = moves.map(([r, c]) => {
            const child = boardFromGrid(board.grid);
            child.removeHook(r, c);
            return anticornersUptimality(child.asTuple());
        });
        value = 1 + (all.length > 0 ? Math.max(...all) : -1);
    }
    anticornersUptimalityMemo.set(position, value);
    return value;
}

function anticornersGameDepth(position) {
    if (anticornersGameDepthMemo.has(position)) return anticornersGameDepthMemo.get(position);
    const board = boardFromGrid(JSON.parse(position));
    const moves = [...allAnticornerMoves(board)];
    const childDepths = moves.map(([r, c]) => {
        const child = boardFromGrid(board.grid);
        child.removeHook(r, c);
        return anticornersGameDepth(child.asTuple());
    });
    const value = 1 + (childDepths.length > 0 ? Math.max(...childDepths) : -1);
    anticornersGameDepthMemo.set(position, value);
    return value;
}

function anticornersReversibleMoves(board) {
    const originalTuple = board.asTuple();
    let count = 0;
    for (const [r, c] of allAnticornerMoves(board)) {
        const child = boardFromGrid(board.grid);
        child.removeHook(r, c);
        for (const [r2, c2] of allAnticornerMoves(child)) {
            const grandchild = boardFromGrid(child.grid);
            grandchild.removeHook(r2, c2);
            if (grandchild.asTuple() === originalTuple) { count++; break; }
        }
    }
    return count;
}

function anticornersOptimalMoves(board) {
    const g = anticornersGrundy(board.asTuple());
    if (g === 0) return "N/A (P-Position)";
    const moves = [];
    for (const [r, c] of allAnticornerMoves(board)) {
        const child = boardFromGrid(board.grid);
        child.removeHook(r, c);
        if (anticornersGrundy(child.asTuple()) === 0) moves.push(`[R${r}C${c}]`);
    }
    return moves.join(' / ') || "No winning moves found.";
}

function anticornersMisere(position) {
    if (anticornersMisereMemo.has(position)) return anticornersMisereMemo.get(position);
    const board = boardFromGrid(JSON.parse(position));
    const anticorners = board.getAnticorners();
    if (anticorners.length === 0) { anticornersMisereMemo.set(position, 1); return 1; }
    for (const [r, c] of anticorners) {
        const child = boardFromGrid(board.grid);
        child.removeHook(r, c);
        if (anticornersMisere(child.asTuple()) === 0) { anticornersMisereMemo.set(position, 1); return 1; }
    }
    anticornersMisereMemo.set(position, 0);
    return 0;
}

function anticornersPerformAnalysis(partition) {
    const board = new AnticornersBoard(partition);
    const tuple = board.asTuple();
    const g = anticornersGrundy(tuple);
    const moves = [...allAnticornerMoves(board)];
    return {
        gValue: g,
        pnStatus: g > 0 ? 'N-Position' : 'P-Position',
        uptimality: anticornersUptimality(tuple),
        gameDepth: anticornersGameDepth(tuple),
        reachableMoves: moves.length,
        reversibleMoves: anticornersReversibleMoves(board),
        optimalMoves: anticornersOptimalMoves(board),
    };
}

function anticornersCreateReportCard(stateStr, analysis) {
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

function anticornersCreateErrorCard(stateStr, errorMessage) {
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

window.AnticornersReport = {
    parseInput(rawInput) {
        return rawInput.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    },
    render(container, inputText, mode = 'normal') {
        container.innerHTML = '';
        anticornersGrundyMemo.clear();
        anticornersUptimalityMemo.clear();
        anticornersGameDepthMemo.clear();
        anticornersMisereMemo.clear();
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
                    const board = new AnticornersBoard(partition);
                    const tuple = board.asTuple();
                    const val = anticornersMisere(tuple);
                    const moves = [...allAnticornerMoves(board)];
                    analysis = {
                        isMisere: true,
                        valueLabel: 'Misere Value',
                        gValue: val,
                        pnStatus: val === 1 ? 'N-Position' : 'P-Position',
                        reachableMoves: moves.length,
                        optimalMoves: (() => {
                            const winning = [];
                            for (const [r, c] of moves) {
                                const child = boardFromGrid(board.grid);
                                child.removeHook(r, c);
                                if (anticornersMisere(child.asTuple()) === 0) winning.push(`[R${r}C${c}]`);
                            }
                            return winning.join(' / ') || 'No winning moves found.';
                        })()
                    };
                } else {
                    analysis = { valueLabel: 'Grundy Value (g)', ...anticornersPerformAnalysis(partition) };
                }
                container.appendChild(anticornersCreateReportCard(stateStr, analysis));
            } catch (error) {
                container.appendChild(anticornersCreateErrorCard(stateStr, error.message));
            }
        });
    }
};
