// --- CORE GAME LOGIC ---
// This section contains the fundamental rules and AI logic for the LCTR game.

class Board {
    constructor(rows) { this.rows = [...rows]; }
    isEmpty() { return this.rows.length === 0; }
    height() { return this.rows.length; }
    width() { return this.rows.length ? Math.max(...this.rows) : 0; }
    removeTopRow() { this.rows.shift(); }
    removeLeftColumn() { this.rows = this.rows.map(r => r - 1).filter(r => r > 0); }
    squares() {
        const coords = [];
        for (let r = 0; r < this.rows.length; r++) { for (let c = 0; c < this.rows[r]; c++) coords.push({ r, c }); }
        return coords;
    }
    asTuple() { return JSON.stringify(this.rows); }
}

const grundyMemo = new Map();
function grundy(position) {
    if (position === '[]') return 0;
    if (grundyMemo.has(position)) return grundyMemo.get(position);
    const posArray = JSON.parse(position);
    const child1 = JSON.stringify(posArray.slice(1));
    const child2 = JSON.stringify(posArray.map(r => r - 1).filter(r => r > 0));
    const childValues = new Set([grundy(child1), grundy(child2)]);
    let g = 0;
    while (childValues.has(g)) { g++; }
    grundyMemo.set(position, g);
    return g;
}

function perfectMove(position) {
    if (position === '[]') throw new Error("No legal move");
    const posArray = JSON.parse(position);
    const childRow = JSON.stringify(posArray.slice(1));
    const childCol = JSON.stringify(posArray.map(r => r - 1).filter(r => r > 0));
    if (grundy(position) !== 0) {
        if (grundy(childRow) === 0) return "row";
        if (grundy(childCol) === 0) return "col";
    }
    // If it's a losing position, make any legal move (prefer row to be deterministic)
    return posArray.length > 0 ? "row" : "col";
}

// --- PARTITION GENERATION UTILITIES ---

function staircase(n) { let parts = []; let t = n; while (t >= 1) { parts.push(t); t = t - 1; } return parts; }
function rectangle(rows, cols) { let parts = []; let t = rows; while (t >= 1) { parts.push(cols); t = t - 1; } return parts; }
function hook(n) { let parts = []; let t = n; parts.push(t); while (t >= 2) { parts.push(1); t = t - 1; } return parts; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomPartition(n) { let parts = []; let remaining = n; let maxPart = n; while (remaining > 0) { let part = randomInt(1, Math.min(remaining, maxPart)); parts.push(part); remaining -= part; maxPart = part; } return parts.sort((a, b) => b - a); }

// --- GAME CLASS ---

class Game {
    static PLAYERS = ["Alice", "Bob"];
    constructor(board, aiPlayer, gameMode = 'normal') {
        this.board = board;
        this.currentIndex = 0;
        this.aiIndex = aiPlayer ? Game.PLAYERS.indexOf(aiPlayer) : null;
        this.gameMode = gameMode; // 'normal' | 'misere'
    }
    get currentPlayer() { return Game.PLAYERS[this.currentIndex]; }
    isAiTurn() { return this.aiIndex === this.currentIndex; }
    switchPlayer() { this.currentIndex = 1 - this.currentIndex; }
    makeMove(moveKind) {
        if (moveKind === "row") this.board.removeTopRow();
        else if (moveKind === "col") this.board.removeLeftColumn();
        const finished = this.board.isEmpty();
        if (!finished) this.switchPlayer();
        return finished;
    }
}

// --- SOUND MANAGER (Placeholder) ---
const SoundManager = { init() {}, play(soundName) {} };

// --- GUI CONTROLLER ---
class ProLCTRGui {
    constructor() {
        this.CELL = 40;
        this.GAP = 1; // Small gap between tiles to prevent border overlap
        this.MARGIN = 20;
        this.ANIMATION_MS = 650;
        this.AI_THINK_MS = 1100;
        this.game = null;
        this.hoveredMove = null;
        this.isAnimating = false;
        this.aiDifficulty = '50';
        this.gameHistory = [];
        this.analysis = null; // Will be attached if analysis script is loaded
        this.gameMode = 'normal';
        
        // Database tracking properties
        this.initialPartition = [];
        this.movesSequence = [];
        this.gameStartTime = null;
        
        // Multiplayer properties - will be set by multiplayer auth
        this.socket = null; // Will be set by multiplayer auth
        this.roomId = null;
        this.playerSymbol = null; // 'A' for Alice, 'B' for Bob
        this.isMultiplayer = false;
        this.turnMessageTimeout = null;
        
        this.getDOMElements();
        this.bindEventListeners();
        SoundManager.init();
        this.showSetupModal();
    }

    getDOMElements() {
        this.gameCard = document.getElementById('game-card');
        this.statusLabel = document.getElementById('status-label');
        this.boardArea = document.getElementById('board-area');
        this.aiThinkingIndicator = document.getElementById('ai-thinking-indicator');
        this.newGameBtn = document.getElementById('new-game-btn');
        this.cycleThemeBtn = document.getElementById('cycle-theme-btn');
        this.setupModal = document.getElementById('setup-modal-backdrop');
        this.gameOverModal = document.getElementById('game-over-modal-backdrop');
        this.rowsInput = document.getElementById('rows-input');
        this.partitionTypeSelect = document.getElementById('partition-type-select');
        this.partitionNumberInput = document.getElementById('partition-number-input');
        this.partitionNumberLabel = document.getElementById('partition-number-label');
        this.partitionColsInput = document.getElementById('partition-cols-input');
        this.partitionColsBox = document.getElementById('partition-cols-box');
        this.generatePartitionBtn = document.getElementById('generate-partition-btn');
        this.gameModeSelect = document.getElementById('game-mode-select');
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
        this.reportBtnModal = document.getElementById('report-btn-modal');
        
        // Multiplayer elements
        this.multiplayerBtn = document.getElementById('multiplayer-btn');
        this.multiplayerModal = document.getElementById('multiplayer-modal-backdrop');
        this.multiplayerBackBtn = document.getElementById('multiplayer-back-btn');
        this.multiplayerRowsInput = document.getElementById('multiplayer-rows-input');
        this.multiplayerPartitionTypeSelect = document.getElementById('multiplayer-partition-type-select');
        this.multiplayerPartitionNumberInput = document.getElementById('multiplayer-partition-number-input');
        this.multiplayerGeneratePartitionBtn = document.getElementById('multiplayer-generate-partition-btn');
        this.createGameBtn = document.getElementById('create-game-btn');
        this.joinGameBtn = document.getElementById('join-game-btn');
        this.joinRoomInput = document.getElementById('join-room-input');
        this.roomInfoLabel = document.getElementById('room-info-label');
    }

    bindEventListeners() {
        this.startGameBtn.addEventListener('click', () => this.processSetup());
        this.newGameBtn.addEventListener('click', () => { SoundManager.play('click'); this.showSetupModal(); });
        this.playAgainBtn.addEventListener('click', () => { SoundManager.play('click'); this.showSetupModal(); });
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
        if (this.gameModeSelect) {
            this.gameModeSelect.addEventListener('change', (e) => {
                this.gameMode = e.target.value;
            });
        }
        if (this.downloadBtnModal) {
            this.downloadBtnModal.addEventListener('click', () => { SoundManager.play('click'); this.downloadGame(); });
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
                this.cycleThemeBtn.innerHTML = `[Tiles: ${newTheme.icon}]`;
                
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
        
        this.boardArea.addEventListener('mousemove', (event) => this.handleMouseMove(event));
        this.boardArea.addEventListener('mouseleave', () => this.handleMouseLeave());
        this.boardArea.addEventListener('click', () => this.handleMouseClick());
        
        // Multiplayer button event listeners
        this.multiplayerBtn.addEventListener('click', () => this.showMultiplayerModal());
        this.multiplayerBackBtn.addEventListener('click', () => this.hideMultiplayerModal());
        this.multiplayerGeneratePartitionBtn.addEventListener('click', () => this.generateMultiplayerPartition());
        this.createGameBtn.addEventListener('click', () => this.createMultiplayerGame());
        this.joinGameBtn.addEventListener('click', () => this.joinMultiplayerGame());
    }

    // Multiplayer helper methods - these are now handled by lctr_multiplayer_auth.js
    createMultiplayerGame() {
        // This is handled by the multiplayer auth script
        console.log('createMultiplayerGame called - should be handled by auth script');
    }
    
    joinMultiplayerGame() {
        // This is handled by the multiplayer auth script
        console.log('joinMultiplayerGame called - should be handled by auth script');
    }
    

    
    resetToSinglePlayer() {
        this.isMultiplayer = false;
        this.roomId = null;
        this.playerSymbol = null;
        this.roomInfoLabel.textContent = '';
        this.roomInfoLabel.style.color = '';
        
        // Clear any turn message timeouts
        if (this.turnMessageTimeout) {
            clearTimeout(this.turnMessageTimeout);
            this.turnMessageTimeout = null;
        }
        
        this.showSetupModal();
    }

    showMultiplayerModal() {
        SoundManager.play('click');
        this.setupModal.classList.remove('visible');
        this.multiplayerModal.classList.add('visible');
        // Reset multiplayer state when showing modal
        this.isMultiplayer = false;
        this.roomId = null;
        this.playerSymbol = null;
        this.roomInfoLabel.textContent = '';
        this.roomInfoLabel.style.color = '';
    }

    hideMultiplayerModal() {
        SoundManager.play('click');
        this.multiplayerModal.classList.remove('visible');
        this.showSetupModal();
    }

    generateMultiplayerPartition() {
        const partitionType = this.multiplayerPartitionTypeSelect.value;
        const n_str = this.multiplayerPartitionNumberInput.value;
        if (!n_str) { alert("Please enter a number for partition generation."); return; }
        const n = parseInt(n_str, 10);
        if (isNaN(n) || n <= 0 || n > 200) { alert("Please enter a positive number less than or equal to 200."); return; }
        let partition;
        if (partitionType === 'random') partition = randomPartition(n);
        else if (partitionType === 'staircase') partition = staircase(n);
        else if (partitionType === 'square') partition = rectangle(n, n);
        else if (partitionType === 'hook') partition = hook(n);
        this.multiplayerRowsInput.value = partition.join(' ');
    }

    showTurnMessage(message) {
        if (!this.statusLabel) return;
        
        // Store the original status
        const originalText = this.statusLabel.textContent;
        const originalColor = this.statusLabel.style.color;
        
        // Show the temporary message in orange
        this.statusLabel.textContent = message;
        this.statusLabel.style.color = 'var(--orange)';
        
        // Clear any existing timeout
        if (this.turnMessageTimeout) {
            clearTimeout(this.turnMessageTimeout);
        }
        
        // Restore original status after 3 seconds
        this.turnMessageTimeout = setTimeout(() => {
            this.statusLabel.textContent = originalText;
            this.statusLabel.style.color = originalColor;
            this.turnMessageTimeout = null;
        }, 3000);
    }

    processSetup() {
        try {
            SoundManager.play('click');
            const nums = this.rowsInput.value.trim().split(/\s+/).map(Number).filter(n => n > 0).sort((a, b) => b - a);
            if (nums.some(n => isNaN(n) || n <= 0)) throw new Error("Invalid input");
            if (nums.length === 1 && nums[0] === 0) throw new Error("Invalid input");


            const aiSide = this.aiSelect.value === "None" ? null : 
                         this.aiSelect.value === "A" ? "Alice" :
                         this.aiSelect.value === "B" ? "Bob" : null;
            this.aiDifficulty = this.difficultySlider.value;
            this.gameMode = this.gameModeSelect ? this.gameModeSelect.value : 'normal';
            this.setupModal.classList.remove('visible');
            this.startGame(nums, aiSide, this.gameMode);
        } catch (e) {
            alert("Invalid input. Please enter positive, space-separated integers.");
        }
    }

    startGame(rows, aiSide, gameMode = 'normal') {
        this.initialPartition = [...rows];
        this.gameHistory = [];
        this.movesSequence = []; // Reset moves tracking
        this.gameStartTime = new Date(); // Track when game started
        this.game = new Game(new Board(rows), aiSide, gameMode);
        this.hoveredMove = null;
        this.isAnimating = false;
        
        // Clear any turn message timeouts
        if (this.turnMessageTimeout) {
            clearTimeout(this.turnMessageTimeout);
            this.turnMessageTimeout = null;
        }
        
        this.redrawBoard();
        this.updateStatus();
        
        // Only start AI turn if it's not a multiplayer game
        if (!this.isMultiplayer && this.game.isAiTurn()) { 
            this.aiTurn(); 
        }

        // Analysis integration
        this.analysis?.onGameStart?.();
    }

    aiTurn() {
        if (!this.game || !this.game.isAiTurn() || this.isAnimating) return;
        this.aiThinkingIndicator.classList.add('thinking');
        setTimeout(() => {
            this.aiThinkingIndicator.classList.remove('thinking');
            let move;
            const difficultyThreshold = parseInt(this.aiDifficulty, 10) / 100;
            if (Math.random() > difficultyThreshold) {
                const legalMoves = [];
                if (this.game.board.height() > 0) legalMoves.push('row');
                if (this.game.board.width() > 0) legalMoves.push('col');
                move = legalMoves[Math.floor(Math.random() * legalMoves.length)];
            } else {
                if (this.game.gameMode === 'misere') {
                    move = miserePerfectMove(this.game.board.asTuple());
                } else {
                    move = perfectMove(this.game.board.asTuple());
                }
            }
            this.executeWithAnimation(move);
        }, this.AI_THINK_MS);
    }
    
    handleMouseMove(event) {
        if (!this.game || this.game.isAiTurn() || this.isAnimating) return;
        
        // In multiplayer, only allow hover effects if it's the local player's turn
        if (this.isMultiplayer) {
            const isMyTurn = (this.playerSymbol === 'A' && this.game.currentIndex === 0) ||
                            (this.playerSymbol === 'B' && this.game.currentIndex === 1);
            if (!isMyTurn) return;
        }
        const rect = this.boardArea.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        let detectedMove = null;
        const extraLeftMargin = this.game.board.width() > 30 ? 20 : 0;
        
        // Calculate horizontal centering offset only (same as in redrawBoard) including gaps
        const boardDataWidth = this.game.board.width() * this.CELL + (this.game.board.width() - 1) * this.GAP;
        const boardDataHeight = this.game.board.height() * this.CELL + (this.game.board.height() - 1) * this.GAP;
        let boardWidth = this.MARGIN * 2 + boardDataWidth + extraLeftMargin;
        let boardHeight = this.MARGIN * 2 + boardDataHeight;
        const minDimension = 480;
        boardWidth = Math.max(boardWidth, minDimension);
        boardHeight = Math.max(boardHeight, minDimension);
        const actualContentWidth = this.MARGIN * 2 + boardDataWidth + extraLeftMargin;
        const centerOffsetX = (boardWidth - actualContentWidth) / 2;
        
        const topLeftCellLeft = centerOffsetX + this.MARGIN + extraLeftMargin;
        const topLeftCellTop = this.MARGIN;
        const topLeftCellRight = centerOffsetX + this.MARGIN + extraLeftMargin + this.CELL;
        const topLeftCellBottom = this.MARGIN + this.CELL;
        if (this.game.board.height() > 0 && this.game.board.width() > 0 && mouseX >= topLeftCellLeft && mouseX <= topLeftCellRight && mouseY >= topLeftCellTop && mouseY <= topLeftCellBottom) {
            const distToBottom = topLeftCellBottom - mouseY;
            const distToRight = topLeftCellRight - mouseX;
            detectedMove = (distToBottom < distToRight) ? 'col' : 'row';
        } else if (this.game.board.height() > 0 && mouseY >= this.MARGIN && mouseY <= this.MARGIN + this.CELL && mouseX >= centerOffsetX + this.MARGIN + extraLeftMargin && mouseX <= centerOffsetX + this.MARGIN + extraLeftMargin + this.game.board.rows[0] * this.CELL + (this.game.board.rows[0] - 1) * this.GAP) {
            detectedMove = 'row';
        } else if (this.game.board.width() > 0 && mouseX >= centerOffsetX + this.MARGIN + extraLeftMargin && mouseX <= centerOffsetX + this.MARGIN + extraLeftMargin + this.CELL && mouseY >= this.MARGIN && mouseY <= this.MARGIN + this.game.board.height() * this.CELL + (this.game.board.height() - 1) * this.GAP) {
            detectedMove = 'col';
        }
        if (detectedMove !== this.hoveredMove) {
            if (detectedMove) SoundManager.play('hover');
            this.hoveredMove = detectedMove;
            this.gameCard.querySelectorAll('.tile.highlighted').forEach(t => t.classList.remove('highlighted'));
            if (this.hoveredMove === 'row') {
                for (let c = 0; c < this.game.board.rows[0]; c++) { document.getElementById(`tile-0-${c}`)?.classList.add('highlighted'); }
            } else if (this.hoveredMove === 'col') {
                for (let r = 0; r < this.game.board.height(); r++) { document.getElementById(`tile-${r}-0`)?.classList.add('highlighted'); }
            }
            // Analysis hover integration
            this.analysis?.updateHover?.(this.hoveredMove);
        }
        this.boardArea.classList.toggle('clickable', !!this.hoveredMove);
    }

    handleMouseLeave() {
        this.hoveredMove = null;
        this.gameCard.querySelectorAll('.tile.highlighted').forEach(t => t.classList.remove('highlighted'));
        this.boardArea.classList.remove('clickable');
    }

    executeWithAnimation(moveKind) {
        if (this.isAnimating) return;
        this.isAnimating = true;
        this.handleMouseLeave();
        SoundManager.play('remove');
        if (moveKind === 'row') {
            for (let c = 0; c < this.game.board.rows[0]; c++) { document.getElementById(`tile-0-${c}`)?.classList.add('removing'); }
            for (let r = 1; r < this.game.board.height(); r++) {
                for (let c = 0; c < this.game.board.rows[r]; c++) {
                    const tile = document.getElementById(`tile-${r}-${c}`);
                    if (tile) { tile.style.top = `${parseInt(tile.style.top) - (this.CELL + this.GAP)}px`; }
                }
            }
        } else {
            for (let r = 0; r < this.game.board.height(); r++) { document.getElementById(`tile-${r}-0`)?.classList.add('removing'); }
        }
        setTimeout(() => this.finishMove(moveKind), this.ANIMATION_MS);
    }
    
    finishMove(moveKind) {
        this.saveGameState();
        
        // Track move for database (R for row, C for column)
        this.movesSequence.push(moveKind === 'row' ? 'R' : 'C');
        
        const finished = this.game.makeMove(moveKind);
        this.isAnimating = false;
        if (finished) {
            SoundManager.play('win');
            // Determine winner based on game mode
            let winnerIndex;
            if (this.game.gameMode === 'misere') {
                // Last mover loses → winner is the other player
                winnerIndex = 1 - this.game.currentIndex;
            } else {
                // Normal: last mover wins
                winnerIndex = this.game.currentIndex;
            }
            const winnerName = Game.PLAYERS[winnerIndex];
            this.gameOverMessage.textContent = `Player ${winnerName} wins!`;
            this.gameOverModal.classList.add('visible');
            
            // Save game to database
            this.storeGameInDatabase(winnerName);
            
            this.redrawBoard();
            return;
        }
        this.redrawBoard();
        this.updateStatus();
        this.analysis?.onMoveMade?.();
        if (this.game.isAiTurn()) { this.aiTurn(); }
    }

    saveGameState() {
        if (!this.game) return;
        const boardCopy = { grid: this.game.board.rows.map(row => row) };
        const gameState = { board: boardCopy, currentIndex: this.game.currentIndex };
        this.gameHistory.push(gameState);
    }

    async storeGameInDatabase(winner) {
        try {
            if (typeof window.DatabaseUtils !== 'undefined') {
                await window.DatabaseUtils.storeGameInDatabase(
                    'LCTR',
                    this.initialPartition,
                    this.movesSequence,
                    (winner && typeof winner === 'string') ? winner.charAt(0) : winner,
                    this.gameStartTime
                );
            }
        } catch (error) {
            console.warn('Could not store LCTR game in database:', error.message);
        }
    }

    clearBoard() {
        this.boardArea.innerHTML = '';
    }

    redrawBoard() {
        this.clearBoard();
        if (!this.game) return;
        const extraLeftMargin = this.game.board.width() > 30 ? 20 : 0;
        
        // Calculate actual content size including gaps
        const boardDataWidth = this.game.board.width() * this.CELL + (this.game.board.width() - 1) * this.GAP;
        const boardDataHeight = this.game.board.height() * this.CELL + (this.game.board.height() - 1) * this.GAP;
        let boardWidth = this.MARGIN * 2 + boardDataWidth + extraLeftMargin;
        let boardHeight = this.MARGIN * 2 + boardDataHeight;
        const minDimension = 480;
        boardWidth = Math.max(boardWidth, minDimension);
        boardHeight = Math.max(boardHeight, minDimension);
        
        // Calculate horizontal centering offset only
        const actualContentWidth = this.MARGIN * 2 + boardDataWidth + extraLeftMargin;
        const centerOffsetX = (boardWidth - actualContentWidth) / 2;
        
        this.game.board.squares().forEach(({ r, c }) => {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.id = `tile-${r}-${c}`;
            tile.style.width = `${this.CELL}px`;
            tile.style.height = `${this.CELL}px`;
            tile.style.left = `${centerOffsetX + this.MARGIN + extraLeftMargin + c * (this.CELL + this.GAP)}px`;
            tile.style.top = `${this.MARGIN + r * (this.CELL + this.GAP)}px`;
            this.boardArea.appendChild(tile);
        });
        
        this.boardArea.style.width = `${boardWidth}px`;
        this.boardArea.style.height = `${boardHeight}px`;
    }

    drawBoard() {
        this.redrawBoard();
    }

    updateStatus() {
        if (!this.game) return;
        
        let newText;
        if (this.isMultiplayer) {
            const currentPlayerName = this.game.currentPlayer;
            const isMyTurn = (this.playerSymbol === 'A' && this.game.currentIndex === 0) ||
                            (this.playerSymbol === 'B' && this.game.currentIndex === 1);
            const turnIndicator = isMyTurn ? "Your turn" : "Opponent's turn";
            newText = `${currentPlayerName} (${turnIndicator}) to move`;
            
            console.log(`[${this.playerSymbol}] Status update:`, {
                currentPlayerName,
                currentIndex: this.game.currentIndex,
                isMyTurn,
                playerSymbol: this.playerSymbol
            });
        } else {
            const kind = this.game.isAiTurn() ? "Computer" : "Human";
            newText = `${this.game.currentPlayer} (${kind}) to move`;
        }
        
        if (this.statusLabel.textContent === newText) return;
        this.statusLabel.classList.add('exiting');
        setTimeout(() => {
            this.statusLabel.textContent = newText;
            this.statusLabel.classList.remove('exiting');
        }, 200);
    }
    
    handleMouseClick() { 
        console.log(`[${this.playerSymbol}] Mouse click - hoveredMove:`, this.hoveredMove);
        if (this.hoveredMove) { 
            this.requestMove(this.hoveredMove); 
        } else {
            console.log(`[${this.playerSymbol}] Click ignored - no hovered move`);
        }
    }
    requestMove(moveKind) { 
        if (!this.isAnimating && !this.game.isAiTurn() && moveKind) { 
            if (this.isMultiplayer) {
                // Get roomId from multiplayer auth
                const roomId = window.lctrMultiplayerAuth ? window.lctrMultiplayerAuth.roomId : null;
                
                if (!roomId) {
                    console.log(`[${this.playerSymbol}] No roomId available - cannot make move`);
                    console.log(`[${this.playerSymbol}] Multiplayer auth state:`, {
                        authExists: !!window.lctrMultiplayerAuth,
                        authRoomId: window.lctrMultiplayerAuth?.roomId,
                        thisRoomId: this.roomId
                    });
                    return;
                }
                
                // Check if it's the player's turn locally first
                const isMyTurn = (this.playerSymbol === 'A' && this.game.currentIndex === 0) ||
                                (this.playerSymbol === 'B' && this.game.currentIndex === 1);
                
                if (!isMyTurn) {
                    console.log(`[${this.playerSymbol}] Not my turn - blocking move locally`);
                    this.showTurnMessage("Not your turn! Waiting for opponent...");
                    return;
                }
                
                // In multiplayer, emit the move to the server
                console.log(`[${this.playerSymbol}] Attempting to make move:`, moveKind, 'Current player index:', this.game.currentIndex);
                console.log(`[${this.playerSymbol}] Using roomId:`, roomId);
                
                // Use the multiplayer auth's makeMove method
                if (window.lctrMultiplayerAuth) {
                    window.lctrMultiplayerAuth.makeMove(moveKind);
                } else {
                    console.log(`[${this.playerSymbol}] Multiplayer auth not available`);
                }
            } else {
                // In single player, execute locally
                console.log(`[${this.playerSymbol}] Single player mode - isMultiplayer:`, this.isMultiplayer);
                this.executeWithAnimation(moveKind); 
            }
        } else {
            console.log(`[${this.playerSymbol}] Move blocked:`, { 
                isAnimating: this.isAnimating, 
                isAiTurn: this.game?.isAiTurn(), 
                moveKind,
                currentIndex: this.game?.currentIndex 
            });
        }
    }
    showHelp() { this.helpPopover.classList.add('visible'); }
    hideHelp() { this.helpPopover.classList.remove('visible'); }
    showSetupModal() { 
        this.gameOverModal.classList.remove('visible'); 
        
        // Show analysis toggle again when returning to setup (in case coming from multiplayer)
        const analysisToggle = document.getElementById('analysis-mode-toggle');
        if (analysisToggle) {
            analysisToggle.style.display = 'block';
        }
        
        // If we're in multiplayer mode, show the multiplayer modal instead
        if (this.isMultiplayer) {
            this.setupModal.classList.remove('visible');
            this.multiplayerModal.classList.add('visible');
            return;
        }
        
        // Otherwise show the single-player setup modal
        this.multiplayerModal.classList.remove('visible');
        this.setupModal.classList.add('visible'); 
        this.updateDifficultyLabel(); // Initialize the difficulty label
        
        // Reset multiplayer state when showing single-player setup modal
        this.roomId = null;
        this.playerSymbol = null;
        this.roomInfoLabel.textContent = '';
        this.roomInfoLabel.style.color = '';
    }
    updateDifficultyLabel() { 
        const value = parseInt(this.difficultySlider.value);
        const difficulty = this.getDifficultyFromValue(value);
        this.difficultyLabel.textContent = `${difficulty} (${value})`;
    }
    
    getDifficultyFromValue(value) {
        if (value < 20) return 'easy';
        if (value <= 70) return 'medium';
        if (value <= 99) return 'hard';
        return 'perfect';
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
        const n_str = this.partitionNumberInput.value;
        if (!n_str) { alert("Please enter a number for partition generation."); return; }
        const n = parseInt(n_str, 10);
        if (isNaN(n) || n <= 0 || n > 200) { alert("Please enter a positive number less than or equal to 200."); return; }
        let partition;
        if (partitionType === 'random') partition = randomPartition(n);
        else if (partitionType === 'staircase') partition = staircase(n);
        else if (partitionType === 'rectangle') {
            const cols = parseInt(this.partitionColsInput.value, 10);
            if (isNaN(cols) || cols <= 0 || cols > 200) { alert("Please enter a positive number of columns less than or equal to 200."); return; }
            partition = rectangle(n, cols);
        }
        else if (partitionType === 'hook') partition = hook(n);
        this.rowsInput.value = partition.join(' ');
    }

    downloadGame() {
        if (!this.game) return;
        const allStates = this.gameHistory.map(state => {
            let mask = state.board && state.board.grid ? state.board.grid : state.board;
            return { mask, currentIndex: state.currentIndex };
        });
        const htmlContent = this.generateGameReplayHTML_LCTR(allStates, this.initialPartition);
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `LCTR-Game-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    openGameReport() {
        if (!this.game) return;
        const allStates = (this.gameHistory || []).map(state => {
            const mask = state.board && state.board.grid ? state.board.grid : state.board;
            return Array.isArray(mask) ? mask.join(' ') : '';
        }).filter(Boolean);
        const finalState = this.game.board.rows.join(' ');
        if (finalState) allStates.push(finalState);
        const uniqueStates = allStates.filter((s, i, self) => s && (i === 0 || s !== self[i-1]));
        const statesString = uniqueStates.join('\n');
        localStorage.setItem('lctrGameStatesForReport', statesString);
        // Persist mode for unified report
        const mode = this.game.gameMode || 'normal';
        localStorage.setItem('lctrReportMode', mode);
        window.open('../../reports/generator/report.html', '_blank');
    }

    generateGameReplayHTML_LCTR(gameStates, initialPartition) {
        const title = `LCTR Game Replay - ${new Date().toLocaleDateString()}`;
        return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${title}</title>
<style>
 body{font-family:sans-serif;background:#f4f4f9;color:#333;margin:0;padding:20px;
       min-height:100vh;display:flex;flex-direction:column;align-items:center;}
 .container{background:#fff;border-radius:12px;padding:30px;max-width:800px;width:100%;
            box-shadow:0 6px 20px rgba(0,0,0,0.08);text-align:center;}
 h1{margin-top:0;color:#333;letter-spacing:1px;}
 .controls{margin:20px 0;display:flex;justify-content:center;align-items:center;
           gap:15px;flex-wrap:wrap;}
 button{padding:10px 18px;font-size:15px;border:none;border-radius:8px;
        background:#e9ecef;color:#333;cursor:pointer;transition:all .2s;}
 button:hover{background:#dee2e6;transform:translateY(-2px);}
 button:disabled{opacity:.5;cursor:not-allowed;transform:none;}
 .state-info{font-size:18px;margin:10px 0;font-weight:bold;color:#555;}
 #game-canvas{border:2px solid #dee2e6;border-radius:8px;margin:20px auto;display:block;
             background:#fff;}
 .instructions{margin-top:20px;font-size:14px;color:#666;line-height:1.6;}
 .error{color:#b00020;background:#f8d7da;padding:12px;border-radius:8px;margin:20px 0;font-size:1.1em;}
</style></head><body>
<div class="container">
 <h1>${title}</h1>
 <div class="state-info">Move <span id="current-state">1</span> of
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
  <strong>Autoplay:</strong> Press Play/Pause to advance automatically.
 </div>
</div>
<script>
 const gameStates=${JSON.stringify(gameStates)};
 const initialPartition=${JSON.stringify(initialPartition)};
 let currentStateIndex=0,isPlaying=false,playInterval;
 const CELL_SIZE=30,MARGIN=20;
 const canvas=document.getElementById('game-canvas'),ctx=canvas.getContext('2d');
 const errorDiv=document.getElementById('error-message');
 function drawBoard(mask){
  if(!Array.isArray(initialPartition)||!initialPartition.length){
    errorDiv.textContent='Game Ended.';errorDiv.style.display='block';return;
  }errorDiv.style.display='none';
  const boardHeight=initialPartition.length;
  const boardWidth=Math.max(...initialPartition, 0);
  const canvasWidth=MARGIN*2+boardWidth*CELL_SIZE;
  const canvasHeight=MARGIN*2+boardHeight*CELL_SIZE;
  canvas.width=canvasWidth;
  canvas.height=canvasHeight;
  ctx.clearRect(0,0,canvasWidth,canvasHeight);
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  for(let r=0;r<boardHeight;r++){
    for(let c=0;c<initialPartition[r];c++){
      const x=MARGIN+c*CELL_SIZE;
      const y=MARGIN+r*CELL_SIZE;
      const isPresent = mask && r < mask.length && c < mask[r];
      ctx.fillStyle = isPresent ? '#333' : '#f4f4f9';
      ctx.fillRect(x,y,CELL_SIZE,CELL_SIZE);
      ctx.strokeRect(x,y,CELL_SIZE,CELL_SIZE);
    }
  }
 }
 function updateDisplay(){
  drawBoard(gameStates[currentStateIndex].mask);
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
    playInterval=setInterval(()=>{if(currentStateIndex<gameStates.length-1)nextState();else toggleAutoplay();},800);}
 }
 document.addEventListener('keydown',e=>{
   if(e.key==='ArrowLeft'){e.preventDefault();previousState();}
   else if(e.key==='ArrowRight'){e.preventDefault();nextState();}
   else if(e.key===' '||e.key==='Spacebar'){e.preventDefault();toggleAutoplay();}
 });
 goToState(0); // Initial draw
</script></body></html>`;
    }

    // Multiplayer integration methods
    initializeMultiplayerGame(boardData, playerNumber, currentPlayer) {
        console.log('Initializing multiplayer game:', { boardData, playerNumber, currentPlayer });
        
        // Initialize the board
        const board = new Board(boardData);
        this.game = new Game(board, null); // No AI in multiplayer
        this.game.currentIndex = currentPlayer;
        this.playerSymbol = playerNumber === 0 ? 'A' : 'B';
        this.isMultiplayer = true;
        
        // Hide analysis mode during multiplayer
        const analysisToggle = document.getElementById('analysis-mode-toggle');
        if (analysisToggle) {
            analysisToggle.style.display = 'none';
        }
        
        // Disable analysis if it's currently active
        if (this.analysis && this.analysis.isEnabled) {
            this.analysis.toggle();
        }
        
        // Get socket and roomId from multiplayer auth
        if (window.lctrMultiplayerAuth) {
            this.socket = window.lctrMultiplayerAuth.socket;
            this.roomId = window.lctrMultiplayerAuth.roomId;
            console.log(`[${this.playerSymbol}] Set roomId to:`, this.roomId);
        }
        
        // Clear any existing board and redraw
        this.clearBoard();
        this.drawBoard();
        
        // Show the game card
        this.gameCard.style.display = 'block';
        this.setupModal.style.display = 'none';
        
        // Update status
        this.updateMultiplayerStatus(
            playerNumber === currentPlayer ? 'Your turn' : 'Opponent\'s turn',
            playerNumber === currentPlayer
        );
    }

    updateMultiplayerStatus(statusText, isMyTurn) {
        this.statusLabel.textContent = statusText;
        
        if (isMyTurn) {
            this.statusLabel.style.color = 'var(--orange)';
            this.enableInteraction();
        } else {
            this.statusLabel.style.color = 'var(--gray)';
            this.disableInteraction();
        }
    }

    enableInteraction() {
        this.isAnimating = false;
        this.hoveredMove = null;
        this.drawBoard();
    }

    disableInteraction() {
        this.isAnimating = true; // Prevents interaction
        this.hoveredMove = null;
        this.drawBoard();
    }

    updateBoardFromServer(boardData, currentPlayer = null, gameEnded = false, winner = null) {
        console.log('Updating board from server:', { boardData, currentPlayer, gameEnded, winner });
        
        if (this.game && this.isMultiplayer) {
            // Update the board state
            this.game.board = new Board(boardData);
            
            // Update current player if provided
            if (currentPlayer !== null) {
                this.game.currentIndex = currentPlayer;
            }
            
            // Redraw the board
            this.clearBoard();
            this.drawBoard();
            
            // Handle game end
            if (gameEnded) {
                SoundManager.play('win');
                const winnerName = winner === 0 ? 'Alice' : 'Bob';
                this.gameOverMessage.textContent = `Player ${winnerName} wins!`;
                this.gameOverModal.classList.add('visible');
            } else {
                // Update status
                this.updateStatus();
            }
        }
    }

    endMultiplayerGame(message) {
        this.statusLabel.textContent = message;
        this.statusLabel.style.color = message.includes('won') ? 'var(--orange)' : 'var(--gray)';
        
        // Show analysis toggle again when multiplayer ends
        const analysisToggle = document.getElementById('analysis-mode-toggle');
        if (analysisToggle) {
            analysisToggle.style.display = 'block';
        }
        
        // Show game over modal
        this.gameOverMessage.textContent = message;
        this.gameOverModal.classList.add('visible');
        
        // Refresh user stats if multiplayer auth is available
        if (window.lctrMultiplayerAuth) {
            window.lctrMultiplayerAuth.loadUserStats();
        }
        
        // Keep multiplayer state so Play Again returns to multiplayer modal
        // Don't set this.isMultiplayer = false here
    }

    // Override makeMove to handle multiplayer
    makeMove(moveKind) {
        if (this.isMultiplayer) {
            // Send move to server instead of handling locally
            if (window.lctrMultiplayerAuth) {
                window.lctrMultiplayerAuth.makeMove(moveKind);
            }
            return;
        }
        
        // Original single-player logic
        if (this.isAnimating || !this.game || this.game.board.isEmpty()) return;
        
        this.isAnimating = true;
        const gameEnded = this.game.makeMove(moveKind);
        
        this.clearHighlights();
        this.hoveredMove = null;
        
        this.animateMove(moveKind, () => {
            this.drawBoard();
            
            if (gameEnded) {
                this.onGameEnd();
            } else if (this.game.isAiTurn()) {
                this.statusLabel.textContent = `${this.game.currentPlayer} is thinking...`;
                this.aiThinkingIndicator.style.visibility = 'visible';
                setTimeout(() => this.makeAiMove(), this.AI_THINK_MS);
            } else {
                this.statusLabel.textContent = `${this.game.currentPlayer}'s turn`;
                this.isAnimating = false;
            }
        });
    }
}

window.addEventListener('DOMContentLoaded', () => {
    // The global script.js handles theme initialization.
    // We just need to initialize our game GUI.
    window.lctrGame = new ProLCTRGui();
    // Attach analysis if available
    if (typeof LctrAnalysis !== 'undefined') {
        window.lctrGame.analysis = new LctrAnalysis(window.lctrGame);
    }
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      Board, // Make sure this line is present
      grundy,
      perfectMove,
      staircase,
      rectangle,
      hook,
      randomPartition,
      Game
    };
  }

// --- Misère logic for LCTR (for AI and analysis) ---
const misereGrundyMemo = new Map();
function misereGrundy(position) {
    // Empty board: current player wins in misère
    if (position === '[]') return 1;
    if (misereGrundyMemo.has(position)) return misereGrundyMemo.get(position);
    const posArray = JSON.parse(position);
    // Children
    const childRow = JSON.stringify(posArray.slice(1));
    const childCol = JSON.stringify(posArray.map(r => r - 1).filter(r => r > 0));
    // Winning if any child is losing
    const isWinning = (misereGrundy(childRow) === 0) || (misereGrundy(childCol) === 0);
    const value = isWinning ? 1 : 0;
    misereGrundyMemo.set(position, value);
    return value;
}

function miserePerfectMove(position) {
    if (position === '[]') throw new Error('No legal move');
    const posArray = JSON.parse(position);
    const childRow = JSON.stringify(posArray.slice(1));
    const childCol = JSON.stringify(posArray.map(r => r - 1).filter(r => r > 0));
    if (misereGrundy(position) === 1) {
        if (misereGrundy(childRow) === 0) return 'row';
        if (misereGrundy(childCol) === 0) return 'col';
    }
    // Otherwise arbitrary legal
    return posArray.length > 0 ? 'row' : 'col';
}

// Utility to load a previous game state (for analysis undo)
ProLCTRGui.prototype.loadState = function loadState(lastState) {
    if (!lastState) return;
    this.game.board = new Board(lastState.board.grid);
    this.game.currentIndex = lastState.currentIndex;
    this.redrawBoard();
    this.updateStatus();
};
