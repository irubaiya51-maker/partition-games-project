/* Random partition utility functions */  
const CELL_SIZE = 40;  
const GAP_SIZE  = 30;  
  
function randomInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}  
function randomPartition(n){  
  let parts=[],remaining=n,maxPart=n;  
  while(remaining>0){  
    let part=randomInt(1,Math.min(remaining,maxPart));  
    parts.push(part);remaining-=part;maxPart=part;  
  }  
  return parts.sort((a,b)=>b-a);  
}  
function staircase(n){let p=[],t=n;while(t>=1){p.push(t);t--;}return p;}  
function rectangle(rows,cols){let p=[],t=rows;while(t>=1){p.push(cols);t--;}return p;}
function hook(n){let p=[n];for(let t=n;t>=2;t--)p.push(1);return p;}  
  
/* ────────────────────  XOR calculations for perfect AI  ──────────────────── */  
function xorAllFragments(state){  
  let x=0;for(const f of state.fragments)x^=gRect(f.rows,f.cols);return x;  
}  
function isWinningMove(state,fIdx,kind,idx,currentXor){  
  const frag=state.fragments[fIdx],h=frag.rows,w=frag.cols;  
  let gAfterFrag;  
  if(kind==='row'){  
    const above=gRect(idx,w),below=gRect(h-1-idx,w);  
    gAfterFrag=above^below;  
  }else{  
    const left=gRect(h,idx),right=gRect(h,w-1-idx);  
    gAfterFrag=left^right;  
  }  
  const xorAfter=(currentXor^gRect(h,w))^gAfterFrag;  
  return xorAfter===0;  
}  
  
/* ───────── Grundy numbers for rectangles ───────── */  
const gMemo=new Map();                     // key: "h,w"  
function gRect(h,w){  
  if(h===0||w===0)return 0;  
  const key=`${h},${w}`;if(gMemo.has(key))return gMemo.get(key);  
  const seen=new Set();  
  for(let r=0;r<h;r++)seen.add(gRect(r,w)^gRect(h-1-r,w));  
  for(let c=0;c<w;c++)seen.add(gRect(h,c)^gRect(h,w-1-c));  
  let g=0;while(seen.has(g))g++;gMemo.set(key,g);return g;  
}  
  
/* =================================================================  
   CRIM  –  Complete Front-End Logic  
   ================================================================= */  
  
class SoundManager{  
  static sounds={};  
  static init(){}  
  static play(name){}  
}  
  
/* ────────────────────  Game Logic  ──────────────────── */  
  
class Player{  
  static RED='Red';static BLUE='Blue';  
  static other(p){return p===Player.RED?Player.BLUE:Player.RED;}  
}  
  
class Fragment{  
  constructor(grid,x=0,y=0,serial=0,rowOffset=0,colOffset=0){  
    this.grid=grid;this.rows=grid.length;  
    this.cols=this.rows?grid[0].length:0;  
    this.x=x;this.y=y;  
    this.serial=serial;  
    this.rowOffset=rowOffset;  
    this.colOffset=colOffset;  
  }  
  rowsAlive(){const a=[];for(let r=0;r<this.rows;r++)if(this.grid[r].some(v=>v))a.push(r);return a;}  
  colsAlive(){  
    const a=[];for(let c=0;c<this.cols;c++){  
      for(let r=0;r<this.rows;r++){if(this.grid[r][c]){a.push(c);break;}}  
    }return a;  
  }  
  hasMoves(){return this.rowsAlive().length>0||this.colsAlive().length>0;}  
  
  deleteRow(r){for(let c=0;c<this.cols;c++)this.grid[r][c]=false;}  
  deleteCol(c){for(let r=0;r<this.rows;r++)this.grid[r][c]=false;}  
  
  _nb(r,c){  
    const res=[],dirs=[[1,0],[-1,0],[0,1],[0,-1]];  
    for(const[dR,dC] of dirs){  
      const nr=r+dR,nc=c+dC;  
      if(0<=nr&&nr<this.rows&&0<=nc&&nc<this.cols&&this.grid[nr][nc])  
        res.push([nr,nc]);  
    }return res;  
  }  
  splitIntoFragments(){  
    const visited=new Set(),frags=[];  
    for(let r=0;r<this.rows;r++)for(let c=0;c<this.cols;c++){  
      if(this.grid[r][c]&&!visited.has(`${r},${c}`)){  
        const q=[[r,c]];visited.add(`${r},${c}`);const cells=[];  
        while(q.length){  
          const[cr,cc]=q.shift();cells.push([cr,cc]);  
          for(const[nr,nc]of this._nb(cr,cc)){  
            const key=`${nr},${nc}`;if(!visited.has(key)){visited.add(key);q.push([nr,nc]);}  
          }  
        }frags.push(Fragment._fromCells(cells));  
      }  
    }return frags;  
  }  
  static _fromCells(cells, baseRowOffset=0, baseColOffset=0){  
    const minR=Math.min(...cells.map(v=>v[0])),minC=Math.min(...cells.map(v=>v[1]));  
    const maxR=Math.max(...cells.map(v=>v[0])),maxC=Math.max(...cells.map(v=>v[1]));  
    const h=maxR-minR+1,w=maxC-minC+1;  
    const g=Array.from({length:h},()=>Array(w).fill(false));  
    for(const[r,c]of cells)g[r-minR][c-minC]=true;  
    return new Fragment(g,0,0,0, baseRowOffset+minR, baseColOffset+minC);  
  }  
  static fromRowSizes(rowSizes){  
    const rows=rowSizes.length,cols=Math.max(...rowSizes);  
    const g=Array.from({length:rows},()=>Array(cols).fill(false));  
    rowSizes.forEach((len,r)=>{for(let c=0;c<len;c++)g[r][c]=true;});  
    return new Fragment(g,0,0,0,0,0);  
  }
  
  getRows() {
    // Return row lengths as an array
    const rowLengths = [];
    for (let r = 0; r < this.rows; r++) {
      let length = 0;
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c]) {
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
  
class GameState{  
  constructor(rowSizes){
    this.fragments=[Fragment.fromRowSizes(rowSizes)];
    this.fragments[0].serial=1; // p1
    this.nextSerial=1;          // last number used
    this.fragmentNames=['p_1']; // helper for GUI
    this.player=Player.RED;
  }
  hasMoves(){return this.fragments.some(f=>f.hasMoves());}  
  performMove(fIdx,kind,lineIdx){  
    const frag=this.fragments[fIdx],originalX=frag.x,originalY=frag.y;  
    const originalSerial=frag.serial; // p_i
    if(kind==='row')frag.deleteRow(lineIdx);else frag.deleteCol(lineIdx);  
    // collect absolute coordinates of each live cell before split
    const cells=[];
    for(let r=0;r<frag.rows;r++)for(let c=0;c<frag.cols;c++){ if(frag.grid[r][c]) cells.push([frag.rowOffset+r, frag.colOffset+c]); }
    // split using absolute coordinates to preserve original row/col indices
    const visited=new Set(); const groups=[];
    const inSet=new Set(cells.map(([r,c])=>`${r},${c}`));
    const nb=(r,c)=>[[1,0],[-1,0],[0,1],[0,-1]].map(([dr,dc])=>[r+dr,c+dc]).filter(([rr,cc])=>inSet.has(`${rr},${cc}`));
    for(const [r,c] of cells){ const key=`${r},${c}`; if(visited.has(key)) continue; const q=[[r,c]]; visited.add(key); const comp=[]; while(q.length){ const [cr,cc]=q.shift(); comp.push([cr,cc]); for(const [nr,nc] of nb(cr,cc)){ const k=`${nr},${nc}`; if(!visited.has(k)){ visited.add(k); q.push([nr,nc]); } } } groups.push(comp); }
    const newFrags=groups.map(group=>Fragment._fromCells(group,0,0));  
  
    if(newFrags.length>1){  
      if(kind==='row'){  
        let y=originalY;  
        newFrags.forEach(nf=>{nf.x=originalX;nf.y=y;y+=nf.rows*40+60;});  
      }else{  
        let x=originalX;  
        newFrags.forEach(nf=>{nf.x=x;nf.y=originalY;x+=nf.cols*40+60;});  
      }  
    }else if(newFrags.length===1){newFrags[0].x=originalX;newFrags[0].y=originalY;}  

    // Assign serials: first keeps old serial, others get fresh increasing
    newFrags.forEach((nf,idx)=>{ if(idx===0){ nf.serial=originalSerial; } else { nf.serial=++this.nextSerial; } });

    // Build GUI names from serials
    const newNames=newFrags.map(f=>`p_${f.serial}`);

    this.fragments.splice(fIdx,1,...newFrags);  
    this.fragmentNames.splice(fIdx,1,...newNames);
    this.player=Player.other(this.player);  
  }  
}  
  
/* ────────────────────  GUI  ──────────────────── */  
  
class CRIM_GUI{  
  constructor(){  
    this.CELL=40;this.GAP=30;this.LABEL=20;  
    this.cpuSide='None';    this.vsCPU=false;  
    this.gameHistory=[];
    // Database tracking
    this.movesSequence = [];
    this.moveContexts = [];
    this.gameStartTime = null;  
    /* DOM handles */  
    this.boardArea=document.getElementById('board-area');  
    this.statusLabel=document.getElementById('status-label');  
    this.setupBackdrop=document.getElementById('setup-modal-backdrop');  
    this.gameOverBackdrop=document.getElementById('game-over-modal-backdrop');  
    this.gameOverMsg=document.getElementById('game-over-message');  
    this.rowsInput=document.getElementById('rows-input');  
    this.helpPopover=document.getElementById('help-popover');  
    /* buttons */  
    document.getElementById('start-game-btn').addEventListener('click',()=>{SoundManager.play('click');this.startFromInput();});  
    document.getElementById('new-game-btn')  .addEventListener('click',()=>{SoundManager.play('click');this.showSetup();});  
    document.getElementById('play-again-btn').addEventListener('click',()=>{SoundManager.play('click');this.showSetup();});  
    document.getElementById('undo-btn').addEventListener('click',()=>{SoundManager.play('click');this.undoMove();});  
    /* partition generation */  
    document.getElementById('generate-partition-btn').addEventListener('click',()=>{SoundManager.play('click');this.generatePartition();});
    document.getElementById('partition-type-select').addEventListener('change',()=>this.updatePartitionUI());
    this.updatePartitionUI();
    /* tile themes */
    const cycleThemeBtn=document.getElementById('cycle-theme-btn');
    this.tileThemes = ['grass', 'stone', 'ice'];
    this.currentThemeIndex = 0;
    if(cycleThemeBtn){
      cycleThemeBtn.addEventListener('click',()=>{SoundManager.play('click');this.cycleTileTheme();});
    }  
    /* help */  
    const helpBtn=document.getElementById('help-btn');  
    const helpBtnModal=document.getElementById('help-btn-modal');
    if(helpBtn){
      helpBtn.addEventListener('mouseenter',()=>this.showHelp());  
      helpBtn.addEventListener('mouseleave',()=>this.hideHelp());
    }
    if(helpBtnModal){  
      helpBtnModal.addEventListener('mouseenter',()=>this.showHelp());
      helpBtnModal.addEventListener('mouseleave',()=>this.hideHelp());
    }  
    /* sound */  
    SoundManager.init();  
    /* start */  
    this.state=null;this.idCounter=0;this.idToAddress=new Map();  
    this.applyTileTheme();  
    this.showSetup();  
    window.crisApp=this;  
  }  
  
  showSetup(){  
    this.gameOverBackdrop.classList.remove('visible');  
    this.setupBackdrop.classList.add('visible');  
    this.statusLabel.textContent='Waiting for start…';  
    this.clearBoard();  
    this.updateDownloadButton();
  }  
  startFromInput(){  
    try{  
      const nums=this.rowsInput.value.trim().split(/\s+/).map(Number).filter(n => n > 0).sort((a, b) => b - a);  
      if(nums.length===0||nums.some(n=>!Number.isInteger(n)||n<=0))throw new Error();  
      this.cpuSide=document.getElementById('ai-select').value;  
      this.vsCPU=(this.cpuSide!=='None');  
      // difficulty slider currently unused  
      this.state=new GameState(nums);  
      // Keep the initial partition for database storage
      this.initialPartitionRows = [...nums];
      
      // Center the initial board
      if (this.state.fragments.length > 0) {
        const frag = this.state.fragments[0];
        const boardWidth = frag.cols;
        const boardHeight = frag.rows;
        
        // Calculate the total content width (including labels)
        const contentWidth = this.LABEL + (boardWidth * this.CELL) + this.LABEL;
        const contentHeight = this.LABEL + (boardHeight * this.CELL) + this.LABEL;
        
        // Set minimum dimensions for board area
        const minDimension = 520;
        const boardAreaWidth = Math.max(contentWidth, minDimension);
        const boardAreaHeight = Math.max(contentHeight, minDimension);
        
        // Calculate horizontal center offset
        const centerX = (boardAreaWidth - contentWidth) / 2;
        
        // Position the board horizontally centered but at the top
        const x0 = centerX + this.LABEL;
        const y0 = this.LABEL; // Start from top with just label space
        
        // Update the first fragment's position to be centered
        this.state.fragments[0].x = x0;
        this.state.fragments[0].y = y0;
      }
      
      this.setupBackdrop.classList.remove('visible');  
      this.clearGameHistory();this.redraw();
      // Initialize database tracking
      this.movesSequence = [];
      this.moveContexts = [];
      this.gameStartTime = new Date();
      this.updateUndoButton();
      this.updateDownloadButton();
      const playerLetter=this.getLetterFromPlayer(this.state.player);  
      const playerType=this.vsCPU&&this.state.player===this.getPlayerFromLetter(this.cpuSide)?'Computer':'Human';  
      this.statusLabel.textContent=`Player ${playerLetter} (${playerType}) to move`;  
        
    }catch{alert('Please enter positive integers separated by spaces.');}  
    if(this.vsCPU&&this.state.player===this.getPlayerFromLetter(this.cpuSide)){  
      setTimeout(()=>this.aiTurnPerfect(),1300);  
    }  
  }  
  
  clearBoard(){this.boardArea.innerHTML='';this.idToAddress.clear();}  
  
  updatePartitionUI(){
    const type=document.getElementById('partition-type-select').value;
    const isRect=type==='rectangle';
    const colsBox=document.getElementById('partition-cols-box');
    const label=document.getElementById('partition-number-label');
    if(colsBox)colsBox.style.display=isRect?'':'none';
    if(label)label.textContent=type==='random'?'partitions':isRect?'rows':type==='staircase'?'rows':'size';
  }

  generatePartition(){
    const sel=document.getElementById('partition-type-select');
    const input=document.getElementById('partition-number-input');
    const type=sel.value,n=parseInt(input.value,10);
    if(isNaN(n)||n<=0||n>200){alert('Please enter a positive number ≤ 200.');return;}
    let partition;
    switch(type){
      case'random':partition=randomPartition(n);break;
      case'staircase':partition=staircase(n);break;
      case'rectangle':{
        const cols=parseInt(document.getElementById('partition-cols-input').value,10);
        if(isNaN(cols)||cols<=0||cols>200){alert('Please enter a positive number of columns ≤ 200.');return;}
        partition=rectangle(n,cols);
        break;
      }
      case'hook':partition=hook(n);break;
      default:alert('This partition type not implemented.');return;
    }
    this.rowsInput.value=partition.join(' ');
  }
  
  saveGameState(){  
    if(!this.state)return;  
    const fragmentsCopy=this.state.fragments.map(f=>{  
      const g=f.grid.map(row=>[...row]);return new Fragment(g,f.x,f.y);  
    });  
    // include fragment names in history for undo fidelity
    this.gameHistory.push({fragments:fragmentsCopy,player:this.state.player,fragmentNames:[...this.state.fragmentNames],nextNameIndex:this.state.nextNameIndex});  
    this.updateDownloadButton();
  }  
  undoMove(){  
    if(!this.canUndo())return;  
    SoundManager.play('click');  
    const prev=this.gameHistory.pop();  
    this.state.fragments=prev.fragments;this.state.player=prev.player;
    this.state.fragmentNames=prev.fragmentNames;this.state.nextNameIndex=prev.nextNameIndex;
    // Remove the last move from the sequence
    this.movesSequence.pop();
    this.moveContexts.pop();
    this.redraw();  
    this.updateUndoButton();
    this.updateDownloadButton();
    const playerLetter=this.getLetterFromPlayer(this.state.player);  
    const playerType=this.vsCPU&&this.state.player===this.getPlayerFromLetter(this.cpuSide)?'Computer':'Human';  
    this.statusLabel.textContent=`Player ${playerLetter} (${playerType}) to move`;  
      
  }  
  clearGameHistory(){
    this.gameHistory=[];
    this.updateDownloadButton();
  }
  
  updateUndoButton() {
    const undoBtn = document.getElementById('undo-btn');
    if (!undoBtn) return;
    
    const canUndo = this.state && this.gameHistory.length > 0 && !this.vsCPU;
    
    if (canUndo) {
      undoBtn.style.display = 'inline-flex';
      undoBtn.disabled = false;
    } else {
      undoBtn.style.display = 'none';
    }
  }
  
  updateDownloadButton() {
    const downloadBtn = document.getElementById('download-btn');
    if (!downloadBtn) return;
    
    const canDownload = this.state && this.gameHistory.length > 0;
    
    if (canDownload) {
      downloadBtn.style.display = 'inline-flex';
      downloadBtn.disabled = false;
    } else {
      downloadBtn.style.display = 'none';
    }
  }
  
  getPlayerFromLetter(letter) {
    return letter === 'A' ? Player.RED : Player.BLUE;
  }
  
  getLetterFromPlayer(player) {
    return player === Player.RED ? 'A' : 'B';
  }  
  
  cycleTileTheme() {
    this.currentThemeIndex = (this.currentThemeIndex + 1) % this.tileThemes.length;
    this.applyTileTheme();
  }

  applyTileTheme() {
    const gameCard = document.getElementById('game-card');
    const cycleBtn = document.getElementById('cycle-theme-btn');
    if (gameCard) {
      const theme = this.tileThemes[this.currentThemeIndex];
      gameCard.setAttribute('data-tile-theme', theme);
      localStorage.setItem('cris-tile-theme', theme);
    }
    if (cycleBtn) {
      const themeEmojis = { grass: '🌱', stone: '🪨', ice: '🧊' };
      const theme = this.tileThemes[this.currentThemeIndex];
      cycleBtn.textContent = `[tiles: ${themeEmojis[theme] || '🌱'}]`;
    }
  }

  showHelp() { this.helpPopover.classList.add('visible'); }
  hideHelp() { this.helpPopover.classList.remove('visible'); }  
  
  redraw(){  
    this.clearBoard();if(!this.state)return;  
    this.updateBoardDimensions();  
    this.state.fragments.forEach((f,i)=>this.drawFragment(f,i,f.x+this.GAP,f.y+this.GAP));  
  }  
  updateBoardDimensions(){  
    if(!this.state||!this.state.fragments.length)return;  
    let maxX=0,maxY=0;  
    this.state.fragments.forEach(f=>{  
      maxX=Math.max(maxX,f.x+f.cols*this.CELL);  
      maxY=Math.max(maxY,f.y+f.rows*this.CELL);  
    });  
    const w=maxX+this.GAP*2+this.LABEL,h=maxY+this.GAP*2+this.LABEL;  
    const mw=480,mh=480;  
    this.boardArea.style.width =`${Math.max(w,mw)}px`;  
    this.boardArea.style.height=`${Math.max(h,mh)}px`;  
  }  
  drawFragment(frag,fIdx,x0,y0){  
    frag.rowsAlive().forEach(r=>{  
      const div=document.createElement('div');div.className='label-cell';  
      div.style.width=`${this.LABEL}px`;div.style.height=`${this.CELL}px`;  
      div.style.left=`${x0-this.LABEL}px`;div.style.top=`${y0+r*this.CELL}px`;  
      const displayIndex = r + (frag.rowOffset||0);
      div.textContent=displayIndex;const id=`lbl-${++this.idCounter}`;div.id=id;  
      this.idToAddress.set(id,{frag:fIdx,kind:'row',index:r,display:displayIndex});  
      div.addEventListener('click',e=>this.handleLabelClick(e));this.boardArea.appendChild(div);  
    });  
    frag.colsAlive().forEach(c=>{  
      const div=document.createElement('div');div.className='label-cell';  
      div.style.width=`${this.CELL}px`;div.style.height=`${this.LABEL}px`;  
      div.style.left=`${x0+c*this.CELL}px`;div.style.top=`${y0-this.LABEL}px`;  
      const displayIndex = c + (frag.colOffset||0);
      div.textContent=displayIndex;const id=`lbl-${++this.idCounter}`;div.id=id;  
      this.idToAddress.set(id,{frag:fIdx,kind:'col',index:c,display:displayIndex});  
      div.addEventListener('click',e=>this.handleLabelClick(e));this.boardArea.appendChild(div);  
    });  
    for(let r=0;r<frag.rows;r++)for(let c=0;c<frag.cols;c++){  
      if(!frag.grid[r][c])continue;  
      const tile=document.createElement('div');tile.className='tile';  
      tile.style.width=`${this.CELL}px`;tile.style.height=`${this.CELL}px`;  
      tile.style.left=`${x0+c*this.CELL}px`;tile.style.top=`${y0+r*this.CELL}px`;  
      this.boardArea.appendChild(tile);  
    }  
  }  
  
  handleLabelClick(ev){  
    const info=this.idToAddress.get(ev.currentTarget.id);if(!info||!this.state)return;  
    this.saveGameState();  
    SoundManager.play('click');  
    ev.currentTarget.classList.add(info.kind==='row'?'row-win':'col-win');  
    setTimeout(()=>{  
      // Track the move and context
      const fragName = this.state.fragmentNames[info.frag] || '?';
      const frag = this.state.fragments[info.frag];
      const fragRows = frag ? frag.getRows() : [];
      // Compute coordinate of the first filled cell in the chosen row/col (global indices)
      let globalR = 0, globalC = 0;
      if (frag) {
        if (info.kind === 'row') {
          const r = info.index;
          let minC = null;
          for (let c = 0; c < frag.cols; c++) { if (frag.grid[r][c]) { minC = c; break; } }
          globalR = (frag.rowOffset || 0) + r;
          globalC = (frag.colOffset || 0) + (minC ?? 0);
        } else {
          const c = info.index;
          let minR = null;
          for (let r = 0; r < frag.rows; r++) { if (frag.grid[r][c]) { minR = r; break; } }
          globalR = (frag.rowOffset || 0) + (minR ?? 0);
          globalC = (frag.colOffset || 0) + c;
        }
      }
      const moveStr = (info.kind === 'row')
        ? `(R${globalR}xC${globalC})`
        : `(C${globalC}xR${globalR})`;
      this.movesSequence.push(moveStr);
      this.moveContexts.push({
        fragmentName: fragName,
        fragmentRows: fragRows,
        move: moveStr,
        kind: info.kind,
        globalRow: globalR,
        globalCol: globalC
      });
      
      this.state.performMove(info.frag,info.kind,info.index);  
      if(!this.state.hasMoves()){  
        SoundManager.play('win');const winner=Player.other(this.state.player)===Player.RED?'A':'B';  
        this.gameOverMsg.textContent=`Player ${winner} wins!`;  
        this.gameOverBackdrop.classList.add('visible');
        this.storeGameInDatabase(winner);
        this.updateDownloadButton();
        this.clearBoard();return;  
      }  
      this.redraw();  
      this.updateUndoButton();
      this.updateDownloadButton();
      const playerLetter=this.getLetterFromPlayer(this.state.player);  
      const playerType=this.vsCPU&&this.state.player===this.getPlayerFromLetter(this.cpuSide)?'Computer':'Human';  
      this.statusLabel.textContent=`Player ${playerLetter} (${playerType}) to move`;  
        
      if(this.vsCPU&&this.state.player===this.getPlayerFromLetter(this.cpuSide))setTimeout(()=>this.aiTurnPerfect(),500);  
    },300);  
  }  
  
  aiTurnPerfect(){  
      
    const totalXor=xorAllFragments(this.state);  
    for(let f=0;f<this.state.fragments.length;f++){  
      const frag=this.state.fragments[f];  
      for(const r of frag.rowsAlive())if(isWinningMove(this.state,f,'row',r,totalXor))return this.executeAIMove(f,'row',r);  
      for(const c of frag.colsAlive())if(isWinningMove(this.state,f,'col',c,totalXor))return this.executeAIMove(f,'col',c);  
    }  
    const f0=this.state.fragments[0];  
    if(f0.rowsAlive().length)return this.executeAIMove(0,'row',f0.rowsAlive()[0]);  
    else return this.executeAIMove(0,'col',f0.colsAlive()[0]);  
  }  
  executeAIMove(fIdx,kind,idx){  
    const id=[...this.idToAddress.entries()].find(([_,v])=>v.frag===fIdx&&v.kind===kind&&v.index===idx)?.[0];  
    if(id)document.getElementById(id).click();  
    this.updateDownloadButton();
  }

  async storeGameInDatabase(winner) {
    try {
      if (window.DatabaseUtils) {
        const payload = {
          gameTypeKey: 'CRIS',
          initialPartition: this.initialPartitionRows || [],
          movesSequence: this.movesSequence,
          winner: winner && winner.charAt(0),
          gameStartTime: this.gameStartTime,
          moveContexts: this.moveContexts
        };
        // Preview exactly what will be sent to the server
        const serverUrl = (window.GameConfig && window.GameConfig.getServerUrl) ? window.GameConfig.getServerUrl() : 'http://localhost:3001';
        const gameDataPreview = {
          gameType: 'CRIS',
          partitionData: Array.isArray(payload.initialPartition) ? payload.initialPartition.join(' ') : payload.initialPartition,
          timestampPlayed: (payload.gameStartTime && payload.gameStartTime.toISOString) ? payload.gameStartTime.toISOString() : new Date().toISOString(),
          movesSequence: Array.isArray(payload.movesSequence) ? payload.movesSequence.join(' ') : payload.movesSequence,
          gameOutcome: payload.winner,
          moveContexts: payload.moveContexts
        };
        console.log('[CRIS] About to save game record to', `${serverUrl}/api/game-records`, gameDataPreview);
        await window.DatabaseUtils.storeGameInDatabase(
          payload.gameTypeKey,
          payload.initialPartition,
          payload.movesSequence,
          payload.winner,
          payload.gameStartTime,
          payload.moveContexts,
          false, // Let server calculate based on parity
          'A'
        );
      }
    } catch (err) {
      console.warn('Database save failed:', err.message);
    }
  }
}  
  
/* ────────────────────  boot  ──────────────────── */  
window.addEventListener('load',()=>{new CRIM_GUI();});  
  
/* Difficulty label init */  
window.addEventListener('load',()=>{  
  const s=document.getElementById('difficulty-slider'),l=document.getElementById('difficulty-label');  
  if(s&&l){  
    s.addEventListener('input',()=>{  
      const v=parseInt(s.value);let level='Medium';  
      if(v<20)level='Easy';else if(v<=70)level='Medium';else if(v<=99)level='Hard';else level='Perfect';  
      l.textContent=`${level} (${v})`;  
    });s.dispatchEvent(new Event('input'));  
  }  
});  
  
/* ────────────────────  DOWNLOAD  ──────────────────── */  
function cloneFrag(f){  
  return{rows:f.rows,cols:f.cols,grid:f.grid.map(r=>[...r])};  
}  
  
function downloadGame(){  
  if(!window.crisApp||!window.crisApp.state){alert('No game state found.');return;}  
  const app=window.crisApp;  
  /* build history + current */  
  const historyCopy=app.gameHistory.map(h=>({  
    fragments:h.fragments.map(cloneFrag)  
  }));  
  const current={fragments:app.state.fragments.map(cloneFrag)};  
  const gameStates=[...historyCopy,current];  
  
  const html=generateGameReplayHTML_CRIS(gameStates);  
  const blob=new Blob([html],{type:'text/html'});  
  const url=URL.createObjectURL(blob);  
  const a=document.createElement('a');a.href=url;  
  a.download=`CRIS-Game-${Date.now()}.html`;  
  document.body.appendChild(a);a.click();document.body.removeChild(a);  
  setTimeout(()=>URL.revokeObjectURL(url),1000);  
}  
  
/* ────────────────────  GAME REPORT  ──────────────────── */
function openGameReport(){
  if(!window.crisApp||!window.crisApp.state){alert('No game state found.');return;}
  const app=window.crisApp;
  const historyStates=app.gameHistory.map(h=>h.fragments.map(f=>`${f.rows}x${f.cols}`).join(' '));
  const currentState=app.state.fragments.map(f=>`${f.rows}x${f.cols}`).join(' ');
  const allStates=[...historyStates,currentState].filter(Boolean);
  const uniqueStates=allStates.filter((s,i,self)=>s&&(i===0||s!==self[i-1]));
  localStorage.setItem('crisGameStatesForReport',uniqueStates.join('\n'));
  localStorage.setItem('crisReportMode','normal');
  window.open('../../reports/generator/report.html','_blank');
}

/* one binding */
window.addEventListener('load',()=>{
  const btn=document.getElementById('download-btn');
  if(btn)btn.addEventListener('click',downloadGame);
  const btnModal=document.getElementById('download-btn-modal');
  if(btnModal)btnModal.addEventListener('click',downloadGame);
  const reportBtnModal=document.getElementById('report-btn-modal');
  if(reportBtnModal)reportBtnModal.addEventListener('click',openGameReport);
});
  
/* --- HTML GENERATOR ------------------------------------------------ */  
function generateGameReplayHTML_CRIS(gameStates){  
  const title=`CRIS Game Replay - ${new Date().toLocaleDateString()}`;  
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
 const CELL_SIZE=40,GAP=30,MARGIN=20;  
 const canvas=document.getElementById('game-canvas'),ctx=canvas.getContext('2d');  
 const errorDiv=document.getElementById('error-message');  
 function drawBoard(fragments){  
  ctx.clearRect(0,0,canvas.width,canvas.height);  
  if(!Array.isArray(fragments)||!fragments.length){  
    errorDiv.textContent='Game Ended.';errorDiv.style.display='block';return;  
  }errorDiv.style.display='none';  
  // Layout fragments side by side with a gap  
  let totalWidth=MARGIN,maxHeight=0;  
  const fragPositions=[];  
  for(const frag of fragments){  
    fragPositions.push({x:totalWidth,y:MARGIN});  
    totalWidth+=frag.cols*CELL_SIZE+GAP;  
    maxHeight=Math.max(maxHeight,frag.rows*CELL_SIZE);  
  }  
  totalWidth+=MARGIN-GAP;  
  maxHeight+=2*MARGIN;  
  canvas.width=totalWidth;  
  canvas.height=maxHeight;  
  for(let f=0;f<fragments.length;f++){  
    const frag=fragments[f];  
    const{x,y}=fragPositions[f];  
    for(let r=0;r<frag.rows;r++)for(let c=0;c<frag.cols;c++){  
      const xx=x+c*CELL_SIZE,yy=y+r*CELL_SIZE;  
      ctx.fillStyle=frag.grid[r][c]?'#111':'#fff';  
      ctx.fillRect(xx,yy,CELL_SIZE,CELL_SIZE);  
    }  
    ctx.save();ctx.strokeStyle='#fff';ctx.lineWidth=1;  
    for(let r=0;r<=frag.rows;r++){const yy=y+r*CELL_SIZE;ctx.beginPath();ctx.moveTo(x,yy);ctx.lineTo(x+frag.cols*CELL_SIZE,yy);ctx.stroke();}  
    for(let c=0;c<=frag.cols;c++){const xx=x+c*CELL_SIZE;ctx.beginPath();ctx.moveTo(xx,y);ctx.lineTo(xx,y+frag.rows*CELL_SIZE);ctx.stroke();}  
    ctx.restore();  
  }  
 }  
 function updateDisplay(){  
  drawBoard(gameStates[currentStateIndex].fragments);  
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