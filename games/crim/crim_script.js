// --- CORE GAME LOGIC ---
class Board {
    constructor(rows) {
        // Convert from row lengths (e.g., [3, 2]) to a 2D grid (e.g., [[1,1,1], [1,1,0]])
        const width = rows.length > 0 ? Math.max(0, ...rows) : 0;
        this.grid = rows.map(len => Array.from({ length: width }, (_, i) => i < len ? 1 : 0));
    }
    
    isEmpty() { return this.grid.length === 0 || this.grid[0].length === 0; }
    height() { return this.grid.length; }
    width() { return this.grid.length > 0 ? this.grid[0].length : 0; }

    removeRow(index) {
        if (index >= 0 && index < this.height()) {
            this.grid.splice(index, 1);
        }
    }

    removeColumn(index) {
        if (index >= 0 && index < this.width()) {
            this.grid.forEach(row => row.splice(index, 1));
            // If a column removal makes all columns empty, remove the row
            this.grid = this.grid.filter(row => row.length > 0);
        }
    }
    
    squares() {
        const coords = [];
        for (let r = 0; r < this.height(); r++) {
            for (let c = 0; c < this.width(); c++) {
                if (this.grid[r][c] === 1) {
                    coords.push({ r, c });
                }
            }
        }
        return coords;
    }

    asTuple() {
        // Convert back to canonical row-length format for memoization
        const rowLengths = this.grid.map(row => row.reduce((sum, cell) => sum + cell, 0)).filter(len => len > 0);
        return JSON.stringify(rowLengths.sort((a, b) => b - a));
    }
    
    getRows() {
        // Return row lengths as an array
        const rowLengths = this.grid.map(row => row.reduce((sum, cell) => sum + cell, 0)).filter(len => len > 0);
        return rowLengths.sort((a, b) => b - a);
    }

    // Methods to check which rows and columns are alive
    rowsAlive() {
        const alive = [];
        for (let r = 0; r < this.height(); r++) {
            if (this.grid[r].some(cell => cell === 1)) {
                alive.push(r);
            }
        }
        return alive;
    }

    colsAlive() {
        const alive = [];
        for (let c = 0; c < this.width(); c++) {
            for (let r = 0; r < this.height(); r++) {
                if (this.grid[r][c] === 1) {
                    alive.push(c);
                    break;
                }
            }
        }
        return alive;
    }

    hasMoves() {
        return this.rowsAlive().length > 0 || this.colsAlive().length > 0;
    }
}

const grundyMemo = new Map();

function getRowLengthsFromTuple(position) {
    return JSON.parse(position);
}

function staircase(n) {
  let parts = []; 
  let t = n; 
  
  while (t >= 1) 
  {
    parts.push(t);
    t = t - 1; 
  }
  
  return parts; // Sort descending like other games
}

function rectangle(rows, cols)
{
    let parts = [];
    let t = rows;

    while (t >= 1)
    {
        parts.push(cols);
        t = t - 1;
    }

    return parts;
}

function hook(n)
{
    let parts = []; 
    let t = n; 

    parts.push(t); 

    while (t >= 2)
    {
        parts.push(1); 
        t = t - 1; 
    }

    return parts; 
}

function grundy(position) {
    if (position === '[]') return 0;
    if (grundyMemo.has(position)) return grundyMemo.get(position);
    
    const posArray = getRowLengthsFromTuple(position);
    const childrenStates = new Set();
    const width = posArray.length > 0 ? posArray[0] : 0;

    // Generate children for removing ANY row
    for (let i = 0; i < posArray.length; i++) {
        const nextPos = [...posArray];
        nextPos.splice(i, 1);
        childrenStates.add(JSON.stringify(nextPos.sort((a, b) => b - a)));
    }

    // Generate children for removing ANY column
    for (let j = 0; j < width; j++) {
        const nextPos = posArray.map(len => len > j ? len - 1 : len).filter(len => len > 0);
        childrenStates.add(JSON.stringify(nextPos.sort((a, b) => b - a)));
    }
    
    const childValues = new Set();
    for (const state of childrenStates) {
        childValues.add(grundy(state));
    }

    let g = 0;
    while (childValues.has(g)) { g++; }
    grundyMemo.set(position, g);
    return g;
}

function perfectMove(position) {
    if (position === '[]') throw new Error("No legal move");
    const posArray = getRowLengthsFromTuple(position);
    const width = posArray.length > 0 ? posArray[0] : 0;

    if (grundy(position) !== 0) {
        // Check row moves
        for (let i = 0; i < posArray.length; i++) {
            const nextPos = [...posArray];
            nextPos.splice(i, 1);
            if (grundy(JSON.stringify(nextPos.sort((a, b) => b - a))) === 0) {
                return { type: 'row', index: i };
            }
        }
        // Check column moves
        for (let j = 0; j < width; j++) {
            const nextPos = posArray.map(len => len > j ? len - 1 : len).filter(len => len > 0);
            if (grundy(JSON.stringify(nextPos.sort((a, b) => b - a))) === 0) {
                return { type: 'col', index: j };
            }
        }
    }
    
    // If losing, make any legal move (prioritize row)
    if (posArray.length > 0) return { type: 'row', index: 0 };
    if (width > 0) return { type: 'col', index: 0 };
    throw new Error("Could not find a legal move.");
}

class Game {
    static PLAYERS = ["A", "B"];
    constructor(board, aiPlayer, gameMode = 'normal') { 
        this.board = board; 
        this.currentIndex = 0; 
        this.aiIndex = aiPlayer ? Game.PLAYERS.indexOf(aiPlayer) : null; 
        this.gameMode = gameMode;
    }
    get currentPlayer() { return Game.PLAYERS[this.currentIndex]; }
    isAiTurn() { return this.aiIndex === this.currentIndex; }
    switchPlayer() { this.currentIndex = 1 - this.currentIndex; }
    makeMove(move) {
        if (move.type === "row") { this.board.removeRow(move.index); } 
        else if (move.type === "col") { this.board.removeColumn(move.index); }
        const finished = this.board.isEmpty();
        if (!finished) this.switchPlayer();
        return finished;
    }
}

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
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
    return parts; 
}

const SoundManager = {
    sounds: {},
    init() { 
        // Sound effects disabled
    },
    play(soundName) { 
        // Sound effects disabled
    }
};

class ProLCTRGui {
    constructor() {
        this.CELL = 40; 
        this.MARGIN = 20; 
        this.LABEL = 20;
        this.ANIMATION_MS = 650; 
        this.AI_THINK_MS = 1100;
        this.game = null; 
        this.isAnimating = false; 
        this.aiDifficultyValue = 50;
        this.idCounter = 0;
        this.idToAddress = new Map();
        this.gameHistory = []; // Store previous game states for undo
        // Database tracking
        this.movesSequence = [];
        this.gameStartTime = null;
        this.getDOMElements();
        this.bindEventListeners();
        this.initTheme();
        SoundManager.init();
        if (typeof CrimAnalysis === 'function') {
            this.analysis = new CrimAnalysis(this);
        }
    }

    getDOMElements() {
        this.gameCard = document.getElementById('game-card');
        this.statusLabel = document.getElementById('status-label');
        this.boardArea = document.getElementById('board-area');
        this.aiThinkingIndicator = document.getElementById('ai-thinking-indicator');
        this.newGameBtn = document.getElementById('new-game-btn');
        this.undoBtn = document.getElementById('undo-btn');
        this.downloadBtn = document.getElementById('download-btn');
        this.cycleThemeBtn = document.getElementById('cycle-theme-btn');
        this.themeToggle = document.getElementById('theme-toggle');
        this.setupModal = document.getElementById('setup-modal-backdrop');
        this.gameOverModal = document.getElementById('game-over-modal-backdrop');
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
        this.playAgainBtn = document.getElementById('play-again-btn');
        this.gameOverMessage = document.getElementById('game-over-message');
        this.helpBtn = document.getElementById('help-btn');
        this.helpBtnModal = document.getElementById('help-btn-modal');
        this.helpPopover = document.getElementById('help-popover');
        this.gameModeSelect = document.getElementById('game-mode-select');
        this.reportBtnModal = document.getElementById('report-btn-modal');
    }

    bindEventListeners() {
        this.startGameBtn.addEventListener('click', () => this.processSetup());
        this.newGameBtn.addEventListener('click', () => { SoundManager.play('click'); this.showSetupModal(); });
        this.undoBtn.addEventListener('click', () => { SoundManager.play('click'); this.undoMove(); });
        this.downloadBtn.addEventListener('click', () => { SoundManager.play('click'); this.downloadGame(); });
        this.playAgainBtn.addEventListener('click', () => { SoundManager.play('click'); this.showSetupModal(); });
        this.themeToggle.addEventListener('change', () => { SoundManager.play('click'); this.toggleTheme(); });
        this.difficultySlider.addEventListener('input', () => this.updateDifficultyLabel());
        this.helpBtn.addEventListener('mouseenter', () => this.showHelp());
        this.helpBtn.addEventListener('mouseleave', () => this.hideHelp());
        if (this.helpBtnModal) {
            this.helpBtnModal.addEventListener('mouseenter', () => this.showHelp());
            this.helpBtnModal.addEventListener('mouseleave', () => this.hideHelp());
        }
        this.generatePartitionBtn.addEventListener('click', () => this.generatePartition());
        this.partitionTypeSelect.addEventListener('change', () => this.updatePartitionUI());
        this.updatePartitionUI();
        const downloadBtnModal = document.getElementById('download-btn-modal');
        if (downloadBtnModal) {
            downloadBtnModal.addEventListener('click', () => { SoundManager.play('click'); this.downloadGame(); });
        }
        if (this.reportBtnModal) {
            this.reportBtnModal.addEventListener('click', () => { SoundManager.play('click'); this.openGameReport(); });
        }
        
        // Theme cycling functionality
        if (this.cycleThemeBtn) {
            const themes = [
                { name: 'grass', icon: '🔥' },
                { name: 'stone', icon: '🪨' },
                { name: 'ice', icon: '🧊' }
            ];
            let currentThemeIndex = 0;

            // A reusable function to update the theme
            const updateTheme = (newIndex) => {
                // This formula correctly wraps the index in both directions (forwards and backwards)
                currentThemeIndex = (newIndex + themes.length) % themes.length;
                
                const newTheme = themes[currentThemeIndex];
                
                // Update the button's text to show the current theme
                this.cycleThemeBtn.innerHTML = `[tiles: ${newTheme.icon}]`;
                
                // Apply the theme to the game card
                if (this.gameCard) {
                    this.gameCard.setAttribute('data-tile-theme', newTheme.name);
                }
            };

            // 1. Handle Clicks
            this.cycleThemeBtn.addEventListener('click', () => {
                // Go to the next theme
                updateTheme(currentThemeIndex + 1);
            });

            // 2. Handle Mouse Wheel Scrolling
            this.cycleThemeBtn.addEventListener('wheel', (event) => {
                // Prevent the default browser action (scrolling the page)
                event.preventDefault();

                if (event.deltaY < 0) {
                    // Scrolled up: go to the previous theme
                    updateTheme(currentThemeIndex - 1);
                } else {
                    // Scrolled down: go to the next theme
                    updateTheme(currentThemeIndex + 1);
                }
            });

            // Set the initial theme when the game loads
            updateTheme(currentThemeIndex);
        }
    }

    clearBoard() {
        this.boardArea.innerHTML = '';
        this.idToAddress.clear();
    }

    redrawBoard() {
        this.clearBoard();
        if (!this.game) return;
        
        // Calculate required dimensions and update board area
        this.updateBoardDimensions();
        
        // Calculate center position for the board
        const board = this.game.board;
        const boardWidth = board.width();
        const boardHeight = board.height();
        
        // Get the actual board area dimensions
        const boardAreaWidth = this.boardArea.offsetWidth;
        const boardAreaHeight = this.boardArea.offsetHeight;
        
        // Calculate the total content width (including labels)
        const contentWidth = this.LABEL + (boardWidth * this.CELL) + this.LABEL;
        const contentHeight = this.LABEL + (boardHeight * this.CELL) + this.LABEL;
        
        // Calculate horizontal center offset (keep vertical at top)
        const centerX = (boardAreaWidth - contentWidth) / 2;
        
        // Position the board horizontally centered but at the top
        const x0 = centerX + this.LABEL;
        const y0 = this.LABEL; // Start from top with just label space
        
        this.drawBoard(this.game.board, x0, y0);
        if (this.analysis && typeof this.analysis.updateToggleButton === 'function') {
            this.analysis.updateToggleButton();
        }
    }

    updateBoardDimensions() {
        if (!this.game) return;
        
        const board = this.game.board;
        const boardHeight = board.height();
        const boardWidth = board.width();
        
        // Calculate required dimensions (including labels on both sides)
        let requiredWidth = this.LABEL + (boardWidth * this.CELL) + this.LABEL;
        let requiredHeight = this.LABEL + (boardHeight * this.CELL) + this.LABEL;
        
        // Set minimum dimensions
        const minDimension = 520; // Increased to match CSS
        requiredWidth = Math.max(requiredWidth, minDimension);
        requiredHeight = Math.max(requiredHeight, minDimension);
        
        // Apply the calculated dimensions to the board area
        this.boardArea.style.width = `${requiredWidth}px`;
        this.boardArea.style.height = `${requiredHeight}px`;
    }

    drawBoard(board, x0, y0) {
        // Draw row labels
        board.rowsAlive().forEach(r => {
            const div = document.createElement('div');
            div.className = 'label-cell';
            div.style.width = `${this.LABEL}px`;
            div.style.height = `${this.CELL}px`;
            div.style.left = `${x0 - this.LABEL}px`;
            div.style.top = `${y0 + r * this.CELL}px`;
            div.textContent = r;
            const id = `lbl-${++this.idCounter}`;
            div.id = id;
            this.idToAddress.set(id, { kind: 'row', index: r });
            div.addEventListener('click', e => this.handleLabelClick(e));
            div.addEventListener('mouseenter', e => this.handleLabelHover(e));
            div.addEventListener('mouseleave', e => this.handleLabelLeave(e));
            this.boardArea.appendChild(div);
        });

        // Draw column labels
        board.colsAlive().forEach(c => {
            const div = document.createElement('div');
            div.className = 'label-cell';
            div.style.width = `${this.CELL}px`;
            div.style.height = `${this.LABEL}px`;
            div.style.left = `${x0 + c * this.CELL}px`;
            div.style.top = `${y0 - this.LABEL}px`;
            div.textContent = c;
            const id = `lbl-${++this.idCounter}`;
            div.id = id;
            this.idToAddress.set(id, { kind: 'col', index: c });
            div.addEventListener('click', e => this.handleLabelClick(e));
            div.addEventListener('mouseenter', e => this.handleLabelHover(e));
            div.addEventListener('mouseleave', e => this.handleLabelLeave(e));
            this.boardArea.appendChild(div);
        });

        // Draw squares
        board.squares().forEach(({ r, c }) => {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.id = `tile-${r}-${c}`;
            tile.style.width = `${this.CELL}px`;
            tile.style.height = `${this.CELL}px`;
            tile.style.left = `${x0 + c * this.CELL}px`;
            tile.style.top = `${y0 + r * this.CELL}px`;
            this.boardArea.appendChild(tile);
        });
    }

    handleLabelClick(ev) {
        const info = this.idToAddress.get(ev.currentTarget.id);
        
        // Only allow human players to click labels
        if (!info || !this.game || this.game.isAiTurn() || this.isAnimating) {
            return;
        }

        this.processMove(info, ev.currentTarget);
    }

    handleLabelHover(ev) {
        if (!this.game || this.game.isAiTurn() || this.isAnimating) return;
        
        const info = this.idToAddress.get(ev.currentTarget.id);
        if (!info) return;

        SoundManager.play('hover');
        this.highlightTiles(info);
    }

    handleLabelLeave(ev) {
        if (!this.game) return;
        this.clearHighlights();
    }

    highlightTiles(info) {
        this.clearHighlights();
        
        if (info.kind === 'row') {
            const rowIndex = info.index;
            for (let c = 0; c < this.game.board.width(); c++) {
                if (this.game.board.grid[rowIndex][c] === 1) {
                    const tile = document.getElementById(`tile-${rowIndex}-${c}`);
                    if (tile) tile.classList.add('highlighted');
                }
            }
        } else if (info.kind === 'col') {
            const colIndex = info.index;
            for (let r = 0; r < this.game.board.height(); r++) {
                if (this.game.board.grid[r][colIndex] === 1) {
                    const tile = document.getElementById(`tile-${r}-${colIndex}`);
                    if (tile) tile.classList.add('highlighted');
                }
            }
        }
    }

    clearHighlights() {
        this.boardArea.querySelectorAll('.tile.highlighted').forEach(tile => {
            tile.classList.remove('highlighted');
        });
    }

    processMove(info, labelElement = null) {
        if (!info || !this.game || this.isAnimating) return;

        // Save the current state before making a move (for undo functionality)
        this.saveGameState();

        SoundManager.play('click');
        if (labelElement) {
            labelElement.classList.add(info.kind === 'row' ? 'row-win' : 'col-win');
        }

        // Execute the move after a short visual flash
        setTimeout(() => {
            this.clearHighlights();
            const move = { type: info.kind, index: info.index };
            const lastMover = this.game.currentPlayer;
            
            // Track the move
            this.movesSequence.push(info.kind === 'row' ? `R${info.index}` : `C${info.index}`);
            
            this.game.makeMove(move);
            
            // Check if game is over (no more moves available)
            const finished = !this.game.board.hasMoves();
            
            if (finished) {
                SoundManager.play('win');
                const winner = (this.game.gameMode === 'misere') ? (lastMover === 'A' ? 'B' : 'A') : lastMover;
                this.gameOverMessage.textContent = `Player ${winner} wins!`;
                this.gameOverModal.classList.add('visible');
                this.storeGameInDatabase(winner);
                if (this.analysis && typeof this.analysis.onMoveMade === 'function') {
                    this.analysis.onMoveMade();
                }
                        this.redrawBoard();
        this.updateStatus();
        this.updateUndoButton();
        this.updateDownloadButton();
        return;
            }

            this.redrawBoard();
            this.updateStatus();
            this.updateUndoButton();
            this.updateDownloadButton();
            if (this.analysis && typeof this.analysis.onMoveMade === 'function') {
                this.analysis.onMoveMade();
            }
            if (this.game.isAiTurn()) {
                this.aiTurn();
            }
        }, 300);
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
        SoundManager.play('click');

        const partitionType = this.partitionTypeSelect.value;
        const n = parseInt(this.partitionNumberInput.value, 10);

        if (isNaN(n) || n <= 0 || n > 200) {
            alert("Please enter a positive number less than or equal to 200.");
            return;
        }

        let partition;

        switch (partitionType) {
            case 'random':
                partition = randomPartition(n);
                break;
            case 'staircase':
                partition = staircase(n);
                break;
            case 'rectangle': {
                const cols = parseInt(this.partitionColsInput.value, 10);
                if (isNaN(cols) || cols <= 0 || cols > 200) {
                    alert("Please enter a positive number of columns less than or equal to 200.");
                    return;
                }
                partition = rectangle(n, cols);
                break;
            }
            case 'hook':
                partition = hook(n);
                break;
            default:
                alert("Unknown partition type selected.");
                return;
        }

        this.rowsInput.value = partition.join(' ');
    }

        

    processSetup() { 
        try { 
            SoundManager.play('click'); 
            const nums = this.rowsInput.value.trim().split(/\s+/).map(Number).filter(n => n > 0).sort((a,b) => b-a); 
            if (nums.length === 0 && this.rowsInput.value.trim() !== '0') { 
                this.startGame([], null); 
                this.setupModal.classList.remove('visible'); 
                return; 
            } 
            const aiSide = this.aiSelect.value === "None" ? null : this.aiSelect.value; 
            this.aiDifficultyValue = parseInt(this.difficultySlider.value); 
            this.setupModal.classList.remove('visible'); 
            const modeSelect = document.getElementById('game-mode-select');
            const gameMode = modeSelect ? modeSelect.value : 'normal';
            this.startGame(nums, aiSide, gameMode); 
        } catch (e) { 
            alert("Invalid input. Please enter positive integers only."); 
        } 
    }

    startGame(rows, aiSide, gameMode = 'normal') { 
        this.resetBoardDimensions();
        this.game = new Game(new Board(rows), aiSide, gameMode); 
        this.isAnimating = false; 
        this.clearGameHistory(); // Clear undo history for new game
        // Initialize database tracking
        this.movesSequence = [];
        this.gameStartTime = new Date();
        this.initialPartition = [...rows]; // Store initial partition
        this.redrawBoard(); 
        this.updateStatus(); 
        this.updateUndoButton();
        this.updateDownloadButton();
        this.updateDownloadButton();
        if (this.analysis && typeof this.analysis.onGameStart === 'function') {
            this.analysis.onGameStart();
        }
        if (this.game.isAiTurn()) { 
            this.aiTurn(); 
        } 
    }

    resetBoardDimensions() {
        // Reset to default dimensions for new games
        this.CELL = 40;
        this.MARGIN = 20;
        this.LABEL = 20;
    }

    aiTurn() { 
        if (!this.game || !this.game.isAiTurn() || this.isAnimating) return; 
        
        this.aiThinkingIndicator.classList.add('thinking'); 
        this.updateUndoButton(); // Update undo button state during AI turn
        this.updateDownloadButton();
        setTimeout(() => { 
            this.aiThinkingIndicator.classList.remove('thinking'); 
            let move; 
            const rand = Math.random(); 
            const legalMoves = []; 
            
            this.game.board.rowsAlive().forEach(i => legalMoves.push({type: 'row', index: i}));
            this.game.board.colsAlive().forEach(j => legalMoves.push({type: 'col', index: j}));
            
            // Calculate mistake probability based on difficulty value (1-100)
            // Perfect (100) = no mistakes, Easy (1-19) = high mistakes, etc.
            const mistakeProbability = this.aiDifficultyValue === 100 ? 0 : (100 - this.aiDifficultyValue) / 100;
            
            if (rand < mistakeProbability) { 
                move = legalMoves[Math.floor(Math.random() * legalMoves.length)]; 
            } else { 
                move = perfectMove(this.game.board.asTuple()); 
            } 
            this.executeAIMove(move); 
        }, this.AI_THINK_MS); 
    }

    executeAIMove(move) {
        // Find the corresponding label info and process the move directly
        const targetInfo = { kind: move.type, index: move.index };
        const labelEntry = [...this.idToAddress.entries()]
            .find(([_, info]) => info.kind === targetInfo.kind && info.index === targetInfo.index);
        
        if (labelEntry) {
            const [labelId, info] = labelEntry;
            const labelElement = document.getElementById(labelId);
            this.processMove(info, labelElement);
        }
    }

    updateStatus() { 
        if (!this.game || this.game.board.isEmpty()) { 
            this.statusLabel.textContent = 'Game Over'; 
            this.updateUndoButton(); // Update undo button when game is over
        this.updateDownloadButton();
            return; 
        } 
        const kind = this.game.isAiTurn() ? "Computer" : "Human"; 
        const newText = `Player ${this.game.currentPlayer} (${kind}) to move`; 
        if (this.statusLabel.textContent === newText) return; 
        this.statusLabel.classList.add('exiting'); 
        setTimeout(() => { 
            this.statusLabel.textContent = newText; 
            this.statusLabel.classList.remove('exiting'); 
            this.updateUndoButton(); // Update undo button after status change
            this.updateDownloadButton();
        }, 200); 
    }

    showHelp() { this.helpPopover.classList.add('visible'); }
    hideHelp() { this.helpPopover.classList.remove('visible'); }
    initTheme() { 
        const savedTheme = localStorage.getItem('theme') || 'dark'; 
        document.documentElement.setAttribute('data-theme', savedTheme); 
        this.themeToggle.checked = savedTheme === 'dark'; 
        // Initialize difficulty label
        this.updateDifficultyLabel();
    }
    toggleTheme() { 
        const newTheme = this.themeToggle.checked ? 'dark' : 'light'; 
        document.documentElement.setAttribute('data-theme', newTheme); 
        localStorage.setItem('theme', newTheme); 
    }

    openGameReport() {
        if (!this.game) return;
        // Collect states as row-length strings
        const allStates = (this.gameHistory || []).map(state => {
            const grid = state.board && state.board.grid ? state.board.grid : state.board;
            if (!Array.isArray(grid)) return '';
            const rowLengths = grid.map(row => row.reduce((s, v) => s + (v ? 1 : 0), 0)).filter(len => len > 0).sort((a, b) => b - a);
            return rowLengths.join(' ');
        }).filter(Boolean);
        const currentRowLens = this.game.board.getRows().join(' ');
        if (currentRowLens) allStates.push(currentRowLens);
        const uniqueStates = allStates.filter((s, i, self) => s && (i === 0 || s !== self[i - 1]));
        const statesString = uniqueStates.join('\n');
        localStorage.setItem('crimGameStatesForReport', statesString);
        const mode = this.game.gameMode || 'normal';
        localStorage.setItem('crimReportMode', mode);
        window.open('../../reports/generator/report.html', '_blank');
    }



    updateDifficultyLabel() {
        const value = parseInt(this.difficultySlider.value);
        const difficulty = this.getDifficultyFromValue(value);
        this.difficultyLabel.textContent = `${difficulty} (${value})`;
    }

    getDifficultyFromValue(value) {
        if (value < 20) return 'Easy';
        if (value <= 70) return 'Medium';
        if (value <= 99) return 'Hard';
        return 'Perfect';
    }

    showSetupModal() { 
        this.gameOverModal.classList.remove('visible'); 
        this.setupModal.classList.add('visible'); 
    }

    // Game state management for undo functionality
    saveGameState() {
        if (!this.game) return;
        
        // Deep copy the current board state
        const boardCopy = {
            grid: this.game.board.grid.map(row => [...row])
        };
        
        const gameState = {
            board: boardCopy,
            currentIndex: this.game.currentIndex
        };
        
        this.gameHistory.push(gameState);
        this.updateUndoButton();
        this.updateDownloadButton();
    }

    undoMove() {
        if (!this.game || this.gameHistory.length === 0 || this.isAnimating || this.game.isAiTurn()) {
            return;
        }

        SoundManager.play('click');
        
        // Restore the previous game state
        const previousState = this.gameHistory.pop();
        
        // Reconstruct the board
        this.game.board.grid = previousState.board.grid.map(row => [...row]);
        this.game.currentIndex = previousState.currentIndex;
        
        // Remove the last move from the sequence
        this.movesSequence.pop();
        
        // Redraw the board and update UI
        this.redrawBoard();
        this.updateStatus();
        this.updateUndoButton();
        this.updateDownloadButton();
    }

    updateUndoButton() {
        if (!this.undoBtn) return;
        
        const canUndo = this.game && this.gameHistory.length > 0 && !this.isAnimating && !this.game.isAiTurn();
        
        if (canUndo) {
            this.undoBtn.style.display = 'flex';
            this.undoBtn.disabled = false;
        } else if (this.game && this.gameHistory.length === 0) {
            this.undoBtn.style.display = 'flex';
            this.undoBtn.disabled = true;
        } else {
            this.undoBtn.style.display = 'none';
        }
    }

    updateDownloadButton() {
        if (!this.downloadBtn) return;
        
        // Show download button if there's game history or current game state
        const hasGameData = this.game && (this.gameHistory.length > 0 || this.game.board);
        
        if (hasGameData) {
            this.downloadBtn.style.display = 'flex';
            this.downloadBtn.disabled = false;
        } else {
            this.downloadBtn.style.display = 'none';
        }
    }

    clearGameHistory() {
        this.gameHistory = [];
        this.updateUndoButton();
        this.updateDownloadButton();
    }

    downloadGame() {
        if (!this.game) return;
        
        // Collect all game states (history + current), ensuring board is a 2D array
        const allStates = this.gameHistory.map(state => ({
            ...state,
            board: (state.board && state.board.grid) ? state.board.grid.map(row => [...row]) : state.board
        }));
        
        // Add current state if it's different from the last saved state
        const currentState = {
            board: this.game.board.grid.map(row => [...row]),
            currentIndex: this.game.currentIndex,
            timestamp: Date.now()
        };
        allStates.push(currentState);
        
        // Create the HTML content
        const htmlContent = this.generateGameReplayHTML(allStates);
        
        // Download the file
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `CRIM-Game-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    generateGameReplayHTML(gameStates) {
        const title = `CRIM Game Replay - ${new Date().toLocaleDateString()}`;
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: sans-serif;
            background: #fff;
            color: #111;
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .container {
            text-align: center;
            background: #fff;
            border-radius: 20px;
            padding: 30px;
            max-width: 800px;
            width: 100%;
            box-shadow: 0 4px 24px #0001;
        }
        h1 { margin-top: 0; color: #111; letter-spacing: 1px; }
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
            background: #eee;
            color: #111;
            cursor: pointer;
            transition: all 0.2s;
        }
        button:hover { background: #ddd; transform: translateY(-2px); }
        button:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .state-info {
            font-size: 18px;
            margin: 10px 0;
            font-weight: bold;
            color: #111;
        }
        #game-canvas {
            border: 2px solid #111;
            border-radius: 12px;
            margin: 20px auto;
            display: block;
            background: #fff;
            box-shadow: 0 8px 25px #0001;
        }
        .instructions {
            margin-top: 20px;
            font-size: 14px;
            opacity: 0.7;
            line-height: 1.6;
        }
        .error {
            color: #b00020;
            background: #f8d7da;
            padding: 12px;
            border-radius: 8px;
            margin: 20px 0;
            font-size: 1.1em;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${title}</h1>
        <div class="state-info">
            State <span id="current-state">1</span> of <span id="total-states">${gameStates.length}</span>
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
            <strong>Autoplay:</strong> Click Play to automatically advance through all states.
        </div>
    </div>

    <script>
        const gameStates = ${JSON.stringify(gameStates)};
        console.log('gameStates:', gameStates);
        let currentStateIndex = 0;
        let isPlaying = false;
        let playInterval;
        const CELL_SIZE = 40;
        const MARGIN = 20;

        const canvas = document.getElementById('game-canvas');
        const ctx = canvas.getContext('2d');
        const errorDiv = document.getElementById('error-message');

        function drawBoard(boardGrid) {
            if (!Array.isArray(boardGrid) || boardGrid.length === 0 || !Array.isArray(boardGrid[0])) {
                errorDiv.textContent = 'Game Ended.';
                errorDiv.style.display = 'block';
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                return;
            } else {
                errorDiv.style.display = 'none';
            }
            const boardHeight = boardGrid.length;
            const boardWidth = boardHeight > 0 ? boardGrid[0].length : 0;
            
            const canvasWidth = MARGIN * 2 + boardWidth * CELL_SIZE;
            const canvasHeight = MARGIN * 2 + boardHeight * CELL_SIZE;
            
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            
            ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            
            // Draw only black and white tiles
            for (let r = 0; r < boardHeight; r++) {
                for (let c = 0; c < boardWidth; c++) {
                    const x = MARGIN + c * CELL_SIZE;
                    const y = MARGIN + r * CELL_SIZE;
                    if (boardGrid[r][c] === 1) {
                        ctx.fillStyle = '#111';
                        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                    } else {
                        ctx.fillStyle = '#fff';
                        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                    }
                }
            }
            // Draw white gridlines
            ctx.save();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            for (let r = 0; r <= boardHeight; r++) {
                const y = MARGIN + r * CELL_SIZE;
                ctx.beginPath();
                ctx.moveTo(MARGIN, y);
                ctx.lineTo(MARGIN + boardWidth * CELL_SIZE, y);
                ctx.stroke();
            }
            for (let c = 0; c <= boardWidth; c++) {
                const x = MARGIN + c * CELL_SIZE;
                ctx.beginPath();
                ctx.moveTo(x, MARGIN);
                ctx.lineTo(x, MARGIN + boardHeight * CELL_SIZE);
                ctx.stroke();
            }
            ctx.restore();
        }

        function updateDisplay() {
            const state = gameStates[currentStateIndex];
            drawBoard(state.board);
            document.getElementById('current-state').textContent = currentStateIndex + 1;
            
            // Update button states
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
            const playBtn = document.getElementById('play-btn');
            if (isPlaying) {
                clearInterval(playInterval);
                isPlaying = false;
                playBtn.textContent = '▶ Play';
            } else {
                isPlaying = true;
                playBtn.textContent = '⏸ Pause';
                playInterval = setInterval(() => {
                    if (currentStateIndex < gameStates.length - 1) {
                        nextState();
                    } else {
                        toggleAutoplay(); // Stop at the end
                    }
                }, 1000);
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

        // Initialize
        updateDisplay();
    </script>
</body>
</html>`;
    }

    async storeGameInDatabase(winner) {
        try {
            if (window.DatabaseUtils) {
                await window.DatabaseUtils.storeGameInDatabase(
                    'CRIM',
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

window.onload = () => {
    const app = new ProLCTRGui();
    app.showSetupModal();
};
