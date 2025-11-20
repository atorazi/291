/* ============================================================
   🧠 Ultra Pro Renju AI (VCF / VCT / Threat-Space Search)
   - 인간 실력 거의 불가 → 챌린지용
   - 후보수 생성 + 위협 기반 탐색 + 강제승리 트리
============================================================ */

const SIZE = 15;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

// 탐색 깊이 설정
const DEPTH_S = 4;
const DEPTH_U = 7;

let board = [];
let humanColor = BLACK;
let aiColor = WHITE;
let turn = BLACK;
let gameOver = false;

/* ============================================================
   보드 생성
============================================================ */
function initBoard() {
    board = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
}

/* ============================================================
   금수 체크 (렌주룰)
============================================================ */
function isForbidden(x, y) {
    if (board[y][x] !== EMPTY) return true;

    board[y][x] = BLACK;

    const overline =
        countLine(x, y, 1, 0, BLACK) >= 6 ||
        countLine(x, y, 0, 1, BLACK) >= 6 ||
        countLine(x, y, 1, 1, BLACK) >= 6 ||
        countLine(x, y, 1, -1, BLACK) >= 6;

    const d3 = countDoubleThree(x, y);
    const d4 = countDoubleFour(x, y);

    board[y][x] = EMPTY;

    return overline || d3 || d4;
}

function countLine(x, y, dx, dy, c) {
    let cnt = 1;
    let nx = x + dx, ny = y + dy;
    while (inBoard(nx, ny) && board[ny][nx] === c) {
        cnt++; nx += dx; ny += dy;
    }
    nx = x - dx; ny = y - dy;
    while (inBoard(nx, ny) && board[ny][nx] === c) {
        cnt++; nx -= dx; ny -= dy;
    }
    return cnt;
}

function countDoubleThree(x, y) {
    return patternCount(x, y, "01110") >= 2;
}

function countDoubleFour(x, y) {
    return patternCount(x, y, "011110") >= 2;
}

function patternCount(x, y, pat) {
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    let cnt = 0;
    for (const [dx,dy] of dirs) {
        let s = "";
        for (let k=-4; k<=4; k++) {
            const nx = x + dx*k;
            const ny = y + dy*k;
            if (!inBoard(nx, ny)) s += "3";
            else if (board[ny][nx] === BLACK) s += "1";
            else if (board[ny][nx] === WHITE) s += "2";
            else s += "0";
        }
        if (s.includes(pat)) cnt++;
    }
    return cnt;
}

/* ============================================================
   착수 후보 생성 (중요 위치만 20개)
============================================================ */
function generateMoves(color) {
    const arr = [];

    for (let y=0;y<SIZE;y++) {
        for (let x=0;x<SIZE;x++) {

            if (board[y][x] !== EMPTY) continue;
            if (!nearStone(x, y)) continue;

            // 금수 방지
            if (color === BLACK && isForbidden(x,y)) continue;

            let score = evaluateMove(x,y,color);
            arr.push({ x, y, score });
        }
    }

    // 중요도 정렬 후 상위 20개만 탐색
    arr.sort((a,b)=>b.score-a.score);
    return arr.slice(0, 20);
}

function nearStone(x, y) {
    for (let i=-2;i<=2;i++)
        for (let j=-2;j<=2;j++) {
            const nx = x + j, ny = y + i;
            if (inBoard(nx,ny) && board[ny][nx] !== EMPTY)
                return true;
        }
    return false;
}

/* ============================================================
   지표 기반 착수 평가
============================================================ */
function evaluateMove(x, y, color) {
    let score = 0;
    score += patternScore(x,y,color) * 2;
    score += patternScore(x,y,3-color);
    return score;
}

function patternScore(x, y, c) {
    const dirs = [[1,0],[0,1],[1,1],[1,-1]];
    let s = 0;

    for (const [dx,dy] of dirs) {
        const k = countLine(x, y, dx, dy, c);
        if (k === 4) s += 8000;
        else if (k === 3) s += 500;
        else if (k === 2) s += 40;
    }
    return s;
}

/* ============================================================
   승리 체크
============================================================ */
function checkWin(color) {
    const dirs=[[1,0],[0,1],[1,1],[1,-1]];
    for (let y=0;y<SIZE;y++)
        for (let x=0;x<SIZE;x++) {
            if (board[y][x] !== color) continue;
            for (const [dx,dy] of dirs)
                if (countLine(x,y,dx,dy,color) >= 5)
                    return true;
        }
    return false;
}

/* ============================================================
   VCF / VCT (강제승리) 탐색
============================================================ */
function searchVCF(color, depth=7) {
    if (depth === 0) return null;

    const moves = generateMoves(color);

    for (const m of moves) {
        board[m.y][m.x] = color;

        if (checkWin(color)) {
            board[m.y][m.x] = EMPTY;
            return m;  // 강제승리 수
        }

        const opp = 3 - color;

        // 상대가 방어 못하는지 확인
        const block = searchVCF(opp, depth - 1);
        board[m.y][m.x] = EMPTY;

        if (!block) return m; // 상대가 막지 못하는 수
    }
    return null;
}

/* ============================================================
   AI 최종 탐색
============================================================ */
function aiMove() {
    const diff = document.querySelector("input[name=difficulty]:checked").value;
    const depth = diff === "U" ? DEPTH_U : DEPTH_S;

    const me = aiColor;
    const opp = humanColor;

    // 즉승
    const win = findWinning(me);
    if (win) return win;

    // 즉패 방어
    const block = findWinning(opp);
    if (block) return block;

    // 강제승리 VCF
    const vcf = searchVCF(me, depth);
    if (vcf) return vcf;

    // 일반 탐색
    return searchNormal(me, opp, depth);
}

/* ============================================================
   즉승 수 찾기
============================================================ */
function findWinning(color) {
    for (let y=0;y<SIZE;y++)
        for (let x=0;x<SIZE;x++) {
            if (board[y][x] !== EMPTY) continue;
            if (color === BLACK && isForbidden(x,y)) continue;
            board[y][x] = color;
            const ok = checkWin(color);
            board[y][x] = EMPTY;
            if (ok) return { x, y };
        }
    return null;
}

/* ============================================================
   일반 수읽기
============================================================ */
function searchNormal(me, opp, depth) {
    const moves = generateMoves(me);

    let best = null;
    let bestVal = -999999;

    for (const m of moves) {
        board[m.y][m.x] = me;

        let val = -searchMin(opp, me, depth - 1, -999999, 999999);

        board[m.y][m.x] = EMPTY;

        if (val > bestVal) {
            bestVal = val;
            best = m;
        }
    }
    return best;
}

function searchMin(me, opp, depth, alpha, beta) {
    if (depth === 0) return evalBoard(opp, me);

    const moves = generateMoves(me);
    if (moves.length === 0) return 0;

    for (const m of moves) {
        board[m.y][m.x] = me;

        if (checkWin(me)) {
            board[m.y][m.x] = EMPTY;
            return -999999;
        }

        let v = -searchMin(opp, me, depth - 1, -beta, -alpha);

        board[m.y][m.x] = EMPTY;

        if (v > alpha) alpha = v;
        if (alpha >= beta) break;
    }
    return alpha;
}

/* ============================================================
   보드 평가
============================================================ */
function evalBoard(me, opp) {
    let score = 0;
    const dirs=[[1,0],[0,1],[1,1],[1,-1]];

    for (let y=0;y<SIZE;y++)
        for (let x=0;x<SIZE;x++) {
            const v = board[y][x];
            if (v === EMPTY) continue;
            for (const [dx,dy] of dirs) {
                const c = countLine(x,y,dx,dy,v);

                if (v === me) {
                    if (c >= 5) score += 5000000;
                    else if (c === 4) score += 60000;
                    else if (c === 3) score += 3500;
                    else if (c === 2) score += 80;
                } else {
                    if (c >= 5) score -= 8000000;
                    else if (c === 4) score -= 90000;
                    else if (c === 3) score -= 4500;
                    else if (c === 2) score -= 100;
                }
            }
        }
    return score;
}

/* ============================================================
   Utility
============================================================ */
function inBoard(x,y){return x>=0 && x<SIZE && y>=0 && y<SIZE;}
