/* ============================================================
   Ultra Renju AI (VCF/VCT + 금수 + 교차점 위치 정확판)
============================================================ */

const SIZE = 15;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

let board = [];
let turn = BLACK;
let humanColor = BLACK;
let aiColor = WHITE;
let gameOver = false;

/* ============================================================
   공통 유틸
============================================================ */
function inside(x, y) {
    return x >= 0 && x < SIZE && y >= 0 && y < SIZE;
}

function setStatus(s) {
    document.getElementById("statusBox").textContent = s;
}

function wait(ms) {
    return new Promise(r => setTimeout(r, ms));
}

/* ============================================================
   보드 초기화
============================================================ */
function initBoard() {
    board = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
}

/* ============================================================
   보드 렌더링 (교차점 절대좌표 계산)
============================================================ */
function renderBoard() {
    const wrap = document.getElementById("board");
    wrap.innerHTML = "";

    const gap = wrap.clientWidth / (SIZE - 1);  // 교차점 간격(px)

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            const p = document.createElement("div");
            p.className = "point";
            p.style.left = (x * gap) + "px";
            p.style.top = (y * gap) + "px";

            p.dataset.x = x;
            p.dataset.y = y;

            p.addEventListener("click", onHumanClick);

            // 돌 표시
            const v = board[y][x];
            if (v !== EMPTY) {
                const s = document.createElement("div");
                s.className = "stone " + (v === BLACK ? "black" : "white");
                p.appendChild(s);
            }

            // 금수 표시
            if (turn === BLACK && v === EMPTY && isForbidden(x, y)) {
                const f = document.createElement("div");
                f.className = "forbid";
                f.textContent = "X";
                p.appendChild(f);
            }

            wrap.appendChild(p);
        }
    }
}

/* ============================================================
   사람 착수
============================================================ */
function onHumanClick(e) {
    if (gameOver) return;
    if (turn !== humanColor) return;

    const x = Number(e.currentTarget.dataset.x);
    const y = Number(e.currentTarget.dataset.y);

    if (!inside(x, y)) return;
    if (board[y][x] !== EMPTY) return;

    if (humanColor === BLACK && isForbidden(x, y)) {
        setStatus("⚠ 금수 자리입니다!");
        return;
    }

    board[y][x] = humanColor;

    if (checkWin(humanColor)) {
        gameOver = true;
        renderBoard();
        setStatus("🎉 당신의 승리!");
        return;
    }

    turn = aiColor;
    renderBoard();
    aiStart();
}

/* ============================================================
   게임 시작
============================================================ */
function startGame() {
    gameOver = false;

    const fp = document.querySelector("input[name=firstPlayer]:checked").value;
    humanColor = fp === "human" ? BLACK : WHITE;
    aiColor = humanColor === BLACK ? WHITE : BLACK;

    turn = BLACK;

    initBoard();
    renderBoard();
    setStatus("게임 시작!");

    if (fp === "ai") aiStart();
}

/* ============================================================
   AI 메인
============================================================ */
async function aiStart() {
    if (gameOver) return;

    await wait(80);

    // 첫 수 → 중앙 고정
    if (board.flat().every(v => v === EMPTY)) {
        board[7][7] = aiColor;
        turn = humanColor;
        renderBoard();
        return;
    }

    const mv = aiMove();

    if (!mv) {
        setStatus("무승부");
        gameOver = true;
        return;
    }

    board[mv.y][mv.x] = aiColor;

    if (checkWin(aiColor)) {
        gameOver = true;
        renderBoard();
        setStatus("💀 AI 승리");
        return;
    }

    turn = humanColor;
    renderBoard();
}

/* ============================================================
   AI 선택 로직 (VCF/VCT + 금수 완전지원)
============================================================ */
function aiMove() {
    const diff = document.querySelector("input[name=difficulty]:checked").value;
    const depth = diff === "U" ? 7 : 4;

    const me = aiColor;
    const opp = humanColor;

    // 즉승
    let w = findWinning(me);
    if (w) return w;

    // 즉패 방어
    let b = findWinning(opp);
    if (b) return b;

    // VCF/VCT (강제승리)
    let vcf = searchVCF(me, depth);
    if (vcf) return vcf;

    // 일반 탐색
    return searchNormal(me, opp, depth);
}

/* ============================================================
   VCF / VCT 탐색
============================================================ */
function searchVCF(color, depth) {
    if (depth <= 0) return null;

    const moves = generateMoves(color);

    for (const mv of moves) {
        board[mv.y][mv.x] = color;

        if (checkWin(color)) {
            board[mv.y][mv.x] = EMPTY;
            return mv;
        }

        const opp = 3 - color;
        const block = searchVCF(opp, depth - 1);

        board[mv.y][mv.x] = EMPTY;

        if (!block) return mv;
    }
    return null;
}

/* ============================================================
   일반 탐색
============================================================ */
function searchNormal(me, opp, depth) {
    const moves = generateMoves(me);

    let best = null;
    let bestVal = -99999999;

    for (const mv of moves) {
        board[mv.y][mv.x] = me;

        const val = -minSearch(opp, me, depth - 1, -99999999, 99999999);

        board[mv.y][mv.x] = EMPTY;

        if (val > bestVal) {
            bestVal = val;
            best = mv;
        }
    }
    return best;
}

function minSearch(me, opp, depth, alpha, beta) {
    if (depth <= 0) return evalBoard(opp, me);

    const moves = generateMoves(me);
    if (moves.length === 0) return 0;

    for (const mv of moves) {
        board[mv.y][mv.x] = me;

        if (checkWin(me)) {
            board[mv.y][mv.x] = EMPTY;
            return -999999;
        }

        const val = -minSearch(opp, me, depth - 1, -beta, -alpha);

        board[mv.y][mv.x] = EMPTY;

        if (val > alpha) alpha = val;
        if (alpha >= beta) break;
    }
    return alpha;
}

/* ============================================================
   후보 수 생성
============================================================ */
function generateMoves(color) {
    const arr = [];

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            if (board[y][x] !== EMPTY) continue;

            if (!nearStone(x, y)) continue;

            if (color === BLACK && isForbidden(x, y)) continue;

            const s = moveScore(x, y, color);
            arr.push({ x, y, score: s });
        }
    }

    arr.sort((a, b) => b.score - a.score);
    return arr.slice(0, 16);
}

function nearStone(x, y) {
    for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) {
            const nx = x + dx, ny = y + dy;
            if (inside(nx, ny) && board[ny][nx] !== EMPTY)
                return true;
        }
    return false;
}

/* ============================================================
   평가 함수
============================================================ */
function moveScore(x, y, c) {
    let s = patternScore(x, y, c) * 2;
    s += patternScore(x, y, 3 - c);
    return s;
}

function patternScore(x, y, c) {
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    let score = 0;

    for (const [dx, dy] of dirs) {
        const len = countLine(x, y, dx, dy, c);

        if (len === 4) score += 8000;
        else if (len === 3) score += 500;
        else if (len === 2) score += 40;
    }
    return score;
}

function countLine(x, y, dx, dy, c) {
    let cnt = 1;

    let nx = x + dx, ny = y + dy;
    while (inside(nx, ny) && board[ny][nx] === c) {
        cnt++; nx += dx; ny += dy;
    }

    nx = x - dx; ny = y - dy;
    while (inside(nx, ny) && board[ny][nx] === c) {
        cnt++; nx -= dx; ny -= dy;
    }

    return cnt;
}

/* ============================================================
   승리 판정
============================================================ */
function checkWin(c) {
    return (
        checkDir(c, 1, 0) ||
        checkDir(c, 0, 1) ||
        checkDir(c, 1, 1) ||
        checkDir(c, 1, -1)
    );
}

function checkDir(c, dx, dy) {
    for (let y = 0; y < SIZE; y++)
        for (let x = 0; x < SIZE; x++)
            if (board[y][x] === c && countLine(x, y, dx, dy, c) >= 5)
                return true;
    return false;
}

/* ============================================================
   금수 판정 (렌주룰)
============================================================ */
function isForbidden(x, y) {
    if (board[y][x] !== EMPTY) return false;

    board[y][x] = BLACK;

    const overline =
        countLine(x, y, 1, 0, BLACK) >= 6 ||
        countLine(x, y, 0, 1, BLACK) >= 6 ||
        countLine(x, y, 1, 1, BLACK) >= 6 ||
        countLine(x, y, 1, -1, BLACK) >= 6;

    const d3 = countOpenPattern(x, y, "01110") >= 2;
    const d4 = countOpenPattern(x, y, "011110") >= 2;

    board[y][x] = EMPTY;
    return overline || d3 || d4;
}

function countOpenPattern(x, y, pat) {
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    let cnt = 0;

    for (const [dx, dy] of dirs) {
        let s = "";
        for (let k = -4; k <= 4; k++) {
            const nx = x + dx * k, ny = y + dy * k;

            if (!inside(nx, ny)) s += "3";
            else if (board[ny][nx] === BLACK) s += "1";
            else if (board[ny][nx] === WHITE) s += "2";
            else s += "0";
        }
        if (s.includes(pat)) cnt++;
    }
    return cnt;
}

/* ============================================================
   즉승 판단
============================================================ */
function findWinning(color) {
    for (let y = 0; y < SIZE; y++)
        for (let x = 0; x < SIZE; x++) {
            if (board[y][x] !== EMPTY) continue;

            if (color === BLACK && isForbidden(x, y)) continue;

            board[y][x] = color;
            const ok = checkWin(color);
            board[y][x] = EMPTY;

            if (ok) return { x, y };
        }
    return null;
}

/* ============================================================
   초기 실행
============================================================ */
window.onload = () => {
    document.getElementById("resetBtn").onclick = startGame;
    startGame();
};
