// --- CORE GAME LOGIC FOR CRPM (Partidzan CRIM) ---

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

    // CRPM-specific methods for player-restricted moves
    hasMovesForPlayer(player) {
        if (player === 'A') {
            return this.rowsAlive().length > 0;
        } else if (player === 'B') {
            return this.colsAlive().length > 0;
        }
        return false;
    }

    getLegalMovesForPlayer(player) {
        const moves = [];
        if (player === 'A') {
            // Player A can only remove rows
            for (const rowIndex of this.rowsAlive()) {
                moves.push({ type: 'row', index: rowIndex });
            }
        } else if (player === 'B') {
            // Player B can only remove columns
            for (const colIndex of this.colsAlive()) {
                moves.push({ type: 'col', index: colIndex });
            }
        }
        return moves;
    }
}

// CRPM uses a partizan game evaluator since players have different move sets
const evaluationMemo = new Map();

function evaluatePosition(position, player) {
    const key = `${position}-${player}`;
    if (evaluationMemo.has(key)) {
        return evaluationMemo.get(key);
    }
    
    const rowLengths = JSON.parse(position);
    const board = new Board(rowLengths);
    
    // Check if current player has any moves
    if (!board.hasMovesForPlayer(player)) {
        // Current player loses (no moves available)
        evaluationMemo.set(key, -1);
        return -1;
    }
    
    const moves = board.getLegalMovesForPlayer(player);
    const nextPlayer = player === 'A' ? 'B' : 'A';
    
    // Try all possible moves
    for (const move of moves) {
        const childBoard = new Board([...rowLengths]);
        
        if (move.type === 'row') {
            childBoard.removeRow(move.index);
        } else {
            childBoard.removeColumn(move.index);
        }
        
        const childPosition = childBoard.asTuple();
        const childValue = evaluatePosition(childPosition, nextPlayer);
        
        // If we can force the opponent into a losing position, this is winning
        if (childValue === -1) {
            evaluationMemo.set(key, 1);
            return 1;
        }
    }
    
    // All moves lead to opponent winning positions, so this is losing
    evaluationMemo.set(key, -1);
    return -1;
}

function findBestMove(position, player) {
    const rowLengths = JSON.parse(position);
    const board = new Board(rowLengths);
    const moves = board.getLegalMovesForPlayer(player);
    const nextPlayer = player === 'A' ? 'B' : 'A';
    
    // First, try to find a winning move
    for (const move of moves) {
        const childBoard = new Board([...rowLengths]);
        
        if (move.type === 'row') {
            childBoard.removeRow(move.index);
        } else {
            childBoard.removeColumn(move.index);
        }
        
        const childPosition = childBoard.asTuple();
        const childValue = evaluatePosition(childPosition, nextPlayer);
        
        if (childValue === -1) {
            return move; // Winning move found
        }
    }
    
    // No winning move found, return any legal move
    return moves.length > 0 ? moves[0] : null;
}

// Game class for CRPM
class Game {
    static PLAYERS = ["A", "B"];
    
    constructor(board, aiPlayer, difficulty) {
        this.board = board;
        this.currentIndex = 0;
        this.aiIndex = aiPlayer ? Game.PLAYERS.indexOf(aiPlayer) : null;
        this.difficulty = difficulty || 50;
        this.gameHistory = [];
    }
    
    get currentPlayer() { return Game.PLAYERS[this.currentIndex]; }
    isAiTurn() { return this.aiIndex === this.currentIndex; }
    switchPlayer() { this.currentIndex = 1 - this.currentIndex; }
    
    canPlayerMakeMove(moveType) {
        const player = this.currentPlayer;
        if (player === 'A' && moveType === 'row') return true;
        if (player === 'B' && moveType === 'col') return true;
        return false;
    }
    
    makeMove(moveType, index) {
        if (!this.canPlayerMakeMove(moveType)) {
            return false; // Invalid move for current player
        }
        
        if (moveType === 'row') {
            this.board.removeRow(index);
        } else if (moveType === 'col') {
            this.board.removeColumn(index);
        }
        
        const finished = this.board.isEmpty() || !this.board.hasMovesForPlayer(this.currentPlayer === 'A' ? 'B' : 'A');
        if (!finished) {
            this.switchPlayer();
        }
        return finished;
    }
    
    hasLegalMoves() {
        return this.board.hasMovesForPlayer(this.currentPlayer);
    }
}

// Utility functions from CRIM
function staircase(n) {
    let parts = []; 
    let t = n; 
    while (t >= 1) {
        parts.push(t);
        t = t - 1; 
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
    return parts; 
}

// Sound manager (simplified)
const SoundManager = {
    sounds: {},
    init() { 
        // Sound effects disabled
    },
    play(soundName) { 
        // Sound effects disabled
    }
};

// Main GUI class for CRPM
class CRPMGui {
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
        this.gameHistory = [];
        // Database tracking
        this.movesSequence = [];
        this.gameStartTime = null;
        this.getDOMElements();
        this.bindEventListeners();
        this.initTheme();
        this.showSetupModal();
        SoundManager.init();
    }

    getDOMElements() {
        this.gameCard = document.getElementById('game-card');
        this.statusLabel = document.getElementById('status-label');
        this.boardArea = document.getElementById('board-area');
        this.aiThinkingIndicator = document.getElementById('ai-thinking-indicator');
        this.newGameBtn = document.getElementById('new-game-btn');
        this.undoBtn = document.getElementById('undo-btn');
        this.downloadBtn = document.getElementById('download-btn');
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
        this.cycleThemeBtn = document.getElementById('cycle-theme-btn');
        this.startGameBtn = document.getElementById('start-game-btn');
        this.playAgainBtn = document.getElementById('play-again-btn');
        this.gameOverMessage = document.getElementById('game-over-message');
        this.helpBtn = document.getElementById('help-btn');
        this.helpBtnModal = document.getElementById('help-btn-modal');
        this.helpPopover = document.getElementById('help-popover');
    }

    bindEventListeners() {
        this.startGameBtn.addEventListener('click', () => this.processSetup());
        this.newGameBtn.addEventListener('click', () => { SoundManager.play('click'); this.showSetupModal(); });
        this.undoBtn.addEventListener('click', () => { SoundManager.play('click'); this.undoMove(); });
        this.downloadBtn.addEventListener('click', () => { SoundManager.play('click'); this.downloadGame(); });
        this.playAgainBtn.addEventListener('click', () => { SoundManager.play('click'); this.showSetupModal(); });
        this.themeToggle.addEventListener('change', () => { SoundManager.play('click'); this.toggleTheme(); });
        // Theme cycling functionality
        if (this.cycleThemeBtn) {
            const themes = [
                { name: 'grass', icon: '🌱' },
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
                SoundManager.play('click');
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
    }

    showSetupModal() {
        this.setupModal.classList.add('visible');
        this.gameOverModal?.classList.remove('visible');
    }

    hideSetupModal() {
        this.setupModal.classList.remove('visible');
    }

    processSetup() {
        const rowsText = this.rowsInput.value.trim();
        const aiPlayer = this.aiSelect.value;
        this.aiDifficultyValue = parseInt(this.difficultySlider.value);
        
        let rows;
        try {
            rows = rowsText.split(/\s+/).map(x => parseInt(x.trim())).filter(x => x > 0).sort((a, b) => b - a);
            if (rows.length === 0) throw new Error("No valid rows");
        } catch (e) {
            alert("Please enter valid row lengths (e.g., '5 4 4 2')");
            return;
        }
        
        this.startGame(rows, aiPlayer === 'None' ? null : aiPlayer);
    }

    startGame(rows, aiPlayer) {
        this.hideSetupModal();
        evaluationMemo.clear(); // Reset memoization for new game
        
        const board = new Board(rows);
        this.game = new Game(board, aiPlayer, this.aiDifficultyValue);
        this.gameHistory = [board.asTuple()];
        
        // Initialize database tracking
        this.movesSequence = [];
        this.gameStartTime = new Date();
        
        this.clearBoard();
        this.redrawBoard();
        this.updateStatus();
        this.updateButtons();
        
        if (this.game.isAiTurn()) {
            this.aiTurn();
        }
    }

    clearBoard() {
        this.boardArea.innerHTML = '';
        this.idToAddress.clear();
    }

    redrawBoard() {
        this.clearBoard();
        if (!this.game) return;
        if (this.game.board.isEmpty()) {
            this.boardArea.innerHTML = '<p>Game Complete!</p>';
            return;
        }
        // Calculate required dimensions and update board area
        this.updateBoardDimensions();
        // Calculate center position for the board
        const board = this.game.board;
        const boardWidth = board.width();
        const boardHeight = board.height();
        const boardAreaWidth = this.boardArea.offsetWidth;
        const boardAreaHeight = this.boardArea.offsetHeight;
        const contentWidth = this.LABEL + (boardWidth * this.CELL) + this.LABEL;
        const contentHeight = this.LABEL + (boardHeight * this.CELL) + this.LABEL;
        const centerX = (boardAreaWidth - contentWidth) / 2;
        const x0 = centerX + this.LABEL;
        const y0 = this.LABEL;
        // Draw row labels (only clickable for Player A)
        board.rowsAlive().forEach(r => {
            const div = document.createElement('div');
            div.className = 'label-cell';
            div.style.width = `${this.LABEL}px`;
            div.style.height = `${this.CELL}px`;
            div.style.left = `${x0 - this.LABEL}px`;
            div.style.top = `${y0 + r * this.CELL}px`;
            div.textContent = r + 1;
            const id = `lbl-${++this.idCounter}`;
            div.id = id;
            this.idToAddress.set(id, { kind: 'row', index: r });
            if (this.game.currentPlayer === 'A') {
                div.addEventListener('click', e => this.handleLabelClick('row', r));
                div.classList.add('clickable');
            } else {
                div.classList.add('disabled');
            }
            this.boardArea.appendChild(div);
        });
        // Draw column labels (only clickable for Player B)
        board.colsAlive().forEach(c => {
            const div = document.createElement('div');
            div.className = 'label-cell';
            div.style.width = `${this.CELL}px`;
            div.style.height = `${this.LABEL}px`;
            div.style.left = `${x0 + c * this.CELL}px`;
            div.style.top = `${y0 - this.LABEL}px`;
            div.textContent = c + 1;
            const id = `lbl-${++this.idCounter}`;
            div.id = id;
            this.idToAddress.set(id, { kind: 'col', index: c });
            if (this.game.currentPlayer === 'B') {
                div.addEventListener('click', e => this.handleLabelClick('col', c));
                div.classList.add('clickable');
            } else {
                div.classList.add('disabled');
            }
            this.boardArea.appendChild(div);
        });
        // Draw tiles
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

    updateBoardDimensions() {
        if (!this.game) return;
        const board = this.game.board;
        const boardHeight = board.height();
        const boardWidth = board.width();
        let requiredWidth = this.LABEL + (boardWidth * this.CELL) + this.LABEL;
        let requiredHeight = this.LABEL + (boardHeight * this.CELL) + this.LABEL;
        const minDimension = 520;
        requiredWidth = Math.max(requiredWidth, minDimension);
        requiredHeight = Math.max(requiredHeight, minDimension);
        this.boardArea.style.width = `${requiredWidth}px`;
        this.boardArea.style.height = `${requiredHeight}px`;
    }

    handleLabelClick(kind, index) {
        if (this.isAnimating || !this.game) return;
        
        // Check if this move is valid for current player
        if (!this.game.canPlayerMakeMove(kind)) {
            return; // Invalid move for current player
        }
        
        // Save game state for undo
        this.gameHistory.push(this.game.board.asTuple());
        
        this.executeMove(kind, index);
    }

    executeMove(kind, index) {
        this.isAnimating = true;
        SoundManager.play('click');
        
        // Highlight tiles that will be removed
        if (kind === 'row') {
            for (let c = 0; c < this.game.board.width(); c++) {
                if (this.game.board.grid[index] && this.game.board.grid[index][c] === 1) {
                    const tileId = this.findTileId(index, c);
                    if (tileId) {
                        document.getElementById(tileId)?.classList.add('removing');
                    }
                }
            }
        } else {
            for (let r = 0; r < this.game.board.height(); r++) {
                if (this.game.board.grid[r] && this.game.board.grid[r][index] === 1) {
                    const tileId = this.findTileId(r, index);
                    if (tileId) {
                        document.getElementById(tileId)?.classList.add('removing');
                    }
                }
            }
        }
        
        setTimeout(() => {
            // Track the move
            this.movesSequence.push(kind === 'row' ? `R${index}` : `C${index}`);
            
            const gameOver = this.game.makeMove(kind, index);
            this.isAnimating = false;
            
            this.redrawBoard();
            this.updateStatus();
            this.updateButtons();
            
            if (gameOver) {
                this.gameHistory.push('[]');
                SoundManager.play('win');
                this.showGameOver();
                this.storeGameInDatabase(this.game.currentPlayer === 'A' ? 'B' : 'A');
            } else if (this.game.isAiTurn()) {
                this.aiTurn();
            }
        }, this.ANIMATION_MS);
    }

    findTileId(row, col) {
        for (const [id, address] of this.idToAddress.entries()) {
            if (address.kind === 'row' && address.index === row) {
                return id;
            }
            if (address.kind === 'col' && address.index === col) {
                return id;
            }
        }
        return null;
    }

    updateStatus() {
        if (!this.game) {
            this.statusLabel.textContent = 'Loading...';
            return;
        }
        
        const currentPlayer = this.game.currentPlayer;
        
        if (this.game.board.isEmpty()) {
            const winner = currentPlayer === 'A' ? 'B' : 'A'; // Previous player wins
            this.statusLabel.textContent = `Game Over - Player ${winner} wins!`;
            return;
        }
        
        if (!this.game.hasLegalMoves()) {
            const winner = currentPlayer === 'A' ? 'B' : 'A'; // Other player wins
            this.statusLabel.textContent = `Game Over - Player ${winner} wins!`;
            this.showGameOver();
            return;
        }
        
        if (this.game.isAiTurn()) {
            const moveType = currentPlayer === 'A' ? 'Rows' : 'Columns';
            this.statusLabel.textContent = `Computer (Player ${currentPlayer} - ${moveType}) is thinking...`;
        } else {
            const moveType = currentPlayer === 'A' ? 'Rows' : 'Columns';
            this.statusLabel.textContent = `Player ${currentPlayer} turn - Click ${moveType}`;
        }
    }

    updateButtons() {
        if (this.undoBtn) {
            this.undoBtn.style.display = this.gameHistory.length > 1 ? 'block' : 'none';
        }
        if (this.downloadBtn) {
            this.downloadBtn.style.display = this.gameHistory.length > 1 ? 'block' : 'none';
        }
    }

    aiTurn() {
        if (!this.game || !this.game.isAiTurn() || this.game.board.isEmpty()) return;
        
        this.aiThinkingIndicator.classList.add('visible');
        
        setTimeout(() => {
            try {
                let move;
                
                if (this.aiDifficultyValue < 30) {
                    // Easy: Random move
                    const moves = this.game.board.getLegalMovesForPlayer(this.game.currentPlayer);
                    move = moves[randomInt(0, moves.length - 1)];
                } else if (this.aiDifficultyValue < 70) {
                    // Medium: Mix of optimal and random
                    if (Math.random() < 0.7) {
                        move = findBestMove(this.game.board.asTuple(), this.game.currentPlayer);
                    } else {
                        const moves = this.game.board.getLegalMovesForPlayer(this.game.currentPlayer);
                        move = moves[randomInt(0, moves.length - 1)];
                    }
                } else {
                    // Hard: Always optimal
                    move = findBestMove(this.game.board.asTuple(), this.game.currentPlayer);
                }
                
                this.aiThinkingIndicator.classList.remove('visible');
                
                if (move) {
                    this.gameHistory.push(this.game.board.asTuple());
                    this.executeMove(move.type, move.index);
                }
            } catch (error) {
                console.error('AI move error:', error);
                this.aiThinkingIndicator.classList.remove('visible');
            }
        }, this.AI_THINK_MS);
    }

    showGameOver() {
        const winner = this.game.currentPlayer === 'A' ? 'B' : 'A';
        const winnerType = winner === 'A' ? 'Rows' : 'Columns';
        this.gameOverMessage.textContent = `Player ${winner} (${winnerType}) wins!`;
        this.gameOverModal.classList.add('visible');
    }

    undoMove() {
        if (this.gameHistory.length > 1) {
            this.gameHistory.pop(); // Remove current state
            const previousState = this.gameHistory[this.gameHistory.length - 1];
            const rowLengths = JSON.parse(previousState);
            this.game.board = new Board(rowLengths);
            this.game.switchPlayer(); // Go back to previous player
            
            // Remove the last move from the sequence
            this.movesSequence.pop();
            this.redrawBoard();
            this.updateStatus();
            this.updateButtons();
        }
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
        const type = this.partitionTypeSelect.value;
        const number = parseInt(this.partitionNumberInput.value) || 25;

        if (number <= 0) {
            alert("Please enter a valid positive number");
            return;
        }

        let partition;
        switch (type) {
            case 'staircase':
                partition = staircase(number);
                break;
            case 'rectangle': {
                const cols = parseInt(this.partitionColsInput.value) || 0;
                if (cols <= 0) {
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

        this.rowsInput.value = partition.join(' ');
        SoundManager.play('click');
    }

    updateDifficultyLabel() {
        const value = this.difficultySlider.value;
        let label = 'Medium';
        if (value < 30) label = 'Easy';
        else if (value > 70) label = 'Hard';
        this.difficultyLabel.textContent = `${label} (${value})`;
    }

    toggleTheme() {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        localStorage.setItem('crpm-theme', isDark ? 'dark' : 'light');
    }

    applyTileTheme() {
        // This method is now handled by the cycle theme button
        // The theme is applied directly in the updateTheme function
    }

    initTheme() {
        const savedTheme = localStorage.getItem('crpm-theme');
        
        if (savedTheme === 'dark') {
            this.themeToggle.checked = true;
            document.body.classList.add('dark-theme');
        }
        
        // Tile theme is now handled by the cycle theme button
        // The initial theme will be set when the cycle button is initialized
    }

    showHelp() {
        this.helpPopover.classList.add('visible');
    }

    hideHelp() {
        this.helpPopover.classList.remove('visible');
    }

    downloadGame() {
        if (!this.game) return;
        
        // Collect all game states (history + current), ensuring board is a 2D array
        const allStates = this.gameHistory.map(state => ({
            board: JSON.parse(state), // Convert partition string back to row lengths
            currentIndex: null, // Will be set based on move number
            timestamp: Date.now()
        }));
        
        // Set currentIndex for each state based on move number
        for (let i = 0; i < allStates.length; i++) {
            allStates[i].currentIndex = i % 2; // 0 for A, 1 for B
        }
        
        // Add current state if game is ongoing
        if (this.game && !this.game.board.isEmpty()) {
            const currentRowLengths = this.game.board.grid.map(row => row.reduce((sum, cell) => sum + cell, 0)).filter(len => len > 0);
            allStates.push({
                board: currentRowLengths,
                currentIndex: this.game.currentIndex,
                timestamp: Date.now()
            });
        }
        
        // Create the HTML content
        const htmlContent = this.generateGameReplayHTML(allStates);
        
        // Download the file
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `CRPM-Game-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    generateGameReplayHTML(gameStates) {
        const title = `CRPM Game Replay - ${new Date().toLocaleDateString()}`;
        
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
            transition: all .2s;
        }
        button:hover {
            background: #ddd;
            transform: translateY(-2px);
        }
        button:disabled {
            opacity: .5;
            cursor: not-allowed;
            transform: none;
        }
        .state-info {
            font-size: 18px;
            margin: 10px 0;
            font-weight: bold;
            color: #111;
        }
        .player-info {
            font-size: 16px;
            margin: 5px 0;
            color: #666;
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
            opacity: .7;
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
        .game-info {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${title}</h1>
        <div class="game-info">
            <strong>CRPM Rules:</strong> Player A can only remove rows, Player B can only remove columns.<br>
            <strong>Victory:</strong> The player who cannot make a legal move loses.
        </div>
        <div class="state-info">
            State <span id="current-state">1</span> of <span id="total-states">${gameStates.length}</span>
        </div>
        <div class="player-info" id="player-info">Initial Position</div>
        <div class="controls">
            <button id="first-btn" onclick="goToState(0)">⏮ First</button>
            <button id="prev-btn" onclick="previousState()">◀ Previous</button>
            <button id="play-btn" onclick="toggleAutoplay()">▶ Play</button>
            <button id="next-btn" onclick="nextState()">Next ▶</button>
            <button id="last-btn" onclick="goToState(gameStates.length-1)">Last ⏭</button>
        </div>
        <canvas id="game-canvas" width="500" height="400"></canvas>
        <div id="error-message" class="error" style="display:none"></div>
        <div class="instructions">
            <strong>Navigation:</strong> Use ←/→ keys or the buttons above.<br>
            <strong>Autoplay:</strong> Press Play to advance automatically.<br>
            <strong>CRPM Rules:</strong> Asymmetric moves create strategic depth through player-specific constraints.
        </div>
    </div>

<script>
const gameStates = ${JSON.stringify(gameStates)};
let currentStateIndex = 0;
let autoplayInterval = null;
const CELL_SIZE = 35;
const MARGIN = 10;

function initReplay() {
    if (gameStates.length === 0) {
        showError("No game states to display.");
        return;
    }
    goToState(0);
    
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
}

function goToState(index) {
    if (index < 0 || index >= gameStates.length) return;
    
    currentStateIndex = index;
    renderState(gameStates[index]);
    updateUI();
}

function nextState() {
    if (currentStateIndex < gameStates.length - 1) {
        goToState(currentStateIndex + 1);
    }
}

function previousState() {
    if (currentStateIndex > 0) {
        goToState(currentStateIndex - 1);
    }
}

function toggleAutoplay() {
    const playBtn = document.getElementById('play-btn');
    
    if (autoplayInterval) {
        clearInterval(autoplayInterval);
        autoplayInterval = null;
        playBtn.textContent = '▶ Play';
    } else {
        playBtn.textContent = '⏸ Pause';
        autoplayInterval = setInterval(() => {
            if (currentStateIndex < gameStates.length - 1) {
                nextState();
            } else {
                toggleAutoplay(); // Stop at end
            }
        }, 1500);
    }
}

function updateUI() {
    document.getElementById('current-state').textContent = currentStateIndex + 1;
    document.getElementById('total-states').textContent = gameStates.length;
    
    // Update player info
    const playerInfoEl = document.getElementById('player-info');
    if (currentStateIndex === 0) {
        playerInfoEl.textContent = 'Initial Position';
    } else {
        const player = (currentStateIndex % 2 === 1) ? 'A' : 'B';
        const moveType = player === 'A' ? 'Rows' : 'Columns';
        playerInfoEl.textContent = \`Move \${currentStateIndex} - Player \${player} (\${moveType} only)\`;
    }
    
    // Update button states
    document.getElementById('first-btn').disabled = currentStateIndex === 0;
    document.getElementById('prev-btn').disabled = currentStateIndex === 0;
    document.getElementById('next-btn').disabled = currentStateIndex === gameStates.length - 1;
    document.getElementById('last-btn').disabled = currentStateIndex === gameStates.length - 1;
}

function renderState(state) {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (!state.board || state.board.length === 0) {
        // Empty board
        ctx.fillStyle = '#999';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Empty Board - Game Over', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    const rows = state.board.length;
    const maxCols = Math.max(...state.board);
    
    // Calculate starting position to center the board
    const boardWidth = maxCols * CELL_SIZE + (maxCols - 1) * 2;
    const boardHeight = rows * CELL_SIZE + (rows - 1) * 2;
    const startX = (canvas.width - boardWidth) / 2;
    const startY = (canvas.height - boardHeight) / 2;
    
    // Draw board
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < state.board[r]; c++) {
            const x = startX + c * (CELL_SIZE + 2);
            const y = startY + r * (CELL_SIZE + 2);
            
            // Draw tile
            ctx.fillStyle = '#4299e1';
            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
            
            // Draw border
            ctx.strokeStyle = '#2b6cb0';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
        }
    }
    
    // Draw row and column labels
    ctx.fillStyle = '#666';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    
    // Row labels
    for (let r = 0; r < rows; r++) {
        const y = startY + r * (CELL_SIZE + 2) + CELL_SIZE / 2;
        ctx.fillText(\`R\${r + 1}\`, startX - 20, y + 4);
    }
    
    // Column labels
    for (let c = 0; c < maxCols; c++) {
        const x = startX + c * (CELL_SIZE + 2) + CELL_SIZE / 2;
        ctx.fillText(\`C\${c + 1}\`, x, startY - 10);
    }
    
    hideError();
}

function showError(message) {
    const errorEl = document.getElementById('error-message');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

function hideError() {
    const errorEl = document.getElementById('error-message');
    errorEl.style.display = 'none';
}

// Initialize when page loads
window.addEventListener('load', initReplay);
</script>
</body>
</html>`;
    }

    async storeGameInDatabase(winner) {
        try {
            if (window.DatabaseUtils) {
                await window.DatabaseUtils.storeGameInDatabase(
                    'CRPM',
                    JSON.parse(this.gameHistory[0]),
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
    new CRPMGui();
}); 