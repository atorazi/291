/* ============================================================
   오목 AI (렌주룰 + Threat-Based)
   - 교차점 정확 배치
   - hover 투명돌 표시
   - 난이도 C 오류 수정
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

let ghostStone; // hover 투명돌

/* ============================================================
   보드 UI 초기화
============================================================ */
function resetBoardUI() {
    const wrap = document.getElementById("boardWrapper");
    wrap.innerHTML = `
        <div id="board"></div>
        <div id="ghostStone"></div>
    `;
    ghostStone = document.getElementById("ghostStone");
}

/* ============================================================
   데이터 초기화
============================================================ */
function initBoard() {
    board = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
}

/* ============================================================
   클릭 포인트 UI 생성
============================================================ */
function createBoardUI() {
    const boardEl = document.getElementById("board");
    boardEl.innerHTML = "";

    const cellPercent = 100 / SIZE;

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            const p = document.createElement("div");
            p.className = "point";
            p.dataset.x = x;
            p.dataset.y = y;

            // 교차점 정 중앙 배치
            p.style.left = `${(x + 0.5) * cellPercent}%`;
            p.style.top  = `${(y + 0.5) * cellPercent}%`;

            // 이벤트
            p.addEventListener("click", onHumanClick);
            p.addEventListener("mousemove", onHover);
            p.addEventListener("mouseleave", () => ghostStone.style.opacity = 0);

            boardEl.appendChild(p);
        }
    }
}

/* ============================================================
   보드 렌더링
============================================================ */
function renderBoard() {
    const boardEl = document.getElementById("board");

    document.querySelectorAll(".stone").forEach(e => e.remove());
    document.querySelectorAll(".ban").forEach(e => e.remove());

    const cellPercent = 100 / SIZE;

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            const v = board[y][x];

            /* 금수 표시 */
            if (turn === BLACK && v === EMPTY && isForbidden(board, x, y)) {
                const b = document.createElement("div");
                b.className = "ban";
                b.style.left = `${(x + 0.5) * cellPercent}%`;
                b.style.top  = `${(y + 0.5) * cellPercent}%`;
                b.textContent = "X";
                boardEl.appendChild(b);
            }

            /* 돌 표시 */
            if (v === BLACK || v === WHITE) {
                const s = document.createElement("div");
                s.className = "stone " + (v === BLACK ? "black" : "white");
                s.style.left = `${(x + 0.5) * cellPercent}%`;
                s.style.top  = `${(y + 0.5) * cellPercent}%`;
                boardEl.appendChild(s);
            }
        }
    }
}

/* ============================================================
   hover 미리보기 돌
============================================================ */
function onHover(e) {
    if (gameOver) return;
    if (turn !== humanColor) return;

    const x = +e.target.dataset.x;
    const y = +e.target.dataset.y;

    const cellPercent = 100 / SIZE;

    ghostStone.style.left = `${(x + 0.5) * cellPercent}%`;
    ghostStone.style.top  = `${(y + 0.5) * cellPercent}%`;

    ghostStone.className = "";
    ghostStone.classList.add(humanColor === BLACK ? "black" : "white");

    if (humanColor === BLACK && isForbidden(board, x, y)) {
        ghostStone.classList.add("forbidden");
    }

    ghostStone.style.opacity = 1;
}

/* ============================================================
   사람 착수
============================================================ */
function onHumanClick(e) {
    if (gameOver) return;
    if (turn !== humanColor) return;

    const x = +e.target.dataset.x;
    const y = +e.target.dataset.y;

    if (board[y][x] !== EMPTY) return;

    if (turn === BLACK && isForbidden(board, x, y)) {
        setStatus("⚠ 금수 자리입니다!");
        return;
    }

    placeStone(x, y, humanColor);

    if (checkWin(humanColor)) {
        setStatus("🎉 당신의 승리!");
        gameOver = true;
        renderBoard();
        return;
    }

    turn = aiColor;
    ghostStone.style.opacity = 0;
    renderBoard();
    aiStartMove();
}

/* ============================================================
   돌 배치
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

    let mv =
        diff === "normal"
            ? aiMove_B()
            : aiMove_C();

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
   금수 아닌 대체 착수
============================================================ */
function findNonForbiddenMove() {
    for (let y = 0; y < SIZE; y++)
        for (let x = 0; x < SIZE; x++)
            if (board[y][x] === EMPTY && !isForbidden(board, x, y))
                return { x, y };

    return null;
}

/* ============================================================
   B 난이도
============================================================ */
function aiMove_B() {
    let win = findWinningMove(aiColor);
    if (win) return win;

    let block = findWinningMove(humanColor);
    if (block) return block;

    let f = findForceMove(aiColor);
    if (f) return f;

    let fb = findForceMove(humanColor);
    if (fb) return fb;

    return chooseStrategicMove(false);
}

/* ============================================================
   C 난이도
   (⚠️ 오류 수정: findDoubleThreat 반복 검증)
============================================================ */
function aiMove_C() {
    let win = findWinningMove(aiColor);
    if (win) return win;

    let block = findWinningMove(humanColor);
    if (block) return block;

    let dual = findDoubleThreat(aiColor);
    if (dual) return dual;

    let dualBlock = findDoubleThreat(humanColor);
    if (dualBlock) return dualBlock;

    let f = findForceMove(aiColor);
    if (f) return f;

    let fb = findForceMove(humanColor);
    if (fb) return fb;

    return chooseStrategicMove(true);
}

/* ============================================================
   승리 수 찾기
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
   강제 4 수
============================================================ */
function findForceMove(color) {
    let best = null;
    let bestScore = -1;

    const dirs = [
        [1, 0],
        [0, 1],
        [1, 1],
        [1, -1]
    ];

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            if (board[y][x] !== EMPTY) continue;
            if (color === BLACK && isForbidden(board, x, y)) continue;

            let score = 0;

            for (const [dx, dy] of dirs) {
                let c = countSeq(board, x, y, dx, dy, color);
                if (c === 4) score += 99999;
                else if (c === 3) score += 700;
            }

            if (score > bestScore) {
                bestScore = score;
                best = { x, y };
            }
        }
    }

    return bestScore > 0 ? best : null;
}

/* ============================================================
   더블 쓰레트
============================================================ */
function findDoubleThreat(color) {
    let best = null;
    let bestCount = 0;

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            if (board[y][x] !== EMPTY) continue;
            if (color === BLACK && isForbidden(board, x, y)) continue;

            board[y][x] = color;
            let f = findForceMove(color);
            board[y][x] = EMPTY;

            if (f) {
                if (++bestCount >= 2)
                    return { x, y };
            }
        }
    }

    return best;
}

/* ============================================================
   전략 위치 선택
============================================================ */
function chooseStrategicMove(hard) {
    let best = null;
    let bestScore = -Infinity;

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            if (board[y][x] !== EMPTY) continue;
            if (aiColor === BLACK && isForbidden(board, x, y)) continue;

            let score = 0;

            // 중심 가중치
            const center = Math.abs(x - 7) + Math.abs(y - 7);
            score += (hard ? 20 : 12) - center;

            // 주변 영향
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;

                    if (!isIn(nx, ny)) continue;

                    if (board[ny][nx] === aiColor) score += hard ? 8 : 5;
                    if (board[ny][nx] === humanColor) score += hard ? 6 : 4;
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
    const dirs = [
        [1, 0],
        [0, 1],
        [1, 1],
        [1, -1]
    ];

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            if (board[y][x] !== color) continue;

            for (const [dx, dy] of dirs) {
                let cnt = 1;

                let nx = x + dx, ny = y + dy;
                while (isIn(nx, ny) && board[ny][nx] === color) {
                    cnt++; nx += dx; ny += dy;
                }

                nx = x - dx; ny = y - dy;
                while (isIn(nx, ny) && board[ny][nx] === color) {
                    cnt++; nx -= dx; ny -= dy;
                }

                if (cnt >= 5) return true;
            }
        }
    }
    return false;
}

/* ============================================================
   금수 검사
============================================================ */
function isForbidden(bd, x, y) {
    if (bd[y][x] !== EMPTY) return true;

    bd[y][x] = BLACK;

    const over =
        isOverline(bd, x, y) ||
        countOpenThree(bd, x, y) >= 2 ||
        countOpenFour(bd, x, y) >= 2;

    bd[y][x] = EMPTY;

    return over;
}

/* 연속 개수 */
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

/* 장목 */
function isOverline(bd, x, y) {
    return (
        countSeq(bd, x, y, 1, 0, BLACK) >= 6 ||
        countSeq(bd, x, y, 0, 1, BLACK) >= 6 ||
        countSeq(bd, x, y, 1, 1, BLACK) >= 6 ||
        countSeq(bd, x, y, 1, -1, BLACK) >= 6
    );
}

/* 패턴 검사 */
function countPattern(bd, x, y, pat) {
    const dirs = [
        [1, 0],
        [0, 1],
        [1, 1],
        [1, -1]
    ];
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

/* 열린 3 / 열린 4 */
function countOpenThree(bd, x, y) { return countPattern(bd, x, y, "01110"); }
function countOpenFour(bd, x, y)  { return countPattern(bd, x, y, "011110"); }

/* 범위 */
function isIn(x, y) { return x >= 0 && y >= 0 && x < SIZE && y < SIZE; }

/* 상태 메시지 */
function setStatus(msg) {
    document.getElementById("statusBox").textContent = msg;
}

/* 초기 실행 */
window.onload = () => {
    document.getElementById("resetBtn").onclick = startGame;
    ghostStone = document.getElementById("ghostStone");
    startGame();
};
