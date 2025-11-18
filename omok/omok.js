/* ---------------------------------------------------------
   PART 1 — 기본 보드 / 렌주 금수 / 기초 도우미
--------------------------------------------------------- */

const SIZE = 15;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

let board = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
let currentPlayer = BLACK;
let humanColor = BLACK;
let aiColor = WHITE;
let gameOver = false;
let lastMove = null;

/* 유틸 */
function cloneBoard(src) {
    return src.map(row => row.slice());
}

function isIn(x, y) {
    return x >= 0 && y >= 0 && x < SIZE && y < SIZE;
}

/* -------------------------
   5목 / 장목 체크
------------------------- */
function countDirection(bd, x, y, dx, dy, color) {
    let count = 1;
    let nx = x + dx, ny = y + dy;

    while (isIn(nx, ny) && bd[ny][nx] === color) {
        count++;
        nx += dx; ny += dy;
    }

    nx = x - dx; ny = y - dy;
    while (isIn(nx, ny) && bd[ny][nx] === color) {
        count++;
        nx -= dx; ny -= dy;
    }
    return count;
}

function isOverline(bd, x, y) {
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    for (const [dx,dy] of dirs) {
        const c = countDirection(bd, x, y, dx, dy, BLACK);
        if (c >= 6) return true; // 장목 금지
    }
    return false;
}

/* -------------------------
   열린3, 열린4 체크
------------------------- */
function countOpenFour(bd, x, y) {
    let count = 0;
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];

    for (const [dx,dy] of dirs) {
        let line = "";
        for (let k= -4; k <= 4; k++) {
            const nx = x + dx*k, ny = y + dy*k;
            if (!isIn(nx,ny)) line += "3";
            else line += (bd[ny][nx] === BLACK) ? "1" : (bd[ny][nx] === EMPTY ? "0" : "2");
        }
        if (line.includes("011110")) count++;  // 열린4
    }
    return count;
}

function countOpenThree(bd, x, y) {
    let count = 0;
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];

    for (const [dx,dy] of dirs) {
        let line = "";
        for (let k= -4; k <= 4; k++) {
            const nx = x + dx*k, ny = y + dy*k;
            if (!isIn(nx,ny)) line += "3";
            else line += (bd[ny][nx] === BLACK) ? "1" : (bd[ny][nx] === EMPTY ? "0" : "2");
        }
        if (line.includes("01110")) count++;  // 열린3
    }
    return count;
}

/* ---------------------------------------------------------
   렌주 금수(흑만)
--------------------------------------------------------- */
function isForbidden(bd, x, y) {
    if (bd[y][x] !== EMPTY) return true;

    bd[y][x] = BLACK;
    const over = isOverline(bd, x, y);
    const three = countOpenThree(bd, x, y) >= 2;
    const four  = countOpenFour(bd, x, y) >= 2;
    bd[y][x] = EMPTY;

    return over || three || four;
}

/* ---------------------------------------------------------
   PART 2 — 평가 함수
--------------------------------------------------------- */

const SCORE = {
    FIVE: 10000000,
    OPEN_FOUR: 500000,
    FOUR: 50000,
    OPEN_THREE: 10000,
    THREE: 3000,
    TWO: 500,
    ONE: 50
};

function evaluateLine(arr, color) {
    const me = color;
    let score = 0;
    const line = arr.join("");

    if (line.includes(`${me}${me}${me}${me}${me}`)) score += SCORE.FIVE;
    if (line.includes(`0${me}${me}${me}${me}0`)) score += SCORE.OPEN_FOUR;
    if (line.includes(`${me}${me}${me}${me}0`) || line.includes(`0${me}${me}${me}${me}`)) score += SCORE.FOUR;
    if (line.includes(`0${me}${me}${me}0`)) score += SCORE.OPEN_THREE;
    if (line.includes(`${me}${me}${me}`)) score += SCORE.THREE;
    if (line.includes(`${me}${me}`)) score += SCORE.TWO;
    if (line.includes(`${me}`)) score += SCORE.ONE;

    return score;
}

function evaluateBoard(bd, color) {
    let total = 0;
    const opp = color === BLACK ? WHITE : BLACK;
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];

    for (let y=0; y<SIZE; y++) {
        for (let x=0; x<SIZE; x++) {
            for (const [dx,dy] of dirs) {
                const arr = [];
                for (let k=-4; k<=4; k++) {
                    const nx = x + dx*k, ny = y + dy*k;
                    arr.push(isIn(nx,ny) ? bd[ny][nx] : 3);
                }
                total += evaluateLine(arr, color);
                total -= evaluateLine(arr, opp) * 0.9;
            }
        }
    }
    return total;
}

/* ---------------------------------------------------------
   PART 3 — Minimax + AlphaBeta + 후보수 생성
--------------------------------------------------------- */

function generateMoves(bd, color) {
    const moves = [];

    for (let y=0; y<SIZE; y++) {
        for (let x=0; x<SIZE; x++) {
            if (bd[y][x] !== EMPTY) continue;

            let near = false;
            for (let dy=-2; dy<=2; dy++) {
                for (let dx=-2; dx<=2; dx++) {
                    const nx=x+dx, ny=y+dy;
                    if (isIn(nx,ny) && bd[ny][nx] !== EMPTY)
                        near = true;
                }
            }
            if (!near) continue;

            if (color === BLACK && isForbidden(bd, x, y)) continue;

            moves.push({x,y});
        }
    }

    moves.sort((a,b)=> (Math.abs(a.x-7)+Math.abs(a.y-7)) - (Math.abs(b.x-7)+Math.abs(b.y-7)));
    return moves;
}

function minimax(bd, depth, alpha, beta, maximizing, color) {
    if (depth === 0) return evaluateBoard(bd, BLACK);

    const me = maximizing ? color : (color===BLACK ? WHITE : BLACK);
    const moves = generateMoves(bd, me);

    if (moves.length === 0) return evaluateBoard(bd, BLACK);

    if (maximizing) {
        let maxEval = -Infinity;
        for (const mv of moves) {
            bd[mv.y][mv.x] = me;
            const eval = minimax(bd, depth-1, alpha, beta, false, color);
            bd[mv.y][mv.x] = EMPTY;

            if (eval > maxEval) maxEval = eval;
            if (eval > alpha) alpha = eval;
            if (beta <= alpha) break;
        }
        return maxEval;

    } else {
        let minEval = Infinity;
        for (const mv of moves) {
            bd[mv.y][mv.x] = me;
            const eval = minimax(bd, depth-1, alpha, beta, true, color);
            bd[mv.y][mv.x] = EMPTY;

            if (eval < minEval) minEval = eval;
            if (eval < beta) beta = eval;
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

function aiMove(color, depth = 3) {
    const moves = generateMoves(board, color);

    let bestScore = -Infinity;
    let bestMove = null;

    for (const mv of moves) {
        board[mv.y][mv.x] = color;
        const score = minimax(board, depth, -Infinity, Infinity, false, color);
        board[mv.y][mv.x] = EMPTY;

        if (score > bestScore) {
            bestScore = score;
            bestMove = mv;
        }
    }
    return bestMove;
}

/* ---------------------------------------------------------
   PART 4 — 게임 엔진 (UI 연결)
--------------------------------------------------------- */

function putStone(x, y, color) {
    board[y][x] = color;
    lastMove = {x,y};
    renderBoard();
}

function checkWin(x, y, color) {
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    for (const [dx,dy] of dirs) {
        let c = countDirection(board, x, y, dx, dy, color);
        if (c >= 5) return true;
    }
    return false;
}

function renderBoard() {
    const tbl = document.getElementById("board");

    for (let y=0; y<SIZE; y++) {
        for (let x=0; x<SIZE; x++) {
            const td = tbl.rows[y].cells[x];
            td.innerHTML = "";
            td.classList.remove("last-move");

            const v = board[y][x];
            if (v === BLACK) {
                const s = document.createElement("div");
                s.className = "stone black";
                td.appendChild(s);
            } else if (v === WHITE) {
                const s = document.createElement("div");
                s.className = "stone white";
                td.appendChild(s);
            } else if (currentPlayer === BLACK && isForbidden(board, x, y)) {
                td.textContent = "B";
            }
        }
    }

    if (lastMove) {
        tbl.rows[lastMove.y].cells[lastMove.x].classList.add("last-move");
    }
}

function handleClick(x, y) {
    if (gameOver) return;
    if (currentPlayer !== humanColor) return;
    if (board[y][x] !== EMPTY) return;

    if (humanColor === BLACK && isForbidden(board, x, y)) return;

    putStone(x, y, humanColor);

    if (checkWin(x, y, humanColor)) {
        gameOver = true;
        document.getElementById("statusText").textContent = "사람 승리!";
        return;
    }

    currentPlayer = aiColor;
    document.getElementById("statusText").textContent = "AI 생각 중...";

    setTimeout(() => {
        const mv = aiMove(aiColor, 2); // 깊이2로 설정(속도/강함 밸런스)
        if (!mv) return;

        putStone(mv.x, mv.y, aiColor);

        if (checkWin(mv.x, mv.y, aiColor)) {
            gameOver = true;
            document.getElementById("statusText").textContent = "AI 승리!";
            return;
        }

        currentPlayer = humanColor;
        document.getElementById("statusText").textContent = "당신 차례입니다.";
    }, 50);
}

function initGame() {
    board = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
    lastMove = null;
    gameOver = false;

    const first = document.querySelector("input[name='firstPlayer']:checked").value;
    currentPlayer = BLACK;

    if (first === "ai-black") {
        humanColor = WHITE;
        aiColor = BLACK;
        currentPlayer = BLACK;
    } else {
        humanColor = BLACK;
        aiColor = WHITE;
        currentPlayer = BLACK;
    }

    const tbl = document.getElementById("board");
    tbl.innerHTML = "";

    for (let y=0; y<SIZE; y++) {
        const tr = document.createElement("tr");
        for (let x=0; x<SIZE; x++) {
            const td = document.createElement("td");
            td.dataset.x = x;
            td.dataset.y = y;
            td.onclick = () => handleClick(x,y);
            tr.appendChild(td);
        }
        tbl.appendChild(tr);
    }

    renderBoard();
}

document.getElementById("resetBtn").onclick = initGame;
window.onload = initGame;
