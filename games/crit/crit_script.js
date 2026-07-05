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
  
  return parts.sort((a, b) => b - a); // Sort descending
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

function staircase(n) {
  let parts = []; 
  let t = n; 
  while (t >= 1) {
    parts.push(t);
    t = t - 1; 
  }
  return parts; // Already descending
}

function generatePartition() {
  const partitionTypeSelect = document.getElementById('partition-type-select');
  const partitionNumberInput = document.getElementById('partition-number-input');
  const rowsInput = document.getElementById('rows-input');

  const partitionType = partitionTypeSelect.value;
  const n = parseInt(partitionNumberInput.value, 10);

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
    case 'hook':
      partition = hook(n);
      break;
    case 'rectangle': {
      const cols = parseInt(document.getElementById('partition-cols-input').value, 10);
      if (isNaN(cols) || cols <= 0 || cols > 200) {
        alert("Please enter a positive number of columns less than or equal to 200.");
        return;
      }
      partition = rectangle(n, cols);
      break;
    }
    case 'triangle':
      alert("Triangle partitions are not yet implemented.");
      return;
    default:
      alert("Unknown partition type selected.");
      return;
  }

  rowsInput.value = partition.join(' ');
}

// ────────────────────────────────────────────────────────────  
// 1.  Board model (with both row and column moves)
// ────────────────────────────────────────────────────────────  
class Board {  
  constructor(rows) { this.rows = [...rows]; }  
  
  /* Basic properties */  
  isEmpty() { return this.rows.length === 0; }  
  clone() { return new Board(this.rows); }  
  key() { return this.rows.join(","); }  
  height() { return this.rows.length; }  
  width() { return this.rows.length ? Math.max(...this.rows) : 0; }  
  
  /* Get column heights at each position */
  getColumnHeights() {
    const width = this.width();
    const colHeights = new Array(width).fill(0);
    
    for (let c = 0; c < width; c++) {
      for (let r = 0; r < this.rows.length; r++) {
        if (this.rows[r] > c) {
          colHeights[c] = r + 1;
        }
      }
    }
    return colHeights;
  }
  
  /* Generate all legal moves (both row and column) */  
  legalMoves() {  
    const moves = [];  
    
    // Row moves (original RIT logic)
    const last = this.rows.length - 1;  
    for (let r = 0; r <= last; r++) {  
      const len = this.rows[r];  
      const below = (r < last) ? this.rows[r + 1] : 0;  
      
      /* Row is selectable when:                                             
           – it is the bottom row, OR                                        
           – it is strictly longer than the row below                      */  
      if (r < last && len <= below) continue;  
      
      /*  Minimum blocks that must remain after shortening.                   
          Bottom row → may be 0 (can delete it).                             
          Other rows → at least max(below, 1).                              */  
      const minKeep = (r === last) ? 0 : Math.max(below, 1);  
      
      for (let newLen = minKeep; newLen <= len - 1; newLen++) {  
        moves.push({ type: 'row', r, newLen });  
      }  
    }
    
    // Column moves (corrected CRIT logic)
    const colHeights = this.getColumnHeights();
    const width = this.width();
    
    for (let c = 0; c < width; c++) {
      const currentHeight = colHeights[c];
      if (currentHeight === 0) continue; // No blocks in this column
      
      const rightHeight = (c < width - 1) ? colHeights[c + 1] : 0;
      
      /* For column moves: we can remove blocks from column c as long as
         the resulting height is still >= height of column (c+1) */
      const minKeep = (c === width - 1) ? 0 : Math.max(rightHeight, 1);
      
      for (let newHeight = minKeep; newHeight <= currentHeight - 1; newHeight++) {
        moves.push({ type: 'col', c, newHeight });
      }
    }
    
    return moves;  
  }  
  
  /* Apply a move to create a new board */  
  applyMove(move) {  
    const next = this.clone();  
    
    if (move.type === 'row') {
      // Row move: shorten the row
      next.rows[move.r] = move.newLen;  
      
      /* Trim any zero-length rows at the bottom */  
      while (next.rows.length && next.rows[next.rows.length - 1] === 0) {  
        next.rows.pop();  
      }
    } else if (move.type === 'col') {
      // Column move: reduce column height to newHeight
      const colHeights = next.getColumnHeights();
      const currentHeight = colHeights[move.c];
      const blocksToRemove = currentHeight - move.newHeight;
      
      // Remove blocks from bottom up in this column
      for (let removeCount = 0; removeCount < blocksToRemove; removeCount++) {
        // Find the bottommost row that has a block in column c
        for (let r = next.rows.length - 1; r >= 0; r--) {
          if (next.rows[r] > move.c) {
            // If this row extends to column c, check if we can shorten it
            if (next.rows[r] === move.c + 1) {
              // This row only has one block in column c, so shorten the row
              next.rows[r] = move.c;
            } else {
              // This row extends beyond column c, so we need to keep reducing
              // Actually, we can't just shorten arbitrary rows - we need to maintain Young diagram property
              // Let's approach this differently: mark for removal from bottom
              next.rows[r] = move.c;
            }
            break; // Remove one block and continue
          }
        }
      }
      
      // Clean up: remove rows that became empty and maintain Young diagram property
      while (next.rows.length && next.rows[next.rows.length - 1] === 0) {
        next.rows.pop();
      }
      
      // Ensure we maintain Young diagram property (each row >= row below)
      for (let r = next.rows.length - 2; r >= 0; r--) {
        if (next.rows[r] < next.rows[r + 1]) {
          next.rows[r] = next.rows[r + 1];
        }
      }
    }
    
    return next;  
  }  
  
  /* Utility for drawing */  
  squares() {  
    const list = [];  
    this.rows.forEach((len, r) => {  
      for (let c = 0; c < len; c++) list.push({ r, c });  
    });  
    return list;  
  }  
}  

// ────────────────────────────────────────────────────────────  
// 2.  Grundy memoisation  (perfect play value)  
// ────────────────────────────────────────────────────────────  
const gMemo = new Map();  
function grundy(board) {  
  const k = board.key();  
  if (gMemo.has(k)) return gMemo.get(k);  
  if (board.isEmpty()) { gMemo.set(k, 0); return 0; }  
  
  const childVals = new Set(  
    board.legalMoves().map(m => grundy(board.applyMove(m)))  
  );  
  let g = 0; while (childVals.has(g)) g++;  
  gMemo.set(k, g); return g;  
}  
function perfectMove(board) {  
  for (const m of board.legalMoves())  
    if (grundy(board.applyMove(m)) === 0) return m;  
  return board.legalMoves()[0];               // no winning move  
}  

// ────────────────────────────────────────────────────────────  
// 3.  Game container  
// ────────────────────────────────────────────────────────────  
class Game {  
  static PLAYERS = ["A", "B"];  
  constructor(rows, aiPlayer, level) {  
    this.board  = new Board(rows);  
    this.turn   = 0;                                    // 0 → A  
    this.aiSide = aiPlayer ? Game.PLAYERS.indexOf(aiPlayer) : null;  
    this.level  = level;                                // Easy | Medium | Hard  
  }  
  player()   { return Game.PLAYERS[this.turn]; }  
  isAiTurn() { return this.turn === this.aiSide; }  
  random()   { const L=this.board.legalMoves(); return L[Math.floor(Math.random()*L.length)]; }  
  aiMove() {  
    if (this.level === "Hard")   return perfectMove(this.board);  
    if (this.level === "Easy")   return this.random();  
    return Math.random()<0.3 ? this.random() : perfectMove(this.board); // Medium  
  }  
  move(m) {  
    this.board = this.board.applyMove(m);  
    const over = this.board.isEmpty();  
    if (!over) this.turn = 1 - this.turn;  
    return over;  
  }  
}  

// ────────────────────────────────────────────────────────────  
// 4.  Sound helper  
// ────────────────────────────────────────────────────────────  
const Sound = {  
  s:{},  
  init(){ ["hover","remove","win","click"].forEach(id=>this.s[id]=document.getElementById(`sound-${id}`)); },  
  play(id){ const a=this.s[id]; if(!a) return; a.currentTime=0; a.play().catch(()=>{}); }  
};  

// ────────────────────────────────────────────────────────────  
// 5.  GUI controller with row and column move support
// ────────────────────────────────────────────────────────────  
class CRITGui {  
  CELL=40; MARGIN=20; ANIM=450; AI_WAIT=900;
  currentCellSize = this.CELL; // Dynamic cell size  
  GAP = 1; // Gap between tiles
  
  constructor() {  
    /* canvas & misc */  
    this.canvas = document.getElementById("game-canvas");  
    this.ctx    = this.canvas?.getContext("2d");  
    this.card   = document.getElementById("game-card");  
    this.status = document.getElementById("status-label");  
    this.dots   = document.getElementById("ai-thinking-indicator");  
  
    /* modals + inputs */  
    this.setupB = document.getElementById("setup-modal-backdrop");  
    this.overB  = document.getElementById("game-over-modal-backdrop");  
    this.msg    = document.getElementById("game-over-message");  
    this.rowsIn = document.getElementById("rows-input");  
    this.aiSel  = document.getElementById("ai-select");  
    this.difficultySlider = document.getElementById("difficulty-slider");
    this.difficultyLabel = document.getElementById("difficulty-label");
    this.themeSel = document.getElementById("theme-select"); // May not exist in CRIT
    this.themeT = document.getElementById("theme-toggle");  
    this.undoBtn = document.getElementById("undo-btn");

    /* buttons */  
    const startGameBtn = document.getElementById("start-game-btn");
    if (startGameBtn) {
      startGameBtn.onclick = ()=>this.start();
    }
    
    const playAgainBtn = document.getElementById("play-again-btn");
    if (playAgainBtn) {
      playAgainBtn.onclick = ()=>this.showSetup();
    }
    
    const newGameBtn = document.getElementById("new-game-btn");
    if (newGameBtn) {
      newGameBtn.onclick = ()=>this.showSetup();
    }
    
    if (this.undoBtn) {
      this.undoBtn.onclick = ()=>this.undoMove();
    }
    
    const partitionTypeSelectEl = document.getElementById("partition-type-select");
    if (partitionTypeSelectEl) {
      partitionTypeSelectEl.onchange = ()=>this.updatePartitionUI();
      this.updatePartitionUI();
    }
    const generatePartitionBtn = document.getElementById("generate-partition-btn");
    if (generatePartitionBtn) {
      generatePartitionBtn.onclick = ()=>this.generatePartition();
    }

    // Download button
    const downloadBtn = document.getElementById("download-btn");
    if (downloadBtn) {
      downloadBtn.onclick = () => this.downloadGame();
    }
    const downloadBtnModal = document.getElementById("download-btn-modal");
    if (downloadBtnModal) {
      downloadBtnModal.onclick = () => this.downloadGame();
    }
    const reportBtnModal = document.getElementById("report-btn-modal");
    if (reportBtnModal) {
      reportBtnModal.onclick = () => this.openGameReport();
    }

    /* theme & help */  
    if (this.themeT) {
      this.themeT.onchange = ()=>this.toggleTheme();
    }
    
    if (this.themeSel) {
      this.themeSel.onchange = ()=>this.applyTileTheme();
    }
    
    if (this.difficultySlider) {
      this.difficultySlider.addEventListener('input', () => this.updateDifficultyLabel());
    }
    
    const helpBtn  = document.getElementById("help-btn");  
    const helpBtnModal = document.getElementById("help-btn-modal");
    const helpPop  = document.getElementById("help-popover");  
    
    if (helpBtn && helpPop) {
      helpBtn.onmouseenter = ()=>helpPop.classList.add("visible");  
      helpBtn.onmouseleave = ()=>helpPop.classList.remove("visible");
    }
    
    if (helpBtnModal && helpPop) {
      helpBtnModal.onmouseenter = ()=>helpPop.classList.add("visible");  
      helpBtnModal.onmouseleave = ()=>helpPop.classList.remove("visible");
    }
  
    /* canvas interaction - now using card for mouse events */  
    if (this.card) {
      this.card.onmousemove = e=>this.hover(e);  
      this.card.onmouseleave = e=>this.clearHover();  
      this.card.onclick = e=>this.tryHumanMove();
    }
  
    /* state */  
    this.game = null; this.anim = false; this.hoverMove = null;
    this.gameHistory = [];  
  
    /* start */  
    Sound.init(); this.initTheme(); this.showSetup();  
  }

  clearBoard() {
    this.card.querySelectorAll(".tile").forEach(t => t.remove());
  }

  // Game state management for undo functionality
  saveGameState() {
    if (!this.game) return;
    
    // Deep copy the current game state
    const gameState = {
      board: this.game.board.clone(),
      turn: this.game.turn
    };
    
    this.gameHistory.push(gameState);
    this.updateUndoButton();
  }

  undoMove() {
    if (!this.game || this.gameHistory.length === 0 || !this.canUndo()) {
      return;
    }

    // Restore the previous game state
    const previousState = this.gameHistory.pop();
    this.game.board = previousState.board;
    this.game.turn = previousState.turn;
    
    // Remove the last move from the sequence
    this.movesSequence.pop();
    
    // Redraw and update UI
    this.draw();
    this.updateStatus();
    this.updateUndoButton();
  }

  canUndo() {
    return this.game && this.gameHistory.length > 0 && 
           !this.game.isAiTurn() && !this.anim;
  }

  updateUndoButton() {
    if (!this.undoBtn) return;
    
    const canUndo = this.canUndo();
    
    if (this.game && this.gameHistory.length >= 0) {
      this.undoBtn.style.display = 'flex';
      this.undoBtn.disabled = !canUndo;
    } else {
      this.undoBtn.style.display = 'none';
    }
  }

  clearGameHistory() {
    this.gameHistory = [];
    this.updateUndoButton();
  }

  updateDifficultyLabel() {
    const value = this.difficultySlider.value;
    const level = value <= 33 ? "Easy" : value <= 66 ? "Medium" : "Hard";
    this.difficultyLabel.textContent = `${level} (${value})`;
  }

  /* modal control */  
  showSetup() { 
    // Hide game over modal first if it's visible
    if (this.overB) {
      this.overB.classList.remove("visible");
    }
    this.setupB.classList.add("visible"); 
    this.clearGameHistory(); 
  }  
  hideSetup() { this.setupB.classList.remove("visible"); }  
  showOver()  { this.overB.classList.add("visible"); }  
  hideOver()  { this.overB.classList.remove("visible"); }  
  
  /* game start/stop */  
  start() {  
    try {  
      const vals = this.rowsIn.value.trim().split(/\s+/).map(Number).filter(n => n > 0).sort((a, b) => b - a);  
      if (!vals.length || vals.some(v => !Number.isInteger(v) || v <= 0)) throw 0;  
      const aiPlayer = this.aiSel.value === "None" ? null : this.aiSel.value;
      const difficulty = this.difficultySlider.value <= 33 ? "Easy" : 
                        this.difficultySlider.value <= 66 ? "Medium" : "Hard";
      this.game = new Game(vals, aiPlayer, difficulty);
      this.initialPartition = vals.slice();
      // Initialize database tracking
      this.movesSequence = [];
      this.gameStartTime = new Date();
      this.hideSetup(); this.hideOver(); this.clearGameHistory(); this.draw(); this.updateStatus(); this.updateUndoButton();
      if (this.game.isAiTurn()) this.aiTurn();  
    } catch { alert("Please enter valid positive integers (e.g., '5 4 2 1')."); }  
  }  
  
  /* AI delay + move */  
  aiTurn() {  
    this.dots.classList.add("visible");  
    setTimeout(() => {  
      this.dots.classList.remove("visible");  
      if (this.game && this.game.isAiTurn()) this.execute(this.game.aiMove());  
    }, this.AI_WAIT);  
  }  
  
  /* hover logic for both row and column moves */  
  hover(evt) {  
    if(!this.game || this.game.isAiTurn() || this.anim) return;  
    const {x,y}=this.rel(evt);  
    
    let m = null;
    
    // Calculate horizontal centering offset to match draw method
    const boardDataWidth = this.game.board.width() * this.currentCellSize + (this.game.board.width() - 1) * this.GAP;  
    const boardWidth = Math.max(this.MARGIN * 2 + boardDataWidth, 480);
    const actualContentWidth = this.MARGIN * 2 + boardDataWidth;
    const centerOffsetX = (boardWidth - actualContentWidth) / 2;
    
    // Check for row moves first
    const r=Math.floor((y-this.MARGIN)/this.currentCellSize);  
    const c=Math.floor((x-centerOffsetX-this.MARGIN)/(this.currentCellSize + this.GAP));  
    
    if(r>=0 && r<this.game.board.height()){  
      const len=this.game.board.rows[r];  
      const last=this.game.board.height()-1;  
      const below=(r<last)?this.game.board.rows[r+1]:0;  
      const selectable = (r===last) || (len>below);  
      if(selectable){  
        const minKeep = (r===last)?0:Math.max(below,1);  
        if(c>=minKeep && c<=len-1){ 
          m={type: 'row', r, newLen:c}; 
        }  
      }  
    }
    
    // If no row move found, check for column moves
    if (!m && c >= 0) {
      const colHeights = this.game.board.getColumnHeights();
      const width = this.game.board.width();
      
      if (c < width) {
        const currentHeight = colHeights[c];
        const rightHeight = (c < width - 1) ? colHeights[c + 1] : 0;
        
        if (currentHeight > 0) {
          const minKeep = (c === width - 1) ? 0 : Math.max(rightHeight, 1);
          
          // Calculate what new height this click would represent
          const clickedRow = r;
          const newHeight = Math.max(0, currentHeight - (currentHeight - clickedRow));
          
          if (newHeight >= minKeep && newHeight <= currentHeight - 1) {
            m = {type: 'col', c, newHeight};
          }
        }
      }
    }
    
    if(JSON.stringify(m)!==JSON.stringify(this.hoverMove)){  
      this.hoverMove=m; this.highlight(m);  
    }  
    this.card.classList.toggle("clickable",!!m);  
  }  
  
  tryHumanMove(){  
    if(this.game && !this.game.isAiTurn() && !this.anim && this.hoverMove)  
      this.execute(this.hoverMove);  
  }  
  clearHover(){ this.hoverMove=null; this.highlight(null); }  
  
  /* execute move */  
  execute(m){  
    // Save the current state before making a move (for undo functionality)
    this.saveGameState();
    
    this.anim=true; Sound.play("remove");  
    
    if (m.type === 'row') {
      const len=this.game.board.rows[m.r];  
      for(let c=m.newLen;c<len;c++)  
        document.getElementById(`t-${m.r}-${c}`)?.classList.add("removing");  
    } else if (m.type === 'col') {
      const colHeights = this.game.board.getColumnHeights();
      const currentHeight = colHeights[m.c];
      const blocksToRemove = currentHeight - m.newHeight;
      
      // Mark blocks for removal from bottom up
      for (let removeCount = 0; removeCount < blocksToRemove; removeCount++) {
        const rowToMark = currentHeight - 1 - removeCount;
        if (rowToMark >= 0) {
          document.getElementById(`t-${rowToMark}-${m.c}`)?.classList.add("removing");
        }
      }
    }

    setTimeout(()=>{  
      // Track the move
      if (m.type === 'row') {
        this.movesSequence.push(`R${m.r}C${m.newLen}-${this.game.board.rows[m.r]-1}`);
      } else if (m.type === 'col') {
        const colHeights = this.game.board.getColumnHeights();
        this.movesSequence.push(`C${m.c}R${m.newHeight}-${colHeights[m.c]-1}`);
      }
      
      const done=this.game.move(m);  
      this.anim=false; this.draw();  
      if(done){  
        Sound.play("win");  
        this.msg.textContent=`Player ${this.game.player()} wins!`;  
        this.overB.classList.add("visible");
        this.storeGameInDatabase(this.game.player());
        this.updateUndoButton();
      }else{  
        this.updateStatus();  
        this.updateUndoButton();
        if(this.game.isAiTurn()) this.aiTurn();  
      }  
    }, this.ANIM);  
  }  
  
  /* drawing */  
  draw(){  
    this.clearBoard();
    if (!this.game) return;
    
    // Dynamic cell sizing to prevent overflow
    this.calculateOptimalCellSize();
    
    // Calculate actual content size including gaps
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

    this.game.board.squares().forEach(({r,c})=>{  
      const tile = document.createElement("div");  
      tile.className="tile"; 
      tile.id=`t-${r}-${c}`;  
      tile.style.width = `${this.currentCellSize}px`;
      tile.style.height = `${this.currentCellSize}px`;
      tile.style.left = `${centerOffsetX + this.MARGIN + c * (this.currentCellSize + this.GAP)}px`;
      tile.style.top = `${this.MARGIN + r * (this.currentCellSize + this.GAP)}px`;
      this.card.appendChild(tile);  
    });  
    
    this.card.style.width = `${boardWidth}px`;
    this.card.style.height = `${boardHeight}px`;
  }
  
  highlight(m){  
    this.card.querySelectorAll(".tile").forEach(t=>t.classList.remove("highlighted"));  
    if(!m) return;  
    
    if (m.type === 'row') {
      const len=this.game.board.rows[m.r];  
      for(let c=m.newLen;c<len;c++)  
        document.getElementById(`t-${m.r}-${c}`)?.classList.add("highlighted");  
    } else if (m.type === 'col') {
      const colHeights = this.game.board.getColumnHeights();
      const currentHeight = colHeights[m.c];
      const blocksToHighlight = currentHeight - m.newHeight;
      
      // Highlight blocks that would be removed (from bottom up)
      for (let i = 0; i < blocksToHighlight; i++) {
        const rowToHighlight = currentHeight - 1 - i;
        if (rowToHighlight >= 0) {
          document.getElementById(`t-${rowToHighlight}-${m.c}`)?.classList.add("highlighted");
        }
      }
    }
    
    Sound.play("hover");  
  }  
  
  calculateOptimalCellSize() {
    if (!this.game) return;
    
    const containerWidth = this.card.clientWidth - 60; // Account for padding
    const containerHeight = window.innerHeight * 0.6; // Max 60% of viewport
    
    const boardWidth = this.game.board.width();
    const boardHeight = this.game.board.height();
    
    const maxCellWidth = Math.floor((containerWidth - this.MARGIN * 2) / boardWidth);
    const maxCellHeight = Math.floor((containerHeight - this.MARGIN * 2) / boardHeight);
    
    this.currentCellSize = Math.min(Math.max(Math.min(maxCellWidth, maxCellHeight), 20), this.CELL);
  }

  /* misc helpers */  
  updateStatus(){  
    const who=this.game.isAiTurn()?"Computer":"Human";  
    this.status.textContent=`Player ${this.game.player()} (${who}) to move - Row or Column`;  
  }  
  rel(evt){ const r=this.card.getBoundingClientRect(); return {x:evt.clientX-r.left, y:evt.clientY-r.top}; }  
  
  /* theme */  
  initTheme(){  
    const t=localStorage.getItem("crit-theme")||"light";  
    document.documentElement.setAttribute("data-theme",t);  
    this.themeT.checked=(t==="dark");  
  }  
  toggleTheme(){  
    const t=this.themeT.checked?"dark":"light";  
    document.documentElement.setAttribute("data-theme",t);  
    localStorage.setItem("crit-theme",t);  
  }  
  applyTileTheme(){
    if (this.themeSel && this.card) {
      this.card.setAttribute("data-tile-theme", this.themeSel.value);
    }
  }

  // Partition generation methods
  randomInt(min, max) { 
    return Math.floor(Math.random() * (max - min + 1)) + min; 
  }

  randomPartition(n) { 
    let parts = []; 
    let remaining = n; 
    let maxPart = n; 
    while (remaining > 0) { 
      let part = this.randomInt(1, Math.min(remaining, maxPart)); 
      parts.push(part); 
      remaining -= part; 
      maxPart = part; 
    } 
    return parts.sort((a, b) => b - a); // Sort descending
  }

  staircase(n) {
    let parts = []; 
    let t = n; 
    while (t >= 1) {
      parts.push(t);
      t = t - 1; 
    }
    return parts; // Already descending
  }

  rectangle(rows, cols) {
    let parts = [];
    let t = rows;
    while (t >= 1) {
      parts.push(cols);
      t = t - 1;
    }
    return parts;
  }

  hook(n) {
    let parts = [];
    let t = n;
    parts.push(t);
    while (t >= 2) {
      parts.push(1);
      t = t - 1;
    }
    return parts;
  }

  generatePartition() {
    const partitionTypeSelect = document.getElementById('partition-type-select');
    const partitionNumberInput = document.getElementById('partition-number-input');

    const partitionType = partitionTypeSelect.value;
    const n = parseInt(partitionNumberInput.value, 10);

    if (isNaN(n) || n <= 0 || n > 200) {
      alert("Please enter a positive number less than or equal to 200.");
      return;
    }

    let partition;

    switch (partitionType) {
      case 'random':
        partition = this.randomPartition(n);
        break;
      case 'staircase':
        partition = this.staircase(n);
        break;
      case 'hook':
        partition = this.hook(n);
        break;
      case 'rectangle': {
        const cols = parseInt(document.getElementById('partition-cols-input').value, 10);
        if (isNaN(cols) || cols <= 0 || cols > 200) {
          alert("Please enter a positive number of columns less than or equal to 200.");
          return;
        }
        partition = this.rectangle(n, cols);
        break;
      }
      case 'triangle':
        alert("Triangle partitions are not yet implemented.");
        return;
      default:
        alert("Unknown partition type selected.");
        return;
    }

    this.rowsIn.value = partition.join(' ');
  }

  updatePartitionUI() {
    const type = document.getElementById('partition-type-select').value;
    const isRect = type === 'rectangle';
    const colsBox = document.getElementById('partition-cols-box');
    const label = document.getElementById('partition-number-label');
    if (colsBox) colsBox.style.display = isRect ? '' : 'none';
    if (label) label.textContent = type === 'random' ? 'partitions' : isRect ? 'rows' : type === 'staircase' ? 'rows' : 'size';
  }

  openGameReport() {
    if (!this.game) return;
    const allStates = (this.gameHistory || []).map(state => state.board.rows.filter(n => n > 0).sort((a, b) => b - a).join(' ')).filter(Boolean);
    const currentRowLens = this.game.board.rows.filter(n => n > 0).sort((a, b) => b - a).join(' ');
    if (currentRowLens) allStates.push(currentRowLens);
    const uniqueStates = allStates.filter((s, i, self) => s && (i === 0 || s !== self[i - 1]));
    localStorage.setItem('critGameStatesForReport', uniqueStates.join('\n'));
    localStorage.setItem('critReportMode', 'normal');
    window.open('../../reports/generator/report.html', '_blank');
  }

  downloadGame() {
    if (!this.gameHistory || this.gameHistory.length === 0) {
      alert("No game history to download");
      return;
    }

    // Collect all game states including current
    const allStates = [...this.gameHistory];
    
    // Add current state if game exists
    if (this.game) {
      allStates.push({
        board: this.game.board.clone(),
        turn: this.game.turn,
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
    link.download = `CRIT-Game-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  generateGameReplayHTML(gameStates) {
    const title = `CRIT Game Replay - ${new Date().toLocaleDateString()}`;
    
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
            max-width: 900px;
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
            <strong>CRIT Rules:</strong> Enhanced RIT with both row and column moves.<br>
            <strong>Row Moves:</strong> Remove blocks from right end of selectable rows.<br>
            <strong>Column Moves:</strong> Remove blocks from bottom of selectable columns where changed(c_i) ≥ c_(i+1).<br>
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
        <canvas id="game-canvas" width="600" height="500"></canvas>
        <div id="error-message" class="error" style="display:none"></div>
        <div class="instructions">
            <strong>Navigation:</strong> Use ←/→ keys or the buttons above.<br>
            <strong>Autoplay:</strong> Press Play to advance automatically.<br>
            <strong>CRIT Rules:</strong> Dual-mode gameplay with strategic row and column choices.
        </div>
    </div>

<script>
const gameStates = ${JSON.stringify(gameStates, (key, value) => {
  if (key === 'rows' && Array.isArray(value)) {
    return value;
  }
  return value;
})};
let currentStateIndex = 0;
let autoplayInterval = null;
const CELL_SIZE = 30;
const MARGIN = 20;

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
                toggleAutoplay();
            }
        }, 1500);
    }
}

function updateUI() {
    document.getElementById('current-state').textContent = currentStateIndex + 1;
    document.getElementById('total-states').textContent = gameStates.length;
    
    // Update player info
    const playerInfoEl = document.getElementById('player-info');
    const state = gameStates[currentStateIndex];
    
    if (currentStateIndex === 0) {
        playerInfoEl.textContent = 'Initial Position';
    } else if (state && state.turn !== undefined) {
        const player = state.turn === 0 ? 'A' : 'B';
        playerInfoEl.textContent = \`Move \${currentStateIndex} - Player \${player}\`;
    } else {
        playerInfoEl.textContent = \`Move \${currentStateIndex}\`;
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
    
    if (!state.board || !state.board.rows || state.board.rows.length === 0) {
        ctx.fillStyle = '#999';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Empty Board - Game Over', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    const rows = state.board.rows.length;
    const maxCols = Math.max(...state.board.rows);
    
    // Calculate starting position to center the board
    const boardWidth = maxCols * CELL_SIZE;
    const boardHeight = rows * CELL_SIZE;
    const startX = (canvas.width - boardWidth) / 2;
    const startY = (canvas.height - boardHeight) / 2;
    
    // Draw board
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < state.board.rows[r]; c++) {
            const x = startX + c * CELL_SIZE;
            const y = startY + r * CELL_SIZE;
            
            // Draw tile with gradient
            const gradient = ctx.createLinearGradient(x, y, x + CELL_SIZE, y + CELL_SIZE);
            gradient.addColorStop(0, '#68d391');
            gradient.addColorStop(1, '#48bb78');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
            
            // Draw border
            ctx.strokeStyle = '#2f855a';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
        }
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

window.addEventListener('load', initReplay);
</script>
</body>
</html>`;
  }

  async storeGameInDatabase(winner) {
    try {
      if (window.DatabaseUtils) {
        await window.DatabaseUtils.storeGameInDatabase(
          'CRIT',
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

// Initialize GUI when page loads  
window.addEventListener('load', () => {  
  new CRITGui();  
}); 