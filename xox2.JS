// ====== عناصر الواجهة ======
const board = document.querySelectorAll(".cell");
const status = document.getElementById("status");
const restartBtn = document.getElementById("restart");
const modeSelect = document.getElementById("mode");

// عناصر لوحة الإنتاج
const totalRoundsEl = document.getElementById("totalRounds");
const winsXEl = document.getElementById("winsX");
const winsOEl = document.getElementById("winsO");
const drawsEl = document.getElementById("draws");

// ====== حالة اللعبة ======
let turn = "X";
let gameOver = false;

// إحصائيات الجلسة (مع حفظ اختياري في LocalStorage)
const STORAGE_KEY = "xo-pro-stats";
let stats = loadStats(); // { total: 0, X: 0, O: 0, D: 0 }
updateProductionBoard();

// ====== أدوات مساعدة ======
function clearWinStyles() {
  board.forEach(c => c.classList.remove("win"));
}

function getBoardArray() {
  return [...board].map(c => c.textContent || null);
}

function emptyIndices(arr) {
  return arr.map((v,i)=> v?null:i).filter(v=>v!==null);
}

function checkWinnerArray(arr) {
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  for (const [a,b,c] of wins) {
    if (arr[a] && arr[a] === arr[b] && arr[a] === arr[c]) {
      return { winner: arr[a], line: [a,b,c] };
    }
  }
  if (arr.every(Boolean)) return { winner: "D", line: [] };
  return null;
}

function applyWinStyles(line) {
  line.forEach(i => board[i].classList.add("win"));
}

function playAt(idx, mark) {
  const cell = board[idx];
  if (!cell || cell.textContent) return false;
  cell.textContent = mark;
  cell.classList.add("played");
  return true;
}

// ====== ذكاء اصطناعي — سهل ======
function aiEasyMove(arr) {
  const empties = emptyIndices(arr);
  return empties[Math.floor(Math.random() * empties.length)];
}

// ====== ذكاء اصطناعي — صعب (Minimax مبسّط) ======
function aiHardMove(arr, aiMark="O", humanMark="X") {
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  function score(b) {
    for (const [a,b2,c] of wins) {
      if (b[a] && b[a] === b[b2] && b[a] === b[c]) {
        return b[a] === aiMark ? 10 : -10;
      }
    }
    return 0;
  }
  function isFull(b){ return b.every(Boolean); }

  function minimax(b, isMax, depth=0) {
    const s = score(b);
    if (s !== 0) return s - depth; // تفضيل الفوز المبكر
    if (isFull(b)) return 0;

    const mark = isMax ? aiMark : humanMark;
    let best = isMax ? -Infinity : Infinity;

    for (let i=0;i<9;i++){
      if (!b[i]) {
        b[i] = mark;
        const val = minimax(b, !isMax, depth+1);
        b[i] = null;
        best = isMax ? Math.max(best, val) : Math.min(best, val);
      }
    }
    return best;
  }

  let move = -1, bestVal = -Infinity;
  for (let i=0;i<9;i++){
    if (!arr[i]) {
      arr[i] = aiMark;
      const val = minimax(arr, false, 0);
      arr[i] = null;
      if (val > bestVal) { bestVal = val; move = i; }
    }
  }
  return move;
}

// ====== تدفق النقر للاعب ======
board.forEach(cell => {
  cell.addEventListener("click", () => {
    if (cell.textContent || gameOver) return;

    // حركة اللاعب الحالي
    cell.textContent = turn;

    const arr = getBoardArray();
    const res = checkWinnerArray(arr);
    if (res) return endIfResult(res);

    // تبديل الدور
    turn = turn === "X" ? "O" : "X";
    status.textContent = `الدور الحالي: ${turn}`;

    // إن كان الوضع ضد الكمبيوتر ودور O
    const mode = modeSelect.value;
    if (!gameOver && (mode === "ai-easy" || mode === "ai-hard") && turn === "O") {
      const arr2 = getBoardArray();
      const aiIdx = mode === "ai-easy" ? aiEasyMove(arr2) : aiHardMove(arr2, "O", "X");

      // تأخير بسيط لإحساس طبيعي
      setTimeout(() => {
        playAt(aiIdx, "O");
        const arr3 = getBoardArray();
        const res2 = checkWinnerArray(arr3);
        if (res2) return endIfResult(res2);

        turn = "X";
        status.textContent = `الدور الحالي: ${turn}`;
      }, 220);
    }
  });
});

// ====== إنهاء الجولة عند نتيجة ======
function endIfResult(res) {
  if (res.winner === "D") {
    status.textContent = "تعادل!";
    stats.total++;
    stats.D++;
    persistStats();
    updateProductionBoard();
    gameOver = true;
    return true;
  }
  if (res.winner) {
    status.textContent = `الفائز هو: ${res.winner}`;
    applyWinStyles(res.line);
    stats.total++;
    stats[res.winner]++;
    persistStats();
    updateProductionBoard();
    gameOver = true;
    return true;
  }
  return false;
}

// ====== إعادة اللعب ======
restartBtn.addEventListener("click", () => {
  board.forEach(c => { c.textContent = ""; c.classList.remove("win","played"); });
  status.textContent = "الدور الحالي: X";
  turn = "X";
  gameOver = false;
  clearWinStyles();
});

// تغيير الوضع يعيد الجولة تلقائيًا
modeSelect.addEventListener("change", () => {
  restartBtn.click();
});

// ====== لوحة الإنتاج (تحديث + تخزين) ======
function updateProductionBoard() {
  totalRoundsEl.textContent = stats.total;
  winsXEl.textContent = stats.X;
  winsOEl.textContent = stats.O;
  drawsEl.textContent = stats.D;
}

function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { total: 0, X: 0, O: 0, D: 0 };
  } catch {
    return { total: 0, X: 0, O: 0, D: 0 };
  }
}

function persistStats() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // في حال منع التخزين، نتجاهل بهدوء
  }
}