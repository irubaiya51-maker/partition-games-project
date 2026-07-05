// ================================================================
// Strict Continuous Corner Game - Complete Rewrite
// Clean implementation focused on core game mechanics
// ================================================================

// Utility functions
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
    for (let i = n; i >= 1; i--) {
        parts.push(i);
    }
    return parts;
}

function rectangle(rows, cols) {
    let parts = [];
    for (let i = 0; i < rows; i++) {
        parts.push(cols);
    }
    return parts;
}

function hook(n) {
    let parts = [n];
    for (let i = 1; i < n; i++) {
        parts.push(1);
    }
    return parts;
}

// ================================================================
// Game Board Class
// ================================================================
class GameBoard {
    constructor(rows) {
        this.rows = [...rows];
    }

    clone() {
        return new GameBoard([...this.rows]);
    }

    isEmpty() {
        return this.rows.length === 0 || this.rows.every(row => row === 0);
    }

    asTuple() {
        return JSON.stringify(this.rows.filter(row => row > 0));
    }

    // Get all corner pieces (rightmost in each row)
    getCornerPieces() {
        const corners = [];
        for (let r = 0; r < this.rows.length; r++) {
            if (this.rows[r] > 0) {
                const last = this.rows.length - 1;
                const below = (r < last) ? this.rows[r + 1] : 0;
                
                // Valid corner if it's the bottom row OR longer than row below
                if (r === last || this.rows[r] > below) {
                    corners.push({ row: r, col: this.rows[r] - 1 });
                }
            }
        }
        return corners;
    }

    // Get topmost corner (A[0] - first corner in sequence)
    getTopmostCorner() {
        const corners = this.getCornerPieces();
        return corners.length > 0 ? corners[0] : null;
    }

    // Get bottommost corner (A[last] - last corner in sequence)
    getBottommostCorner() {
        const corners = this.getCornerPieces();
        return corners.length > 0 ? corners[corners.length - 1] : null;
    }

    // Check if position is a valid corner
    isCornerPiece(row, col) {
        if (row < 0 || row >= this.rows.length) return false;
        if (col < 0 || col >= this.rows[row]) return false;
        
        const corners = this.getCornerPieces();
        return corners.some(c => c.row === row && c.col === col);
    }

    // Check if position is topmost corner (A[0] - first in corner sequence)
    isTopmostCorner(row, col) {
        const corners = this.getCornerPieces();
        if (corners.length === 0) return false;
        const topmost = corners[0]; // A[0]
        return topmost.row === row && topmost.col === col;
    }

    // Check if position is bottommost corner (A[last] - last in corner sequence)
    isBottommostCorner(row, col) {
        const corners = this.getCornerPieces();
        if (corners.length === 0) return false;
        const bottommost = corners[corners.length - 1]; // A[A.length-1]
        return bottommost.row === row && bottommost.col === col;
    }

    // Check if selected pieces form a valid move
    isValidMove(selectedPieces) {
        if (selectedPieces.length === 0) return false;

        // All pieces must be corners
        for (const piece of selectedPieces) {
            if (!this.isCornerPiece(piece.row, piece.col)) {
                return false;
            }
        }

        // Must include topmost OR bottommost corner
        const hasTopmost = selectedPieces.some(p => this.isTopmostCorner(p.row, p.col));
        const hasBottommost = selectedPieces.some(p => this.isBottommostCorner(p.row, p.col));
        
        if (!hasTopmost && !hasBottommost) return false;

        // If single piece, it's valid
        if (selectedPieces.length === 1) return true;

        // Check if pieces form a connected path
        return this.areConnected(selectedPieces);
    }

    // Check if pieces form a connected path in the corner sequence
    areConnected(selectedPieces) {
        if (selectedPieces.length <= 1) return true;

        // Get all corners in their ordered sequence
        const A = this.getCornerPieces(); // Array of all corner coordinates
        
        // Create a map from coordinates to indices in the sequence
        const cornerIndexMap = new Map();
        A.forEach((corner, index) => {
            cornerIndexMap.set(`${corner.row},${corner.col}`, index);
        });

        // Get indices of selected pieces in the corner sequence
        const selectedIndices = selectedPieces.map(piece => {
            const key = `${piece.row},${piece.col}`;
            return cornerIndexMap.get(key);
        }).filter(index => index !== undefined).sort((a, b) => a - b);

        // Check if selected indices form a contiguous subsequence
        if (selectedIndices.length !== selectedPieces.length) return false;
        
        for (let i = 1; i < selectedIndices.length; i++) {
            if (selectedIndices[i] !== selectedIndices[i-1] + 1) {
                return false;
            }
        }

        return true;
    }

    // Check if two pieces are adjacent in the corner sequence
    areAdjacentInSequence(piece1, piece2) {
        const A = this.getCornerPieces();
        
        // Find indices of both pieces
        let index1 = -1, index2 = -1;
        for (let i = 0; i < A.length; i++) {
            if (A[i].row === piece1.row && A[i].col === piece1.col) index1 = i;
            if (A[i].row === piece2.row && A[i].col === piece2.col) index2 = i;
        }
        
        if (index1 === -1 || index2 === -1) return false;
        
        // Adjacent if indices differ by exactly 1
        return Math.abs(index1 - index2) === 1;
    }

    // Execute a move by removing selected pieces
    executeMove(selectedPieces) {
        for (const piece of selectedPieces) {
            // Remove piece by shortening the row
            if (piece.row < this.rows.length && piece.col < this.rows[piece.row]) {
                this.rows[piece.row] = piece.col;
            }
        }

        // Remove empty rows from bottom
        while (this.rows.length > 0 && this.rows[this.rows.length - 1] === 0) {
            this.rows.pop();
        }
    }

    // Get all valid moves for AI
    getAllValidMoves() {
        const moves = [];
        const corners = this.getCornerPieces();
        
        // Single corner moves
        for (const corner of corners) {
            if (this.isValidMove([corner])) {
                moves.push([corner]);
            }
        }

        // Multi-piece moves starting from topmost
        const topmost = this.getTopmostCorner();
        if (topmost) {
            this.generateConnectedMoves(moves, corners, topmost);
        }

        // Multi-piece moves starting from bottommost  
        const bottommost = this.getBottommostCorner();
        if (bottommost) {
            this.generateConnectedMoves(moves, corners, bottommost);
        }

        return moves;
    }

    // Generate connected moves from starting corner
    generateConnectedMoves(moves, corners, startCorner) {
        // Find the index of the starting corner in the sequence
        const startIndex = corners.findIndex(c => c.row === startCorner.row && c.col === startCorner.col);
        if (startIndex === -1) return;

        // Generate all contiguous subsequences that include the starting corner
        for (let start = 0; start <= startIndex; start++) {
            for (let end = startIndex; end < corners.length; end++) {
                if (start === end) continue; // Skip single pieces (already added)
                
                const subsequence = corners.slice(start, end + 1);
                if (this.isValidMove(subsequence)) {
                    moves.push([...subsequence]);
                }
            }
        }
    }
}

// ================================================================
// Simple AI
// ================================================================
const moveCache = new Map();

function evaluatePosition(boardState) {
    if (moveCache.has(boardState)) {
        return moveCache.get(boardState);
    }

    const board = new GameBoard(JSON.parse(boardState));
    const moves = board.getAllValidMoves();
    
    if (moves.length === 0) {
        moveCache.set(boardState, 0);
        return 0;
    }

    const childValues = new Set();
    for (const move of moves) {
        const newBoard = board.clone();
        newBoard.executeMove(move);
        childValues.add(evaluatePosition(newBoard.asTuple()));
    }

    let value = 0;
    while (childValues.has(value)) value++;
    
    moveCache.set(boardState, value);
    return value;
}

function getBestMove(board, difficulty) {
    const moves = board.getAllValidMoves();
    if (moves.length === 0) return null;

    if (difficulty <= 33) {
        // Easy: Random move
        return moves[randomInt(0, moves.length - 1)];
    }

    // Find winning moves
    for (const move of moves) {
        const newBoard = board.clone();
        newBoard.executeMove(move);
        if (evaluatePosition(newBoard.asTuple()) === 0) {
            if (difficulty <= 66 && Math.random() > 0.7) {
                // Medium: Sometimes ignore winning move
                continue;
            }
            return move;
        }
    }

    // If no winning move, return random
    return moves[randomInt(0, moves.length - 1)];
}

// ================================================================
// Game Controller
// ================================================================
class StrictContinuousCornerGame {
    constructor(rows, aiPlayer, aiDifficulty) {
        this.board = new GameBoard(rows);
        this.currentPlayer = 'A'; // A or B
        this.aiPlayer = aiPlayer; // 'A', 'B', or null
        this.aiDifficulty = aiDifficulty; // 1-100
        this.gameHistory = [];
        this.selectedPieces = [];
    }

    isAiTurn() {
        return this.aiPlayer === this.currentPlayer;
    }

    makeMove(selectedPieces) {
        // Validate move
        if (!this.board.isValidMove(selectedPieces)) {
            throw new Error('Invalid move');
        }

        // Save state for undo
        this.gameHistory.push({
            board: this.board.clone(),
            player: this.currentPlayer
        });

        // Execute move
        this.board.executeMove(selectedPieces);

        // Check if game is over
        if (this.board.isEmpty()) {
            return { gameOver: true, winner: this.currentPlayer };
        }

        // Switch players
        this.currentPlayer = this.currentPlayer === 'A' ? 'B' : 'A';
        
        return { gameOver: false };
    }

    undoMove() {
        if (this.gameHistory.length === 0) return false;
        
        const lastState = this.gameHistory.pop();
        this.board = lastState.board;
        this.currentPlayer = lastState.player;
        return true;
    }

    getAiMove() {
        return getBestMove(this.board, this.aiDifficulty);
    }
}

// ================================================================
// UI Controller
// ================================================================
class GameUI {
    constructor() {
        this.game = null;
        this.selectedPieces = [];
        this.tileThemes = ['grass', 'water', 'fire', 'stone'];
        this.currentThemeIndex = 0;
        // Database tracking
        this.movesSequence = [];
        this.gameStartTime = null;

        this.initializeElements();
        this.bindEvents();
        this.initializeTheme();
        this.showSetupModal();
    }

    initializeElements() {
        try {
            this.boardArea = document.getElementById('board-area');
            this.statusLabel = document.getElementById('status-label');
            this.aiThinkingIndicator = document.getElementById('ai-thinking-indicator');
            
            this.setupModal = document.getElementById('setup-modal-backdrop');
            this.gameOverModal = document.getElementById('game-over-modal-backdrop');
            this.gameOverMessage = document.getElementById('game-over-message');
            this.helpPopover = document.getElementById('help-popover');
            
            this.rowsInput = document.getElementById('rows-input');
            this.aiSelect = document.getElementById('ai-select');
            this.difficultySlider = document.getElementById('difficulty-slider');
            this.difficultyLabel = document.getElementById('difficulty-label');
            
            this.gameCard = document.getElementById('game-card');
            this.undoBtn = document.getElementById('undo-btn');
            this.downloadBtn = document.getElementById('download-btn');
            
            // Set initial status if status label exists
            if (this.statusLabel) {
                this.statusLabel.textContent = 'Click "New Game" to start';
            }
        } catch (error) {
            console.error('Error initializing SCC GUI elements:', error);
            const statusLabel = document.getElementById('status-label');
            if (statusLabel) {
                statusLabel.textContent = 'Error loading game. Please refresh the page.';
            }
        }
    }

    bindEvents() {
        // Game controls
        const newGameBtn = document.getElementById('new-game-btn');
        if (newGameBtn) {
            newGameBtn.addEventListener('click', () => this.showSetupModal());
        }
        
        const startGameBtn = document.getElementById('start-game-btn');
        if (startGameBtn) {
            startGameBtn.addEventListener('click', () => this.startGame());
        }
        
        const playAgainBtn = document.getElementById('play-again-btn');
        if (playAgainBtn) {
            playAgainBtn.addEventListener('click', () => this.playAgain());
        }
        
        // Board interaction
        if (this.boardArea) {
            this.boardArea.addEventListener('click', (e) => this.handleBoardClick(e));
        }
        
        // Selection controls (now inside game card)
        const confirmSelectionBtn = document.getElementById('confirm-selection-btn');
        if (confirmSelectionBtn) {
            confirmSelectionBtn.addEventListener('click', () => this.confirmMove());
        }
        
        const clearSelectionBtn = document.getElementById('clear-selection-btn');
        if (clearSelectionBtn) {
            clearSelectionBtn.addEventListener('click', () => this.clearSelection());
        }
        
        // Undo and download
        if (this.undoBtn) {
            this.undoBtn.addEventListener('click', () => this.undoMove());
        }
        if (this.downloadBtn) {
            this.downloadBtn.addEventListener('click', () => this.downloadGame());
        }
        
        // Help
        const helpBtn = document.getElementById('help-btn');
        const helpBtnModal = document.getElementById('help-btn-modal');
        const helpPopover = document.getElementById('help-popover');
        
        if (helpBtn && helpPopover) {
            helpBtn.addEventListener('mouseenter', () => this.showHelp());
            helpBtn.addEventListener('mouseleave', () => this.hideHelp());
        }
        
        if (helpBtnModal && helpPopover) {
            helpBtnModal.addEventListener('mouseenter', () => this.showHelp());
            helpBtnModal.addEventListener('mouseleave', () => this.hideHelp());
        }
        
        // Partition generation
        const generatePartitionBtn = document.getElementById('generate-partition-btn');
        if (generatePartitionBtn) {
            generatePartitionBtn.addEventListener('click', () => this.generatePartition());
        }
        const partitionTypeSelect = document.getElementById('partition-type-select');
        if (partitionTypeSelect) {
            partitionTypeSelect.addEventListener('change', () => this.updatePartitionUI());
            this.updatePartitionUI();
        }
        
        // Difficulty slider
        if (this.difficultySlider) {
            this.difficultySlider.addEventListener('input', () => this.updateDifficultyLabel());
        }
    }

    // Theme management (tile skin only — light/dark is handled site-wide)
    initializeTheme() {
        const savedTileTheme = localStorage.getItem('strict-continuous-corner-tile-theme') || 'grass';
        this.currentThemeIndex = this.tileThemes.indexOf(savedTileTheme);
        if (this.currentThemeIndex === -1) this.currentThemeIndex = 0;
        this.applyTileTheme();
    }

    cycleTileTheme() {
        this.currentThemeIndex = (this.currentThemeIndex + 1) % this.tileThemes.length;
        this.applyTileTheme();
    }

    applyTileTheme() {
        const themeName = this.tileThemes[this.currentThemeIndex];
        if (this.gameCard) {
            this.gameCard.setAttribute('data-tile-theme', themeName);
        }
        localStorage.setItem('strict-continuous-corner-tile-theme', themeName);
    }

    // Modal management
    showSetupModal() {
        // Hide game over modal first if it's visible
        if (this.gameOverModal) {
            this.gameOverModal.classList.remove('visible');
        }
        if (this.setupModal) {
            this.setupModal.classList.add('visible');
            this.updateDifficultyLabel();
        }
    }

    hideSetupModal() {
        if (this.setupModal) {
            this.setupModal.classList.remove('visible');
        }
    }

    showGameOverModal(winner) {
        if (this.gameOverMessage) {
            this.gameOverMessage.textContent = `Player ${winner.toLowerCase()} wins!`;
        }
        if (this.gameOverModal) {
            this.gameOverModal.classList.add('visible');
        }
    }

    hideGameOverModal() {
        if (this.gameOverModal) {
            this.gameOverModal.classList.remove('visible');
        }
    }

    showHelp() {
        if (this.helpPopover) {
            this.helpPopover.classList.add('visible');
        }
    }

    hideHelp() {
        if (this.helpPopover) {
            this.helpPopover.classList.remove('visible');
        }
    }

    playAgain() {
        this.game = null;
        this.selectedPieces = [];
        this.hideGameOverModal();
        if (this.boardArea) {
            this.boardArea.innerHTML = '';
        }
        if (this.statusLabel) {
            this.statusLabel.textContent = 'Click "New Game" to start';
        }
        this.updateButtons();
        this.showSetupModal();
    }

    // Game management
    startGame() {
        try {
            
            const rowsText = this.rowsInput.value.trim();
            
            const rows = rowsText.split(/\s+/).map(x => parseInt(x)).filter(x => x > 0).sort((a, b) => b - a);
            
            if (rows.length === 0) {
                throw new Error('Invalid partition');
            }
            
            const aiPlayer = this.aiSelect.value === 'None' ? null : this.aiSelect.value;
            const difficulty = parseInt(this.difficultySlider.value);
            
            this.game = new StrictContinuousCornerGame(rows, aiPlayer, difficulty);
            this.selectedPieces = [];
            
            // Initialize database tracking
            this.movesSequence = [];
            this.gameStartTime = new Date();
            this.initialPartition = [...rows]; // Store initial partition
            
            this.hideSetupModal();
            this.hideGameOverModal();
            this.updateBoard();
            this.updateStatus();
            this.updateButtons();
            
            if (this.game.isAiTurn()) {
                this.aiTurn();
            }
        } catch (error) {
            console.error('Error starting SCC game:', error);
            alert('Please enter a valid partition (e.g., "5 4 2 1")');
        }
    }

    updateDifficultyLabel() {
        if (!this.difficultySlider || !this.difficultyLabel) return;
        
        const value = this.difficultySlider.value;
        let level;
        if (value <= 33) level = 'Easy';
        else if (value <= 66) level = 'Medium';
        else level = 'Hard';
        
        this.difficultyLabel.textContent = `${level} (${value})`;
    }

    // Board rendering
    updateBoard() {
        if (!this.game || !this.boardArea) return;
        
        this.boardArea.innerHTML = '';
        
        if (this.game.board.isEmpty()) {
            this.boardArea.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--gray);">game over</div>';
            return;
        }
        
        const maxRow = this.game.board.rows.length;
        const maxCol = Math.max(...this.game.board.rows);
        
        // Calculate tile size and positioning
        const CELL_SIZE = 40;
        const GAP = 2;
        const MARGIN = 20;
        
        // Calculate board dimensions
        const boardDataWidth = maxCol * CELL_SIZE + (maxCol - 1) * GAP;
        const boardDataHeight = maxRow * CELL_SIZE + (maxRow - 1) * GAP;
        let boardWidth = MARGIN * 2 + boardDataWidth;
        let boardHeight = MARGIN * 2 + boardDataHeight;
        const minDimension = 480;
        boardWidth = Math.max(boardWidth, minDimension);
        boardHeight = Math.max(boardHeight, minDimension);
        
        // Calculate horizontal centering offset
        const actualContentWidth = MARGIN * 2 + boardDataWidth;
        const centerOffsetX = (boardWidth - actualContentWidth) / 2;
        
        // Set board area dimensions
        this.boardArea.style.width = `${boardWidth}px`;
        this.boardArea.style.height = `${boardHeight}px`;
        this.boardArea.style.position = 'relative';
        
        for (let r = 0; r < maxRow; r++) {
            for (let c = 0; c < maxCol; c++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                tile.dataset.row = r;
                tile.dataset.col = c;
                tile.id = `t-${r}-${c}`;
                
                // Set tile dimensions
                tile.style.width = `${CELL_SIZE}px`;
                tile.style.height = `${CELL_SIZE}px`;
                
                // Position tile
                tile.style.left = `${centerOffsetX + MARGIN + c * (CELL_SIZE + GAP)}px`;
                tile.style.top = `${MARGIN + r * (CELL_SIZE + GAP)}px`;
                
                if (c < this.game.board.rows[r]) {
                    // Occupied tile
                    const isSelected = this.selectedPieces.some(p => p.row === r && p.col === c);
                    const isCorner = this.game.board.isCornerPiece(r, c);
                    const isTopmost = this.game.board.isTopmostCorner(r, c);
                    const isBottommost = this.game.board.isBottommostCorner(r, c);
                    
                    if (isSelected) {
                        tile.classList.add('selected');
                    }
                    
                    if (isTopmost || isBottommost) {
                        tile.classList.add('starting-corner');
                    }
                    
                    if (isCorner && !this.game.isAiTurn()) {
                        tile.style.cursor = 'pointer';
                        tile.classList.add('corner-piece');
                        tile.style.pointerEvents = 'auto';
                    }
                } else {
                    // Empty space
                    tile.style.opacity = '0';
                    tile.style.pointerEvents = 'none';
                }
                
                this.boardArea.appendChild(tile);
            }
        }
    }

    handleBoardClick(event) {
        if (!this.game || this.game.isAiTurn()) return;
        
        const tile = event.target.closest('.tile');
        if (!tile) return;
        
        const row = parseInt(tile.dataset.row);
        const col = parseInt(tile.dataset.col);
        
        if (!this.game.board.isCornerPiece(row, col)) return;
        
        const piece = { row, col };
        const existingIndex = this.selectedPieces.findIndex(p => p.row === row && p.col === col);
        
        if (existingIndex >= 0) {
            // Deselect piece
            this.selectedPieces.splice(existingIndex, 1);
        } else {
            // Try to select piece
            const testSelection = [...this.selectedPieces, piece];
            
            if (this.game.board.isValidMove(testSelection)) {
                this.selectedPieces.push(piece);
            } else {
                this.showInvalidMessage();
            }
        }
        
        this.updateBoard();
        this.updateButtons();
    }

    showInvalidMessage() {
        const message = document.createElement('div');
        message.textContent = 'Invalid selection: must include first or last corner (glowing) and form contiguous sequence';
        message.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--orange);
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            z-index: 9999;
            font-family: inherit;
            font-size: 14px;
        `;
        document.body.appendChild(message);
        
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 2000);
    }

    confirmMove() {
        if (this.selectedPieces.length === 0) return;
        
        // Add removing animation
        this.selectedPieces.forEach(piece => {
            const tile = document.querySelector(`[data-row="${piece.row}"][data-col="${piece.col}"]`);
            if (tile) tile.classList.add('removing');
        });
        
        setTimeout(() => {
            try {
                // Track the move
                const moveStr = this.selectedPieces.map(p => `R${p.row}C${p.col}`).join(',');
                this.movesSequence.push(moveStr);
                
                const result = this.game.makeMove([...this.selectedPieces]);
                this.selectedPieces = [];
                this.updateBoard();
                this.updateStatus();
                this.updateButtons();
                
                if (result.gameOver) {
                    this.showGameOverModal(result.winner);
                    this.storeGameInDatabase(result.winner);
                } else if (this.game.isAiTurn()) {
                    this.aiTurn();
                }
            } catch (error) {
                alert(error.message);
                this.updateBoard();
            }
        }, 300);
    }

    clearSelection() {
        this.selectedPieces = [];
        this.updateBoard();
        this.updateButtons();
    }

    // AI turn
    aiTurn() {
        this.aiThinkingIndicator.classList.add('visible');
        this.statusLabel.textContent = 'ai thinking...';
        
        setTimeout(() => {
            const move = this.game.getAiMove();
            this.aiThinkingIndicator.classList.remove('visible');
            
            if (move) {
                this.selectedPieces = move;
                this.confirmMove();
            } else {
                this.updateStatus();
            }
        }, 1100);
    }

    // Status updates
    updateStatus() {
        if (!this.statusLabel) return;
        
        if (!this.game) {
            this.statusLabel.textContent = 'Click "New Game" to start';
            return;
        }
        
        const player = this.game.currentPlayer;
        const isAi = this.game.isAiTurn();
        const playerType = isAi ? 'AI' : 'Human';
        
        this.statusLabel.textContent = `Player ${player.toLowerCase()} (${playerType}) to move`;
    }

    updateButtons() {
        if (!this.game) return;
        
        // Selection controls
        const selectionControls = document.getElementById('selection-controls');
        const confirmSelectionBtn = document.getElementById('confirm-selection-btn');
        const clearSelectionBtn = document.getElementById('clear-selection-btn');
        const showSelection = this.selectedPieces.length > 0 && !this.game.isAiTurn();
        if (selectionControls) {
            selectionControls.style.display = showSelection ? 'flex' : 'none';
        }
        if (confirmSelectionBtn) {
            confirmSelectionBtn.disabled = this.selectedPieces.length === 0;
        }
        if (clearSelectionBtn) {
            clearSelectionBtn.disabled = this.selectedPieces.length === 0;
        }
        
        // Undo button
        if (this.undoBtn) {
            const canUndo = this.game.gameHistory.length > 0 && !this.game.isAiTurn() && this.selectedPieces.length === 0;
            this.undoBtn.style.display = canUndo ? 'inline-block' : 'none';
        }
        
        // Download button
        if (this.downloadBtn) {
            const hasHistory = this.game.gameHistory.length > 0;
            this.downloadBtn.style.display = hasHistory ? 'inline-block' : 'none';
        }
    }

    undoMove() {
        if (!this.game) return;
        
        if (this.game.undoMove()) {
            this.selectedPieces = [];
            this.updateBoard();
            this.updateStatus();
            this.updateButtons();
        }
    }

    // Partition generation
    updatePartitionUI() {
        const type = document.getElementById('partition-type-select').value;
        const isRect = type === 'rectangle';
        const colsBox = document.getElementById('partition-cols-box');
        const label = document.getElementById('partition-number-label');
        if (colsBox) colsBox.style.display = isRect ? '' : 'none';
        if (label) label.textContent = type === 'random' ? 'partitions' : isRect ? 'rows' : type === 'staircase' ? 'rows' : 'size';
    }

    generatePartition() {
        const typeSelect = document.getElementById('partition-type-select');
        const numberInput = document.getElementById('partition-number-input');

        const type = typeSelect.value;
        const n = parseInt(numberInput.value);

        if (isNaN(n) || n <= 0 || n > 100) {
            alert('Please enter a number between 1 and 100');
            return;
        }

        let partition;

        switch (type) {
            case 'random':
                partition = randomPartition(n);
                break;
            case 'staircase':
                partition = staircase(n);
                break;
            case 'rectangle': {
                const cols = parseInt(document.getElementById('partition-cols-input').value, 10);
                if (isNaN(cols) || cols <= 0 || cols > 100) {
                    alert('Please enter a number of columns between 1 and 100');
                    return;
                }
                partition = rectangle(n, cols);
                break;
            }
            case 'hook':
                partition = hook(n);
                break;
            default:
                alert('Partition type not implemented yet');
                return;
        }

        this.rowsInput.value = partition.join(' ');
    }

    // Download game
    downloadGame() {
        if (!this.game || this.game.gameHistory.length === 0) {
            alert('No game history to download');
            return;
        }
        
        const htmlContent = this.generateReplayHTML();
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `strict-continuous-corner-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    generateReplayHTML() {
        const title = `strict continuous corner replay - ${new Date().toLocaleDateString()}`;
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: monospace; padding: 20px; background: #1a1a1a; color: #e5e5e5; }
        .container { max-width: 800px; margin: 0 auto; }
        h1 { color: #FF6B35; text-align: center; }
        .controls { text-align: center; margin: 20px 0; }
        button { padding: 10px 20px; margin: 0 5px; background: #FF6B35; color: white; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #E55A2B; }
        .state-info { text-align: center; margin: 20px 0; font-size: 1.1em; }
        .board { display: inline-block; border: 1px solid #666; border-radius: 6px; padding: 20px; background: #222; }
        .tile { width: 30px; height: 30px; display: inline-block; margin: 1px; border-radius: 2px; background: #4CAF50; }
        .corner-piece { border: 2px solid #FF6B35; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔗 ${title}</h1>
        <div class="controls">
            <button onclick="goToState(0)">⏮ first</button>
            <button onclick="previousState()">◀ previous</button>
            <button onclick="toggleAutoplay()">▶ play</button>
            <button onclick="nextState()">next ▶</button>
            <button onclick="goToState(gameStates.length-1)">last ⏭</button>
        </div>
        <div class="state-info">
            state <span id="current-state">1</span> of <span id="total-states">${this.game.gameHistory.length + 1}</span>
        </div>
        <div id="board-display" style="text-align: center;"></div>
    </div>
    <script>
        const gameStates = ${JSON.stringify([...this.game.gameHistory, { board: this.game.board, player: this.game.currentPlayer }])};
        let currentStateIndex = 0;
        let autoplayInterval = null;
        
        function renderState(state) {
            const board = state.board;
            let html = '<div class="board">';
            
            for (let r = 0; r < board.rows.length; r++) {
                html += '<div>';
                for (let c = 0; c < board.rows[r]; c++) {
                    html += '<div class="tile"></div>';
                }
                html += '</div>';
            }
            html += '</div>';
            
            document.getElementById('board-display').innerHTML = html;
            document.getElementById('current-state').textContent = currentStateIndex + 1;
        }
        
        function goToState(index) {
            if (index >= 0 && index < gameStates.length) {
                currentStateIndex = index;
                renderState(gameStates[index]);
            }
        }
        
        function nextState() { goToState(currentStateIndex + 1); }
        function previousState() { goToState(currentStateIndex - 1); }
        
        function toggleAutoplay() {
            if (autoplayInterval) {
                clearInterval(autoplayInterval);
                autoplayInterval = null;
            } else {
                autoplayInterval = setInterval(() => {
                    if (currentStateIndex < gameStates.length - 1) nextState();
                    else toggleAutoplay();
                }, 1500);
            }
        }
        
        document.getElementById('total-states').textContent = gameStates.length;
        if (gameStates.length > 0) goToState(0);
    </script>
</body>
</html>`;
    }

    async storeGameInDatabase(winner) {
        try {
            if (window.DatabaseUtils) {
                await window.DatabaseUtils.storeGameInDatabase(
                    'SCC',
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

// Initialize the game when page loads
window.addEventListener('load', () => {
    new GameUI();
});