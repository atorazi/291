/* ============================================================
   ⚫ 오목 AI (렌주룰 + Threat-Based + 모바일 대응 + 교차점 정중앙)
============================================================ */

const SIZE = 15;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

let board = [];
let humanColor = BLACK;
let aiColor = WHITE;
let turn = BLACK;
let gameOver = false;

let ghostStone;

/* ============================================================
   초기 실행
============================================================ */
window.onload = () => {
    ghostStone = document.getElementById("ghostStone");
    document.getElementById("resetBtn").onclick = startGame;
    startGame();
};

/* ============================================================
   게임 시작
============================================================ */
function startGame() {
    initBoard();
    createBoardUI();
    renderBoard();

    const first = document.querySelector("input[name=firstPlayer]:checked").value;
    humanColor = (first === "human" ? BLACK : WHITE);
    aiColor    = (humanColor === BLACK ? WHITE : BLACK);

    turn = BLACK;
    gameOver = false;
    ghostStone.style.opacity = 0;
    setStatus("새 게임이 시작되었습니다.");

    if (first === "ai") aiStartMove();
}

/* ============================================================
   배열 초기화
============================================================ */
function initBoard() {
    board = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
}

/* ============================================================
   클릭 포인트 UI 생성 (교차점)
============================================================ */
function createBoardUI() {
    const boardEl = document.getElementById("board");
    boardEl.innerHTML = "";
    ghostStone.style.opacity = 0;

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            const p = document.createElement("div");
            p.className = "point";
            p.dataset.x = x;
            p.dataset.y = y;

            // CSS 변수로 좌표 전달
            p.style.setProperty("--x", x);
            p.style.setProperty("--y", y);

            p.addEventListener("click", onHumanClick);
            p.addEventListener("mousemove", onHover);
            p.addEventListener("mouseleave", () => ghostStone.style.opacity = 0);

            // 모바일 터치 대응
            p.addEventListener("touchstart", (e) => {
                e.preventDefault();
                onHover({ target: p });
            });
            p.addEventListener("touchend", (e) => {
                e.preventDefault();
                onHumanClick({ currentTarget: p });
            });

            boardEl.appendChild(p);
        }
    }
}

/* ============================================================
   렌더링 (돌 + 금수 + 좌표)
============================================================ */
function renderBoard() {
    const boardEl = document.getElementById("board");

    document.querySelectorAll(".stone").forEach(s => s.remove());
    document.querySelectorAll(".ban").forEach(b => b.remove());

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            const v = board[y][x];

            /* ------------ 금수 표시 -------------- */
            if (turn === BLACK && v === EMPTY && isForbidden(board, x, y)) {
                const b = document.createElement("div");
                b.className = "ban";
                b.textContent = "X";

                b.style.setProperty("--x", x);
                b.style.setProperty("--y", y);

                boardEl.appendChild(b);
            }

            /* ------------ 돌 렌더링 -------------- */
            if (v === BLACK || v === WHITE) {
                const s = document.createElement("div");
                s.className = "stone " + (v === BLACK ? "black" : "white");

                s.style.setProperty("--x", x);
                s.style.setProperty("--y", y);

                boardEl.appendChild(s);
            }
        }
    }
}

/* ============================================================
   Hover 투명 돌 표시 (ghostStone)
============================================================ */
function onHover(e) {
    if (gameOver) return;
    if (turn !== humanColor) return;

    const x = +e.target.dataset.x;
    const y = +e.target.dataset.y;

    ghostStone.style.opacity = 1;
    ghostStone.style.setProperty("--x", x);
    ghostStone.style.setProperty("--y", y);

    ghostStone.className = "";
    ghostStone.classList.add(humanColor === BLACK ? "black" : "white");

    if (humanColor === BLACK && isForbidden(board, x, y)) {
        ghostStone.classList.add("forbidden");
    }
}

/* ============================================================
   사용자 착수
============================================================ */
function onHumanClick(e) {
    if (gameOver) return;
    if (turn !== humanColor) return;

    const x = +e.currentTarget.dataset.x;
    const y = +e.currentTarget.dataset.y;

    if (board[y][x] !== EMPTY) return;

    if (turn === BLACK && isForbidden(board, x, y)) {
        setStatus("⚠ 금수 자리입니다!");
        return;
    }

    placeStone(x, y, humanColor);
    ghostStone.style.opacity = 0;

    if (checkWin(humanColor)) {
        setStatus("🎉 당신의 승리!");
        gameOver = true;
        renderBoard();
        return;
    }

    turn = aiColor;
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
   AI 착수
============================================================ */
async function aiStartMove() {
    if (gameOver) return;

    setStatus("AI 생각 중...");
    await new Promise(r => setTimeout(r, 70));

    const diff = document.querySelector("input[name=difficulty]:checked").value;
    let mv = (diff === "normal" ? aiMove_B() : aiMove_C());

    if (!mv) return;

    if (aiColor === BLACK && isForbidden(board, mv.x, mv.y)) {
        mv = findNonForbiddenMove();
        if (!mv) {
            setStatus("무승부!");
            return;
        }
    }

    placeStone(mv.x, mv.y, aiColor);

    if (checkWin(aiColor)) {
        setStatus("💀 AI 승리!");
        gameOver = true;
        renderBoard();
        return;
    }

    turn = humanColor;
    setStatus("당신 차례입니다.");
    renderBoard();
}

/* ============================================================
   금수 아닌 자리 찾기
============================================================ */
function findNonForbiddenMove() {
    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            if (board[y][x] === EMPTY && !isForbidden(board, x, y))
                return { x, y };
        }
    }
    return null;
}

/* ============================================================
   AI 로직 (기존 그대로 유지)
============================================================ */
function aiMove_B() {
    let w = findWinningMove(aiColor);
    if (w) return w;

    let b = findWinningMove(humanColor);
    if (b) return b;

    let f = findForceMove(aiColor);
    if (f) return f;

    let fb = findForceMove(humanColor);
    if (fb) return fb;

    return chooseStrategicMove(false);
}

function aiMove_C() {
    let w = findWinningMove(aiColor);
    if (w) return w;

    let b = findWinningMove(humanColor);
    if (b) return b;

    let d = findDoubleThreat(aiColor);
    if (d) return d;

    let db = findDoubleThreat(humanColor);
    if (db) return db;

    let f = findForceMove(aiColor);
    if (f) return f;

    let fb = findForceMove(humanColor);
    if (fb) return fb;

    return chooseStrategicMove(true);
}

/* ============================================================
   즉승 수
============================================================ */
function findWinningMove(color) {
    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            if (board[y][x] !== EMPTY) continue;
            if (color === BLACK && isForbidden(board, x, y)) continue;

            board[y][x] = color;
            let win = checkWin(color);
            board[y][x] = EMPTY;

            if (win) return { x, y };
        }
    }
    return null;
}

/* ============================================================
   강제 4
============================================================ */
function findForceMove(color) {
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    let best = null, bestScore = 0;

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            if (board[y][x] !== EMPTY) continue;
            if (color === BLACK && isForbidden(board, x, y)) continue;

            let score = 0;
            for (const [dx, dy] of dirs) {
                let c = countSeq(board, x, y, dx, dy, color);
                if (c === 4) score += 100000;
                else if (c === 3) score += 800;
            }

            if (score > bestScore) {
                bestScore = score;
                best = { x, y };
            }
        }
    }
    return best;
}

/* ============================================================
   더블 쓰레트
============================================================ */
function findDoubleThreat(color) {
    let bestMove = null, bestCnt = 0;

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            if (board[y][x] !== EMPTY) continue;
            if (color === BLACK && isForbidden(board, x, y)) continue;

            board[y][x] = color;
            let f = findForceMove(color);
            let cnt = f ? 1 : 0;
            board[y][x] = EMPTY;

            if (cnt > bestCnt) {
                bestCnt = cnt;
                bestMove = { x, y };
            }
        }
    }
    return bestMove;
}

/* ============================================================
   전략적 위치 선택
============================================================ */
function chooseStrategicMove(hardMode) {
    let best = null;
    let bestScore = -Infinity;

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            if (board[y][x] !== EMPTY) continue;
            if (aiColor === BLACK && isForbidden(board, x, y)) continue;

            let score = 0;

            const dist = Math.abs(x - 7) + Math.abs(y - 7);
            score += (hardMode ? 30 : 18) - dist;

            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    let nx = x + dx, ny = y + dy;
                    if (!isIn(nx, ny)) continue;

                    if (board[ny][nx] === aiColor) score += (hardMode ? 14 : 10);
                    if (board[ny][nx] === humanColor) score += (hardMode ? 11 : 7);
                }
            }

            if (score > bestScore) {
                bestScore = score;
                best = { x, y };
            }
        }
    }
    return best;
}

/* ============================================================
   승리 판정
============================================================ */
function checkWin(color) {
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            if (board[y][x] !== color) continue;

            for (const [dx, dy] of dirs) {
                let c = 1;

                let nx = x + dx, ny = y + dy;
                while (isIn(nx, ny) && board[ny][nx] === color) {
                    c++; nx += dx; ny += dy;
                }

                nx = x - dx; ny = y - dy;
                while (isIn(nx, ny) && board[ny][nx] === color) {
                    c++; nx -= dx; ny -= dy;
                }

                if (c >= 5) return true;
            }
        }
    }
    return false;
}

/* ============================================================
   렌주룰 금수 체크
============================================================ */
function isForbidden(bd, x, y) {
    if (bd[y][x] !== EMPTY) return true;

    bd[y][x] = BLACK;

    const over  = isOverline(bd, x, y);
    const open3 = countOpenThree(bd, x, y) >= 2;
    const open4 = countOpenFour(bd, x, y) >= 2;

    bd[y][x] = EMPTY;

    return over || open3 || open4;
}

function isOverline(bd, x, y) {
    return (
        countSeq(bd, x, y, 1, 0, BLACK) >= 6 ||
        countSeq(bd, x, y, 0, 1, BLACK) >= 6 ||
        countSeq(bd, x, y, 1, 1, BLACK) >= 6 ||
        countSeq(bd, x, y, 1, -1, BLACK) >= 6
    );
}

function countSeq(bd, x, y, dx, dy, color) {
    let cnt = 1;

    let nx = x + dx, ny = y + dy;
    while (isIn(nx, ny) && bd[ny][nx] === color) {
        cnt++; nx += dx; ny += dy;
    }

    nx = x - dx; ny = y - dy;
    while (isIn(nx, ny) && bd[ny][nx] === color) {
        cnt++; nx -= dx; ny -= dy;
    }

    return cnt;
}

function countPattern(bd, x, y, pat) {
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    let cnt = 0;

    for (const [dx, dy] of dirs) {
        let line = "";
        for (let k = -4; k <= 4; k++) {
            let nx = x + dx * k;
            let ny = y + dy * k;

            if (!isIn(nx, ny)) line += "3";
            else line += (bd[ny][nx] === BLACK ? "1" :
                          bd[ny][nx] === WHITE ? "2" : "0");
        }

        if (line.includes(pat)) cnt++;
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
   범위 체크
============================================================ */
function isIn(x, y) {
    return (x >= 0 && y >= 0 && x < SIZE && y < SIZE);
}

/* ============================================================
   상태 메시지
============================================================ */
function setStatus(msg) {
    document.getElementById("statusBox").textContent = msg;
}
