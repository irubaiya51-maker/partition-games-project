// --- CORE GAME LOGIC ---

class Fragment {
    constructor(grid) {
        this.grid = grid; // 2D array where 1 = filled square, 0 = empty
        this.x = 0; // Position for rendering
        this.y = 0;
    }
    
    static fromRowSizes(rowSizes) {
        const width = rowSizes.length > 0 ? Math.max(...rowSizes) : 0;
        const grid = rowSizes.map(len => Array.from({ length: width }, (_, i) => i < len ? 1 : 0));
        return new Fragment(grid);
    }
    
    get rows() { return this.grid.length; }
    get cols() { return this.grid.length > 0 ? this.grid[0].length : 0; }
    
    isEmpty() {
        return this.grid.length === 0 || !this.grid.some(row => row.some(cell => cell === 1));
    }
    
    squares() {
        const coords = [];
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] === 1) {
                    coords.push({ r, c });
                }
            }
        }
        return coords;
    }
    
    // Remove hook at position (r, c): all squares (r, c'), c' >= c, and (r', c), r' >= r
    removeHook(r, c) {
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols && this.grid[r][c] === 1) {
            // Remove the hook: all squares to the right in row r and all squares below in column c
            for (let row = r; row < this.rows; row++) {
                if (row === r) {
                    // Remove all squares to the right in row r (including the selected square)
                    for (let col = c; col < this.cols; col++) {
                        this.grid[row][col] = 0;
                    }
                } else {
                    // Remove the square in column c (if it exists)
                    if (c < this.cols) {
                        this.grid[row][c] = 0;
                    }
                }
            }
            
            // After removal, merge/compact the remaining squares
            this.mergeSquares();
        }
    }
    
    // Merge and compact remaining squares like in CRIM
    mergeSquares() {
        // Convert the grid back to row lengths, filtering out empty rows
        const rowLengths = [];
        for (let r = 0; r < this.rows; r++) {
            let length = 0;
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] === 1) {
                    length++;
                }
            }
            if (length > 0) {
                rowLengths.push(length);
            }
        }
        
        // Sort in descending order to maintain Young diagram property
        rowLengths.sort((a, b) => b - a);
        
        // Rebuild the grid from the merged row lengths
        if (rowLengths.length === 0) {
            this.grid = [];
            return;
        }
        
        const maxWidth = Math.max(...rowLengths);
        this.grid = rowLengths.map(len => 
            Array.from({ length: maxWidth }, (_, i) => i < len ? 1 : 0)
        );
    }
    

    
    hasMoves() {
        return this.squares().length > 0;
    }
    
    // Get current row sizes from the grid
    getRowSizes() {
        const rowLengths = [];
        for (let r = 0; r < this.rows; r++) {
            let length = 0;
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] === 1) {
                    length++;
                }
            }
            if (length > 0) {
                rowLengths.push(length);
            }
        }
        return rowLengths.sort((a, b) => b - a); // Sort in descending order
    }
}

class GameState {
    constructor(rowSizes) {
        this.board = Fragment.fromRowSizes(rowSizes);
        this.currentPlayer = 0; // 0 = Player A, 1 = Player B
    }
    
    get player() {
        return this.currentPlayer === 0 ? 'A' : 'B';
    }
    
    hasMoves() {
        return this.board.hasMoves();
    }
    
    performMove(r, c) {
        this.board.removeHook(r, c);
        this.currentPlayer = 1 - this.currentPlayer;
    }
    
    getAllSquares() {
        return this.board.squares();
    }
    
    getBoard() {
        return this.board;
    }
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
    return parts.sort((a, b) => b - a);
}

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
    let t = rows;
    while (t >= 1) {
        parts.push(cols);
        t = t - 1;
    }
    return parts;
}

function hook(n) {
    let parts = [];
    let t = n;
    parts.push(t);
    while (t >= 2) {
        parts.push(1);
        t = t - 1;
    }
    return parts;
}

class Game {
    static PLAYERS = ["A", "B"];
    constructor(rowSizes, aiPlayer) {
        this.gameState = new GameState(rowSizes);
        this.aiIndex = aiPlayer ? Game.PLAYERS.indexOf(aiPlayer) : null;
    }
    
    get currentPlayer() { return this.gameState.player; }
    isAiTurn() { return this.aiIndex !== null && Game.PLAYERS.indexOf(this.gameState.player) === this.aiIndex; }
    
    makeMove(r, c) {
        this.gameState.performMove(r, c);
        return !this.gameState.hasMoves();
    }
    
    getAllSquares() {
        return this.gameState.getAllSquares();
    }
    
    getBoard() {
        return this.gameState.getBoard();
    }
    
    isEmpty() {
        return !this.gameState.hasMoves();
    }
}

const SoundManager = {
    sounds: {},
    init() {},
    play(soundName) {}
};

class SatoWelterGui {
    constructor() {
        this.CELL = 40;
        this.GAP = 1; // Small gap between tiles to prevent border overlap
        this.MARGIN = 20;
        this.ANIMATION_MS = 650;
        this.AI_THINK_MS = 1100;
        this.game = null;
        this.hoveredMove = null;
        this.isAnimating = false;
        this.aiDifficulty = 'Medium';
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
        this.themeSelect = document.getElementById('theme-select');
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
        this.downloadBtnModal = document.getElementById('download-btn-modal');
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
        if (this.generatePartitionBtn) {
            this.generatePartitionBtn.addEventListener('click', () => this.generatePartition());
        }
        if (this.partitionTypeSelect) {
            this.partitionTypeSelect.addEventListener('change', () => this.updatePartitionUI());
            this.updatePartitionUI();
        }
        if (this.downloadBtnModal) {
            this.downloadBtnModal.addEventListener('click', () => { SoundManager.play('click'); this.downloadGame(); });
        }
        if (this.themeSelect) {
            this.themeSelect.addEventListener('change', () => this.applyTileTheme());
        }
        this.boardArea.addEventListener('mousemove', (event) => this.handleMouseMove(event));
        this.boardArea.addEventListener('mouseleave', () => this.handleMouseLeave());
        this.boardArea.addEventListener('click', (event) => this.handleMouseClick(event));
    }
    applyTileTheme() {
        if (this.themeSelect && this.gameCard) {
            this.gameCard.setAttribute('data-tile-theme', this.themeSelect.value);
        }
    }
    processSetup() {
        try {
            SoundManager.play('click');
            const nums = this.rowsInput.value.trim().split(/\s+/).map(Number).filter(n => n > 0).sort((a, b) => b - a);
            if (nums.length === 0 || nums.some(n => isNaN(n) || n <= 0)) throw new Error("Invalid input");
            const aiSide = this.aiSelect.value === "None" ? null : this.aiSelect.value;
            this.aiDifficulty = this.difficultySlider.value;
            this.applyTileTheme();
            this.setupModal.classList.remove('visible');
            this.setupModal.style.opacity = '0';
            this.setupModal.style.visibility = 'hidden';
            this.startGame(nums, aiSide);
        } catch (e) {
            alert("Invalid input. Please enter positive integers only.");
        }
    }
    startGame(rows, aiSide) {
        this.game = new Game(rows, aiSide);
        this.hoveredMove = null;
        this.isAnimating = false;
        this.clearGameHistory();
        // Initialize database tracking
        this.movesSequence = [];
        this.gameStartTime = new Date();
        this.initialPartition = [...rows]; // Store initial partition
        this.redrawBoard();
        this.updateStatus();
        this.updateUndoButton();
        this.updateDownloadButton();
        if (this.game.isAiTurn()) { this.aiTurn(); }
    }
    aiTurn() {
        if (!this.game || !this.game.isAiTurn() || this.isAnimating) return;
        this.aiThinkingIndicator.classList.add('thinking');
        setTimeout(() => {
            this.aiThinkingIndicator.classList.remove('thinking');
            
            // Get all legal moves (all squares)
            const legalMoves = this.game.getAllSquares();
            
            if (legalMoves.length === 0) return;
            
            // For now, AI just makes random moves (could implement more sophisticated logic later)
            const move = legalMoves[Math.floor(Math.random() * legalMoves.length)];
            this.executeWithAnimation(move.r, move.c);
        }, this.AI_THINK_MS);
    }
    handleMouseMove(event) {
        if (!this.game || this.game.isAiTurn() || this.isAnimating) return;
        const rect = this.boardArea.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        let hovered = null;

        const board = this.game.getBoard();

        // *** ADD THE CENTERING LOGIC HERE AS WELL ***
        const boardDataWidth = board.cols * this.CELL + (board.cols - 1) * this.GAP;
        const minDimension = 480;
        let boardWidth = Math.max(this.MARGIN * 2 + boardDataWidth, minDimension);
        const actualContentWidth = this.MARGIN * 2 + boardDataWidth;
        const centerOffsetX = (boardWidth - actualContentWidth) / 2;
        
        // Find which square is hovered using the offset
        board.squares().forEach(({ r, c }) => {
            // Use the offset when calculating the tile's left boundary
            const left = centerOffsetX + this.MARGIN + c * (this.CELL + this.GAP);
            const top = this.MARGIN + r * (this.CELL + this.GAP);
            if (mouseX >= left && mouseX < left + this.CELL && mouseY >= top && mouseY < top + this.CELL) {
                hovered = { r, c };
            }
        });
        
        if (hovered && (!this.hoveredMove || 
            hovered.r !== this.hoveredMove.r || 
            hovered.c !== this.hoveredMove.c)) {
            SoundManager.play('hover');
        }
        
        this.hoveredMove = hovered;
        // This part remains the same, as it just adds/removes CSS classes
        this.gameCard.querySelectorAll('.tile').forEach(t => t.classList.remove('highlighted'));
        
        if (this.hoveredMove) {
            board.squares().forEach(({ r, c }) => {
                if ((r === this.hoveredMove.r && c >= this.hoveredMove.c) || 
                    (c === this.hoveredMove.c && r >= this.hoveredMove.r)) {
                    document.getElementById(`tile-${r}-${c}`)?.classList.add('highlighted');
                }
            });
        }
        this.boardArea.classList.toggle('clickable', !!this.hoveredMove);
    }
    handleMouseLeave() {
        this.hoveredMove = null;
        this.gameCard.querySelectorAll('.tile').forEach(t => t.classList.remove('highlighted'));
        this.boardArea.classList.remove('clickable');
    }
    handleMouseClick(event) {
        if (!this.game || this.isAnimating || this.game.isAiTurn() || !this.hoveredMove) return;
        this.executeWithAnimation(this.hoveredMove.r, this.hoveredMove.c);
    }
    
    executeWithAnimation(r, c) {
        if (this.isAnimating) return;
        this.isAnimating = true;
        this.handleMouseLeave();
        SoundManager.play('remove');
        
        // Save state before making the move
        this.saveGameState();
        
        // Animate: highlight the hook
        const board = this.game.getBoard();
        board.squares().forEach(({ r: fr, c: fc }) => {
            if ((fr === r && fc >= c) || (fc === c && fr >= r)) {
                document.getElementById(`tile-${fr}-${fc}`)?.classList.add('removing');
            }
        });
        
        setTimeout(() => this.finishMove(r, c), this.ANIMATION_MS);
    }
    
    finishMove(r, c) {
        // Track the move
        this.movesSequence.push(`R${r}C${c}`);
        
        const mover = this.game.currentPlayer; // Player who is about to move
        const finished = this.game.makeMove(r, c);
        this.isAnimating = false;
        if (finished) {
            SoundManager.play('win');
            this.gameOverMessage.textContent = `Player ${mover} wins!`;
            this.gameOverModal.classList.add('visible');
            this.storeGameInDatabase(mover);
            this.redrawBoard();
            this.updateUndoButton();
            this.updateDownloadButton();
            return;
        }
        this.redrawBoard();
        this.updateStatus();
        this.updateUndoButton();
        this.updateDownloadButton();
        if (this.game.isAiTurn()) { this.aiTurn(); }
    }
    redrawBoard() {
        this.boardArea.innerHTML = ''; // Clear the board more efficiently
        if (!this.game) return;

        const board = this.game.getBoard();

        // Calculate actual content size including gaps
        const boardDataWidth = board.cols * this.CELL + (board.cols - 1) * this.GAP;
        const boardDataHeight = board.rows * this.CELL + (board.rows - 1) * this.GAP;
        const minDimension = 480;

        // Determine the full container size, enforcing a minimum
        let boardWidth = Math.max(this.MARGIN * 2 + boardDataWidth, minDimension);
        let boardHeight = Math.max(this.MARGIN * 2 + boardDataHeight, minDimension);

        // *** THIS IS THE CRITICAL CENTERING LOGIC ***
        // Calculate the horizontal offset needed to center the content
        const actualContentWidth = this.MARGIN * 2 + boardDataWidth;
        const centerOffsetX = (boardWidth - actualContentWidth) / 2;

        // Draw squares for the board using the calculated offset
        board.squares().forEach(({ r, c }) => {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.id = `tile-${r}-${c}`;
            tile.style.width = `${this.CELL}px`;
            tile.style.height = `${this.CELL}px`;
            // Apply the centering offset to the left position
            tile.style.left = `${centerOffsetX + this.MARGIN + c * (this.CELL + this.GAP)}px`;
            tile.style.top = `${this.MARGIN + r * (this.CELL + this.GAP)}px`;
            this.boardArea.appendChild(tile);
        });
        
        // Set the final size of the board area container
        this.boardArea.style.width = `${boardWidth}px`;
        this.boardArea.style.height = `${boardHeight}px`;
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
    showHelp() { this.helpPopover.classList.add('visible'); }
    hideHelp() { this.helpPopover.classList.remove('visible'); }
    initTheme() { const savedTheme = localStorage.getItem('theme') || 'light'; document.documentElement.setAttribute('data-theme', savedTheme); this.themeToggle.checked = savedTheme === 'dark'; }
    toggleTheme() { const newTheme = this.themeToggle.checked ? 'dark' : 'light'; document.documentElement.setAttribute('data-theme', newTheme); localStorage.setItem('theme', newTheme); }
    showSetupModal() { 
        this.gameOverModal.classList.remove('visible'); 
        
        // Clear any inline styles that might override the CSS
        this.setupModal.style.opacity = '';
        this.setupModal.style.visibility = '';
        
        this.setupModal.classList.add('visible');
        this.statusLabel.textContent = 'Waiting for start…';
    }
    updateDifficultyLabel() {
        const difficulty = this.difficultySlider.value;
        this.difficultyLabel.textContent = `AI Difficulty: ${difficulty}`;
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
        if (partitionType === 'random') {
            partition = randomPartition(n);
        } else if (partitionType === 'staircase') {
            partition = staircase(n);
        } else if (partitionType === 'rectangle') {
            const cols = parseInt(this.partitionColsInput.value, 10);
            if (isNaN(cols) || cols <= 0 || cols > 200) {
                alert("Please enter a positive number of columns less than or equal to 200.");
                return;
            }
            partition = rectangle(n, cols);
        } else if (partitionType === 'hook') {
            partition = hook(n);
        }
        this.rowsInput.value = partition.join(' ');
    }
    
    saveGameState() {
        if (!this.game) return;
        
        // Deep copy the current board state
        const boardCopy = {
            grid: this.game.getBoard().grid.map(row => [...row])
        };
        
        const gameState = {
            board: boardCopy,
            currentPlayer: this.game.currentPlayer
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
        this.game.getBoard().grid = previousState.board.grid.map(row => [...row]);
        this.game.gameState.currentPlayer = previousState.currentPlayer === 'A' ? 0 : 1;
        
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
        
        if (this.game && this.gameHistory.length >= 0) {
            this.undoBtn.style.display = 'flex';
            this.undoBtn.disabled = !canUndo;
        } else {
            this.undoBtn.style.display = 'none';
        }
    }

    updateDownloadButton() {
        if (!this.downloadBtn) return;
        
        // Show download button if there's game history or current game state
        const hasGameData = this.game && (this.gameHistory.length > 0 || this.game.getBoard());
        
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
        
        const html = this.generateGameReplayHTML();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Sato-Welter-Game-${Date.now()}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    generateGameReplayHTML() {
        if (!this.game) return '';

        // Build game states including current state
        const gameStates = [...this.gameHistory];
        
        // Add current state
        const currentBoardState = {
            board: {
                grid: this.game.getBoard().grid.map(row => [...row])
            },
            currentPlayer: this.game.currentPlayer
        };
        gameStates.push(currentBoardState);

        const title = `Sato-Welter Game Replay - ${new Date().toLocaleDateString()}`;

        return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title}</title>
<style>
 body{font-family:sans-serif;background:#fff;color:#111;margin:0;padding:20px;
       min-height:100vh;display:flex;flex-direction:column;align-items:center;}
 .container{background:#fff;border-radius:20px;padding:30px;max-width:800px;width:100%;
            box-shadow:0 4px 24px #0001;text-align:center;}
 h1{margin-top:0;color:#111;letter-spacing:1px;}
 .controls{margin:20px 0;display:flex;justify-content:center;align-items:center;
           gap:20px;flex-wrap:wrap;}
 button{padding:12px 20px;font-size:16px;border:none;border-radius:8px;
        background:#eee;color:#111;cursor:pointer;transition:all .2s;}
 button:hover{background:#ddd;transform:translateY(-2px);}
 button:disabled{opacity:.5;cursor:not-allowed;transform:none;}
 .state-info{font-size:18px;margin:10px 0;font-weight:bold;color:#111;}
 #game-canvas{border:2px solid #111;border-radius:12px;margin:20px auto;display:block;
             background:#fff;box-shadow:0 8px 25px #0001;}
 .instructions{margin-top:20px;font-size:14px;opacity:.7;line-height:1.6;}
 .error{color:#b00020;background:#f8d7da;padding:12px;border-radius:8px;margin:20px 0;font-size:1.1em;}
</style></head><body>
<div class="container">
 <h1>${title}</h1>
 <div class="state-info">State <span id="current-state">1</span> of 
 <span id="total-states">${gameStates.length}</span></div>
 <div class="controls">
  <button id="first-btn" onclick="goToState(0)">⏮ First</button>
  <button id="prev-btn"  onclick="previousState()">◀ Previous</button>
  <button id="play-btn"  onclick="toggleAutoplay()">▶ Play</button>
  <button id="next-btn"  onclick="nextState()">Next ▶</button>
  <button id="last-btn"  onclick="goToState(gameStates.length-1)">Last ⏭</button>
 </div>
 <canvas id="game-canvas" width="400" height="400"></canvas>
 <div id="error-message" class="error" style="display:none"></div>
 <div class="instructions">
  <strong>Navigation:</strong> Use ←/→ keys or the buttons above.<br>
  <strong>Autoplay:</strong> Press Play to advance automatically.
 </div>
</div>
<script>
 const gameStates=${JSON.stringify(gameStates)};
 let currentStateIndex=0,isPlaying=false,playInterval;
 const CELL_SIZE=40,MARGIN=20;
 const canvas=document.getElementById('game-canvas'),ctx=canvas.getContext('2d');
 const errorDiv=document.getElementById('error-message');
 
 function drawBoard(boardState){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(!boardState||!boardState.board||!boardState.board.grid){
    errorDiv.textContent='Invalid board state.';errorDiv.style.display='block';return;
  }errorDiv.style.display='none';
  
  const grid=boardState.board.grid;
  // Find all squares
  const squares=[];
  for(let r=0;r<grid.length;r++){
    for(let c=0;c<grid[r].length;c++){
      if(grid[r][c]===1)squares.push({r,c});
    }
  }
  
  if(squares.length===0){
    ctx.fillStyle='#999';ctx.font='16px sans-serif';ctx.textAlign='center';
    ctx.fillText('Game Ended - No squares remaining',canvas.width/2,canvas.height/2);
    return;
  }
  
  // Calculate board dimensions
  const maxRow=Math.max(...squares.map(s=>s.r));
  const maxCol=Math.max(...squares.map(s=>s.c));
  const boardWidth=(maxCol+1)*CELL_SIZE;
  const boardHeight=(maxRow+1)*CELL_SIZE;
  
  // Center the board
  const offsetX=(canvas.width-boardWidth)/2;
  const offsetY=(canvas.height-boardHeight)/2;
  
  // Draw squares
  for(const {r,c} of squares){
    const x=offsetX+c*CELL_SIZE;
    const y=offsetY+r*CELL_SIZE;
    
    ctx.fillStyle='#111';
    ctx.fillRect(x,y,CELL_SIZE,CELL_SIZE);
  }
  
  // Draw grid lines
  ctx.save();ctx.strokeStyle='#fff';ctx.lineWidth=1;
  for(let r=0;r<=maxRow+1;r++){
    const yy=offsetY+r*CELL_SIZE;
    ctx.beginPath();ctx.moveTo(offsetX,yy);ctx.lineTo(offsetX+boardWidth,yy);ctx.stroke();
  }
  for(let c=0;c<=maxCol+1;c++){
    const xx=offsetX+c*CELL_SIZE;
    ctx.beginPath();ctx.moveTo(xx,offsetY);ctx.lineTo(xx,offsetY+boardHeight);ctx.stroke();
  }
  ctx.restore();
 }
 
 function updateDisplay(){
  drawBoard(gameStates[currentStateIndex]);
  document.getElementById('current-state').textContent=currentStateIndex+1;
  document.getElementById('first-btn').disabled=currentStateIndex===0;
  document.getElementById('prev-btn').disabled =currentStateIndex===0;
  document.getElementById('next-btn').disabled =currentStateIndex===gameStates.length-1;
  document.getElementById('last-btn').disabled =currentStateIndex===gameStates.length-1;
 }
 function goToState(i){if(i>=0&&i<gameStates.length){currentStateIndex=i;updateDisplay();}}
 function nextState(){if(currentStateIndex<gameStates.length-1){currentStateIndex++;updateDisplay();}}
 function previousState(){if(currentStateIndex>0){currentStateIndex--;updateDisplay();}}
 function toggleAutoplay(){
  const btn=document.getElementById('play-btn');
  if(isPlaying){clearInterval(playInterval);isPlaying=false;btn.textContent='▶ Play';}
  else{isPlaying=true;btn.textContent='⏸ Pause';
    playInterval=setInterval(()=>{if(currentStateIndex<gameStates.length-1)nextState();else toggleAutoplay();},1000);}
 }
 document.addEventListener('keydown',e=>{
   if(e.key==='ArrowLeft'){e.preventDefault();previousState();}
   else if(e.key==='ArrowRight'){e.preventDefault();nextState();}
   else if(e.key===' '){e.preventDefault();toggleAutoplay();}
 });
 updateDisplay();
</script></body></html>`;
    }

    async storeGameInDatabase(winner) {
        try {
            if (window.DatabaseUtils) {
                await window.DatabaseUtils.storeGameInDatabase(
                    'SATO',
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
    const app = new SatoWelterGui();
    app.showSetupModal();
}; 