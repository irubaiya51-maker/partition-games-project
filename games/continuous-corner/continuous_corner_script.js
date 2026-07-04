// --- CORE GAME LOGIC FOR CONTINUOUS CORNER ---

// Continuous Corner Game: Like Corner, but players can only select consecutive corners

// Tile theme constants
const TILE_THEMES = ['grass', 'stone', 'ice'];
const TILE_THEME_NAMES = {
    'grass': '🌱',
    'stone': '🪨', 
    'ice': '🧊'
};

class Board {
    constructor(rows) { this.rows = [...rows]; }
    isEmpty() { return this.rows.length === 0 || this.rows.every(r => r === 0); }
    height() { return this.rows.length; }
    width() { return this.rows.length ? Math.max(...this.rows) : 0; }
    
    // Corner-specific move: remove last cell from appropriate rows
    makeCornerMove() {
        if (this.isEmpty()) return;
        
        // Group consecutive rows of same length
        const groups = [];
        let currentGroup = [0];
        
        for (let i = 1; i < this.rows.length; i++) {
            if (this.rows[i] === this.rows[i-1]) {
                currentGroup.push(i);
            } else {
                groups.push(currentGroup);
                currentGroup = [i];
            }
        }
        groups.push(currentGroup);
        
        // For each group, only remove from the last row in the group
        for (const group of groups) {
            const lastRowInGroup = group[group.length - 1];
            if (this.rows[lastRowInGroup] > 0) {
                this.rows[lastRowInGroup]--;
            }
        }
        
        // Remove any rows that are now 0
        this.rows = this.rows.filter(r => r > 0);
    }
    
    // New method: remove only selected pieces
    makeCornerMoveWithSelection(selectedPieces) {
        if (this.isEmpty() || selectedPieces.length === 0) return;
        
        // Remove selected pieces (which should be last pieces in their respective groups)
        for (const piece of selectedPieces) {
            if (piece.row < this.rows.length && piece.col < this.rows[piece.row]) {
                // Only remove if it's actually the last piece in the row
                if (piece.col === this.rows[piece.row] - 1) {
                    this.rows[piece.row]--;
                }
            }
        }
        
        // Remove any rows that are now 0
        this.rows = this.rows.filter(r => r > 0);
    }
    
    // Get all the "last pieces" that can be selected
    getSelectableLastPieces() {
        if (this.isEmpty()) return [];
        
        // Group consecutive rows of same length
        const groups = [];
        let currentGroup = [0];
        
        for (let i = 1; i < this.rows.length; i++) {
            if (this.rows[i] === this.rows[i-1]) {
                currentGroup.push(i);
            } else {
                groups.push(currentGroup);
                currentGroup = [i];
            }
        }
        groups.push(currentGroup);
        
        // For each group, the last row in the group has a selectable piece
        const selectablePieces = [];
        for (const group of groups) {
            const lastRowInGroup = group[group.length - 1];
            if (this.rows[lastRowInGroup] > 0) {
                selectablePieces.push({
                    row: lastRowInGroup,
                    col: this.rows[lastRowInGroup] - 1
                });
            }
        }
        
        return selectablePieces;
    }
    
    squares() {
        const coords = [];
        for (let r = 0; r < this.rows.length; r++) { 
            for (let c = 0; c < this.rows[r]; c++) coords.push({ r, c }); 
        }
        return coords;
    }
    asTuple() { return JSON.stringify(this.rows); }
}

/* ───────── Grundy numbers for Continuous Corner game ───────── */
/*
 * CONTINUOUS CORNER AI IMPLEMENTATION using proper Sprague-Grundy theory
 * 
 * This implements optimal play for the Continuous Corner game with consecutive piece selection.
 * 
 * Key difference from regular Corner: Only consecutive subsequences of selectable pieces are allowed.
 * 
 * Performance notes:
 * - Memoization keeps play instant on boards ~40 squares
 * - For larger boards, the consecutive restriction naturally reduces branching factor
 * 
 * Algorithm:
 * 1. allContinuousCornerMoves() enumerates all consecutive subsequences of selectable pieces
 * 2. grundy() calculates mex over all possible child positions  
 * 3. perfectMove() finds moves leading to grundy value 0 (winning)
 * 4. AI uses this for optimal play at Hard difficulty
 */
const grundyMemo = new Map();

// Generate all possible consecutive corner moves (consecutive subsequences of selectable pieces)
function* allContinuousCornerMoves(board) {
    const selectable = board.getSelectableLastPieces();
    const n = selectable.length;
    
    // Generate all consecutive subsequences
    for (let start = 0; start < n; start++) {
        for (let end = start; end < n; end++) {
            const move = [];
            for (let i = start; i <= end; i++) {
                move.push(selectable[i]);
            }
            yield move;
        }
    }
}

function grundy(position) {
    if (position === '[]') return 0;
    if (grundyMemo.has(position)) return grundyMemo.get(position);
    
    const posArray = JSON.parse(position);
    const board = new Board(posArray);
    
    // Check if there are any legal moves
    const selectablePieces = board.getSelectableLastPieces();
    if (selectablePieces.length === 0) {
        grundyMemo.set(position, 0);
        return 0;
    }
    
    const childValues = new Set();
    
    // Try all consecutive moves from this position
    for (const move of allContinuousCornerMoves(board)) {
        // Create a copy of the board to avoid modifying the original
        const child = new Board([...board.rows]);
        child.makeCornerMoveWithSelection(move);
        
        const childGrundy = grundy(child.asTuple());
        childValues.add(childGrundy);
    }
    
    // Calculate mex (minimum excluded value)
    let g = 0;
    while (childValues.has(g)) {
        g++;
    }
    
    grundyMemo.set(position, g);
    return g;
}

function perfectMove(position) {
    const posArray = JSON.parse(position);
    const board = new Board(posArray);
    
    // Check if there are any legal moves
    const selectablePieces = board.getSelectableLastPieces();
    if (selectablePieces.length === 0) {
        return null; // No moves available
    }
    
    // Try to find a winning move (one that leads to grundy value 0)
    for (const move of allContinuousCornerMoves(board)) {
        const child = new Board([...board.rows]);
        child.makeCornerMoveWithSelection(move);
        
        if (grundy(child.asTuple()) === 0) {
            return move; // This is a winning move
        }
    }
    
    // No winning move found, return any legal move (first one)
    for (const move of allContinuousCornerMoves(board)) {
        return move;
    }
    
    return null; // Should not reach here if there are selectable pieces
}

class Game {
    static PLAYERS = ["A", "B"];
    constructor(board, aiPlayer, difficulty) {
        this.board = board;
        this.currentIndex = 0;
        this.aiIndex = aiPlayer ? Game.PLAYERS.indexOf(aiPlayer) : null;
        this.difficulty = difficulty || "Medium";
        this.gameHistory = []; // For undo and replay functionality
    }
    get currentPlayer() { return Game.PLAYERS[this.currentIndex]; }
    isAiTurn() { return this.aiIndex === this.currentIndex; }
    switchPlayer() { this.currentIndex = 1 - this.currentIndex; }
    
    makeMove(selectedPieces = null) {
        if (selectedPieces && selectedPieces.length > 0) {
            this.board.makeCornerMoveWithSelection(selectedPieces);
        } else {
            this.board.makeCornerMove();
        }
        const finished = this.board.isEmpty();
        if (!finished) this.switchPlayer();
        return finished;
    }
}

// --- PARTITION UTILITIES ---
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPartition(n) {
    let parts = [];
    let remaining = n;
    let maxPart = n;
    
    while (remaining > 0) {
        let part = randomInt(1, Math.min(remaining, maxPart));
        parts.push(part);
        remaining -= part;
        maxPart = part;
    }
    
    return parts.sort((a, b) => b - a);
}

function staircase(n) {
    let parts = [];
    for (let t = n; t >= 1; t--) {
        parts.push(t);
    }
    return parts;
}

function rectangle(rows, cols) {
    let parts = [];
    for (let t = 0; t < rows; t++) {
        parts.push(cols);
    }
    return parts;
}

function hook(n) {
    let parts = [n];
    for (let t = 1; t < n; t++) {
        parts.push(1);
    }
    return parts;
}

// --- SOUND MANAGEMENT ---
class SoundManager {
    static play(soundType) {
        // Placeholder for sound effects
        // In a full implementation, you would load and play actual sound files
        console.log(`Playing sound: ${soundType}`);
    }
}

// --- GUI CLASS FOR CONTINUOUS CORNER ---
class ContinuousCornerGui {
    constructor() {
        this.game = null;
        this.isAnimating = false;
        // Database tracking
        this.movesSequence = [];
        this.gameStartTime = null;
        
        // DOM elements will be set in getDOMElements()
        this.gameCard = null;
        this.boardArea = null;
        this.statusLabel = null;
        this.aiThinkingIndicator = null;
        this.newGameBtn = null;
        this.setupModal = null;
        this.gameOverModal = null;
        this.helpPopover = null;
        this.themeToggle = null;
        this.cycleThemeBtn = null;
        this.currentTileThemeIndex = 0;
        
        // Board rendering constants
        this.CELL = 40; // Tile size in pixels (match anticorners)
        this.MARGIN = 20; // Board margin
        this.GAP = 1; // Gap between tiles, like in RIT
        this.currentCellSize = this.CELL; // For dynamic resizing
        
        // Setup UI elements
        this.rowsInput = null;
        this.partitionTypeSelect = null;
        this.partitionNumberInput = null;
        this.generatePartitionBtn = null;
        this.aiSelect = null;
        this.difficultySlider = null;
        this.difficultyLabel = null;
        this.startGameBtn = null;
        
        // Game over elements
        this.gameOverMessage = null;
        this.playAgainBtn = null;
        this.downloadBtn = null;
        
        // Selection elements
        this.selectionControls = null;
        this.confirmSelectionBtn = null;
        this.clearSelectionBtn = null;
        
        // Selection state
        this.selectedPieces = [];
        this.selectablePieces = [];
        this.isInSelectionMode = false;
        
        // Game history for undo/replay
        this.gameHistory = [];
        
        this.init();
    }

    init() {
        this.getDOMElements();
        this.bindEventListeners();
        this.initTheme();
        
        // Set initial status
        if (this.statusLabel) {
            this.statusLabel.textContent = 'ready to play';
        }
        
        this.showSetupModal();
    }

    getDOMElements() {
        this.gameCard = document.getElementById('game-card');
        this.boardArea = document.getElementById('board-area');
        this.statusLabel = document.getElementById('status-label');
        this.aiThinkingIndicator = document.getElementById('ai-thinking-indicator');
        this.newGameBtn = document.getElementById('new-game-btn');
        this.setupModal = document.getElementById('setup-modal-backdrop');
        this.gameOverModal = document.getElementById('game-over-modal-backdrop');
        this.helpPopover = document.getElementById('help-popover');
        this.cycleThemeBtn = document.getElementById('cycle-theme-btn');
        

        
        // Setup elements
        this.rowsInput = document.getElementById('rows-input');
        this.partitionTypeSelect = document.getElementById('partition-type-select');
        this.partitionNumberInput = document.getElementById('partition-number-input');
        this.partitionNumberLabel = document.getElementById('partition-number-label');
        this.partitionColsInput = document.getElementById('partition-cols-input');
        this.partitionColsBox = document.getElementById('partition-cols-box');
        this.generatePartitionBtn = document.getElementById('generate-partition-btn');
        this.aiSelect = document.getElementById('ai-select');
        this.difficultySlider = document.getElementById('difficulty-slider');
        this.difficultyLabel = document.getElementById('difficulty-label');
        this.startGameBtn = document.getElementById('start-game-btn');
        
        // Game over elements
        this.gameOverMessage = document.getElementById('game-over-message');
        this.playAgainBtn = document.getElementById('play-again-btn');
        this.downloadBtn = document.getElementById('download-btn-modal');
        
        // Selection elements
        this.selectionControls = document.getElementById('selection-controls');
        this.confirmSelectionBtn = document.getElementById('confirm-selection-btn');
        this.clearSelectionBtn = document.getElementById('clear-selection-btn');
    }

    bindEventListeners() {
        // Main game events
        if (this.newGameBtn) {
            this.newGameBtn.addEventListener('click', () => this.showSetupModal());
        }
        
        if (this.boardArea) {
            this.boardArea.addEventListener('click', (event) => this.handleMouseClick(event));
        }
        
        // Setup modal events
        if (this.generatePartitionBtn) {
            this.generatePartitionBtn.addEventListener('click', () => this.generatePartition());
        }
        if (this.partitionTypeSelect) {
            this.partitionTypeSelect.addEventListener('change', () => this.updatePartitionUI());
            this.updatePartitionUI();
        }
        
        if (this.startGameBtn) {
            this.startGameBtn.addEventListener('click', () => this.processSetup());
        }
        
        // Difficulty slider
        if (this.difficultySlider) {
            this.difficultySlider.addEventListener('input', () => this.updateDifficultyLabel());
        }
        
        // Game over modal events
        if (this.playAgainBtn) {
            this.playAgainBtn.addEventListener('click', () => this.showSetupModal());
        }
        
        if (this.downloadBtn) {
            this.downloadBtn.addEventListener('click', () => this.downloadGameHistory());
        }
        
        
        if (this.cycleThemeBtn) {
            this.cycleThemeBtn.addEventListener('click', () => this.cycleTileTheme());
            this.cycleThemeBtn.addEventListener('wheel', (e) => {
                e.preventDefault();
                this.cycleTileTheme();
            });
        }
        
        // Selection control events
        if (this.confirmSelectionBtn) {
            this.confirmSelectionBtn.addEventListener('click', () => this.confirmSelection());
        }
        
        if (this.clearSelectionBtn) {
            this.clearSelectionBtn.addEventListener('click', () => this.clearSelection());
        }
        
        // Help and modal events
        const helpBtn = document.getElementById('help-btn');
        const helpBtnModal = document.getElementById('help-btn-modal');
        
        if (helpBtn) {
            helpBtn.addEventListener('click', () => this.toggleHelp());
        }
        
        if (helpBtnModal) {
            helpBtnModal.addEventListener('click', () => this.toggleHelp());
        }
        
        // Global click handler for closing modals
        document.addEventListener('click', (e) => {
            const helpPopover = document.getElementById('help-popover');
            const helpBtn = document.getElementById('help-btn');
            const helpBtnModal = document.getElementById('help-btn-modal');
            
            if (helpPopover && (!helpBtn || !helpBtn.contains(e.target)) && 
                (!helpBtnModal || !helpBtnModal.contains(e.target)) && 
                !helpPopover.contains(e.target)) {
                helpPopover.classList.remove('visible');
            }
        });
    }

    initTheme() {
        // Defer to the global script for dark/light theme logic.
        // This check is similar to the one in anticorners_script.js.
        if (typeof updateThemeToggleButton === 'function') {
            updateThemeToggleButton();
        }
    
        // This part for the tile theme remains the same, as it's specific to this game.
        const savedTileTheme = localStorage.getItem('continuous-corner-tile-theme');
        if (savedTileTheme) {
            const themeIndex = TILE_THEMES.indexOf(savedTileTheme);
            if (themeIndex !== -1) {
                this.currentTileThemeIndex = themeIndex;
            }
        }
        this.updateTileThemeButton();
    }

    showSetupModal() {
        if (this.setupModal) {
            this.setupModal.classList.add('visible');
        }
        if (this.gameOverModal) {
            this.gameOverModal.classList.remove('visible');
        }
        this.updateDifficultyLabel();
    }

    hideSetupModal() {
        if (this.setupModal) {
            this.setupModal.classList.remove('visible');
        }
    }

    processSetup() {
        const rowsText = this.rowsInput ? this.rowsInput.value.trim() : '';
        const aiPlayer = this.aiSelect ? this.aiSelect.value : 'B';
        const difficultyValue = this.difficultySlider ? parseInt(this.difficultySlider.value) : 2;
        
        // Map numeric difficulty to text
        const difficultyMap = { 1: 'easy', 2: 'medium', 3: 'hard' };
        const difficulty = difficultyMap[difficultyValue] || 'medium';
        
        let rows;
        try {
            rows = rowsText.split(/\s+/).map(x => parseInt(x.trim())).filter(x => x > 0).sort((a, b) => b - a);
            if (rows.length === 0) throw new Error("No valid rows");
        } catch (e) {
            alert("Please enter valid row lengths (e.g., '5 4 4 2')");
            return;
        }
        
        this.startGame(rows, aiPlayer === 'None' ? null : aiPlayer, difficulty);
    }

    startGame(rows, aiPlayer, difficulty) {
        this.hideSetupModal();
        grundyMemo.clear(); // Reset memoization for new game
        
        const board = new Board(rows);
        this.game = new Game(board, aiPlayer, difficulty);
        this.gameHistory = [board.asTuple()]; // Save initial state
        
        // Initialize database tracking
        this.movesSequence = [];
        this.gameStartTime = new Date();
        this.initialPartition = [...rows]; // Store initial partition
        
        // Reset selection state
        this.exitSelectionMode();
        
        this.updateGameBoard();
        this.updateStatus();
        
        // Board area should not be clickable - tiles handle their own clicks
        if (this.boardArea) {
            this.boardArea.classList.remove('clickable');
        }
        
        if (this.game.isAiTurn()) {
            this.aiTurn();
        }
    }

    updateGameBoard() {
        if (!this.boardArea || !this.game) return;
        
        // Clear existing tiles
        this.boardArea.innerHTML = '';
        
        if (this.game.board.isEmpty()) {
            this.boardArea.innerHTML = '<p>game complete!</p>';
            if (this.boardArea) {
                this.boardArea.classList.remove('clickable');
            }
            return;
        }
        
        // Set up absolute positioning context
        this.boardArea.style.position = 'relative';
        

        const rows = this.game.board.rows;
        
        // --- START: New Centering and Gap Logic from RIT ---
        const boardDataWidth = this.game.board.width() * this.currentCellSize + (this.game.board.width() - 1) * this.GAP;  
        const boardDataHeight = this.game.board.height() * this.currentCellSize + (this.game.board.height() - 1) * this.GAP;  
        let boardWidth = this.MARGIN * 2 + boardDataWidth;
        let boardHeight = this.MARGIN * 2 + boardDataHeight;
        const minDimension = 480;
        boardWidth = Math.max(boardWidth, minDimension);
        boardHeight = Math.max(boardHeight, minDimension);
        
        // Calculate horizontal centering offset
        const actualContentWidth = this.MARGIN * 2 + boardDataWidth;
        const centerOffsetX = (boardWidth - actualContentWidth) / 2;

        const boardRows = this.game.board.rows;
        
        // Create tiles with absolute positioning, gaps, and centering
        for (let r = 0; r < boardRows.length; r++) {
            for (let c = 0; c < rows[r]; c++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                tile.id = `tile-${r}-${c}`;
                tile.dataset.row = r;
                tile.dataset.col = c;
                
                // Position absolutely
                tile.style.position = 'absolute';
                tile.style.width = `${this.currentCellSize}px`;
                tile.style.height = `${this.currentCellSize}px`;
                // Apply centering offset and gaps
                tile.style.left = `${centerOffsetX + this.MARGIN + c * (this.currentCellSize + this.GAP)}px`;
                tile.style.top = `${this.MARGIN + r * (this.currentCellSize + this.GAP)}px`;
                
                // Apply tile theme
                const currentTheme = TILE_THEMES[this.currentTileThemeIndex];
                tile.setAttribute('data-tile-theme', currentTheme);
                
                this.boardArea.appendChild(tile);
            }
        }
        
        // Set board area size
        this.boardArea.style.width = `${boardWidth}px`;
        this.boardArea.style.height = `${boardHeight}px`;
        // --- END: New Centering and Gap Logic from RIT ---
        
        this.updateSelectionDisplay();
    }

    updateStatus() {
        if (!this.statusLabel || !this.game) return;
        
        if (this.game.board.isEmpty()) {
            // Game is over, winner is the player who just made the last move
            const winner = this.game.currentPlayer;
            this.statusLabel.textContent = `Game Over - Player ${winner} wins!`;
            if (this.gameOverMessage) {
                this.gameOverMessage.textContent = `Player ${winner} wins!`;
            }
            if (this.gameOverModal) {
                this.gameOverModal.classList.add('visible');
            }
            return;
        }
        
        const currentPlayer = this.game.currentPlayer;
        
        if (this.game.isAiTurn()) {
            this.statusLabel.textContent = `Computer (Player ${currentPlayer}) is thinking...`;
        } else {
            if (this.isInSelectionMode) {
                this.statusLabel.textContent = `Player ${currentPlayer}: Select consecutive corners to remove`;
            } else {
                this.statusLabel.textContent = `Player ${currentPlayer}: Click to select corners`;
            }
        }
    }

    handleMouseClick(event) {
        if (this.isAnimating || !this.game || this.game.isAiTurn() || this.game.board.isEmpty()) return;
        
        const tile = event.target.closest('.tile');
        if (!tile) return;
        
        // If not in selection mode, enter it first
        if (!this.isInSelectionMode) {
            this.enterSelectionMode();
        }
        
        // Now, handle the tile click for selection logic
        const row = parseInt(tile.dataset.row);
        const col = parseInt(tile.dataset.col);
        this.handleTileClick(row, col);
    }

    handleTileClick(row, col) {
        // Check if this tile is selectable
        const isSelectable = this.selectablePieces.some(p => p.row === row && p.col === col);
        if (!isSelectable) return;
        
        const pieceIndex = this.selectablePieces.findIndex(p => p.row === row && p.col === col);
        
        // For continuous corner, we need to maintain consecutive selection
        if (this.selectedPieces.length === 0) {
            // First selection
            this.selectedPieces.push({ row, col, index: pieceIndex });
        } else {
            // Check if this extends the consecutive selection
            const selectedIndices = this.selectedPieces.map(p => p.index).sort((a, b) => a - b);
            const minIndex = Math.min(...selectedIndices);
            const maxIndex = Math.max(...selectedIndices);
            
            if (pieceIndex === minIndex - 1) {
                // Extend selection to the left
                this.selectedPieces.push({ row, col, index: pieceIndex });
            } else if (pieceIndex === maxIndex + 1) {
                // Extend selection to the right
                this.selectedPieces.push({ row, col, index: pieceIndex });
            } else if (selectedIndices.includes(pieceIndex)) {
                // Deselect this piece (only if it's at the end of the range)
                if (pieceIndex === minIndex || pieceIndex === maxIndex) {
                    this.selectedPieces = this.selectedPieces.filter(p => p.index !== pieceIndex);
                }
            }
            // Otherwise, ignore the click (non-consecutive)
        }
        
        this.updateSelectionDisplay();
        this.updateSelectionButtons();
    }

    enterSelectionMode() {
        this.isInSelectionMode = true;
        this.selectablePieces = this.game.board.getSelectableLastPieces().map((piece, index) => ({
            ...piece,
            index
        }));
        this.selectedPieces = [];
        
        if (this.selectionControls) {
            this.selectionControls.style.display = 'flex';
        }
        
        this.updateSelectionDisplay();
        this.updateSelectionButtons();
        this.updateStatus();
    }

    exitSelectionMode() {
        this.isInSelectionMode = false;
        this.selectedPieces = [];
        this.selectablePieces = [];
        
        if (this.selectionControls) {
            this.selectionControls.style.display = 'none';
        }
        
        this.clearSelectionDisplay();
        this.updateStatus();
    }

    updateSelectionDisplay() {
        // Clear all selection classes
        this.clearSelectionDisplay();
        
        if (!this.isInSelectionMode) {
            // When not in selection mode, make all selectable pieces clickable
            const selectablePieces = this.game.board.getSelectableLastPieces();
            for (const piece of selectablePieces) {
                const tile = document.getElementById(`tile-${piece.row}-${piece.col}`);
                if (tile) {
                    tile.classList.add('selectable');
                }
            }
            return;
        }
        
        // Add selectable class to all selectable pieces
        for (const piece of this.selectablePieces) {
            const tile = document.getElementById(`tile-${piece.row}-${piece.col}`);
            if (tile) {
                tile.classList.add('selectable');
            }
        }
        
        // Add selected class to selected pieces
        for (const piece of this.selectedPieces) {
            const tile = document.getElementById(`tile-${piece.row}-${piece.col}`);
            if (tile) {
                tile.classList.add('selected');
            }
        }
    }

    clearSelectionDisplay() {
        const tiles = document.querySelectorAll('.tile');
        tiles.forEach(tile => {
            tile.classList.remove('selectable', 'selected');
        });
    }

    updateSelectionButtons() {
        if (this.confirmSelectionBtn) {
            this.confirmSelectionBtn.disabled = this.selectedPieces.length === 0;
        }
    }

    confirmSelection() {
        if (this.selectedPieces.length === 0) return;
        
        const pieces = this.selectedPieces.map(p => ({ row: p.row, col: p.col }));
        this.executeWithAnimation(pieces);
    }

    clearSelection() {
        this.selectedPieces = [];
        this.updateSelectionDisplay();
        this.updateSelectionButtons();
    }

    executeWithAnimation(selectedPieces = null) {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        this.exitSelectionMode();
        
        // Save current state for history
        this.gameHistory.push(this.game.board.asTuple());
        
        SoundManager.play('remove');
        
        // Determine which pieces to animate
        let piecesToAnimate = [];
        if (selectedPieces && selectedPieces.length > 0) {
            piecesToAnimate = selectedPieces;
        } else {
            // Fallback to all selectable pieces
            piecesToAnimate = this.game.board.getSelectableLastPieces();
        }
        
        // Add removing class to tiles that will be removed
        for (const piece of piecesToAnimate) {
            const tile = document.getElementById(`tile-${piece.row}-${piece.col}`);
            if (tile) {
                tile.classList.add('removing');
            }
        }
        
        setTimeout(() => {
            this.finishMove(selectedPieces);
        }, 350);
    }

    finishMove(selectedPieces = null) {
        // Track the move
        if (selectedPieces && selectedPieces.length > 0) {
            const moveStr = selectedPieces.map(p => `R${p.row}C${p.col}`).join(',');
            this.movesSequence.push(moveStr);
        }
        
        const gameOver = this.game.makeMove(selectedPieces);
        this.isAnimating = false;
        
        this.updateGameBoard();
        this.updateStatus();
        
        if (gameOver) {
            // Add final empty state to history
            this.gameHistory.push('[]');
            SoundManager.play('win');
            const winner = this.game.currentPlayer; // Current player is the winner when game is over
            this.storeGameInDatabase(winner);
            
            if (this.gameOverMessage) {
                this.gameOverMessage.textContent = `Player ${winner} wins!`;
            }
            if (this.gameOverModal) {
                this.gameOverModal.classList.add('visible');
            }
        } else if (this.game.isAiTurn()) {
            this.aiTurn();
        }
    }

    aiTurn() {
        if (!this.game || !this.game.isAiTurn() || this.game.board.isEmpty()) return;
        
        if (this.aiThinkingIndicator) {
            this.aiThinkingIndicator.classList.add('thinking');
        }
        
        setTimeout(() => {
            try {
                let selectedPieces;
                
                // AI difficulty implementation
                if (this.game.difficulty === 'Easy') {
                    // Easy: Random consecutive selection
                    const selectable = this.game.board.getSelectableLastPieces();
                    if (selectable.length > 0) {
                        const start = randomInt(0, selectable.length - 1);
                        const end = randomInt(start, selectable.length - 1);
                        selectedPieces = selectable.slice(start, end + 1);
                        console.log('AI (Easy) chose random consecutive move:', selectedPieces);
                    }
                } else if (this.game.difficulty === 'Medium') {
                    // Medium: 70% optimal, 30% random
                    if (Math.random() < 0.7) {
                        selectedPieces = perfectMove(this.game.board.asTuple());
                        console.log('AI (Medium) chose optimal move:', selectedPieces);
                    } else {
                        // Random consecutive move
                        const selectable = this.game.board.getSelectableLastPieces();
                        if (selectable.length > 0) {
                            const start = randomInt(0, selectable.length - 1);
                            const end = randomInt(start, selectable.length - 1);
                            selectedPieces = selectable.slice(start, end + 1);
                            console.log('AI (Medium) chose random move:', selectedPieces);
                        }
                    }
                } else {
                    // Hard: Always optimal
                    selectedPieces = perfectMove(this.game.board.asTuple());
                    console.log('AI (Hard) chose optimal move:', selectedPieces);
                }
                
                if (this.aiThinkingIndicator) {
                    this.aiThinkingIndicator.classList.remove('thinking');
                }
                
                if (selectedPieces && selectedPieces.length > 0) {
                    this.executeWithAnimation(selectedPieces);
                } else {
                    // Fallback to default move
                    console.log('AI fallback to default move');
                    this.executeWithAnimation();
                }
            } catch (error) {
                console.error('AI move error:', error);
                if (this.aiThinkingIndicator) {
                    this.aiThinkingIndicator.classList.remove('thinking');
                }
                // Fallback to default move
                this.executeWithAnimation();
            }
        }, 1000);
    }

    updatePartitionUI() {
        const type = this.partitionTypeSelect.value;
        const isRect = type === 'rectangle';
        if (this.partitionColsBox) this.partitionColsBox.style.display = isRect ? '' : 'none';
        if (this.partitionNumberLabel) {
            this.partitionNumberLabel.textContent = type === 'random' ? 'partitions' : isRect ? 'rows' : type === 'staircase' ? 'rows' : 'size';
        }
    }

    generatePartition() {
        const type = this.partitionTypeSelect ? this.partitionTypeSelect.value : 'random';
        const number = this.partitionNumberInput ? parseInt(this.partitionNumberInput.value) : 25;

        if (isNaN(number) || number <= 0) {
            alert("Please enter a valid positive number");
            return;
        }

        let partition;
        switch (type) {
            case 'staircase':
                partition = staircase(number);
                break;
            case 'rectangle': {
                const cols = parseInt(this.partitionColsInput.value, 10);
                if (isNaN(cols) || cols <= 0) {
                    alert("Please enter a valid positive number of columns");
                    return;
                }
                partition = rectangle(number, cols);
                break;
            }
            case 'hook':
                partition = hook(number);
                break;
            default:
                partition = randomPartition(number);
        }

        if (this.rowsInput) {
            this.rowsInput.value = partition.join(' ');
        }

        SoundManager.play('click');
    }

    updateDifficultyLabel() {
        if (!this.difficultySlider || !this.difficultyLabel) return;
        
        const value = parseInt(this.difficultySlider.value);
        const labels = { 1: 'easy', 2: 'medium', 3: 'hard' };
        this.difficultyLabel.textContent = labels[value] || 'medium';
    }

    updateTileThemeButton() {
        const currentTheme = TILE_THEMES[this.currentTileThemeIndex];
        const emoji = TILE_THEME_NAMES[currentTheme];
        if (this.cycleThemeBtn) {
            this.cycleThemeBtn.textContent = `[tiles: ${emoji}]`;
        }
        
        if (this.gameCard) {
            this.gameCard.setAttribute('data-tile-theme', currentTheme);
        }
        localStorage.setItem('continuous-corner-tile-theme', currentTheme);
    }

    cycleTileTheme() {
        this.currentTileThemeIndex = (this.currentTileThemeIndex + 1) % TILE_THEMES.length;
        this.updateTileThemeButton();
    }

    toggleHelp() {
        if (this.helpPopover) {
            this.helpPopover.classList.toggle('visible');
        }
    }

    downloadGameHistory() {
        if (this.gameHistory.length === 0) {
            alert("No game history to download");
            return;
        }
        
        const timestamp = new Date().toISOString();
        const finalResult = this.gameOverMessage ? this.gameOverMessage.textContent : "Game completed";
        
        // Generate HTML content
        let htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Continuous Corner Game Replay</title>
    <style>
        body {
            font-family: 'Courier New', monospace;
            background: #1a1a1a;
            color: #00ff00;
            margin: 20px;
            line-height: 1.6;
        }
        .header {
            border: 2px solid #00ff00;
            padding: 20px;
            margin-bottom: 20px;
            background: #0a0a0a;
        }
        .move {
            border: 1px solid #333;
            margin: 10px 0;
            padding: 15px;
            background: #111;
        }
        .partition {
            font-family: monospace;
            background: #222;
            padding: 10px;
            border-left: 3px solid #00ff00;
            margin: 5px 0;
        }
        .move-number {
            color: #ffff00;
            font-weight: bold;
        }
        .final-result {
            background: #002200;
            border: 2px solid #00ff00;
            padding: 15px;
            margin-top: 20px;
            text-align: center;
            font-size: 1.2em;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎮 CONTINUOUS CORNER GAME REPLAY</h1>
        <p><strong>Generated:</strong> ${timestamp}</p>
        <p><strong>Game Type:</strong> Continuous Corner</p>
        <p><strong>Total Moves:</strong> ${this.gameHistory.length - 1}</p>
    </div>
`;

        // Add each move
        for (let i = 0; i < this.gameHistory.length; i++) {
            const partition = this.gameHistory[i];
            
            if (i === 0) {
                htmlContent += `    <div class="move">
        <div class="move-number">INITIAL POSITION</div>
        <div class="partition">Partition: ${partition}</div>
    </div>
`;
            } else if (partition === '[]') {
                htmlContent += `    <div class="move">
        <div class="move-number">MOVE ${i}</div>
        <div class="partition">Partition: [] (Game Over)</div>
    </div>
`;
            } else {
                const player = (i % 2 === 1) ? 'A' : 'B';
                htmlContent += `    <div class="move">
        <div class="move-number">MOVE ${i} - Player ${player}</div>
        <div class="partition">Partition: ${partition}</div>
    </div>
`;
            }
        }

        htmlContent += `    <div class="final-result">
        🏆 ${finalResult}
    </div>
    
    <div style="margin-top: 30px; text-align: center; color: #666;">
        <p>Generated by Continuous Corner Game Engine</p>
        <p>Visit the game at your local server to play again!</p>
    </div>
</body>
</html>`;
        
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `continuous-corner-replay-${Date.now()}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        SoundManager.play('click');
    }

    async storeGameInDatabase(winner) {
        try {
            if (window.DatabaseUtils) {
                await window.DatabaseUtils.storeGameInDatabase(
                    'CCORN',
                    this.initialPartition,
                    this.movesSequence,
                    winner && winner.charAt(0),
                    this.gameStartTime
                );
            }
        } catch (err) {
            console.warn('Database save failed:', err.message);
        }
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    new ContinuousCornerGui();
}); 