// --- CORE GAME LOGIC ---

// Corner Game: Remove last cell of each row, except when there are consecutive
// rows of the same length - only the last row in the consecutive block loses a cell

class Board {
  constructor(rows) {
    this.rows = [...rows];
  }
  isEmpty() {
    return this.rows.length === 0 || this.rows.every((r) => r === 0);
  }
  height() {
    return this.rows.length;
  }
  width() {
    return this.rows.length ? Math.max(...this.rows) : 0;
  }

  // Corner-specific move: remove last cell from appropriate rows
  makeCornerMove() {
    if (this.isEmpty()) return;

    // Group consecutive rows of same length
    const groups = [];
    let currentGroup = [0];

    for (let i = 1; i < this.rows.length; i++) {
      if (this.rows[i] === this.rows[i - 1]) {
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
    this.rows = this.rows.filter((r) => r > 0);
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
    this.rows = this.rows.filter((r) => r > 0);
  }

  // Get all the "last pieces" that can be selected
  getSelectableLastPieces() {
    if (this.isEmpty()) return [];

    // Group consecutive rows of same length
    const groups = [];
    if (this.rows.length > 0) {
        let currentGroup = [0];
        for (let i = 1; i < this.rows.length; i++) {
          if (this.rows[i] === this.rows[i - 1]) {
            currentGroup.push(i);
          } else {
            groups.push(currentGroup);
            currentGroup = [i];
          }
        }
        groups.push(currentGroup);
    }
    
    // For each group, the last row in the group has a selectable piece
    const selectablePieces = [];
    for (const group of groups) {
      const lastRowInGroup = group[group.length - 1];
      if (this.rows[lastRowInGroup] > 0) {
        selectablePieces.push({
          row: lastRowInGroup,
          col: this.rows[lastRowInGroup] - 1,
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
  asTuple() {
    return JSON.stringify(this.rows);
  }
}

/* ───────── Grundy numbers for Corner game with selection ───────── */
const grundyMemo = new Map();
const misereGrundyMemo = new Map();

// Generate all possible corner moves (non-empty subsets of selectable pieces)
function* allCornerMoves(board) {
  const selectable = board.getSelectableLastPieces();
  const n = selectable.length;

  // Generate all non-empty subsets (1 to 2^n - 1)
  for (let mask = 1; mask < 1 << n; mask++) {
    const move = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        move.push(selectable[i]);
      }
    }
    yield move;
  }
}

// --- Normal Play Logic ---
function grundy(position) {
  if (position === "[]") return 0;
  if (grundyMemo.has(position)) return grundyMemo.get(position);

  const board = new Board(JSON.parse(position));
  if (board.getSelectableLastPieces().length === 0) {
    grundyMemo.set(position, 0);
    return 0;
  }

  const childValues = new Set();
  for (const move of allCornerMoves(board)) {
    const child = new Board([...board.rows]);
    child.makeCornerMoveWithSelection(move);
    childValues.add(grundy(child.asTuple()));
  }

  let g = 0;
  while (childValues.has(g)) g++;
  grundyMemo.set(position, g);
  return g;
}

function perfectMove(position) {
  const board = new Board(JSON.parse(position));
  if (board.getSelectableLastPieces().length === 0) {
    throw new Error("No legal moves available");
  }

  for (const move of allCornerMoves(board)) {
    const child = new Board([...board.rows]);
    child.makeCornerMoveWithSelection(move);
    if (grundy(child.asTuple()) === 0) {
      return move;
    }
  }

  const allMoves = [...allCornerMoves(board)];
  return allMoves.length > 0 ? allMoves[0] : [];
}

// --- Misere Play Logic ---
function misereGrundy(position) {
    // A terminal position is a WINNING position for the player whose turn it is in misere play
    // (because the previous player made the last move and lost). We return 1 for Win, 0 for Loss.
    if (position === "[]") return 1;
    if (misereGrundyMemo.has(position)) return misereGrundyMemo.get(position);

    const board = new Board(JSON.parse(position));
    if (board.getSelectableLastPieces().length === 0) {
        misereGrundyMemo.set(position, 1);
        return 1;
    }

    // A position is WINNING if there is AT LEAST ONE move to a LOSING position for the opponent.
    for (const move of allCornerMoves(board)) {
        const child = new Board([...board.rows]);
        child.makeCornerMoveWithSelection(move);
        if (misereGrundy(child.asTuple()) === 0) { // Found a move to a losing position
            misereGrundyMemo.set(position, 1); // So, this position is winning
            return 1;
        }
    }

    // If all moves lead to winning positions for the opponent, this position is LOSING.
    misereGrundyMemo.set(position, 0);
    return 0;
}

function miserePerfectMove(position) {
    const board = new Board(JSON.parse(position));
    if (board.getSelectableLastPieces().length === 0) {
        throw new Error("No legal moves available");
    }

    // Look for a move that leads to a misere-losing (value 0) position for the opponent.
    for (const move of allCornerMoves(board)) {
        const child = new Board([...board.rows]);
        child.makeCornerMoveWithSelection(move);
        if (misereGrundy(child.asTuple()) === 0) {
            return move; // This is a winning move in misere
        }
    }

    // No winning move found, all moves lead to winning positions for opponent.
    // Return the first legal move as a fallback.
    const allMoves = [...allCornerMoves(board)];
    return allMoves.length > 0 ? allMoves[0] : [];
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
  constructor(board, aiPlayer, gameMode = 'normal') {
    this.board = board;
    this.currentIndex = 0;
    this.aiIndex = aiPlayer ? Game.PLAYERS.indexOf(aiPlayer) : null;
    this.gameMode = gameMode;
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

// --- RANDOM PARTITION UTILITIES ---
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

// --- SOUND MANAGER ---
const SoundManager = {
  sounds: {},
  init() {
    // Sound effects disabled
  },
  play(soundName) {
    // Sound effects disabled
  },
};

// --- GUI CONTROLLER ---
class ProCornerGui {
  constructor() {
    this.CELL = 40;
    this.GAP = 2; // Gap between tiles
    this.MARGIN = 20;
    this.ANIMATION_MS = 650;
    this.AI_THINK_MS = 1100;
    this.game = null;
    this.isAnimating = false;
    this.hoveredMove = null;
    this.aiDifficulty = "Medium";
    this.gameMode = 'normal';
    this.currentTileTheme = "grass";
    this.tileThemes = ["grass", "stone", "ice"];
    this.tileThemeEmojis = { grass: "🔥", stone: "🪨", ice: "🧊" };
    this.gameHistory = [];
    this.initialPartition = [];

    // Database tracking properties
    this.movesSequence = [];
    this.gameStartTime = null;

    // Selection state for new Corner logic
    this.selectedPieces = []; // Array of {row, col} objects
    this.selectablePieces = []; // Array of {row, col} objects representing last pieces
    this.isInSelectionMode = false;

    this.analysis = null; //Analysis mode

    // Multiplayer state
    this.isMultiplayer = false;
    this.playerNumber = null; // 0 or 1
    this.turnMessageTimeout = null;

    this.getDOMElements();
    this.bindEventListeners();
    this.initTheme();
    this.showSetupModal();
    SoundManager.init();
  }

  getDOMElements() {
    this.gameCard = document.getElementById("game-card");
    this.statusLabel = document.getElementById("status-label");
    this.boardArea = document.getElementById("board-area");
    this.aiThinkingIndicator = document.getElementById("ai-thinking-indicator");
    this.newGameBtn = document.getElementById("new-game-btn");
    this.themeToggle = document.getElementById("theme-toggle");
    this.cycleThemeBtn = document.getElementById("cycle-theme-btn");
    this.setupModal = document.getElementById("setup-modal-backdrop");
    this.gameOverModal = document.getElementById("game-over-modal-backdrop");
    this.rowsInput = document.getElementById("rows-input");
    this.partitionTypeSelect = document.getElementById("partition-type-select");
    this.partitionNumberInput = document.getElementById(
      "partition-number-input"
    );
    this.partitionNumberLabel = document.getElementById("partition-number-label");
    this.partitionColsInput = document.getElementById("partition-cols-input");
    this.partitionColsBox = document.getElementById("partition-cols-box");
    this.generatePartitionBtn = document.getElementById(
      "generate-partition-btn"
    );
    this.gameModeSelect = document.getElementById('game-mode-select');
    this.aiSelect = document.getElementById("ai-select");
    this.difficultySlider = document.getElementById("difficulty-slider");
    this.difficultyLabel = document.getElementById("difficulty-label");
    this.startGameBtn = document.getElementById("start-game-btn");
    this.playAgainBtn = document.getElementById("play-again-btn");
    // Multiplayer elements (added to page)
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
    this.gameOverMessage = document.getElementById("game-over-message");

    this.helpBtn = document.getElementById("help-btn");
    this.helpBtnModal = document.getElementById("help-btn-modal");
    this.helpPopover = document.getElementById("help-popover");
    this.gameRuleDescription = document.getElementById('game-rule-description');
    this.downloadBtnModal = document.getElementById("download-btn-modal");
    this.reportBtnModal = document.getElementById("report-btn-modal");

    // New selection control elements
    this.selectionControls = document.getElementById("selection-controls");
    this.confirmSelectionBtn = document.getElementById("confirm-selection-btn");
    this.clearSelectionBtn = document.getElementById("clear-selection-btn");
  }

  bindEventListeners() {
    this.startGameBtn.addEventListener("click", () => this.processSetup());

    if (this.newGameBtn) {
      this.newGameBtn.addEventListener("click", (e) => {
        e.preventDefault();
        SoundManager.play("click");
        this.showSetupModal();
      });
    }

    if (this.playAgainBtn) {
      this.playAgainBtn.addEventListener("click", (e) => {
        e.preventDefault();
        SoundManager.play("click");
        this.showSetupModal();
      });
    }
    if (this.cycleThemeBtn) {
      this.cycleThemeBtn.addEventListener("click", () => this.cycleTileTheme());
      this.cycleThemeBtn.addEventListener("wheel", (e) => {
        e.preventDefault();
        this.cycleTileTheme();
      });
    }
    this.difficultySlider.addEventListener("input", () =>
      this.updateDifficultyLabel()
    );
    this.helpBtn.addEventListener("mouseenter", () => this.showHelp());
    this.helpBtn.addEventListener("mouseleave", () => this.hideHelp());
    if (this.helpBtnModal) {
      this.helpBtnModal.addEventListener("mouseenter", () => this.showHelp());
      this.helpBtnModal.addEventListener("mouseleave", () => this.hideHelp());
    }
    if (this.generatePartitionBtn) {
      this.generatePartitionBtn.addEventListener("click", () =>
        this.generatePartition()
      );
    }
    if (this.partitionTypeSelect) {
      this.partitionTypeSelect.addEventListener("change", () => this.updatePartitionUI());
      this.updatePartitionUI();
    }

    if (this.multiplayerBtn) {
      this.multiplayerBtn.addEventListener('click', () => {
        SoundManager.play('click');
        if (this.setupModal) {
          this.setupModal.classList.remove('visible');
          this.setupModal.style.opacity = "0";
          this.setupModal.style.visibility = "hidden";
        }
        if (this.multiplayerModal) {
          this.multiplayerModal.style.display = 'flex';
          this.multiplayerModal.classList.add('visible');
          this.multiplayerModal.style.opacity = "1";
          this.multiplayerModal.style.visibility = "visible";
        }
      });
    }
    // Multiplayer events
    if (this.multiplayerBackBtn) {
      this.multiplayerBackBtn.addEventListener('click', () => {
        SoundManager.play('click');
        this.multiplayerModal.classList.remove('visible');
        this.multiplayerModal.style.opacity = "0";
        this.multiplayerModal.style.visibility = "hidden";
        setTimeout(() => {
          this.multiplayerModal.style.display = 'none';
        }, 300);
        this.setupModal.classList.add('visible');
        this.setupModal.style.opacity = "1";
        this.setupModal.style.visibility = "visible";
      });
    }
    if (this.multiplayerGeneratePartitionBtn) {
      this.multiplayerGeneratePartitionBtn.addEventListener('click', () => {
        const type = this.multiplayerPartitionTypeSelect.value;
        const n = parseInt(this.multiplayerPartitionNumberInput.value, 10);
        if (!n || n <= 0) { alert('Please enter a positive number'); return; }
        let p;
        if (type === 'random') p = randomPartition(n);
        else if (type === 'staircase') p = staircase(n);
        else if (type === 'square') p = rectangle(n, n);
        else if (type === 'hook') p = hook(n);
        this.multiplayerRowsInput.value = p.join(' ');
      });
    }
    if (this.downloadBtnModal) {
      this.downloadBtnModal.addEventListener("click", () => {
        SoundManager.play("click");
        this.downloadGame();
      });
    }
     if (this.reportBtnModal) {
        this.reportBtnModal.addEventListener('click', () => {
            SoundManager.play('click');
            this.openGameReport();
        });
    }
    if (this.gameModeSelect) {
        this.gameModeSelect.addEventListener('change', (e) => this.updateGameMode(e.target.value));
    }

    if (this.confirmSelectionBtn) {
      this.confirmSelectionBtn.addEventListener("click", () =>
        this.confirmSelection()
      );
    }
    if (this.clearSelectionBtn) {
      this.clearSelectionBtn.addEventListener("click", () =>
        this.clearSelection()
      );
    }

    this.boardArea.addEventListener("mousemove", (event) =>
      this.handleMouseMove(event)
    );
    this.boardArea.addEventListener("mouseleave", () =>
      this.handleMouseLeave()
    );
    this.boardArea.addEventListener("click", (event) =>
      this.handleMouseClick(event)
    );
  }
  
  updateGameMode(mode) {
      this.gameMode = mode;
      if (mode === 'misere') {
          this.gameRuleDescription.textContent = 'The player who removes the last cell loses the game.';
      } else {
          this.gameRuleDescription.textContent = 'The player who removes the last cell wins the game.';
      }
  }

  cycleTileTheme() {
    const currentIndex = this.tileThemes.indexOf(this.currentTileTheme);
    const nextIndex = (currentIndex + 1) % this.tileThemes.length;
    this.currentTileTheme = this.tileThemes[nextIndex];

    if (this.gameCard) {
      this.gameCard.setAttribute("data-tile-theme", this.currentTileTheme);
    }

    if (this.cycleThemeBtn) {
      const emoji = this.tileThemeEmojis[this.currentTileTheme];
      this.cycleThemeBtn.textContent = `[tiles: ${emoji}]`;
    }
  }

  processSetup() {
    try {
      SoundManager.play("click");
      const nums = this.rowsInput.value.trim().split(/\s+/).map(Number).filter(n => n > 0).sort((a, b) => b - a);
      if (nums.length === 0 || nums.some((n) => isNaN(n) || n <= 0))
        throw new Error("Invalid input");

      const aiSide =
        this.aiSelect.value === "None" ? null : this.aiSelect.value;
      
      const gameMode = this.gameModeSelect.value;

      const difficultyValue = parseInt(this.difficultySlider.value);
      switch (difficultyValue) {
        case 1: this.aiDifficulty = "Easy"; break;
        case 2: this.aiDifficulty = "Medium"; break;
        case 3: this.aiDifficulty = "Hard"; break;
        default: this.aiDifficulty = "Medium"; break;
      }

      this.currentTileTheme = "grass";
      if (this.gameCard) {
        this.gameCard.setAttribute("data-tile-theme", this.currentTileTheme);
      }
      if (this.cycleThemeBtn) {
        const emoji = this.tileThemeEmojis[this.currentTileTheme];
        this.cycleThemeBtn.textContent = `[tiles: ${emoji}]`;
      }

      this.setupModal.classList.remove("visible");
      this.setupModal.style.opacity = "0";
      this.setupModal.style.visibility = "hidden";

      this.startGame(nums, aiSide, gameMode);
    } catch (e) {
      alert("Invalid input. Please enter positive integers only.");
    }
  }

  loadState(gameState) {
    this.game.board = new Board(gameState.board.grid);
    this.game.currentIndex = gameState.currentIndex;
    this.isAnimating = false;

    this.exitSelectionMode();
    this.redrawBoard();
    this.updateStatus();
    this.analysis?.updatePanel();
  }

  startGame(rows, aiSide, gameMode) {
    this.initialPartition = [...rows];
    this.game = new Game(new Board(rows), aiSide, gameMode);
    this.hoveredMove = null;
    this.isAnimating = false;
    this.gameHistory = [];
    this.movesSequence = []; 
    this.gameStartTime = new Date();

    grundyMemo.clear();
    misereGrundyMemo.clear();

    this.exitSelectionMode();
    this.redrawBoard();
    this.updateStatus();
    if (!this.isMultiplayer && this.game.isAiTurn()) {
      this.aiTurn();
    }
    this.analysis?.onGameStart();
  }

  aiTurn() {
    if (!this.game || !this.game.isAiTurn() || this.isAnimating) return;

    this.aiThinkingIndicator.classList.add("thinking");

    setTimeout(() => {
      this.aiThinkingIndicator.classList.remove("thinking");

      try {
        let selectedPieces;
        const isHard = this.aiDifficulty === 'Hard';
        const isMedium = this.aiDifficulty === 'Medium';

        if (this.game.gameMode === 'misere') {
            // Misere AI Logic
            if (isHard || (isMedium && Math.random() < 0.7)) {
                selectedPieces = miserePerfectMove(this.game.board.asTuple());
            } else { // Easy or failed Medium roll
                const allMoves = [...allCornerMoves(this.game.board)];
                if (allMoves.length > 0) {
                    selectedPieces = allMoves[Math.floor(Math.random() * allMoves.length)];
                }
            }
        } else {
            // Normal AI Logic
            if (isHard || (isMedium && Math.random() < 0.7)) {
                selectedPieces = perfectMove(this.game.board.asTuple());
            } else { // Easy or failed Medium roll
                const allMoves = [...allCornerMoves(this.game.board)];
                if (allMoves.length > 0) {
                    selectedPieces = allMoves[Math.floor(Math.random() * allMoves.length)];
                }
            }
        }

        if (selectedPieces && selectedPieces.length > 0) {
          this.executeWithAnimation(selectedPieces);
        } else {
          console.warn("AI could not find valid move, using fallback");
          this.executeWithAnimation();
        }
      } catch (error) {
        console.error("AI error:", error);
        this.executeWithAnimation();
      }
    }, this.AI_THINK_MS);
  }

  handleMouseMove(event) {
    if (
      !this.game ||
      this.game.isAiTurn() ||
      this.isAnimating ||
      this.game.board.isEmpty()
    )
      return;

    const rect = this.boardArea.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const centerOffset = this.getBoardCenterOffset();
    let detectedMove = null;

    for (let r = 0; r < this.game.board.height(); r++) {
      for (let c = 0; c < this.game.board.rows[r]; c++) {
        const cellLeft = centerOffset.x + c * (this.CELL + this.GAP);
        const cellTop = centerOffset.y + r * (this.CELL + this.GAP);
        const cellRight = cellLeft + this.CELL;
        const cellBottom = cellTop + this.CELL;

        if (
          mouseX >= cellLeft &&
          mouseX <= cellRight &&
          mouseY >= cellTop &&
          mouseY <= cellBottom
        ) {
          detectedMove = "corner";
          break;
        }
      }
      if (detectedMove) break;
    }

    if (detectedMove !== this.hoveredMove) {
      if (detectedMove) SoundManager.play("hover");
      this.hoveredMove = detectedMove;
      this.highlightCornerMove();
    }
    this.boardArea.classList.toggle("clickable", !!this.hoveredMove);
  }

  highlightCornerMove() {
    this.gameCard
      .querySelectorAll(".tile.highlighted")
      .forEach((t) => t.classList.remove("highlighted"));

    if (this.hoveredMove === "corner") {
      const groups = this.getConsecutiveGroups();
      for (const group of groups) {
        const lastRowInGroup = group[group.length - 1];
        const lastCol = this.game.board.rows[lastRowInGroup] - 1;
        if (lastCol >= 0) {
          const tile = document.getElementById(
            `tile-${lastRowInGroup}-${lastCol}`
          );
          if (tile) tile.classList.add("highlighted");
        }
      }
    }
  }

  getConsecutiveGroups() {
    const groups = [];
    if (this.game.board.rows.length > 0) {
        let currentGroup = [0];
        for (let i = 1; i < this.game.board.rows.length; i++) {
          if (this.game.board.rows[i] === this.game.board.rows[i - 1]) {
            currentGroup.push(i);
          } else {
            groups.push(currentGroup);
            currentGroup = [i];
          }
        }
        groups.push(currentGroup);
    }
    return groups;
  }

  handleMouseLeave() {
    this.hoveredMove = null;
    this.gameCard
      .querySelectorAll(".tile.highlighted")
      .forEach((t) => t.classList.remove("highlighted"));
    this.boardArea.classList.remove("clickable");
  }

  executeWithAnimation(selectedPieces = null) {
    if (this.isAnimating || this.game.board.isEmpty()) return;
    this.isAnimating = true;
    this.handleMouseLeave();
    SoundManager.play("remove");

    if (selectedPieces && selectedPieces.length > 0) {
      selectedPieces.forEach((piece) => {
        const tile = document.getElementById(`tile-${piece.row}-${piece.col}`);
        if (tile) tile.classList.add("removing");
      });
    } else {
      const groups = this.getConsecutiveGroups();
      for (const group of groups) {
        const lastRowInGroup = group[group.length - 1];
        const lastCol = this.game.board.rows[lastRowInGroup] - 1;
        if (lastCol >= 0) {
          const tile = document.getElementById(
            `tile-${lastRowInGroup}-${lastCol}`
          );
          if (tile) tile.classList.add("removing");
        }
      }
    }

    setTimeout(() => this.finishMove(selectedPieces), this.ANIMATION_MS);
  }

  finishMove(selectedPieces = null) {
    this.saveGameState();

    if (selectedPieces && selectedPieces.length > 0) {
      const moveStr = selectedPieces.map((p) => `R${p.row}C${p.col}`).join(",");
      this.movesSequence.push(moveStr);
    }

    const finished = this.game.makeMove(selectedPieces);
    this.isAnimating = false;

    this.analysis?.onMoveMade();

    if (finished) {
        SoundManager.play("win");
        
        let winner, loser;
        const lastPlayerToMove = this.game.currentPlayer;
        
        // Temporarily switch to find the other player
        this.game.switchPlayer();
        const otherPlayer = this.game.currentPlayer;
        this.game.switchPlayer(); // Switch back

        if (this.game.gameMode === 'misere') {
            // Player who made the last move loses
            winner = otherPlayer;
            loser = lastPlayerToMove;
        } else {
            // Normal play: player who made the last move wins
            winner = lastPlayerToMove;
            loser = otherPlayer;
        }

        const winnerName = winner.toLowerCase() === 'a' ? 'alice' : 'bob';
        const winnerIsAi = this.game.aiIndex === Game.PLAYERS.indexOf(winner);
        const winnerType = winnerIsAi ? 'computer' : 'human';
        
        this.gameOverMessage.textContent = `${winnerName} (${winnerType}) wins!`;
        this.gameOverModal.classList.add("visible");
        this.storeGameInDatabase(winner);
        this.redrawBoard();
        return;
    }
    
    this.redrawBoard();
    this.updateStatus();
    if (this.game.isAiTurn()) {
      this.aiTurn();
    }
  }

  saveGameState() {
    if (!this.game) return;
    const boardCopy = {
      grid: this.game.board.rows.map((row) => row),
    };
    const gameState = {
      board: boardCopy,
      currentIndex: this.game.currentIndex,
    };
    this.gameHistory.push(gameState);
  }

  async storeGameInDatabase(winner) {
    try {
      if (typeof window.DatabaseUtils !== "undefined") {
        await window.DatabaseUtils.storeGameInDatabase(
          "CORNER",
          this.initialPartition,
          this.movesSequence,
          winner,
          this.gameStartTime,
          this.game.gameMode 
        );
      }
    } catch (error) {
      console.warn("Could not store Corner game in database:", error.message);
    }
  }

  getBoardCenterOffset() {
    if (!this.game || !this.initialPartition.length) return { x: 0, y: 0 };

    const maxWidth = Math.max(...this.initialPartition);
    const maxHeight = this.initialPartition.length;

    const boardDataWidth = maxWidth * this.CELL + (maxWidth - 1) * this.GAP;
    const boardDataHeight = maxHeight * this.CELL + (maxHeight - 1) * this.GAP;
    const minDimension = 480;
    let boardWidth = Math.max(this.MARGIN * 2 + boardDataWidth, minDimension);
    let boardHeight = Math.max(this.MARGIN * 2 + boardDataHeight, minDimension);

    return {
      x: (boardWidth - boardDataWidth) / 2,
      y: this.MARGIN,
    };
  }

  redrawBoard() {
    console.log('redrawBoard called');
    console.log('this.game exists:', !!this.game);
    console.log('this.initialPartition:', this.initialPartition);
    console.log('this.boardArea exists:', !!this.boardArea);
    
    this.boardArea.querySelectorAll(".tile, .label-cell").forEach((el) => el.remove());
    if (!this.game) {
      console.log('No game, returning early');
      return;
    }

    const maxWidth = Math.max(0, ...this.initialPartition);
    const maxHeight = this.initialPartition.length;
    console.log('Board dimensions:', { maxWidth, maxHeight });

    const boardDataWidth = maxWidth * this.CELL + (maxWidth - 1) * this.GAP;
    const boardDataHeight = maxHeight * this.CELL + (maxHeight - 1) * this.GAP;
    const minDimension = 480;
    let boardWidth = Math.max(this.MARGIN * 2 + boardDataWidth, minDimension);
    let boardHeight = Math.max(this.MARGIN * 2 + boardDataHeight, minDimension);

    const centerOffset = this.getBoardCenterOffset();

    if (this.analysis && this.analysis.isEnabled) {
      for (let r = 0; r < maxHeight; r++) {
        const rowLabel = document.createElement("div");
        rowLabel.className = "label-cell";
        rowLabel.textContent = r;
        rowLabel.style.width = `${this.CELL * 0.6}px`;
        rowLabel.style.height = `${this.CELL * 0.6}px`;
        rowLabel.style.left = `${centerOffset.x - this.CELL * 0.6 - this.GAP}px`;
        rowLabel.style.top = `${centerOffset.y + r * (this.CELL + this.GAP) + (this.CELL * 0.2)}px`;
        this.boardArea.appendChild(rowLabel);
      }

      for (let c = 0; c < maxWidth; c++) {
        const colLabel = document.createElement("div");
        colLabel.className = "label-cell";
        colLabel.textContent = c;
        colLabel.style.width = `${this.CELL * 0.6}px`;
        colLabel.style.height = `${this.CELL * 0.6}px`;
        colLabel.style.left = `${centerOffset.x + c * (this.CELL + this.GAP) + (this.CELL * 0.2)}px`;
        colLabel.style.top = `${centerOffset.y - this.CELL * 0.6 - this.GAP}px`;
        this.boardArea.appendChild(colLabel);
      }
    }

    console.log('Creating tiles...');
    let tileCount = 0;
    for (let r = 0; r < maxHeight; r++) {
      for (let c = 0; c < this.initialPartition[r]; c++) {
        const tile = document.createElement("div");
        const isPresent =
          r < this.game.board.rows.length && c < this.game.board.rows[r];
        tile.className = isPresent ? "tile" : "tile empty";
        tile.id = `tile-${r}-${c}`;
        tile.style.width = `${this.CELL}px`;
        tile.style.height = `${this.CELL}px`;
        tile.style.left = `${centerOffset.x + c * (this.CELL + this.GAP)}px`;
        tile.style.top = `${centerOffset.y + r * (this.CELL + this.GAP)}px`;
        this.boardArea.appendChild(tile);
        tileCount++;
      }
    }
    console.log(`Created ${tileCount} tiles`);

    this.boardArea.style.width = `${boardWidth}px`;
    this.boardArea.style.height = `${boardHeight}px`;
    console.log('Board area dimensions set:', { boardWidth, boardHeight });
    console.log('Board area element:', this.boardArea);
  }

  updateStatus() {
    if (!this.game) return;
    
    // Handle multiplayer mode differently
    if (this.isMultiplayer) {
      const isMyTurn = this.playerNumber === this.game.currentIndex;
      const newText = isMyTurn ? 'Your turn' : 'Opponent\'s turn';
      if (this.statusLabel.textContent === newText) return;
      this.statusLabel.classList.add("exiting");
      setTimeout(() => {
        this.statusLabel.textContent = newText;
        this.statusLabel.classList.remove("exiting");
      }, 200);
      return;
    }
    
    // Handle single player mode
    const kind = this.game.isAiTurn() ? "computer" : "human";
    const player =
      this.game.currentPlayer.toLowerCase() === "a" ? "alice" : "bob";
    const newText = `${player} (${kind}) to move`;
    if (this.statusLabel.textContent === newText) return;
    this.statusLabel.classList.add("exiting");
    setTimeout(() => {
      this.statusLabel.textContent = newText;
      this.statusLabel.classList.remove("exiting");
    }, 200);
  }

  handleMouseClick(event) {
    if (
      !this.game ||
      this.game.board.isEmpty() ||
      this.isAnimating ||
      (!this.isMultiplayer && this.game.isAiTurn())
    ) {
      return;
    }

    if (this.isInSelectionMode) {
      // In multiplayer, ensure it's my turn; otherwise block selection
      if (this.isMultiplayer) {
        const isMyTurn = (this.playerNumber === 0 && this.game.currentIndex === 0) || (this.playerNumber === 1 && this.game.currentIndex === 1);
        if (!isMyTurn) { this.showTurnMessage('Not your turn!'); return; }
      }
      const rect = this.boardArea.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const centerOffset = this.getBoardCenterOffset();
      const col = Math.floor((x - centerOffset.x) / (this.CELL + this.GAP));
      const row = Math.floor((y - centerOffset.y) / (this.CELL + this.GAP));

      if (row >= 0 && row < this.game.board.height() && 
          col >= 0 && col < this.game.board.rows[row]) {
        this.handleTileClick(row, col);
      }
    } else {
      // Before entering selection mode in multiplayer, verify it's my turn
      if (this.isMultiplayer) {
        const isMyTurn = (this.playerNumber === 0 && this.game.currentIndex === 0) || (this.playerNumber === 1 && this.game.currentIndex === 1);
        if (!isMyTurn) { this.showTurnMessage('Not your turn!'); return; }
      }
      this.enterSelectionMode();
    }
  }

  handleTileClick(row, col) {
    const selectablePiece = this.selectablePieces.find(
      (p) => p.row === row && p.col === col
    );
    if (!selectablePiece) return;

    const selectedIndex = this.selectedPieces.findIndex(
      (p) => p.row === row && p.col === col
    );

    if (selectedIndex >= 0) {
      this.selectedPieces.splice(selectedIndex, 1);
    } else {
      this.selectedPieces.push({ row, col });
    }

    this.updateSelectionDisplay();
    this.updateSelectionButtons();
  }

  enterSelectionMode() {
    this.isInSelectionMode = true;
    this.selectablePieces = this.game.board.getSelectableLastPieces();
    this.selectedPieces = [];

    if (this.selectionControls) {
      this.selectionControls.style.display = "flex";
    }

    this.updateSelectionDisplay();
    this.updateSelectionButtons();
  }

  exitSelectionMode() {
    this.isInSelectionMode = false;
    this.selectablePieces = [];
    this.selectedPieces = [];

    if (this.selectionControls) {
      this.selectionControls.style.display = "none";
    }

    this.clearSelectionDisplay();
  }

  updateSelectionDisplay() {
    this.boardArea.querySelectorAll(".tile").forEach((tile) => {
      tile.classList.remove("selectable", "selected");
    });

    this.selectablePieces.forEach((piece) => {
      const tile = document.getElementById(`tile-${piece.row}-${piece.col}`);
      if (tile) {
        tile.classList.add("selectable");
      }
    });

    this.selectedPieces.forEach((piece) => {
      const tile = document.getElementById(`tile-${piece.row}-${piece.col}`);
      if (tile) {
        tile.classList.add("selected");
      }
    });
    this.analysis?.updateHover(this.selectedPieces);
  }

  clearSelectionDisplay() {
    this.boardArea.querySelectorAll(".tile").forEach((tile) => {
      tile.classList.remove("selectable", "selected");
    });
  }

  updateSelectionButtons() {
    if (this.confirmSelectionBtn) {
      this.confirmSelectionBtn.disabled = this.selectedPieces.length === 0;
    }
  }

  confirmSelection() {
    if (this.selectedPieces.length === 0) return;

    SoundManager.play("click");
    if (this.isMultiplayer) {
      // Send selection to server via auth helper
      if (window.cornerMultiplayerAuth) {
        window.cornerMultiplayerAuth.makeMove(this.selectedPieces);
      }
      this.exitSelectionMode();
    } else {
      this.executeWithAnimation(this.selectedPieces);
      this.exitSelectionMode();
    }
  }

  clearSelection() {
    SoundManager.play("click");
    this.selectedPieces = [];
    this.updateSelectionDisplay();
    this.updateSelectionButtons();

    this.analysis?.clearHighlights();
  }

  showTurnMessage(message) {
    if (!this.statusLabel) return;
    const originalText = this.statusLabel.textContent;
    const originalColor = this.statusLabel.style.color;
    this.statusLabel.textContent = message;
    this.statusLabel.style.color = 'var(--orange)';
    if (this.turnMessageTimeout) clearTimeout(this.turnMessageTimeout);
    this.turnMessageTimeout = setTimeout(() => {
      this.statusLabel.textContent = originalText;
      this.statusLabel.style.color = originalColor;
      this.turnMessageTimeout = null;
    }, 2000);
  }

  requestMove() {
    if (!this.isAnimating && !this.game.isAiTurn() && !this.game.board.isEmpty()) {
      if (!this.isMultiplayer) {
        this.executeWithAnimation();
      }
    }
  }

  showHelp() {
    this.helpPopover.classList.add("visible");
  }
  hideHelp() {
    this.helpPopover.classList.remove("visible");
  }
  initTheme() {
    // Theme initialization is handled by global script.js
  }
  showSetupModal() {
    // Show analysis toggle again when returning to setup (in case coming from multiplayer)
    const analysisToggle = document.getElementById('analysis-mode-toggle');
    if (analysisToggle) {
      analysisToggle.style.display = 'block';
    }
    
    if (this.gameOverModal) {
      this.gameOverModal.classList.remove("visible");
    }
    if (this.setupModal) {
      this.setupModal.classList.add("visible");
      this.setupModal.style.opacity = "1";
      this.setupModal.style.visibility = "visible";
    }
  }
  updateDifficultyLabel() {
    const value = parseInt(this.difficultySlider.value);
    let difficulty;
    switch (value) {
      case 1: difficulty = "easy"; break;
      case 2: difficulty = "medium"; break;
      case 3: difficulty = "hard"; break;
      default: difficulty = "medium"; break;
    }
    this.difficultyLabel.textContent = difficulty;
  }
  updatePartitionUI() {
    const type = this.partitionTypeSelect.value;
    const isRect = type === "rectangle";
    if (this.partitionColsBox) this.partitionColsBox.style.display = isRect ? "" : "none";
    if (this.partitionNumberLabel) {
      this.partitionNumberLabel.textContent = type === "random" ? "partitions" : isRect ? "rows" : type === "staircase" ? "rows" : "size";
    }
  }

  generatePartition() {
    const partitionType = this.partitionTypeSelect.value;
    const n = parseInt(this.partitionNumberInput.value, 10);
    if (isNaN(n) || n <= 0) {
        alert("Please enter a positive number for partition generation.");
        return;
    }
    let partition;
    if (partitionType === "random") {
      partition = randomPartition(n);
    } else if (partitionType === "staircase") {
      partition = staircase(n);
    } else if (partitionType === "rectangle") {
      const cols = parseInt(this.partitionColsInput.value, 10);
      if (isNaN(cols) || cols <= 0) {
        alert("Please enter a positive number of columns for partition generation.");
        return;
      }
      partition = rectangle(n, cols);
    } else if (partitionType === "hook") {
      partition = hook(n);
    }
    this.rowsInput.value = partition.join(" ");
  }

  openGameReport() {
    if (!this.game) return;

    const allStates = (this.gameHistory || []).map(state => {
        const mask = state.board && state.board.grid ? state.board.grid : state.board;
        return mask.join(' ');
    });

    const finalState = this.game.board.rows.join(' ');
    if (finalState) {
        allStates.push(finalState);
    }

    const uniqueStates = allStates.filter((state, index, self) =>
        state && (index === 0 || state !== self[index - 1])
    );

    const statesString = uniqueStates.join('\n');
    localStorage.setItem('cornerGameStatesForReport', statesString);
    // Persist mode for unified report
    const mode = this.game.gameMode || 'normal';
    localStorage.setItem('cornerReportMode', mode);
    window.open('../../reports/generator/report.html', '_blank');
  }

  downloadGame() {
    if (!this.game) return;
    const allStates = (this.gameHistory || []).map((state) => {
      let mask =
        state.board && state.board.grid ? state.board.grid : state.board;
      return { mask, currentIndex: state.currentIndex };
    });
    let currentMask = this.game.board.rows;
    allStates.push({
      mask: currentMask,
      currentIndex: this.game.currentIndex,
      timestamp: Date.now(),
    });

    const htmlContent = this.generateGameReplayHTML_Corner(
      allStates,
      this.initialPartition
    );
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Corner-Game-${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/:/g, "-")}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  generateGameReplayHTML_Corner(gameStates, initialPartition) {
    const title = `Corner Game Replay - ${new Date().toLocaleDateString()}`;
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
  <strong>Autoplay:</strong> Press Play to advance automatically.<br>
  <strong>Corner Rules:</strong> Remove the last cell of each row, except when consecutive rows have the same length - only the last row in each consecutive block loses a cell.
 </div>
</div>
<script>
 const gameStates=${JSON.stringify(gameStates)};
 const initialPartition=${JSON.stringify(initialPartition)};
 let currentStateIndex=0,isPlaying=false,playInterval;
 const CELL_SIZE=40,MARGIN=20;
 const canvas=document.getElementById('game-canvas'),ctx=canvas.getContext('2d');
 const errorDiv=document.getElementById('error-message');
 function drawBoard(mask){
  ctx.clearRect(0,0,canvas.width,canvas.height);
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
  for(let r=0;r<boardHeight;r++){
    const rowLen = initialPartition[r];
    const maskLen = (mask && mask[r] !== undefined) ? (Array.isArray(mask[r]) ? mask[r].reduce((acc,v)=>acc+(v?1:0),0) : mask[r]) : 0;
    for(let c=0;c<rowLen;c++){
      const x=MARGIN+c*CELL_SIZE;
      const y=MARGIN+r*CELL_SIZE;
      ctx.fillStyle = c < maskLen ? '#111' : '#fff';
      ctx.fillRect(x,y,CELL_SIZE,CELL_SIZE);
    }
  }
  ctx.save();ctx.strokeStyle='#fff';ctx.lineWidth=1;
  for(let r=0;r<=boardHeight;r++){const y=MARGIN+r*CELL_SIZE;ctx.beginPath();ctx.moveTo(MARGIN,y);ctx.lineTo(MARGIN+boardWidth*CELL_SIZE,y);ctx.stroke();}
  for(let c=0;c<=boardWidth;c++){const x=MARGIN+c*CELL_SIZE;ctx.beginPath();ctx.moveTo(x,MARGIN);ctx.lineTo(x,MARGIN+boardHeight*CELL_SIZE);ctx.stroke();}
  ctx.restore();
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
}

window.addEventListener("load", () => {
  window.cornerApp = new ProCornerGui();
  // Instantiate and attach the analysis module
  if (typeof CornerAnalysis !== 'undefined') {
    window.cornerApp.analysis = new CornerAnalysis(window.cornerApp);
  }
});

// Multiplayer integration methods for Corner
ProCornerGui.prototype.initializeMultiplayerGame = function(boardData, playerNumber, currentPlayer) {
  console.log('initializeMultiplayerGame called with:', { boardData, playerNumber, currentPlayer });
  this.isMultiplayer = true;
  this.playerNumber = playerNumber;
  this.game = new Game(new Board(boardData), null, this.gameMode);
  this.game.currentIndex = currentPlayer;
  
  // Set the initial partition for board rendering
  this.initialPartition = [...boardData];
  console.log('Set initialPartition:', this.initialPartition);
  
  // Hide analysis mode during multiplayer
  const analysisToggle = document.getElementById('analysis-mode-toggle');
  if (analysisToggle) {
    analysisToggle.style.display = 'none';
  }
  
  // Disable analysis if it's currently active
  if (this.analysis && this.analysis.isEnabled) {
    this.analysis.toggle();
  }
  
  this.exitSelectionMode();
  console.log('About to call redrawBoard...');
  this.redrawBoard();
  console.log('redrawBoard completed');
  this.updateStatus();
};

ProCornerGui.prototype.updateMultiplayerStatus = function(text, isMyTurn) {
  if (this.statusLabel) {
    this.statusLabel.textContent = text;
    this.statusLabel.style.color = isMyTurn ? 'var(--orange)' : 'var(--gray)';
  }
};

ProCornerGui.prototype.updateBoardFromServer = function(boardData, currentPlayer, gameEnded, winner) {
  if (!this.isMultiplayer || !this.game) return;
  this.game.board = new Board(boardData);
  if (typeof currentPlayer === 'number') this.game.currentIndex = currentPlayer;
  this.exitSelectionMode();
  this.redrawBoard();
  if (gameEnded) {
    const winnerName = winner === 0 ? 'alice' : 'bob';
    const winnerType = 'human';
    this.gameOverMessage.textContent = `${winnerName} (${winnerType}) wins!`;
    this.gameOverModal.classList.add('visible');
  } else {
    this.updateStatus();
  }
};

ProCornerGui.prototype.endMultiplayerGame = function(message) {
  // Show analysis toggle again when multiplayer ends
  const analysisToggle = document.getElementById('analysis-mode-toggle');
  if (analysisToggle) {
    analysisToggle.style.display = 'block';
  }
  
  if (this.statusLabel) {
    this.statusLabel.textContent = message;
    this.statusLabel.style.color = message.includes('won') ? 'var(--orange)' : 'var(--gray)';
  }
  if (this.gameOverModal) {
    this.gameOverMessage.textContent = message;
    this.gameOverModal.classList.add('visible');
  }
};
