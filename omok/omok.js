/* ============================================================
   오목 AI (렌주룰 + 하이브리드 + 미니맥스)
   난이도: normal(깊이2), hard(깊이3)
============================================================ */

const SIZE = 14;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

let board = [];
let humanColor = BLACK;
let aiColor = WHITE;
let turn = BLACK;
let gameOver = false;
let ghostStone;

let stoneSize = 44;

/* ============================================================
   보드 초기화
============================================================ */
function resetBoardUI() {
    const wrap = document.getElementById("boardWrapper");
    wrap.innerHTML = `
        <div id="board"></div>
        <div id="ghostStone"></div>
    `;
    ghostStone = document.getElementById("ghostStone");
}

function initBoard() {
    board = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
}

function createBoardUI() {
    const boardEl = document.getElementById("board");
    boardEl.innerHTML = "";

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            const p = document.createElement("div");
            p.className = "point";
            p.dataset.x = x;
            p.dataset.y = y;
            p.style.left = `${(x / 13) * 100}%`;
            p.style.top = `${(y / 13) * 100}%`;

            p.addEventListener("click", onHumanClick);
            p.addEventListener("mousemove", onHover);
            p.addEventListener("mouseleave", () => (ghostStone.style.opacity = 0));

            boardEl.appendChild(p);
        }
    }
}

function renderBoard() {
    const boardEl = document.getElementById("board");
    document.querySelectorAll(".stone, .ban").forEach(e => e.remove());

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            let v = board[y][x];

            if (turn === BLACK && v === EMPTY && isForbidden(board, x, y)) {
                const ban = document.createElement("div");
                ban.className = "ban";
                ban.style.left = `${(x / 13) * 100}%`;
                ban.style.top = `${(y / 13) * 100}%`;
                ban.textContent = "X";
                boardEl.appendChild(ban);
            }

            if (v === BLACK || v === WHITE) {
                const s = document.createElement("div");
                s.className = "stone " + (v === BLACK ? "black" : "white");
                s.style.left = `${(x / 13) * 100}%`;
                s.style.top = `${(y / 13) * 100}%`;
                boardEl.appendChild(s);
            }
        }
    }
}

/* ============================================================
   Hover Preview
============================================================ */
function onHover(e) {
    if (turn !== humanColor || gameOver) return;

    const x = +e.target.dataset.x;
    const y = +e.target.dataset.y;

    ghostStone.style.left = `${(x / 13) * 100}%`;
    ghostStone.style.top = `${(y / 13) * 100}%`;

    ghostStone.className = humanColor === BLACK ? "black" : "white";

    if (humanColor === BLACK && isForbidden(board, x, y)) {
        ghostStone.classList.add("forbidden");
    }

    ghostStone.style.opacity = 1;
}

/* ============================================================
   사람 착수
============================================================ */
function onHumanClick(e) {
    if (turn !== humanColor || gameOver) return;

    const x = +e.target.dataset.x;
    const y = +e.target.dataset.y;

    if (board[y][x] !== EMPTY) return;
    if (turn === BLACK && isForbidden(board, x, y)) {
        setStatus("⚠️ 금수 자리!");
        return;
    }

    placeStone(x, y, humanColor);

    if (checkWin(humanColor)) {
        gameOver = true;
        renderBoard();
        setStatus("🎉 당신 승리!");
        return;
    }

    turn = aiColor;
    ghostStone.style.opacity = 0;
    renderBoard();

    aiStartMove();
}

/* ============================================================
   돌 놓기
============================================================ */
function placeStone(x, y, color) {
    board[y][x] = color;
}

/* ============================================================
   게임 시작
============================================================ */
function startGame() {
    resetBoardUI();
    initBoard();
    createBoardUI();
    renderBoard();

    const first = document.querySelector("input[name=firstPlayer]:checked").value;
    humanColor = first === "human" ? BLACK : WHITE;
    aiColor = humanColor === BLACK ? WHITE : BLACK;

    turn = BLACK;
    gameOver = false;

    setStatus("새 게임 시작!");

    if (first === "ai") aiStartMove();
}

/* ============================================================
   AI 시작
============================================================ */
async function aiStartMove() {
    if (gameOver) return;

    setStatus("AI 생각 중...");
    await new Promise(r => setTimeout(r, 60));

    if (isBoardEmpty()) {
        placeStone(7, 7, aiColor);
        turn = humanColor;
        renderBoard();
        return;
    }

    const mv = aiMoveHybrid();
    placeStone(mv.x, mv.y, aiColor);

    if (checkWin(aiColor)) {
        gameOver = true;
        renderBoard();
        setStatus("💀 AI 승리");
        return;
    }

    turn = humanColor;
    renderBoard();
    setStatus("당신 차례!");
}

/* ============================================================
   ❗ 최종 하이브리드 AI (즉승→즉패→강제수→딥서치)
============================================================ */
function aiMoveHybrid() {
    const me = aiColor;
    const opp = humanColor;

    // 1) 즉승
    let win = findWinningMove(me);
    if (win) return win;

    // 2) 즉패 방어
    let block = findWinningMove(opp);
    if (block) return block;

    // 3) 강제수
    let force = findBestForceMove(me);
    if (force) return force;

    let forceDef = findBestForceMove(opp);
    if (forceDef) return forceDef;

    // 4) 딥서치 (난이도별)
    const depth = getAIDepth(); // normal=2, hard=3
    const moves = generateCandidateMoves(me);

    let best = null;
    let bestVal = -Infinity;

    for (const mv of moves) {
        board[mv.y][mv.x] = me;

        const val = minimax(depth - 1, false, me, opp, -Infinity, Infinity);

        board[mv.y][mv.x] = EMPTY;

        if (val > bestVal) {
            bestVal = val;
            best = { x: mv.x, y: mv.y };
        }
    }

    return best ?? moves[0];
}

/* ============================================================
   난이도 설정
============================================================ */
function getAIDepth() {
    const diff = document.querySelector("input[name=difficulty]:checked")?.value;
    if (diff === "hard") return 3; // C 난이도
    return 2;                     // B 난이도
}

/* ============================================================
   후보수 생성
============================================================ */
function generateCandidateMoves(color) {
    let cand = [];

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            if (board[y][x] !== EMPTY) continue;
            if (!hasNearbyStone(x, y)) continue;
            if (color === BLACK && isForbidden(board, x, y)) continue;

            let score = 0;

            for (const [dx, dy] of [[1,0],[0,1],[1,1],[1,-1]]) {
                score += countSeq(board, x, y, dx, dy, color) ** 2;
                score += countSeq(board, x, y, dx, dy, humanColor) ** 2;
            }

            cand.push({ x, y, score });
        }
    }

    cand.sort((a,b) => b.score - a.score);
    return cand.slice(0, 10);
}

/* ============================================================
   미니맥스 + 알파베타
============================================================ */
function minimax(depth, maximizing, me, opp, alpha, beta) {
    if (depth === 0) 
        return evaluateBoardState(me, opp);

    const moves = generateCandidateMoves(maximizing ? me : opp);
    if (moves.length === 0) return 0;

    if (maximizing) {
        let maxVal = -Infinity;

        for (const mv of moves) {
            board[mv.y][mv.x] = me;

            if (checkWin(me)) {
                board[mv.y][mv.x] = EMPTY;
                return 99999999;
            }

            const val = minimax(depth - 1, false, me, opp, alpha, beta);
            board[mv.y][mv.x] = EMPTY;

            maxVal = Math.max(maxVal, val);
            alpha = Math.max(alpha, val);

            if (beta <= alpha) break;
        }

        return maxVal;
    }

    else {
        let minVal = Infinity;

        for (const mv of moves) {
            board[mv.y][mv.x] = opp;

            if (checkWin(opp)) {
                board[mv.y][mv.x] = EMPTY;
                return -99999999;
            }

            const val = minimax(depth - 1, true, me, opp, alpha, beta);
            board[mv.y][mv.x] = EMPTY;

            minVal = Math.min(minVal, val);
            beta = Math.min(beta, val);

            if (beta <= alpha) break;
        }

        return minVal;
    }
}

/* ============================================================
   평가 함수
============================================================ */
function evaluateBoardState(me, opp) {
    let score = 0;
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            const v = board[y][x];

            if (v === me) {
                for (const [dx, dy] of dirs) {
                    let c = countSeq(board, x, y, dx, dy, me);
                    if (c >= 5) score += 10000000;
                    else if (c === 4) score += 60000;
                    else if (c === 3) score += 900;
                    else if (c === 2) score += 50;
                }
            }

            else if (v === opp) {
                for (const [dx, dy] of dirs) {
                    let c = countSeq(board, x, y, dx, dy, opp);
                    if (c >= 5) score -= 10000000;
                    else if (c === 4) score -= 70000;
                    else if (c === 3) score -= 1200;
                    else if (c === 2) score -= 60;
                }
            }

        }
    }

    return score;
}

/* ============================================================
   강제수
============================================================ */
function findBestForceMove(color) {
    let best = null;
    let bestScore = 0;
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];

    for (let y = 0; y < SIZE; y++)
        for (let x = 0; x < SIZE; x++) {

            if (board[y][x] !== EMPTY) continue;
            if (color === BLACK && isForbidden(board, x, y)) continue;

            let score = 0;

            for (const [dx, dy] of dirs) {
                let c = countSeq(board, x, y, dx, dy, color);
                if (c >= 4) score += 50000;
                else if (c === 3) score += 3000;
                else if (c === 2) score += 60;
            }

            if (score > bestScore) {
                bestScore = score;
                best = { x, y };
            }
        }

    return best;
}

/* ============================================================
   즉승 탐지 (정확 버전)
============================================================ */
function findWinningMove(color) {
    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            if (board[y][x] !== EMPTY) continue;
            if (color === BLACK && isForbidden(board, x, y)) continue;

            board[y][x] = color;
            let ok = checkWin(color);
            board[y][x] = EMPTY;

            if (ok) return { x, y };
        }
    }
    return null;
}

/* ============================================================
   체크 함수들
============================================================ */
function isBoardEmpty() {
    return board.every(row => row.every(v => v === EMPTY));
}

function hasNearbyStone(x, y) {
    for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE) continue;
            if (board[ny][nx] !== EMPTY) return true;
        }
    return false;
}

function isIn(x, y) {
    return x >= 0 && y >= 0 && x < SIZE && y < SIZE;
}

function countSeq(bd, x, y, dx, dy, color) {
    let cnt = 1;
    let nx = x + dx, ny = y + dy;

    while (isIn(nx, ny) && bd[ny][nx] === color) {
        cnt++; nx += dx; ny += dy;
    }

    nx = x - dx;
    ny = y - dy;

    while (isIn(nx, ny) && bd[ny][nx] === color) {
        cnt++; nx -= dx; ny -= dy;
    }

    return cnt;
}

function checkWin(color) {
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];

    for (let y = 0; y < SIZE; y++)
        for (let x = 0; x < SIZE; x++)
            if (board[y][x] === color)
                for (const [dx, dy] of dirs) {
                    if (countSeq(board, x, y, dx, dy, color) >= 5)
                        return true;
                }

    return false;
}

/* ============================================================
   렌주룰 금수
============================================================ */
function isForbidden(bd, x, y) {
    if (bd[y][x] !== EMPTY) return true;

    bd[y][x] = BLACK;

    const over6 =
        countSeq(bd, x, y, 1, 0, BLACK) >= 6 ||
        countSeq(bd, x, y, 0, 1, BLACK) >= 6 ||
        countSeq(bd, x, y, 1, 1, BLACK) >= 6 ||
        countSeq(bd, x, y, 1, -1, BLACK) >= 6;

    const open3 = countOpenThree(bd, x, y) >= 2;
    const open4 = countOpenFour(bd, x, y) >= 2;

    bd[y][x] = EMPTY;

    return over6 || open3 || open4;
}

function countPattern(bd, x, y, pattern) {
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    let cnt = 0;

    for (const [dx, dy] of dirs) {
        let line = "";

        for (let k = -4; k <= 4; k++) {
            const nx = x + dx * k;
            const ny = y + dy * k;

            if (!isIn(nx, ny)) line += "3";
            else line += (bd[ny][nx] === BLACK ? "1" : bd[ny][nx] === WHITE ? "2" : "0");
        }

        if (line.includes(pattern)) cnt++;
    }

    return cnt;
}

function countOpenThree(bd, x, y) {
    return countPattern(bd, x, y, "01110");
}

function countOpenFour(bd, x, y) {
    return countPattern(bd, x, y, "011110");
}

/* ============================================================
   상태 표시
============================================================ */
function setStatus(msg) {
    document.getElementById("statusBox").textContent = msg;
}

/* ============================================================
   실행
============================================================ */
window.onload = () => {
    document.getElementById("resetBtn").onclick = startGame;
    startGame();
};
