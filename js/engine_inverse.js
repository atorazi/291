/* ========================================================================
   engine_inverse.js
   ------------------------------------------------------------------------
   S0(초기 스탯) + Sg(성장률) → (k, u, e) 자동 역산 엔진
   - kokodas 3.5 엔진과 구조적으로 동일
   - PET_DB에서 선택된 펫의 S0/Sg 데이터를 받아 역산 수행
   ======================================================================== */

const E_SET = [575, 555, 535, 515, 495, 475, 455, 435];

/* ------------------------------------------------------------------------
   floating precision fix (성장률 비교용)
------------------------------------------------------------------------ */
function roundFix(v) {
    return Math.round(v * 1000) / 1000;
}

/* ------------------------------------------------------------------------
   성장률(Sg) 계산 (PDF 공식 기반)
------------------------------------------------------------------------ */
function calcSg(stat, u, e) {
    const f = e / 10000;
    const uh = u.hp + 2.5;
    const ua = u.atk + 2.5;
    const ud = u.def + 2.5;
    const ug = u.agi + 2.5;

    switch (stat) {
        case "hp":  return roundFix(f * (4 * uh + ua + ud + ug));
        case "atk": return roundFix(f * (0.1 * uh + 1 * ua + 0.1 * ud + 0.05 * ug));
        case "def": return roundFix(f * (0.1 * uh + 0.1 * ua + 1 * ud + 0.05 * ug));
        case "agi": return roundFix(f * ug);
    }
    return 0;
}

/* ------------------------------------------------------------------------
   초기치 S0 계산 (b=0, r=0인 상태에서)
------------------------------------------------------------------------ */
function calcSO(stat, u, k, e) {
    const f = (k / 100) * (e / 10000);

    const uh = u.hp + 2.5;
    const ua = u.atk + 2.5;
    const ud = u.def + 2.5;
    const ug = u.agi + 2.5;

    let base = 0;

    switch (stat) {
        case "hp":  base = 4 * uh + ua + ud + ug; break;
        case "atk": base = 0.1 * uh + 1 * ua + 0.1 * ud + 0.05 * ug; break;
        case "def": base = 0.1 * uh + 0.1 * ua + 1 * ud + 0.05 * ug; break;
        case "agi": base = ug; break;
    }

    return Math.floor(f * base);
}

/* ========================================================================
   핵심: S0, Sg → (k, u, e) 역산
========================================================================= */
function inverseCoefficients(S0, Sg) {

    const targetHp = S0.hp, targetAtk = S0.atk, targetDef = S0.def, targetAgi = S0.agi;
    const gHp = Sg.hp, gAtk = Sg.atk, gDef = Sg.def, gAgi = Sg.agi;

    // 탐색 범위
    const kRange = { min: 10, max: 30 };
    const uRange = { min: 0, max: 100 };

    // --------------------------------------------------------------------
    // 1단계: 먼저 u.agi → Sg.agi에서 결정 가능
    // --------------------------------------------------------------------
    for (const e of E_SET) {
        for (let uagi = uRange.min; uagi <= uRange.max; uagi++) {

            const uTestAgi = { hp: 0, atk: 0, def: 0, agi: uagi };
            const sgAgi = calcSg("agi", uTestAgi, e);

            if (roundFix(sgAgi) !== roundFix(gAgi)) continue;

            // ----------------------------------------------------------------
            // 2단계: 초기치 S0.agi = floor( f * (u.agi+2.5) )
            // → k 검증
            // ----------------------------------------------------------------
            for (let k = kRange.min; k <= kRange.max; k++) {
                const soAgi = calcSO("agi", uTestAgi, k, e);
                if (soAgi !== targetAgi) continue;

                // ----------------------------------------------------------------
                // 3단계: u.hp / u.atk / u.def 전체 탐색
                // ----------------------------------------------------------------
                for (let uhp = uRange.min; uhp <= uRange.max; uhp++) {
                    for (let uatk = uRange.min; uatk <= uRange.max; uatk++) {
                        for (let udef = uRange.min; udef <= uRange.max; udef++) {

                            const u = { hp: uhp, atk: uatk, def: udef, agi: uagi };

                            // 성장률 검증
                            const g1 = calcSg("hp", u, e);
                            const g2 = calcSg("atk", u, e);
                            const g3 = calcSg("def", u, e);

                            if (
                                roundFix(g1) !== roundFix(gHp) ||
                                roundFix(g2) !== roundFix(gAtk) ||
                                roundFix(g3) !== roundFix(gDef)
                            ) continue;

                            // 초기치 검증
                            const s1 = calcSO("hp", u, k, e);
                            const s2 = calcSO("atk", u, k, e);
                            const s3 = calcSO("def", u, k, e);

                            if (
                                s1 === targetHp &&
                                s2 === targetAtk &&
                                s3 === targetDef
                            ) {
                                // === 완전 일치 → 정답! ===
                                return {
                                    k,
                                    u,
                                    e
                                };
                            }
                        }
                    }
                }
            }
        }
    }

    return null; // 찾지 못함
}

/* ========================================================================
   외부에서 사용
========================================================================= */
function getCoefficientsByName(petName) {
    const data = PET_DB.find(x => x.name === petName);
    if (!data) return null;

    return inverseCoefficients(data.S0, data.Sg);
}

