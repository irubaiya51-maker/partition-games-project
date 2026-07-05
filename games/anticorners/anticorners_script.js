// --- CORE GAME LOGIC ---
// This section contains the fundamental rules and AI logic for the Anticorners game.

// --- PARTITION GENERATION UTILITIES ---

function staircase(n) { let parts = []; let t = n; while (t >= 1) { parts.push(t); t = t - 1; } return parts; }
function rectangle(rows, cols) { let parts = []; let t = rows; while (t >= 1) { parts.push(cols); t = t - 1; } return parts; }
function hook(n) { let parts = []; let t = n; parts.push(t); while (t >= 2) { parts.push(1); t = t - 1; } return parts; }

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

// --- CORE GAME LOGIC ---
class Board {
    constructor(rows) {
        this.rows = [...rows];
        this.initGrid();
    }

    initGrid() {
        if (this.rows.length === 0) {
            this.grid = [];
            return;
        }

        const height = this.rows.length;
        const width = Math.max(...this.rows);
        
        // Create 2D grid: 0=empty, 1=cell, 2=anticorner
        this.grid = [];
        for (let r = 0; r < height; r++) {
            this.grid[r] = [];
            for (let c = 0; c < width; c++) {
                this.grid[r][c] = (c < this.rows[r]) ? 1 : 0;
            }
        }
        
        // Mark anticorners
        this.updateAnticorners();
    }

    updateAnticorners() {
        // Reset all cells to 1 (regular cells)
        for (let r = 0; r < this.grid.length; r++) {
            for (let c = 0; c < this.grid[r].length; c++) {
                if (this.grid[r][c] > 0) {
                    this.grid[r][c] = 1;
                }
            }
        }

        // Find and mark anticorners using the mathematical definition
        const anticorners = this.findAnticorners();
        for (const [r, c] of anticorners) {
            if (r < this.grid.length && c < this.grid[r].length) {
                this.grid[r][c] = 2;
            }
        }
    }

    findAnticorners() {
        // Convert grid back to partition (row lengths)
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
        
        // Top-right anticorner: (1, λ1)
        A.push([0, partition[0] - 1]);  // Convert to 0-based: (1-1, λ1-1)
        
        // Boundary drop anticorners: (i, λ{i+1}) for each i with λ{i+1} < λ{i}
        for (let i = 0; i < k - 1; i++) {  // i = 0 to k-2 (rows 1 to k-1 in 1-based)
            if (partition[i + 1] < partition[i]) {
                A.push([i, partition[i + 1] - 1]);  // Convert to 0-based: (i+1-1, λ{i+1}-1)
            }
        }
        
        // Bottom-left anticorner: (k, 1) - avoid double listing (1,1)
        if (k > 1 || partition[0] > 1) {
            A.push([k - 1, 0]);  // Convert to 0-based: (k-1, 1-1)
        }
        
        return A.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    }

    isEmpty() {
        return this.getTotalSum() === 0;
    }

    getTotalSum() {
        let sum = 0;
        for (let r = 0; r < this.grid.length; r++) {
            for (let c = 0; c < this.grid[r].length; c++) {
                sum += this.grid[r][c];
            }
        }
        return sum;
    }

    height() {
        return this.grid.length;
    }

    width() {
        return this.grid.length > 0 ? this.grid[0].length : 0;
    }

    // Remove hook at position (r, c)
    removeHook(r, c) {
        // Remove all cells at (i,j) where i >= r and j >= c
        for (let i = r; i < this.grid.length; i++) {
            for (let j = c; j < this.grid[i].length; j++) {
                this.grid[i][j] = 0;
            }
        }
        
        // Clean up empty rows from the end
        while (this.grid.length > 0) {
            const lastRow = this.grid[this.grid.length - 1];
            if (lastRow.every(cell => cell === 0)) {
                this.grid.pop();
            } else {
                break;
            }
        }
        
        // Update anticorners after removal
        this.updateAnticorners();
    }

    getAnticorners() {
        const anticorners = [];
        for (let r = 0; r < this.grid.length; r++) {
            for (let c = 0; c < this.grid[r].length; c++) {
                if (this.grid[r][c] === 2) {
                    anticorners.push([r, c]);
                }
            }
        }
        return anticorners;
    }

    hasMoves() {
        return this.getAnticorners().length > 0;
    }

    getAllCells() {
        const cells = [];
        for (let r = 0; r < this.grid.length; r++) {
            for (let c = 0; c < this.grid[r].length; c++) {
                if (this.grid[r][c] > 0) {
                    cells.push({ r, c, value: this.grid[r][c] });
                }
            }
        }

        return cells;
    }

    asTuple() {
        return JSON.stringify(this.grid);
    }
}

class Game {
    static PLAYERS = ["A", "B"];
    
    constructor(board, aiPlayer) {
        this.board = board;
        this.currentIndex = 0;
        this.aiIndex = aiPlayer ? Game.PLAYERS.indexOf(aiPlayer) : null;
    }
    
    get currentPlayer() { 
        return Game.PLAYERS[this.currentIndex]; 
    }
    
    isAiTurn() { 
        return this.aiIndex === this.currentIndex; 
    }
    
    switchPlayer() { 
        this.currentIndex = 1 - this.currentIndex; 
    }
    
    makeMove(r, c) {
        this.board.removeHook(r, c);
        const finished = this.board.isEmpty();
        if (!finished) this.switchPlayer();
        return finished;
    }
}

// --- AI LOGIC ---
const grundyMemo = new Map();

function grundy(position) {
    if (grundyMemo.has(position)) return grundyMemo.get(position);
    
    const grid = JSON.parse(position);
    const board = new Board([]);
    board.grid = grid.map(row => [...row]);
    board.updateAnticorners();
    
    if (board.isEmpty()) {
        grundyMemo.set(position, 0);
        return 0;
    }
    
    const anticorners = board.getAnticorners();
    if (anticorners.length === 0) {
        grundyMemo.set(position, 0);
        return 0;
    }
    
    const childValues = new Set();
    for (const [r, c] of anticorners) {
        const newBoard = new Board([]);
        newBoard.grid = grid.map(row => [...row]);
        newBoard.removeHook(r, c);
        const childPosition = newBoard.asTuple();
        childValues.add(grundy(childPosition));
    }
    
    let g = 0;
    while (childValues.has(g)) { g++; }
    grundyMemo.set(position, g);
    return g;
}

function perfectMove(position) {
    const grid = JSON.parse(position);
    const board = new Board([]);
    board.grid = grid.map(row => [...row]);
    board.updateAnticorners();
    
    const anticorners = board.getAnticorners();
    if (anticorners.length === 0) throw new Error("No legal move");
    
    for (const [r, c] of anticorners) {
        const newBoard = new Board([]);
        newBoard.grid = grid.map(row => [...row]);
        newBoard.removeHook(r, c);
        const childPosition = newBoard.asTuple();
        if (grundy(childPosition) === 0) {
            return [r, c];
        }
    }
    
    return anticorners[0]; // fallback
}

// --- THEME CYCLING FUNCTIONALITY ---
const TILE_THEMES = ['grass', 'stone', 'ice'];
const TILE_THEME_NAMES = {
    'grass': '🌱',
    'stone': '🪨', 
    'ice': '🧊'
};

function initThemeSystem() {
    const themeToggle = document.getElementById('theme-toggle');
    const cycleThemeBtn = document.getElementById('cycle-theme-btn');
    
    // Initialize theme toggle content from script.js (if available)
    if (typeof updateThemeToggleButton === 'function') {
        updateThemeToggleButton();
    }
    
    // Initialize tile theme
    let currentTileThemeIndex = 0;
    updateTileThemeButton();
    
    function updateTileThemeButton() {
        const currentTheme = TILE_THEMES[currentTileThemeIndex];
        const emoji = TILE_THEME_NAMES[currentTheme];
        if (cycleThemeBtn) {
            cycleThemeBtn.textContent = `[tiles: ${emoji}]`;
        }
        
        const gameCard = document.getElementById('game-card');
        if (gameCard) {
            gameCard.setAttribute('data-tile-theme', currentTheme);
        }
    }
    
    function cycleTileTheme() {
        currentTileThemeIndex = (currentTileThemeIndex + 1) % TILE_THEMES.length;
        updateTileThemeButton();
    }
    
    // Bind events
    if (cycleThemeBtn) {
        cycleThemeBtn.addEventListener('click', cycleTileTheme);
        cycleThemeBtn.addEventListener('wheel', (e) => {
            e.preventDefault();
            cycleTileTheme();
        });
    }
}

// --- GUI CONTROLLER ---
class AnticornersGui {
    constructor() {
        this.CELL = 40;
        this.MARGIN = 20;
        this.ANIMATION_MS = 650;
        this.AI_THINK_MS = 1100;
        
        this.game = null;
        this.hoveredMove = null;
        this.isAnimating = false;
        this.aiDifficulty = 50;
        this.undoStack = [];
        this.gameHistory = [];
        this.gameStates = [];  // Track visual game states for replay
        
        this.getDOMElements();
        this.bindEventListeners();
        this.showSetupModal();
        initThemeSystem();
    }

    getDOMElements() {
        this.gameCard = document.getElementById('game-card');
        this.statusLabel = document.getElementById('status-label');
        this.boardArea = document.getElementById('board-area');
        this.aiThinkingIndicator = document.getElementById('ai-thinking-indicator');
        this.newGameBtn = document.getElementById('new-game-btn');
        
        // Modals
        this.setupModal = document.getElementById('setup-modal-backdrop');
        this.gameOverModal = document.getElementById('game-over-modal-backdrop');
        
        // Setup form elements
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
        this.playAgainBtn = document.getElementById('play-again-btn');
        this.gameOverMessage = document.getElementById('game-over-message');
        
        // Other buttons
        this.helpBtn = document.getElementById('help-btn');
        this.helpBtnModal = document.getElementById('help-btn-modal');
        this.helpPopover = document.getElementById('help-popover');
        this.undoBtn = document.getElementById('undo-btn');
        this.downloadBtn = document.getElementById('download-btn');
        this.downloadBtnModal = document.getElementById('download-btn-modal');
        this.reportBtnModal = document.getElementById('report-btn-modal');
    }

    bindEventListeners() {
        this.startGameBtn.addEventListener('click', () => this.processSetup());
        this.newGameBtn.addEventListener('click', () => this.showSetupModal());
        this.playAgainBtn.addEventListener('click', () => this.showSetupModal());
        this.difficultySlider.addEventListener('input', () => this.updateDifficultyLabel());
        
        if (this.generatePartitionBtn) {
            this.generatePartitionBtn.addEventListener('click', () => this.generatePartition());
        }
        if (this.partitionTypeSelect) {
            this.partitionTypeSelect.addEventListener('change', () => this.updatePartitionUI());
            this.updatePartitionUI();
        }
        
        if (this.undoBtn) {
            this.undoBtn.addEventListener('click', () => this.undoMove());
        }
        
        if (this.downloadBtn) {
            this.downloadBtn.addEventListener('click', () => this.downloadGame());
        }
        
        if (this.reportBtnModal) {
            this.reportBtnModal.addEventListener('click', () => this.openGameReport());
        }

        if (this.downloadBtnModal) {
            this.downloadBtnModal.addEventListener('click', () => this.downloadGame());
        }
        
        // Help functionality
        if (this.helpBtn) {
            this.helpBtn.addEventListener('mouseenter', () => this.showHelp());
            this.helpBtn.addEventListener('mouseleave', () => this.hideHelp());
        }
        if (this.helpBtnModal) {
            this.helpBtnModal.addEventListener('mouseenter', () => this.showHelp());
            this.helpBtnModal.addEventListener('mouseleave', () => this.hideHelp());
        }
    }


    
    processSetup() {
        try {
            const nums = this.rowsInput.value.trim().split(/\s+/).map(Number).filter(n => n > 0).sort((a, b) => b - a);
            if (nums.length === 0 || nums.some(n => isNaN(n) || n <= 0)) {
                throw new Error("Invalid input");
            }
            
            const aiSide = this.aiSelect.value === "None" ? null : this.aiSelect.value;
            this.aiDifficulty = parseInt(this.difficultySlider.value);
            
            this.hideSetupModal();
            this.startGame(nums, aiSide);
        } catch (e) {
            alert("Invalid input. Please enter positive integers only.");
        }
    }

    startGame(rowSizes, aiSide) {
        this.initialPartition = [...rowSizes];
        this.game = new Game(new Board(rowSizes), aiSide);
        this.hoveredMove = null;
        this.isAnimating = false;
        this.undoStack = [];
        this.gameHistory = [];
        this.gameStates = [];
        this.movesSequence = []; // Track moves for database storage
        this.gameStartTime = new Date();
        
        // Record initial game state
        const initialVisualState = {
            grid: this.game.board.grid.map(row => [...row]),
            player: this.game.currentPlayer,
            moveNumber: 0,
            timestamp: new Date().toISOString()
        };
        this.gameStates.push(initialVisualState);
        
        this.redrawBoard();
        this.updateStatus();
        this.updateUndoButton();
        this.updateDownloadButton();
        
        if (this.game.isAiTurn()) {
            this.aiTurn();
        }
    }

    redrawBoard() {
        // Clear existing tiles
        this.boardArea.innerHTML = '';
        
        if (!this.game || this.game.board.isEmpty()) return;
        
        /* Make the container the positioning context */
        this.boardArea.style.position = 'relative';
        
        // Calculate board centering offset
        const centerOffset = this.getBoardCenterOffset();
        
        // Draw all cells from the 2D grid
        this.game.board.getAllCells().forEach(({ r, c, value }) => {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.id = `tile-${r}-${c}`;
            
            tile.style.position = 'absolute';
            tile.style.width = `${this.CELL}px`;
            tile.style.height = `${this.CELL}px`;
            tile.style.left = `${centerOffset.x + c * this.CELL}px`;
            tile.style.top = `${centerOffset.y + r * this.CELL}px`;
            
            // Remove forced styling - let CSS handle it
            tile.style.backgroundColor = '';
            tile.style.border = '';
            
            // Style based on cell value
            if (value === 2) {
                tile.classList.add('anticorner');
            }
            
            this.boardArea.appendChild(tile);
        });
        
        // Set board area size with proper centering
        const boardDataWidth = this.game.board.width() * this.CELL;
        const boardDataHeight = this.game.board.height() * this.CELL;
        
        const minDimension = 480;
        let boardWidth = Math.max(this.MARGIN * 2 + boardDataWidth, minDimension);
        let boardHeight = Math.max(this.MARGIN * 2 + boardDataHeight, minDimension);
        
        this.boardArea.style.width = `${boardWidth}px`;
        this.boardArea.style.height = `${boardHeight}px`;
        
        // Add event listeners
        this.boardArea.addEventListener('mousemove', (event) => this.handleMouseMove(event));
        this.boardArea.addEventListener('mouseleave', () => this.handleMouseLeave());
        this.boardArea.addEventListener('click', () => this.handleMouseClick());
    }

    getBoardCenterOffset() {
        if (!this.game || this.game.board.isEmpty()) return { x: this.MARGIN, y: this.MARGIN };

        const boardDataWidth = this.game.board.width() * this.CELL;
        const boardDataHeight = this.game.board.height() * this.CELL;
        const minDimension = 480;
        
        let boardWidth = Math.max(this.MARGIN * 2 + boardDataWidth, minDimension);
        let boardHeight = Math.max(this.MARGIN * 2 + boardDataHeight, minDimension);

        // Calculate centering offset - only center horizontally, keep original top margin
        return {
            x: (boardWidth - boardDataWidth) / 2,
            y: this.MARGIN, // Keep original top margin instead of centering vertically
        };
    }

    handleMouseMove(event) {
        if (!this.game || this.game.isAiTurn() || this.isAnimating) return;
        
        const rect = this.boardArea.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        const centerOffset = this.getBoardCenterOffset();
        let detectedMove = null;
        
        // Check if mouse is over an anticorner position
        const anticorners = this.game.board.getAnticorners();
        for (const [r, c] of anticorners) {
            const cellLeft = centerOffset.x + c * this.CELL;
            const cellTop = centerOffset.y + r * this.CELL;
            const cellRight = cellLeft + this.CELL;
            const cellBottom = cellTop + this.CELL;
            
            if (mouseX >= cellLeft && mouseX <= cellRight && 
                mouseY >= cellTop && mouseY <= cellBottom) {
                detectedMove = [r, c];
                break;
            }
        }

        if (JSON.stringify(detectedMove) !== JSON.stringify(this.hoveredMove)) {
            this.hoveredMove = detectedMove;
            this.highlightHoveredMove();
        }
        
        this.boardArea.classList.toggle('clickable', !!this.hoveredMove);
    }

    highlightHoveredMove() {
        // Remove previous highlights and will-remove classes
        this.gameCard.querySelectorAll('.tile.highlighted, .tile.will-remove').forEach(tile => {
            tile.classList.remove('highlighted', 'will-remove');
        });
        
        // Highlight hovered anticorner and preview cells to be removed
        if (this.hoveredMove) {
            const [r, c] = this.hoveredMove;
            
            // Highlight the anticorner itself
            const anticornerTile = document.getElementById(`tile-${r}-${c}`);
            if (anticornerTile) {
                anticornerTile.classList.add('highlighted');
            }
            
            // Preview all cells that will be removed when this anticorner is selected
            // (all cells at positions (i,j) where i >= r and j >= c)
            for (let i = r; i < this.game.board.height(); i++) {
                for (let j = c; j < this.game.board.width(); j++) {
                    if (this.game.board.grid[i] && this.game.board.grid[i][j] > 0) {
                        const tile = document.getElementById(`tile-${i}-${j}`);
                        if (tile && !tile.classList.contains('highlighted')) {
                            tile.classList.add('will-remove');
                        }
                    }
                }
            }
        }
    }

    handleMouseLeave() {
        this.hoveredMove = null;
        this.highlightHoveredMove();
        this.boardArea.classList.remove('clickable');
    }

    handleMouseClick() {
        if (this.hoveredMove && !this.isAnimating && !this.game.isAiTurn()) {
            this.executeMove(this.hoveredMove[0], this.hoveredMove[1]);
        }
    }

    executeMove(r, c) {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        this.handleMouseLeave();
        
        // Save state for undo (before move)
        const undoState = {
            grid: this.game.board.grid.map(row => [...row]),
            currentIndex: this.game.currentIndex
        };
        this.undoStack.push(undoState);
        
        // Track move in game history
        this.gameHistory.push({
            player: this.game.currentPlayer,
            move: [r, c],
            timestamp: new Date().toISOString()
        });
        
        // Track move for database storage (format: R2C3 for row 2, column 3)
        this.movesSequence.push(`R${r}C${c}`);
        
        // Animate the removal
        this.animateRemoval(r, c, () => {
            const finished = this.game.makeMove(r, c);
            this.isAnimating = false;
            
            // Save visual state after the move
            const visualState = {
                grid: this.game.board.grid.map(row => [...row]),
                player: this.game.currentPlayer,
                moveNumber: this.gameStates.length,
                timestamp: new Date().toISOString()
            };
            this.gameStates.push(visualState);
            
            if (finished) {
                this.gameOverMessage.textContent = `Player ${this.game.currentPlayer} wins!`;
                this.gameOverModal.classList.add('visible');
                
                // Store game data in database
                this.storeGameInDatabase(this.game.currentPlayer);
            } else {
                this.updateStatus();
                if (this.game.isAiTurn()) {
                    this.aiTurn();
                }
            }
            
            this.redrawBoard();
            this.updateUndoButton();
            this.updateDownloadButton();
        });
    }

    animateRemoval(r, c, callback) {
        // Mark cells to be removed with animation
        for (let i = r; i < this.game.board.height(); i++) {
            for (let j = c; j < this.game.board.width(); j++) {
                if (this.game.board.grid[i] && this.game.board.grid[i][j] > 0) {
                    const tile = document.getElementById(`tile-${i}-${j}`);
                    if (tile) {
                        tile.classList.add('removing');
                    }
                }
            }
        }
        
        setTimeout(callback, this.ANIMATION_MS);
    }

    aiTurn() {
        if (!this.game || !this.game.isAiTurn() || this.isAnimating) return;
        
        this.aiThinkingIndicator.classList.add('thinking');
        
        setTimeout(() => {
            this.aiThinkingIndicator.classList.remove('thinking');
            
            const anticorners = this.game.board.getAnticorners();
            if (anticorners.length === 0) return;
            
            let move;
            const rand = Math.random();
            
            // AI difficulty logic
            if ((this.aiDifficulty < 30 && rand < 0.8) || (this.aiDifficulty < 70 && rand < 0.4)) {
                // Random move for easier difficulties
                move = anticorners[Math.floor(Math.random() * anticorners.length)];
            } else {
                // Try to find optimal move
                try {
                    move = perfectMove(this.game.board.asTuple());
                } catch {
                    move = anticorners[0];
                }
            }
            
            this.executeMove(move[0], move[1]);
        }, this.AI_THINK_MS);
    }



    undoMove() {
        if (this.undoStack.length === 0 || this.game.isAiTurn() || this.isAnimating) return;
        
        const previousState = this.undoStack.pop();
        this.game.board.grid = previousState.grid.map(row => [...row]);
        this.game.board.updateAnticorners();
        this.game.currentIndex = previousState.currentIndex;
        
        // Remove the last move from history
        if (this.gameHistory.length > 0) {
            this.gameHistory.pop();
        }
        
        // Remove the last move from the sequence for database storage
        if (this.movesSequence.length > 0) {
            this.movesSequence.pop();
        }
        
        // Remove the last visual state
        if (this.gameStates.length > 1) {
            this.gameStates.pop();
        }
        
        this.redrawBoard();
        this.updateStatus();
        this.updateUndoButton();
        this.updateDownloadButton();
    }

    updateUndoButton() {
        if (this.undoBtn) {
            this.undoBtn.style.display = this.undoStack.length > 0 ? 'inline-flex' : 'none';
        }
    }

    updateDownloadButton() {
        if (this.downloadBtn) {
            this.downloadBtn.style.display = this.gameStates.length > 1 ? 'inline-flex' : 'none';
        }
    }

    async storeGameInDatabase(winner) {
        try {
            // Prepare game data in the required format
            const gameData = {
                gameType: 'ANTI',
                partitionData: this.initialPartition.join(' '),
                timestampPlayed: this.gameStartTime.toISOString(),
                movesSequence: this.movesSequence.join(' '),
                gameOutcome: winner
            };

            // Get server URL from global config
            const serverUrl = typeof window.GameConfig !== 'undefined' 
                ? window.GameConfig.getServerUrl() 
                : 'http://localhost:3001'; // fallback for local development

            const response = await fetch(`${serverUrl}/api/game-records`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(gameData)
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Game successfully stored in database:', result.record.id);
            } else {
                const error = await response.json();
                console.warn('Failed to store game in database:', error.error);
            }
        } catch (error) {
            console.warn('Could not connect to database server:', error.message);
            // Game continues normally even if database storage fails
        }
    }

    updateStatus() {
        if (!this.game) return;
        
        const kind = this.game.isAiTurn() ? "Computer" : "Human";
        const newText = `Player ${this.game.currentPlayer} (${kind}) to move`;
        
        if (this.statusLabel.textContent === newText) return;
        
        this.statusLabel.classList.add('exiting');
        setTimeout(() => {
            this.statusLabel.textContent = newText;
            this.statusLabel.classList.remove('exiting');
        }, 200);
    }

    updateDifficultyLabel() {
        const difficulty = this.difficultySlider.value;
        let difficultyText = 'Easy';
        if (difficulty >= 30) difficultyText = 'Medium';
        if (difficulty >= 70) difficultyText = 'Hard';
        this.difficultyLabel.textContent = `${difficultyText} (${difficulty})`;
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
        const partitionType = this.partitionTypeSelect.value;
        const n = parseInt(this.partitionNumberInput.value, 10);

        if (isNaN(n) || n <= 0 || n > 200) {
            alert("Please enter a positive number less than or equal to 200.");
            return;
        }

        let partition;
        switch (partitionType) {
            case 'random': partition = randomPartition(n); break;
            case 'staircase': partition = staircase(n); break;
            case 'rectangle': {
                const cols = parseInt(this.partitionColsInput.value, 10);
                if (isNaN(cols) || cols <= 0 || cols > 200) {
                    alert("Please enter a positive number of columns less than or equal to 200.");
                    return;
                }
                partition = rectangle(n, cols);
                break;
            }
            case 'hook': partition = hook(n); break;
            default: partition = staircase(n);
        }

        this.rowsInput.value = partition.join(' ');
    }

    openGameReport() {
        if (!this.game) return;
        const allStates = (this.gameStates || []).map(state => {
            const grid = state.grid;
            if (!Array.isArray(grid)) return '';
            const rowLengths = grid.map(row => row.reduce((s, v) => s + (v > 0 ? 1 : 0), 0)).filter(len => len > 0).sort((a, b) => b - a);
            return rowLengths.join(' ');
        }).filter(Boolean);
        const uniqueStates = allStates.filter((s, i, self) => s && (i === 0 || s !== self[i - 1]));
        const statesString = uniqueStates.join('\n');
        localStorage.setItem('anticornersGameStatesForReport', statesString);
        localStorage.setItem('anticornersReportMode', 'normal');
        window.open('../../reports/generator/report.html', '_blank');
    }

    downloadGame() {
        if (!this.game || this.gameStates.length === 0) return;

        const htmlContent = this.generateGameReplayHTML(this.gameStates, this.initialPartition);
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Anticorners-Game-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    generateGameReplayHTML(gameStates, initialPartition) {
        const title = `Anticorners Game Replay - ${new Date().toLocaleDateString()}`;
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: sans-serif;
            background: #f8f9fa;
            color: #212529;
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .container {
            background: #fff;
            border-radius: 20px;
            padding: 30px;
            max-width: 800px;
            width: 100%;
            box-shadow: 0 4px 24px rgba(0,0,0,0.1);
            text-align: center;
        }
        h1 { margin-top: 0; color: #212529; letter-spacing: 1px; }
        .controls {
            margin: 20px 0;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 20px;
            flex-wrap: wrap;
        }
        button {
            padding: 12px 20px;
            font-size: 16px;
            border: none;
            border-radius: 8px;
            background: #f59e0b;
            color: #fff;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: 600;
        }
        button:hover { 
            background: #d97706; 
            transform: translateY(-2px); 
        }
        button:disabled { 
            opacity: 0.5; 
            cursor: not-allowed; 
            transform: none; 
            background: #6c757d;
        }
        .state-info {
            font-size: 18px;
            margin: 10px 0;
            font-weight: bold;
            color: #212529;
        }
        #game-canvas {
            border: 2px solid #212529;
            border-radius: 12px;
            margin: 20px auto;
            display: block;
            background: #fff;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }
        .instructions {
            margin-top: 20px;
            font-size: 14px;
            opacity: 0.7;
            line-height: 1.6;
        }
        .info {
            margin: 10px 0;
            padding: 15px;
            background: #e3f2fd;
            border-radius: 8px;
            font-size: 14px;
        }
        .error {
            color: #dc3545;
            background: #f8d7da;
            padding: 12px;
            border-radius: 8px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${title}</h1>
        <div class="info">
            <strong>Initial Partition:</strong> [${initialPartition.join(', ')}] &nbsp;|&nbsp; 
            <strong>Total States:</strong> ${gameStates.length}
        </div>
        <div class="state-info">
            State <span id="current-state">1</span> of <span id="total-states">${gameStates.length}</span>
            <span id="player-info"></span>
        </div>
        <div class="controls">
            <button id="first-btn" onclick="goToState(0)">⏮ First</button>
            <button id="prev-btn" onclick="previousState()">◀ Previous</button>
            <button id="play-btn" onclick="toggleAutoplay()">▶ Play</button>
            <button id="next-btn" onclick="nextState()">Next ▶</button>
            <button id="last-btn" onclick="goToState(gameStates.length - 1)">Last ⏭</button>
        </div>
        <canvas id="game-canvas" width="400" height="400"></canvas>
        <div id="error-message" class="error" style="display:none"></div>
        <div class="instructions">
            <strong>Navigation:</strong> Use the buttons above or arrow keys (←/→) to navigate between game states.<br>
            <strong>Autoplay:</strong> Click Play to automatically advance through all states.<br>
            <strong>Legend:</strong> <span style="background:#86efac;padding:2px 8px;border-radius:4px;color:#000;">Green = Regular Cell</span> 
            <span style="background:#ff6b6b;padding:2px 8px;border-radius:4px;color:#fff;">Red = Anticorner</span>
        </div>
    </div>

    <script>
        const gameStates = ${JSON.stringify(gameStates)};
        let currentStateIndex = 0;
        let isPlaying = false;
        let playInterval;
        const CELL_SIZE = 40;
        const MARGIN = 20;

        const canvas = document.getElementById('game-canvas');
        const ctx = canvas.getContext('2d');
        const errorDiv = document.getElementById('error-message');

        function drawBoard(grid) {
            if (!Array.isArray(grid) || grid.length === 0) {
                errorDiv.textContent = 'Game Ended - No cells remaining.';
                errorDiv.style.display = 'block';
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#212529';
                ctx.font = '24px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('Game Complete', canvas.width/2, canvas.height/2);
                return;
            }
            
            errorDiv.style.display = 'none';
            
            const boardHeight = grid.length;
            const boardWidth = boardHeight > 0 ? grid[0].length : 0;
            
            const canvasWidth = MARGIN * 2 + boardWidth * CELL_SIZE;
            const canvasHeight = MARGIN * 2 + boardHeight * CELL_SIZE;
            
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            
            // Draw cells
            for (let r = 0; r < boardHeight; r++) {
                for (let c = 0; c < boardWidth; c++) {
                    const x = MARGIN + c * CELL_SIZE;
                    const y = MARGIN + r * CELL_SIZE;
                    const cellValue = grid[r][c];
                    
                    if (cellValue === 0) {
                        // Empty space - light gray
                        ctx.fillStyle = '#f8f9fa';
                    } else if (cellValue === 1) {
                        // Regular cell - green
                        ctx.fillStyle = '#86efac';
                    } else if (cellValue === 2) {
                        // Anticorner - red
                        ctx.fillStyle = '#ff6b6b';
                    }
                    
                    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                    
                    // Draw border for cells
                    if (cellValue > 0) {
                        ctx.strokeStyle = cellValue === 2 ? '#e03131' : '#22c55e';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
                    }
                }
            }
            
            // Draw grid lines
            ctx.strokeStyle = '#dee2e6';
            ctx.lineWidth = 1;
            
            // Vertical lines
            for (let c = 0; c <= boardWidth; c++) {
                const x = MARGIN + c * CELL_SIZE;
                ctx.beginPath();
                ctx.moveTo(x, MARGIN);
                ctx.lineTo(x, MARGIN + boardHeight * CELL_SIZE);
                ctx.stroke();
            }
            
            // Horizontal lines
            for (let r = 0; r <= boardHeight; r++) {
                const y = MARGIN + r * CELL_SIZE;
                ctx.beginPath();
                ctx.moveTo(MARGIN, y);
                ctx.lineTo(MARGIN + boardWidth * CELL_SIZE, y);
                ctx.stroke();
            }
        }

        function updateDisplay() {
            const state = gameStates[currentStateIndex];
            drawBoard(state.grid);
            
            document.getElementById('current-state').textContent = currentStateIndex + 1;
            
            const playerInfo = document.getElementById('player-info');
            if (currentStateIndex === 0) {
                playerInfo.textContent = ' - Initial Position';
            } else {
                playerInfo.textContent = \` - Player \${state.player} to move\`;
            }
            
            document.getElementById('first-btn').disabled = currentStateIndex === 0;
            document.getElementById('prev-btn').disabled = currentStateIndex === 0;
            document.getElementById('next-btn').disabled = currentStateIndex === gameStates.length - 1;
            document.getElementById('last-btn').disabled = currentStateIndex === gameStates.length - 1;
        }

        function goToState(index) {
            if (index >= 0 && index < gameStates.length) {
                currentStateIndex = index;
                updateDisplay();
            }
        }

        function nextState() {
            if (currentStateIndex < gameStates.length - 1) {
                currentStateIndex++;
                updateDisplay();
            }
        }

        function previousState() {
            if (currentStateIndex > 0) {
                currentStateIndex--;
                updateDisplay();
            }
        }

        function toggleAutoplay() {
            const btn = document.getElementById('play-btn');
            if (isPlaying) {
                clearInterval(playInterval);
                isPlaying = false;
                btn.textContent = '▶ Play';
            } else {
                isPlaying = true;
                btn.textContent = '⏸ Pause';
                playInterval = setInterval(() => {
                    if (currentStateIndex < gameStates.length - 1) {
                        nextState();
                    } else {
                        toggleAutoplay();
                    }
                }, 1500);
            }
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                previousState();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                nextState();
            } else if (e.key === ' ') {
                e.preventDefault();
                toggleAutoplay();
            }
        });

        // Initialize display
        updateDisplay();
    </script>
</body>
</html>`;
    }

    // UI methods
    
    showSetupModal() { 
        this.gameOverModal.classList.remove('visible'); 
        this.setupModal.classList.add('visible'); 
    }
    
    hideSetupModal() {
        this.setupModal.classList.remove('visible');
    }
    
    showHelp() { 
        if (this.helpPopover) this.helpPopover.classList.add('visible'); 
    }
    
    hideHelp() { 
        if (this.helpPopover) this.helpPopover.classList.remove('visible'); 
    }
}

// Initialize the game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    window.anticornersApp = new AnticornersGui();
});

