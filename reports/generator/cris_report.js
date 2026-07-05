// cris_report.js — report engine for CRIS.
// CRIS positions are a disjunctive SUM of independent rectangular fragments
// (games/cris/cris_script.js treats each fragment purely by its h×w bounding
// box for Grundy purposes — see gRect()/xorAllFragments()/isWinningMove()).
// A game state here is therefore a *list of h×w fragments*, not a single
// partition, so its input format is "HxW HxW ..." (one state per line),
// e.g. "3x4 2x2 1x5".

const crisRectMemo = new Map(); // key: "h,w"

function crisGRect(h, w) {
    if (h === 0 || w === 0) return 0;
    const key = `${h},${w}`;
    if (crisRectMemo.has(key)) return crisRectMemo.get(key);
    const seen = new Set();
    for (let r = 0; r < h; r++) seen.add(crisGRect(r, w) ^ crisGRect(h - 1 - r, w));
    for (let c = 0; c < w; c++) seen.add(crisGRect(h, c) ^ crisGRect(h, w - 1 - c));
    let g = 0;
    while (seen.has(g)) g++;
    crisRectMemo.set(key, g);
    return g;
}

function crisParseFragments(stateStr) {
    return stateStr.split(/\s+/).filter(Boolean).map(tok => {
        const m = /^(\d+)x(\d+)$/i.exec(tok.trim());
        if (!m) throw new Error(`Invalid fragment "${tok}" — expected "HxW" (e.g. 3x4)`);
        return { h: parseInt(m[1], 10), w: parseInt(m[2], 10) };
    });
}

function crisAnalyze(fragments) {
    const fragGs = fragments.map(f => crisGRect(f.h, f.w));
    let totalXor = 0;
    fragGs.forEach(g => { totalXor ^= g; });

    let reachableMoves = 0;
    fragments.forEach(f => { reachableMoves += f.h + f.w; });

    const optimalMoves = [];
    fragments.forEach((f, i) => {
        const otherXor = totalXor ^ fragGs[i];
        for (let idx = 0; idx < f.h; idx++) {
            const gAfter = crisGRect(idx, f.w) ^ crisGRect(f.h - 1 - idx, f.w);
            if ((otherXor ^ gAfter) === 0) optimalMoves.push(`[Fragment #${i + 1} (${f.h}x${f.w}): cut row ${idx}]`);
        }
        for (let idx = 0; idx < f.w; idx++) {
            const gAfter = crisGRect(f.h, idx) ^ crisGRect(f.h, f.w - 1 - idx);
            if ((otherXor ^ gAfter) === 0) optimalMoves.push(`[Fragment #${i + 1} (${f.h}x${f.w}): cut column ${idx}]`);
        }
    });

    return {
        gValue: totalXor,
        pnStatus: totalXor !== 0 ? 'N-Position' : 'P-Position',
        reachableMoves,
        optimalMoves: totalXor === 0 ? 'N/A (P-Position)' : (optimalMoves.join(' / ') || 'No winning moves found.'),
    };
}

function crisCreateReportCard(stateStr, analysis) {
    const card = document.createElement('div');
    card.className = 'report-card';
    const pnClass = analysis.pnStatus === 'N-Position' ? 'n-position' : 'p-position';
    const valueLabel = analysis.valueLabel || 'XOR of fragment Grundy values (g)';
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
    addRow('Reachable Moves', analysis.reachableMoves);
    if (analysis.optimalMoves !== undefined && analysis.optimalMoves !== 'N/A') {
        content += `
            <div class="optimal-moves-container">
                <span class="label">Optimal Moves (to XOR=0):</span>
                <div class="optimal-moves-list">${analysis.optimalMoves}</div>
            </div>
        `;
    }
    card.innerHTML = content;
    return card;
}

function crisCreateErrorCard(stateStr, errorMessage) {
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

window.CrisReport = {
    parseInput(rawInput) {
        return rawInput.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    },
    render(container, inputText /*, mode — CRIS has no misère variant */) {
        container.innerHTML = '';
        const states = this.parseInput(inputText);
        if (states.length === 0) {
            container.innerHTML = '<p>Please enter at least one valid game state (space-separated HxW fragments, e.g. "3x4 2x2").</p>';
            return;
        }
        states.forEach(stateStr => {
            try {
                const fragments = crisParseFragments(stateStr);
                const analysis = crisAnalyze(fragments);
                container.appendChild(crisCreateReportCard(stateStr, analysis));
            } catch (error) {
                container.appendChild(crisCreateErrorCard(stateStr, error.message));
            }
        });
    }
};
