/* =========================================================
   성장률 계산기 — spet.json 기반
   (초기치 + 기준 성장률 비교)
========================================================= */

async function loadSPET() {
    try {
        const res = await fetch("./data/spet.json");
        return await res.json();
    } catch (e) {
        console.error("spet.json 로드 실패:", e);
        return [];
    }
}

document.getElementById("growthRun").addEventListener("click", async () => {

    const petName = document.getElementById("growthName").value.trim();
    const level = Number(document.getElementById("growthLevel").value);
    const myHP = Number(document.getElementById("growthHP").value);
    const myAtk = Number(document.getElementById("growthAtk").value);
    const myDef = Number(document.getElementById("growthDef").value);
    const myAgi = Number(document.getElementById("growthAgi").value);

    const box = document.getElementById("growthResult");
    box.innerHTML = "검색 중...";

    if (!petName || !level || !myHP || !myAtk || !myDef || !myAgi) {
        box.innerHTML = `<p style="color:#f77">모든 값을 입력해주세요.</p>`;
        return;
    }

    /* ------------------------------
       spet.json 읽기
    ------------------------------ */
    const list = await loadSPET();
    const pet = list.find(p => p["이름"] === petName);

    if (!pet) {
        box.innerHTML = `<p style="color:#f77">spet.json에서 '${petName}' 이/가 없습니다.</p>`;
        return;
    }

    const baseInit = pet["초기치(stat)"];
    const baseGrow = pet["성장률(up)"];

    /* ------------------------------
       내 펫 성장률 계산
    ------------------------------ */
    const my = {
        HP: (myHP - baseInit["내구력(HP)"]) / (level - 1),
        Atk: (myAtk - baseInit["공격력(Atk)"]) / (level - 1),
        Def: (myDef - baseInit["방어력(Def)"]) / (level - 1),
        Agi: (myAgi - baseInit["순발력(Agi)"]) / (level - 1),
    };

    const base = {
        HP: baseGrow["내구력(HP)"],
        Atk: baseGrow["공격력(Atk)"],
        Def: baseGrow["방어력(Def)"],
        Agi: baseGrow["순발력(Agi)"],
    };

    const diff = {
        HP: my.HP - base.HP,
        Atk: my.Atk - base.Atk,
        Def: my.Def - base.Def,
        Agi: my.Agi - base.Agi,
    };

    /* ------------------------------
       출력 테이블 작성
    ------------------------------ */
    box.innerHTML = `
    <table style="width:100%; border-collapse:collapse; margin-top:12px;">
        <tr style="background:#11234a; color:#ffd447;">
            <th style="padding:6px;">스탯</th>
            <th>내 성장률</th>
            <th>기준 성장률</th>
            <th>차이</th>
        </tr>

        ${["HP","Atk","Def","Agi"].map(stat => `
            <tr style="text-align:center; border-bottom:1px solid #1f355f;">
                <td style="padding:6px;">${stat}</td>
                <td>${my[stat].toFixed(3)}</td>
                <td>${base[stat].toFixed(3)}</td>
                <td style="color:${diff[stat] >= 0 ? "#7fff7f" : "#ff7777"};">
                    ${(diff[stat] >= 0 ? "+" : "") + diff[stat].toFixed(3)}
                </td>
            </tr>
        `).join("")}
    </table>
    `;
});
