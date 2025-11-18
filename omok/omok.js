/* ============================================================
   오목 AI (렌주룰 + Threat-Based) — 최종 안정화 버전
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

let stoneSize = 42; // 원하는 돌 크기(px)

// ⭐ 선-선 교차점 간격(=14칸)
const CELL = 100 / (SIZE - 1);

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

/* ============================================================
   클릭 포인트 생성 (정확한 교차점)
============================================================ */
function createBoardUI() {
    const boardEl = document.getElementById("board");
    boardEl.innerHTML = "";

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            const p = document.createElement("div");
            p.className = "point";
            p.dataset.x = x;
            p.dataset.y = y;

            p.style.left = `${x * CELL}%`;
            p.style.top  = `${y * CELL}%`;

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

    // 이전 돌/금수 제거
    document.querySelectorAll(".stone").forEach(e => e.remove());
    document.querySelectorAll(".ban").forEach(e => e.remove());

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            const v = board[y][x];

            // 금수 표시
            if (turn === BLACK && v === EMPTY && isForbidden(board, x, y)) {
                const ban = document.createElement("div");
                ban.className = "ban";
                ban.textContent = "X";
                ban.style.left = `${x * CELL}%`;
                ban.style.top  = `${y * CELL}%`;
                boardEl.appendChild(ban);
            }

            // 실제 돌
            if (v === BLACK || v === WHITE) {
                const s = document.createElement("div");
                s.className = "stone " + (v === BLACK ? "black" : "white");
                s.style.left = `${x * CELL}%`;
                s.style.top  = `${y * CELL}%`;
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

    ghostStone.style.left = `${x * CELL}%`;
    ghostStone.style.top  = `${y * CELL}%`;

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
   돌 놓기
============================================================ */
function placeStone(x, y, color) {
    board[y][x] = color;
}

/* ============================================================
   게임 시작
============================================================ */
function startGame() {
    document.documentElement.style.setProperty("--stone-size", stoneSize + "px");

    resetBoardUI();
    initBoard();
    createBoardUI();
    renderBoard();

    const first = document.querySelector("input[name=firstPlayer]:checked").value;
    humanColor = first === "human" ? BLACK : WHITE;
    aiColor = humanColor === BLACK ? WHITE : BLACK;

    turn = BLACK;
    gameOver = false;
    setStatus("새 게임이 시작되었습니다.");

    if (first === "ai") aiStartMove();
}

/* ============================================================
   AI 착수
============================================================ */
async function aiStartMove() {
    if (gameOver) return;

    setStatus("AI 생각 중...");
    await new Promise(r => setTimeout(r, 80));

    const diff = document.querySelector("input[name=difficulty]:checked").value;

    // normal = B, hard = C
    let mv = aiMoveHybrid();


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
   금수 자리 아닌 곳 찾기
============================================================ */
function findNonForbiddenMove() {
    for (let y = 0; y < SIZE; y++)
        for (let x = 0; x < SIZE; x++)
            if (board[y][x] === EMPTY && !isForbidden(board, x, y))
                return { x, y };
    return null;
}

/* ============================================================
   하이브리드 AI — 승리수 + 금수 + 패턴 기반
============================================================ */

function aiMoveHybrid() {
    const me = aiColor;
    const opp = humanColor;

    /* 1) 즉발 승리수 */
    let win = findWinningMove(me);
    if (win) return win;

    /* 2) 즉발 차단 */
    let block = findWinningMove(opp);
    if (block) return block;

    /* 3) 강한 위협 탐색 (4 생성) */
    let force = findBestForceMove(me);
    if (force) return force;

    let forceBlock = findBestForceMove(opp);
    if (forceBlock) return forceBlock;

    /* 4) 패턴 기반 점수 시스템으로 전체 평가 */
    return evaluateBestMove(me, opp);
}

/* ============================================================
   강제 4 탐색 강화
============================================================ */
function findBestForceMove(color) {
    let best = null;
    let bestScore = 0;

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            if (board[y][x] !== EMPTY) continue;
            if (color === BLACK && isForbidden(board, x, y)) continue;

            board[y][x] = color;
            let c = countForcePatterns(board, x, y, color);
            board[y][x] = EMPTY;

            if (c > bestScore) {
                bestScore = c;
                best = { x, y };
            }
        }
    }
    return best;
}

function countForcePatterns(bd, x, y, color) {
    let score = 0;

    const dirs = [[1,0],[0,1],[1,1],[1,-1]];

    for (const [dx, dy] of dirs) {
        let c = countSeq(bd, x, y, dx, dy, color);

        if (c === 4) score += 200000;   // 승에 가까움
        if (c === 3) score += 3500;
        if (c === 2) score += 40;
    }

    return score;
}

/* ============================================================
   패턴 평가 기반 최종 선택
============================================================ */
function evaluateBestMove(me, opp) {
    let best = null;
    let bestScore = -999999;

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            if (board[y][x] !== EMPTY) continue;
            if (me === BLACK && isForbidden(board, x, y)) continue;

            // 후보: 주변 2칸 안에 돌 있어야만 탐색
            if (!hasNearbyStone(x, y)) continue;

            board[y][x] = me;

            let score = 0;

            /* 공격 패턴 */
            score += evaluatePatterns(x, y, me) * 1.2;

            /* 수비 패턴 */
            board[y][x] = opp;
            score += evaluatePatterns(x, y, opp) * 1.0;

            board[y][x] = me;

            /* 중심 보정 */
            score += (14 - (Math.abs(x-7)+Math.abs(y-7))) * 4;

            board[y][x] = EMPTY;

            if (score > bestScore) {
                bestScore = score;
                best = { x, y };
            }
        }
    }

    return best;
}

function hasNearbyStone(x, y) {
    for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (!isIn(nx, ny)) continue;
            if (board[ny][nx] !== EMPTY) return true;
        }
    }
    return false;
}

/* ============================================================
   패턴 세기
============================================================ */
function evaluatePatterns(x, y, color) {
    let score = 0;
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];

    for (const [dx, dy] of dirs) {
        const c = countSeq(board, x, y, dx, dy, color);

        if (c >= 4) score += 200000;       // 4 완성
        else if (c === 3) score += 2800;   // 열린3 가능성
        else if (c === 2) score += 90;
    }

    return score;
}

/* ============================================================
   승리수 탐색
============================================================ */
function findWinningMove(color) {
    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            if (board[y][x] !== EMPTY) continue;
            if (color === BLACK && isForbidden(board, x, y)) continue;

            board[y][x] = color;
            const win = checkWin(color);
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
   더블 쓰레트 (C만)
============================================================ */
function findDoubleThreat(color) {
    let best = null, bestCnt = 0;

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
                best = { x, y };
            }
        }
    }

    return best;
}

/* ============================================================
   전략 배치
============================================================ */
function chooseStrategicMove(hard) {
    let best = null, bestScore = -999999;

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            if (board[y][x] !== EMPTY) continue;
            if (aiColor === BLACK && isForbidden(board, x, y)) continue;

            let score = 0;

            // 중심 가중치
            const dist = Math.abs(x - 7) + Math.abs(y - 7);
            score += (hard ? 30 : 18) - dist;

            // 주변 영향
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    let nx = x + dx, ny = y + dy;
                    if (!isIn(nx, ny)) continue;

                    if (board[ny][nx] === aiColor)
                        score += (hard ? 14 : 10);

                    if (board[ny][nx] === humanColor)
                        score += (hard ? 11 : 7);
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
                let count = 1;

                // 정방향
                let nx = x + dx, ny = y + dy;
                while (isIn(nx, ny) && board[ny][nx] === color) {
                    count++; nx += dx; ny += dy;
                }

                // 역방향
                nx = x - dx; ny = y - dy;
                while (isIn(nx, ny) && board[ny][nx] === color) {
                    count++; nx -= dx; ny -= dy;
                }

                if (count >= 5) return true;
            }
        }
    }

    return false;
}

/* ============================================================
   연속 개수 세기
============================================================ */
function countSeq(bd, x, y, dx, dy, color) {
    let cnt = 1;

    let nx = x + dx, ny = y + dy;
    while (isIn(nx,ny) && bd[ny][nx] === color) {
        cnt++; nx += dx; ny += dy;
    }

    nx = x - dx; ny = y - dy;
    while (isIn(nx,ny) && bd[ny][nx] === color) {
        cnt++; nx -= dx; ny -= dy;
    }

    return cnt;
}

/* ============================================================
   장목 검사
============================================================ */
function isOverline(bd, x, y) {
    return (
        countSeq(bd, x, y, 1,0, BLACK) >= 6 ||
        countSeq(bd, x, y, 0,1, BLACK) >= 6 ||
        countSeq(bd, x, y, 1,1, BLACK) >= 6 ||
        countSeq(bd, x, y, 1,-1,BLACK) >= 6
    );
}

/* ============================================================
   패턴 검사 관련
============================================================ */
function countPattern(bd, x, y, pattern) {
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    let count = 0;

    for (const [dx, dy] of dirs) {
        let line = "";

        for (let k = -4; k <= 4; k++) {
            let nx = x + dx*k;
            let ny = y + dy*k;

            if (!isIn(nx, ny)) line += "3";
            else {
                line += (
                    bd[ny][nx] === BLACK ? "1" :
                    bd[ny][nx] === WHITE ? "2" : "0"
                );
            }
        }

        if (line.includes(pattern)) count++;
    }

    return count;
}

function countOpenThree(bd, x, y) {
    return countPattern(bd, x, y, "01110");
}

function countOpenFour(bd, x, y) {
    return countPattern(bd, x, y, "011110");
}

/* ============================================================
   금수 규칙
============================================================ */
function isForbidden(bd, x, y) {
    if (bd[y][x] !== EMPTY) return true;

    bd[y][x] = BLACK;

    const over6 = isOverline(bd, x, y);
    const open3 = countOpenThree(bd, x, y) >= 2;
    const open4 = countOpenFour(bd, x, y) >= 2;

    bd[y][x] = EMPTY;

    return over6 || open3 || open4;
}

/* ============================================================
   좌표 유효성
============================================================ */
function isIn(x, y) {
    return x >= 0 && y >= 0 && x < SIZE && y < SIZE;
}

/* ============================================================
   UI 메시지
============================================================ */
function setStatus(msg) {
    document.getElementById("statusBox").textContent = msg;
}

/* ============================================================
   초기 실행
============================================================ */
window.onload = () => {
    document.getElementById("resetBtn").onclick = startGame;
    document.documentElement.style.setProperty("--stone-size", stoneSize + "px");
    startGame();
};



