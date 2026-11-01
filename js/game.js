/**
 * 游戏核心逻辑
 * 管理游戏状态、用户交互、进度保存
 */

class SudokuGame {
  constructor() {
    this.generator = new SudokuGenerator();
    this.currentPuzzle = null;
    this.currentSolution = null;
    this.playerBoard = null;
    this.difficulty = 'medium';
    this.selectedCell = null;
    this.startTime = null;
    this.timer = null;
    this.history = []; // 用于撤销功能
    this.hints = 3; // 剩余提示次数
    this.errors = 0; // 错误次数
    this.gameCompleted = false;
    
    this.init();
  }

  /**
   * 初始化游戏
   */
  init() {
    this.loadGameState();
    this.bindEvents();
  }

  /**
   * 开始新游戏
   */
  startNewGame(difficulty = 'medium') {
    this.difficulty = difficulty;
    const { puzzle, solution } = this.generator.generatePuzzle(difficulty);
    
    this.currentPuzzle = puzzle;
    this.currentSolution = solution;
    this.playerBoard = JSON.parse(JSON.stringify(puzzle));
    this.selectedCell = null;
    this.startTime = Date.now();
    this.history = [];
    this.hints = 3;
    this.errors = 0;
    this.gameCompleted = false;
    
    this.saveGameState();
    this.renderBoard();
    this.startTimer();
    this.updateStats();
    
    // 播放音效
    this.playSound('start');
  }

  /**
   * 渲染棋盘
   */
  renderBoard() {
    const boardElement = document.getElementById('sudoku-board');
    boardElement.innerHTML = '';
    
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = row;
        cell.dataset.col = col;
        
        // 添加宫格边框样式
        if (col % 3 === 0 && col !== 0) cell.classList.add('border-left');
        if (row % 3 === 0 && row !== 0) cell.classList.add('border-top');
        
        const value = this.playerBoard[row][col];
        
        if (value !== 0) {
          cell.textContent = value;
          
          // 区分初始数字和玩家填入的数字
          if (this.currentPuzzle[row][col] !== 0) {
            cell.classList.add('initial');
          } else {
            cell.classList.add('user-input');
          }
        }
        
        // 绑定点击事件
        cell.addEventListener('click', () => this.selectCell(row, col));
        
        boardElement.appendChild(cell);
      }
    }
  }

  /**
   * 选中单元格
   */
  selectCell(row, col) {
    // 不能选中初始数字
    if (this.currentPuzzle[row][col] !== 0) {
      return;
    }
    
    this.selectedCell = { row, col };
    this.highlightCell();
  }

  /**
   * 高亮选中的单元格
   */
  highlightCell() {
    // 清除之前的高亮
    document.querySelectorAll('.cell').forEach(cell => {
      cell.classList.remove('selected', 'highlight');
    });
    
    if (!this.selectedCell) return;
    
    const { row, col } = this.selectedCell;
    const cells = document.querySelectorAll('.cell');
    
    cells.forEach(cell => {
      const r = parseInt(cell.dataset.row);
      const c = parseInt(cell.dataset.col);
      
      // 高亮选中的单元格
      if (r === row && c === col) {
        cell.classList.add('selected');
      }
      
      // 高亮同行、同列、同宫格
      if (r === row || c === col || 
          (Math.floor(r / 3) === Math.floor(row / 3) && 
           Math.floor(c / 3) === Math.floor(col / 3))) {
        cell.classList.add('highlight');
      }
    });
  }

  /**
   * 填入数字
   */
  inputNumber(num) {
    if (!this.selectedCell || this.gameCompleted) return;
    
    const { row, col } = this.selectedCell;
    
    // 保存历史记录（用于撤销）
    this.history.push({
      row,
      col,
      oldValue: this.playerBoard[row][col]
    });
    
    this.playerBoard[row][col] = num;
    this.saveGameState();
    this.renderBoard();
    
    // 检查是否完成
    if (this.checkCompletion()) {
      this.onGameComplete();
    }
    
    this.playSound('input');
  }

  /**
   * 撤销操作
   */
  undo() {
    if (this.history.length === 0) return;
    
    const last = this.history.pop();
    this.playerBoard[last.row][last.col] = last.oldValue;
    
    this.saveGameState();
    this.renderBoard();
    this.playSound('undo');
  }

  /**
   * 清除选中单元格
   */
  erase() {
    if (!this.selectedCell) return;
    this.inputNumber(0);
  }

  /**
   * 使用提示
   */
  useHint() {
    if (this.hints <= 0 || !this.selectedCell || this.gameCompleted) {
      alert('提示次数已用完！');
      return;
    }
    
    const { row, col } = this.selectedCell;
    
    // 如果选中的是初始数字，不能提示
    if (this.currentPuzzle[row][col] !== 0) {
      alert('这是题目给出的数字，不需要提示');
      return;
    }
    
    this.hints--;
    this.inputNumber(this.currentSolution[row][col]);
    this.updateStats();
    this.playSound('hint');
  }

  /**
   * 检查错误
   */
  checkErrors() {
    let hasError = false;
    const cells = document.querySelectorAll('.cell');
    
    cells.forEach(cell => {
      cell.classList.remove('error');
      
      const row = parseInt(cell.dataset.row);
      const col = parseInt(cell.dataset.col);
      const value = this.playerBoard[row][col];
      
      if (value !== 0 && value !== this.currentSolution[row][col]) {
        cell.classList.add('error');
        hasError = true;
      }
    });
    
    if (hasError) {
      this.errors++;
      this.updateStats();
      this.playSound('error');
      alert('发现错误！标红的格子需要修改');
    } else {
      alert('目前没有错误，继续加油！');
    }
  }

  /**
   * 检查是否完成游戏
   */
  checkCompletion() {
    // 检查是否所有格子都填满
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (this.playerBoard[i][j] === 0) return false;
      }
    }
    
    // 检查答案是否正确
    return this.generator.validateSolution(JSON.parse(JSON.stringify(this.playerBoard)));
  }

  /**
   * 游戏完成回调
   */
  onGameComplete() {
    this.gameCompleted = true;
    this.stopTimer();
    
    const timeSpent = this.formatTime(Math.floor((Date.now() - this.startTime) / 1000));
    
    // 更新统计
    this.updateGameStats();
    
    // 显示完成动画和弹窗
    setTimeout(() => {
      this.playSound('complete');
      this.showCompletionModal(timeSpent);
    }, 300);
  }

  /**
   * 显示完成弹窗
   */
  showCompletionModal(time) {
    const modal = document.getElementById('completion-modal');
    const difficultyNames = {
      'easy': '入门',
      'medium': '简单',
      'hard': '中等',
      'expert': '困难',
      'master': '专家'
    };
    
    document.getElementById('modal-time').textContent = time;
    document.getElementById('modal-difficulty').textContent = difficultyNames[this.difficulty];
    document.getElementById('modal-hints').textContent = 3 - this.hints;
    document.getElementById('modal-errors').textContent = this.errors;
    
    modal.classList.add('show');
  }

  /**
   * 计时器
   */
  startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      document.getElementById('timer').textContent = this.formatTime(elapsed);
    }, 1000);
  }

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  /**
   * 更新统计信息
   */
  updateStats() {
    document.getElementById('difficulty-display').textContent = this.getDifficultyName();
    document.getElementById('hints-count').textContent = this.hints;
  }

  getDifficultyName() {
    const names = {
      'easy': '入门',
      'medium': '简单',
      'hard': '中等',
      'expert': '困难',
      'master': '专家'
    };
    return names[this.difficulty] || '简单';
  }

  /**
   * 保存游戏状态到localStorage
   */
  saveGameState() {
    const state = {
      currentPuzzle: this.currentPuzzle,
      currentSolution: this.currentSolution,
      playerBoard: this.playerBoard,
      difficulty: this.difficulty,
      startTime: this.startTime,
      hints: this.hints,
      errors: this.errors
    };
    
    localStorage.setItem('sudoku-game-state', JSON.stringify(state));
  }

  /**
   * 从localStorage加载游戏状态
   */
  loadGameState() {
    const saved = localStorage.getItem('sudoku-game-state');
    if (saved) {
      const state = JSON.parse(saved);
      this.currentPuzzle = state.currentPuzzle;
      this.currentSolution = state.currentSolution;
      this.playerBoard = state.playerBoard;
      this.difficulty = state.difficulty;
      this.startTime = state.startTime;
      this.hints = state.hints;
      this.errors = state.errors;
    }
  }

  /**
   * 更新游戏统计（完成次数、最佳时间等）
   */
  updateGameStats() {
    let stats = JSON.parse(localStorage.getItem('sudoku-stats') || '{}');
    
    if (!stats[this.difficulty]) {
      stats[this.difficulty] = {
        completed: 0,
        bestTime: Infinity,
        totalTime: 0
      };
    }
    
    const timeSpent = Math.floor((Date.now() - this.startTime) / 1000);
    stats[this.difficulty].completed++;
    stats[this.difficulty].totalTime += timeSpent;
    
    if (timeSpent < stats[this.difficulty].bestTime) {
      stats[this.difficulty].bestTime = timeSpent;
    }
    
    localStorage.setItem('sudoku-stats', JSON.stringify(stats));
  }

  /**
   * 播放音效
   */
  playSound(type) {
    // 简单实现：使用Web Audio API生成音效
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    const sounds = {
      'input': { freq: 800, duration: 0.05 },
      'hint': { freq: 600, duration: 0.1 },
      'error': { freq: 200, duration: 0.15 },
      'undo': { freq: 500, duration: 0.05 },
      'start': { freq: 1000, duration: 0.1 },
      'complete': { freq: 1200, duration: 0.3 }
    };
    
    const sound = sounds[type] || sounds.input;
    
    oscillator.frequency.value = sound.freq;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + sound.duration);
  }

  /**
   * 绑定键盘和按钮事件
   */
  bindEvents() {
    // 数字按钮
    for (let i = 1; i <= 9; i++) {
      document.getElementById(`btn-${i}`).addEventListener('click', () => {
        this.inputNumber(i);
      });
    }
    
    // 功能按钮
    document.getElementById('btn-undo').addEventListener('click', () => this.undo());
    document.getElementById('btn-erase').addEventListener('click', () => this.erase());
    document.getElementById('btn-hint').addEventListener('click', () => this.useHint());
    document.getElementById('btn-check').addEventListener('click', () => this.checkErrors());
    
    // 键盘输入
    document.addEventListener('keydown', (e) => {
      if (e.key >= '1' && e.key <= '9') {
        this.inputNumber(parseInt(e.key));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        this.erase();
      } else if (e.key === 'z' && e.ctrlKey) {
        this.undo();
      }
    });
    
    // 难度选择
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const difficulty = e.target.dataset.difficulty;
        this.startNewGame(difficulty);
        document.getElementById('main-menu').classList.remove('show');
      });
    });
    
    // 菜单按钮
    document.getElementById('btn-menu').addEventListener('click', () => {
      document.getElementById('main-menu').classList.add('show');
    });
    
    // 新游戏按钮
    document.getElementById('btn-new-game').addEventListener('click', () => {
      if (confirm('确定要开始新游戏吗？当前进度将丢失。')) {
        this.startNewGame(this.difficulty);
      }
    });
    
    // 关闭弹窗
    document.querySelectorAll('.close-modal').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.target.closest('.modal').classList.remove('show');
      });
    });
    
    // 完成后再来一局
    document.getElementById('btn-play-again').addEventListener('click', () => {
      document.getElementById('completion-modal').classList.remove('show');
      this.startNewGame(this.difficulty);
    });
  }
}

// 页面加载完成后初始化游戏
if (typeof window !== 'undefined') {
  window.SudokuGame = SudokuGame;
}
