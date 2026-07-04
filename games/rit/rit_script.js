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
  
  return parts.sort((a, b) => b - a); // Sort descending like other games
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
  
  return parts.sort((a, b) => b - a); // Sort descending like other games
}


// ────────────────────────────────────────────────────────────  
// 1.  Young-diagram model  (legal-move engine corrected)  
// ────────────────────────────────────────────────────────────  


class Board {  
  constructor(rows) {                    // non-increasing positive ints  
    this.rows = [...rows];  
  }  
  clone()   { return new Board(this.rows); }  
  height()  { return this.rows.length; }  
  width()   { return this.rows.length ? Math.max(...this.rows) : 0; }  
  isEmpty() { return this.rows.length === 0; }  
  key()     { return JSON.stringify(this.rows); }  
  
  /* Legal moves = { r, newLen }  (shorten row r to newLen)                */  
  legalMoves() {  
    const moves = [];  
    const last  = this.rows.length - 1;  
    for (let r = 0; r <= last; r++) {  
      const len   = this.rows[r];  
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
        moves.push({ r, newLen });  
      }  
    }  
    return moves;  
  }  
  
  /* Produce a new board after executing move m                            */  
  applyMove({ r, newLen }) {  
    const next = this.clone();  
    next.rows[r] = newLen;  
  
    /* Trim any zero-length rows at the bottom                              */  
    while (next.rows.length && next.rows[next.rows.length - 1] === 0) {  
      next.rows.pop();  
    }  
    return next;  
  }  
  
  /* Utility for drawing                                                   */  
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
  
  
// ────────────────────────────────────────────────────────────  
// 5.  GUI controller   (hover logic updated)  
// ────────────────────────────────────────────────────────────  
class RITGui {  
  CELL=40; GAP=1; MARGIN=20; ANIM=450; AI_WAIT=900; // Small gap between tiles to prevent border overlap
  currentCellSize = this.CELL; // Dynamic cell size  
  
  constructor() {  
    /* board & misc */  
    this.boardArea = document.getElementById("board-area");  
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
    this.themeT = document.getElementById("theme-toggle");  

    /* buttons */  
    document.getElementById("start-game-btn").onclick = ()=>this.start();  
    document.getElementById("play-again-btn").onclick = ()=>this.showSetup();  
    document.getElementById("new-game-btn").onclick   = ()=>this.showSetup();  
    document.getElementById("generate-partition-btn").onclick = ()=>this.generatePartition();
    document.getElementById("partition-type-select").onchange = ()=>this.updatePartitionUI();
    this.updatePartitionUI();

        /* theme & help */  
    this.themeT.onclick = ()=>this.toggleTheme();
    this.difficultySlider.addEventListener('input', () => this.updateDifficultyLabel());
    const helpBtn  = document.getElementById("help-btn");  
    const helpBtnModal = document.getElementById("help-btn-modal");
    const helpPop  = document.getElementById("help-popover");  
    helpBtn.onmouseenter = ()=>helpPop.classList.add("visible");  
    helpBtn.onmouseleave = ()=>helpPop.classList.remove("visible");
    if (helpBtnModal) {
      helpBtnModal.onmouseenter = ()=>helpPop.classList.add("visible");  
      helpBtnModal.onmouseleave = ()=>helpPop.classList.remove("visible");
    }
  
    /* board interaction */  
    this.boardArea.onmousemove = e=>this.hover(e);  
    this.boardArea.onmouseleave= ()=>this.clearHover();  
    this.boardArea.onclick     = ()=>this.tryHumanMove();  
  
    /* state */  
    this.game=null; this.hoverMove=null; this.anim=false;  
    this.gameHistory = []; // Store previous game states for replay
  
    /* boot */  
    this.initTheme(); this.showSetup();
    
    // Add window resize listener for responsive cell sizing
    window.addEventListener('resize', () => {
      if (this.game) {
        this.draw();
      }
    });  
    this.applyTileTheme(); // Apply initial tile theme
  }  
  
  /* ---------- game start / AI ---------- */  
  start() {  
    const rows = this.rowsIn.value.trim().split(/\s+/).map(Number).filter(n => n > 0).sort((a, b) => b - a)  
                  .filter(n=>Number.isInteger(n)&&n>0);  
    if (!rows.length || rows.some((n,i,a)=>i && n>a[i-1])) {  
      alert("Enter a non-increasing list of positive integers.");  
      return;  
    }  
    const ai = this.aiSel.value==="None"?null:this.aiSel.value;  
    this.game = new Game(rows, ai, this.getDifficultyFromValue(parseInt(this.difficultySlider.value)));  
    this.setupB.classList.remove("visible");  
    this.initialPartition = rows.slice(); // Always store the initial partition
    this.gameHistory = [];
    // Database tracking
    this.movesSequence = [];
    this.gameStartTime = new Date();
    this.draw(); this.updateStatus();  
    if (this.game.isAiTurn()) this.aiTurn();
  }  
  aiTurn() {  
    this.dots.classList.add("thinking");  
    setTimeout(()=>{  
      const m=this.game.aiMove();  
      this.dots.classList.remove("thinking");  
      this.execute(m);  
    }, this.AI_WAIT);  
  }  
  
  /* ---------- hover / click ---------- */  
  hover(evt){  
    if(!this.game || this.game.isAiTurn() || this.anim) return;  
    const {x,y}=this.rel(evt);  
    
    // Calculate the same centerOffsetX as in draw() including gaps
    const boardDataWidth = this.game.board.width() * this.currentCellSize + (this.game.board.width() - 1) * this.GAP;  
    let boardWidth = this.MARGIN * 2 + boardDataWidth;
    const minDimension = 480;
    boardWidth = Math.max(boardWidth, minDimension);
    const actualContentWidth = this.MARGIN * 2 + boardDataWidth;
    const centerOffsetX = (boardWidth - actualContentWidth) / 2;
    
    // Adjust coordinates for the centering offset and gaps
    const adjustedX = x - centerOffsetX;
    const r=Math.floor((y-this.MARGIN)/(this.currentCellSize + this.GAP));  
    const c=Math.floor((adjustedX-this.MARGIN)/(this.currentCellSize + this.GAP));  
    let m=null;  
    if(r>=0 && r<this.game.board.height()){  
      const len=this.game.board.rows[r];  
      const last=this.game.board.height()-1;  
      const below=(r<last)?this.game.board.rows[r+1]:0;  
      const selectable = (r===last) || (len>below);  
      if(selectable){  
        const minKeep = (r===last)?0:Math.max(below,1);  
        if(c>=minKeep && c<=len-1){ m={r,newLen:c}; }  
      }  
    }  
    if(JSON.stringify(m)!==JSON.stringify(this.hoverMove)){  
      this.hoverMove=m; this.highlight(m);  
    }  
    this.boardArea.classList.toggle("clickable",!!m);  
  }  
  tryHumanMove(){  
    if(this.game && !this.game.isAiTurn() && !this.anim && this.hoverMove)  
      this.execute(this.hoverMove);  
  }  
  clearHover(){ this.hoverMove=null; this.highlight(null); }  
  
  /* ---------- execute move ---------- */  
  execute(m){  
    this.anim=true; 
    const len=this.game.board.rows[m.r];  
    for(let c=m.newLen;c<len;c++)  
      document.getElementById(`t-${m.r}-${c}`)?.classList.add("removing");  

    setTimeout(()=>{  
      // Track the move
      this.movesSequence.push(`R${m.r}C${m.newLen}-${len-1}`);
      
      const done=this.game.move(m);  
      this.anim=false; this.draw();  
      if(done){  
        // --- FIX: Save empty board state for replay ---
        this.gameHistory.push([]); // Add empty board after last move
        this.msg.textContent=`Player ${this.game.player()} wins!`;  
        this.overB.classList.add("visible");  
        this.storeGameInDatabase(this.game.player());
      }else{  
        this.updateStatus();  
        if(this.game.isAiTurn()) this.aiTurn();  
      }  
    }, this.ANIM);  
  }  
  
    /* ---------- drawing ---------- */  
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
      this.boardArea.appendChild(tile);  
    });  
    
    this.boardArea.style.width = `${boardWidth}px`;
    this.boardArea.style.height = `${boardHeight}px`;
  }
  
  clearBoard() {
    this.boardArea.querySelectorAll(".tile").forEach(t => t.remove());
  }  
  highlight(m){  
    this.boardArea.querySelectorAll(".tile").forEach(t=>t.classList.remove("highlighted"));  
    if(!m) return;  
    const len=this.game.board.rows[m.r];  
    for(let c=m.newLen;c<len;c++)  
      document.getElementById(`t-${m.r}-${c}`)?.classList.add("highlighted");  
  }  
  
  /* ---------- misc helpers ---------- */  
  updateStatus(){  
    const who=this.game.isAiTurn()?"Computer":"Human";  
    this.status.textContent=`Player ${this.game.player()} (${who}) to move`;  
  }  
  rel(evt){ const r=this.boardArea.getBoundingClientRect(); return {x:evt.clientX-r.left, y:evt.clientY-r.top}; }  
  
  /* theme */  
  initTheme(){  
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    
    // Initialize theme toggle button
    const sunIcon = `<svg class="theme-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
    const moonIcon = `<svg class="theme-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    
    if (savedTheme === "dark") {
      this.themeT.innerHTML = sunIcon + "[light]";
      this.themeT.setAttribute("aria-label", "Switch to light mode");
    } else {
      this.themeT.innerHTML = moonIcon + "[dark]";
      this.themeT.setAttribute("aria-label", "Switch to dark mode");
    }
  }  
  toggleTheme(){  
    const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
    const newTheme = currentTheme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", newTheme);  
    localStorage.setItem("theme", newTheme);
    
    // Update button content
    const sunIcon = `<svg class="theme-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
    const moonIcon = `<svg class="theme-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    
    if (newTheme === "dark") {
      this.themeT.innerHTML = sunIcon + "[light]";
      this.themeT.setAttribute("aria-label", "Switch to light mode");
    } else {
      this.themeT.innerHTML = moonIcon + "[dark]";
      this.themeT.setAttribute("aria-label", "Switch to dark mode");
    }
  }  
  applyTileTheme(){
    // Default to grass theme since theme-select was removed
    this.card.setAttribute("data-tile-theme", "grass");
  }

  // Random partition utility functions
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

    rowsInput.value = partition.join(' ');
  }

  updatePartitionUI() {
    const type = document.getElementById('partition-type-select').value;
    const isRect = type === 'rectangle';
    const colsBox = document.getElementById('partition-cols-box');
    const label = document.getElementById('partition-number-label');
    if (colsBox) colsBox.style.display = isRect ? '' : 'none';
    if (label) label.textContent = type === 'random' ? 'partitions' : isRect ? 'rows' : type === 'staircase' ? 'rows' : 'size';
  }


  
  calculateOptimalCellSize() {
    if (!this.game) {
      this.currentCellSize = this.CELL;
      return;
    }
    
    const boardWidth = this.game.board.width();
    const boardHeight = this.game.board.height();
    
    // Calculate required canvas size with default cell size including gaps
    const requiredWidth = this.MARGIN * 2 + boardWidth * this.CELL + (boardWidth - 1) * this.GAP;
    const requiredHeight = this.MARGIN * 2 + boardHeight * this.CELL + (boardHeight - 1) * this.GAP;
    
    // Get actual available viewport space
    // Account for header (about 90px), padding (40px total), and some breathing room (40px)
    const availableWidth = window.innerWidth - 40; // Just side margins
    const availableHeight = window.innerHeight - 170; // Header + top/bottom padding + breathing room
    
    // Only scale down if the board would actually overflow
    let scale = 1;
    if (requiredWidth > availableWidth) {
      scale = Math.min(scale, availableWidth / requiredWidth);
    }
    if (requiredHeight > availableHeight) {
      scale = Math.min(scale, availableHeight / requiredHeight);
    }
    
    // Apply scale but don't go below 20px for usability
    this.currentCellSize = Math.max(Math.floor(this.CELL * scale), 20);
  }
  
  /* modal */  
  showSetup(){ 
    this.overB.classList.remove("visible"); 
    this.setupB.classList.add("visible"); 
    this.updateDifficultyLabel(); // Initialize difficulty label
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

  async storeGameInDatabase(winner) {
    try {
      if (window.DatabaseUtils) {
        await window.DatabaseUtils.storeGameInDatabase(
          'RIT',
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
  
// ────────────────────────────────────────────────────────────  
// 6.  Boot  
// ────────────────────────────────────────────────────────────  
function downloadGameRIT() {
  if (!window.ritApp || !window.ritApp.game) return;
  const gameState = JSON.stringify(window.ritApp.game.board.rows);
  const blob = new Blob([gameState], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'game_state.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function downloadGameHTML_RIT() {
  if (!window.ritApp || !window.ritApp.gameHistory || window.ritApp.gameHistory.length === 0) {
    alert('No game state found.');
    return;
  }
  let history = window.ritApp.gameHistory.slice();
  const initialPartition = window.ritApp.initialPartition || history[0] || [];
  // --- REWRITE: Always ensure the last state is an empty board ---
  const isEmpty = arr => Array.isArray(arr) && (arr.length === 0 || arr.every(x => x === 0));
  if (!isEmpty(history[history.length - 1])) {
    history.push([]); // Always add empty board as last state
  }
  const title = `RIT Game Replay - ${new Date().toLocaleDateString()}`;
  let html = `<!DOCTYPE html>
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
 <span id="total-states">${history.length}</span></div>
 <div class="controls">
  <button id="first-btn" onclick="goToState(0)">⏮ First</button>
  <button id="prev-btn"  onclick="previousState()">◀ Previous</button>
  <button id="play-btn"  onclick="toggleAutoplay()">▶ Play</button>
  <button id="next-btn"  onclick="nextState()">Next ▶</button>
  <button id="last-btn"  onclick="goToState(history.length-1)">Last ⏭</button>
 </div>
 <canvas id="game-canvas" width="400" height="400"></canvas>
 <div id="error-message" class="error" style="display:none"></div>
 <div class="instructions">
  <strong>Navigation:</strong> Use ←/→ keys or the buttons above.<br>
  <strong>Autoplay:</strong> Press Play to advance automatically.
 </div>
</div>
<script>
 const history=${JSON.stringify(history)};
 const initialPartition=${JSON.stringify(initialPartition)};
 let currentStateIndex=0,isPlaying=false,playInterval;
 const CELL_SIZE=40,MARGIN=20;
 const canvas=document.getElementById('game-canvas'),ctx=canvas.getContext('2d');
 const errorDiv=document.getElementById('error-message');
 function drawBoard(rows){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(!Array.isArray(initialPartition)||!initialPartition.length){
    errorDiv.textContent='No valid game state found.';errorDiv.style.display='block';return;
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
    const maskLen = (rows && rows[r] !== undefined) ? rows[r] : 0;
    for(let c=0;c<rowLen;c++){
      const x=MARGIN+c*CELL_SIZE;
      const y=MARGIN+r*CELL_SIZE;
      ctx.fillStyle = c < maskLen ? '#111' : '#fff'; // black if present, white if removed
      ctx.fillRect(x,y,CELL_SIZE,CELL_SIZE);
    }
  }
  ctx.save();ctx.strokeStyle='#fff';ctx.lineWidth=1;
  for(let r=0;r<=boardHeight;r++){const y=MARGIN+r*CELL_SIZE;ctx.beginPath();ctx.moveTo(MARGIN,y);ctx.lineTo(MARGIN+boardWidth*CELL_SIZE,y);ctx.stroke();}
  for(let c=0;c<=boardWidth;c++){const x=MARGIN+c*CELL_SIZE;ctx.beginPath();ctx.moveTo(x,MARGIN);ctx.lineTo(x,MARGIN+boardHeight*CELL_SIZE);ctx.stroke();}
  ctx.restore();
 }
 function updateDisplay(){
  drawBoard(history[currentStateIndex]);
  document.getElementById('current-state').textContent=currentStateIndex+1;
  document.getElementById('first-btn').disabled=currentStateIndex===0;
  document.getElementById('prev-btn').disabled =currentStateIndex===0;
  document.getElementById('next-btn').disabled =currentStateIndex===history.length-1;
  document.getElementById('last-btn').disabled =currentStateIndex===history.length-1;
 }
 function goToState(i){if(i>=0&&i<history.length){currentStateIndex=i;updateDisplay();}}
 function nextState(){if(currentStateIndex<history.length-1){currentStateIndex++;updateDisplay();}}
 function previousState(){if(currentStateIndex>0){currentStateIndex--;updateDisplay();}}
 function toggleAutoplay(){
  const btn=document.getElementById('play-btn');
  if(isPlaying){clearInterval(playInterval);isPlaying=false;btn.textContent='▶ Play';}
  else{isPlaying=true;btn.textContent='⏸ Pause';
    playInterval=setInterval(()=>{if(currentStateIndex<history.length-1)nextState();else toggleAutoplay();},1000);}
 }
 document.addEventListener('keydown',e=>{
   if(e.key==='ArrowLeft'){e.preventDefault();previousState();}
   else if(e.key==='ArrowRight'){e.preventDefault();nextState();}
   else if(e.key===' '){e.preventDefault();toggleAutoplay();}
 });
 updateDisplay();
</script></body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'rit_game.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
window.addEventListener('load', () => {
  const btn = document.getElementById('download-btn');
  if (btn) btn.addEventListener('click', downloadGameRIT);
});
window.addEventListener('load', () => {
  const btn = document.getElementById('download-btn');
  if (btn) btn.addEventListener('click', downloadGameHTML_RIT);
});
window.onload = ()=>{ window.ritApp = new RITGui(); };  