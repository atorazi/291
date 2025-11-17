/*
SPDX-FileCopyrightText: © 2025 atorazi <atorazi@github.io>
SPDX-License-Identifier: MIT
*/

/* =========================
   🧭 공통 초기 설정 + 탭 전환
========================= */
document.addEventListener("DOMContentLoaded", () => {
  function showTab(id) {
    const allTabs = document.querySelectorAll(".tab-content");
    const allButtons = document.querySelectorAll(".sidebar button");

    // 모든 탭 숨기기
    allTabs.forEach(tab => {
      tab.classList.remove("active");
      tab.style.display = "none";
    });

    // 모든 버튼 비활성화
    allButtons.forEach(btn => btn.classList.remove("active"));

    // 선택된 탭과 버튼 찾기
    const selectedTab = document.getElementById(id);
    const base = id.replace(/Tab$/, ""); // "home", "sim", ...
    const btnId = "tab" + base.charAt(0).toUpperCase() + base.slice(1);
    const selectedBtn = document.getElementById(btnId);

    // 선택 탭 표시
    if (selectedTab) {
      selectedTab.style.display = "block";
      setTimeout(() => selectedTab.classList.add("active"), 10);
    }

    if (selectedBtn) selectedBtn.classList.add("active");
  }

  // 탭 버튼 이벤트 연결 (🎨 ANSI 탭 추가)
  ["Home","Ansi","Sim","Exp","Enhance","Growth","Maze"].forEach(name => {
    const btn = document.getElementById("tab" + name);
    if (btn) {
      btn.addEventListener("click", () => showTab(name.toLowerCase() + "Tab"));
    }
  });

  // 각 기능 초기화
  if (typeof initPetSimulator === "function") initPetSimulator();
  if (typeof initExpCalculator === "function") initExpCalculator();
  if (typeof initEnhanceSimulator === "function") initEnhanceSimulator();
  if (typeof initGrowthCalculator === "function") initGrowthCalculator();
});


/* =========================
   🐾 초기치 시뮬레이터
========================= */
function initPetSimulator() {
  async function loadPetData() {
    const base = "./data/";
    try {
      const [pets, spet] = await Promise.all([
        fetch(base + "pets.json").then(r => r.json()),
        fetch(base + "spet.json").then(r => r.json())
      ]);
      return { pets: pets || [], spet: spet || [] };
    } catch (e) {
      console.error("펫 데이터 불러오기 실패:", e);
      alert("펫 데이터를 불러오지 못했습니다. data 폴더 확인하세요.");
      return { pets: [], spet: [] };
    }
  }

  let PETS = [], SPETS = [], currentBase = null;
  const sgradeBox = document.getElementById("sgrade");
  const nameInput = document.getElementById("petName");
  const resultBox = document.getElementById("result");
  const costDisplay = document.getElementById("costDisplay");
  let totalCost = 0;

  loadPetData().then(d => { PETS = d.pets; SPETS = d.spet; });

  function safeName(o) { return ((o && (o.name || o.이름)) || "").toString().toLowerCase().trim(); }
  if (nameInput) {
    nameInput.onkeydown = e => { if (e.key === "Enter") updatePet(); };
    nameInput.onchange = updatePet;
  }

  function updatePet() {
    const n = (nameInput?.value || "").trim().toLowerCase();
    if (!n) { sgradeBox.innerHTML = `<b style="color:#ff6b81">⚠️ 입력 필요</b>`; currentBase = null; return; }
    const s = (SPETS || []).find(x => safeName(x) === n);
    if (!s) { sgradeBox.innerHTML = `<b style="color:#ff6b81">⚠️ [${n}] 데이터 없음</b>`; currentBase = null; return; }
    const stat = s["초기치(stat)"] || {};
    currentBase = { name: s.이름 || s.name || n, hp: stat["내구력(HP)"] || 0, atk: stat["공격력(Atk)"] || 0, def: stat["방어력(Def)"] || 0, agi: stat["순발력(Agi)"] || 0 };
    sgradeBox.innerHTML = `<b>${currentBase.name} S급 기준</b><br>체력 <b>${currentBase.hp}</b> | 공격력 <b>${currentBase.atk}</b> | 방어력 <b>${currentBase.def}</b> | 순발력 <b>${currentBase.agi}</b>`;
  }

  function rand() { return Math.floor(Math.random() * 5) - 2; }
  const fmt = (v,b) => {
    const d = v - b;
    if (d > 0) return `${v}<span class="plus"> (+${d})</span>`;
    if (d < 0) return `${v}<span class="minus"> (${d})</span>`;
    return `${v}<span class="zero"> (0)</span>`;
  };

  function simulate(t = 1) {
    if (!currentBase) { alert("펫 이름을 먼저 입력하세요."); return; }
    if (resultBox) resultBox.value = "";
    let o = `${currentBase.name} 시뮬레이션 결과\n────────────────────\n`;
    for (let i = 1; i <= t; i++) {
      const x = { HP: currentBase.hp + rand(), Atk: currentBase.atk + rand(), Def: currentBase.def + rand(), Agi: currentBase.agi + rand() };
      o += `${i}회차 → 체력 ${fmt(x.HP, currentBase.hp)} | 공격력 ${fmt(x.Atk, currentBase.atk)} | 방어력 ${fmt(x.Def, currentBase.def)} | 순발력 ${fmt(x.Agi, currentBase.agi)}\n`;
    }
    if (resultBox) resultBox.value = o.replace(/<[^>]+>/g,"");
  }

  const sim1 = document.getElementById("sim1");
  const sim5 = document.getElementById("sim5");
  const clearBtn = document.getElementById("clear");
  sim1 && (sim1.onclick = () => { simulate(1); totalCost += 1000; if (costDisplay) costDisplay.textContent = `💰 총 소모: ${totalCost.toLocaleString()}원`; });
  sim5 && (sim5.onclick = () => { simulate(5); totalCost += 5000; if (costDisplay) costDisplay.textContent = `💰 총 소모: ${totalCost.toLocaleString()}원`; });
  clearBtn && (clearBtn.onclick = () => { if (resultBox) resultBox.value = ""; totalCost = 0; if (costDisplay) costDisplay.textContent = "💰 총 소모: 0원"; });
}


/* =========================
   📘 경험치 계산기 (1~40)
========================= */
function initExpCalculator(){
  const EXP_TABLE = {
    1:2,2:6,3:17,4:37,5:67,6:111,7:169,8:247,9:344,10:464,
    11:609,12:783,13:985,14:1221,15:1491,16:1799,17:2145,18:2535,19:2968,20:3448,
    21:3977,22:4559,23:5193,24:5885,25:6635,26:7447,27:8321,28:9263,29:10272,30:11352,
    31:12506,32:13734,33:15042,34:16429,35:17899,36:19454,37:21098,38:22830,39:24656,40:26576,
    41:28594,42:30710,43:32930,44:35253,45:37683,46:40222,47:42874,48:45638,49:48520,50:51520,
    51:54642,52:57886,53:61258,54:64757,55:68387,56:72150,57:76050,58:80086,59:84264,60:106110,
    61:113412,62:121149,63:129352,64:138044,65:147256,66:157019,67:167366,68:178334,69:189958,
    70:202282,71:215348,72:229205,73:243901,74:259495,75:276041,76:293606,77:312258,78:332071,
    79:353126,80:375511,81:399318,82:424655,83:451631,84:480370,85:511007,86:543686,87:578571,
    88:616838,89:655680,90:698312,91:743970,92:795918,93:842442,94:901869,95:962553,96:1026899,
    97:1098354,98:1174419,99:1256664,100:1407463,101:1576358,102:1765521,103:1977384,104:2214670,
    105:2480430,106:2778082,107:3111451,108:3484825,109:3903005,110:4371365,111:4895929,
    112:5483440,113:6141453,114:6878428,115:7703839,116:8628300,117:9663695,118:10823339,
    119:12122140,120:13576796,121:15206012,122:17030733,123:19074421,124:21363352,125:23926954,
    126:26798189,127:30013971,128:33615648,129:37649526,130:42167469,131:47227565,132:52894873,
    133:59242257,134:66351328,135:74313488,136:83231106,137:93218839,138:104405100,139:116933712,
    140:-1
  };

  function getTotalExp(s,t){
    let sum = 0;
    for (let lv = s; lv < t; lv++) if (EXP_TABLE[lv]) sum += EXP_TABLE[lv];
    return sum;
  }

  const runBtn = document.getElementById("run");
  const resetBtn = document.getElementById("reset");
  const fmtNum = n => isFinite(n) ? Number(n).toLocaleString() : "-";

  if (runBtn){
    runBtn.onclick = () => {
      try {
        const c = +document.getElementById('currentLevel').value;
        const cp = +(document.getElementById('currentPercent').value) || 0;
        const t = +document.getElementById('targetLevel').value;
        const ph = +document.getElementById('xpPerHour').value;
        if (!c || !t || !ph) throw new Error('입력이 부족합니다.');
        if (t <= c) throw new Error('목표 레벨은 현재보다 커야 합니다.');
        if (t > 140) throw new Error('최대 레벨은 140입니다.');
        const rem1 = (EXP_TABLE[c] || 0) * (1 - (cp / 100));
        const rem2 = getTotalExp(c+1, t);
        const remain = rem1 + rem2;
        const hrs = remain / ph;
        const days = hrs / 24;
        const H = Math.floor(hrs);
        const M = Math.round((hrs - H) * 60);
        document.getElementById('statRemain').textContent = fmtNum(Math.round(remain));
        document.getElementById('statHours').textContent = `${H}시간 ${M}분`;
        document.getElementById('statDays').textContent = days.toFixed(2) + " 일";
        document.getElementById('results').hidden = false;
      } catch (e) { alert(e.message); }
    };
  }

  if (resetBtn){
    resetBtn.onclick = () => {
      document.querySelectorAll('#expTab input').forEach(i => i.value = '');
      document.getElementById('results').hidden = true;
    };
  }
}

/* =========================
   🪄 강화 시뮬레이터 (레어 큐브 + 자동강화 6·8·10)
========================= */
function initEnhanceSimulator() {
  const upgradeData = [
    { level: 1, success: 1.00, break: 0.00, cost: 35000 },
    { level: 2, success: 0.80, break: 0.00, cost: 59800 },
    { level: 3, success: 0.60, break: 0.00, cost: 106400 },
    { level: 4, success: 0.50, break: 1.00, cost: 152710 },
    { level: 5, success: 0.40, break: 1.00, cost: 273630 },
    { level: 6, success: 0.40, break: 1.00, cost: 468530 },
    { level: 7, success: 0.30, break: 1.00, cost: 552800 },
    { level: 8, success: 0.20, break: 1.00, cost: 698470 },
    { level: 9, success: 0.20, break: 1.00, cost: 857200 },
    { level: 10, success: 0.10, break: 1.00, cost: 1195390 }
  ];

  let level = 0;
  let totalCost = 0;
  let selectedCube = { rate: 0, mult: 1, isRare: false };
  let selectedBooster = 0;
  let currentEquip = "weapon";

  const levelEl = document.getElementById("level");
  const totalCostEl = document.getElementById("totalCost");
  const statusEl = document.getElementById("status");
  const outputBox = document.getElementById("enhanceOutput");

  const getEquipName = () => (currentEquip === "weapon" ? "무기" : "방어구");

  function addLog(text) {
    if (outputBox) {
      outputBox.value += (outputBox.value ? "\n" : "") + text;
      outputBox.scrollTop = outputBox.scrollHeight;
    }
  }

  function resetAll(bySwitch) {
    level = 0;
    totalCost = 0;
    if (levelEl) levelEl.textContent = "현재 강화 단계: +0";
    if (statusEl) statusEl.textContent = "";
    if (totalCostEl) totalCostEl.textContent = "0 S";
    if (outputBox) outputBox.value = "";
    if (bySwitch) addLog(`장비 변경됨: ${getEquipName()}`);
  }

  function upgradeOnce() {
    if (level >= 10) return;
    const data = upgradeData[level];
    const successRate = Math.min(1, data.success + selectedCube.rate + selectedBooster);

    // ✅ 레어 큐브면 비용 2배
    const cubeMultiplier = selectedCube.isRare ? 2 : selectedCube.mult;
    const cost = data.cost * cubeMultiplier;
    totalCost += cost;
    const roll = Math.random();

    if (roll <= successRate) {
      level++;
      addLog(`⚔️ ${getEquipName()} +${level - 1} ▶ +${level} 강화 성공`);
    } else {
      if (level >= 4) {
        level = 0;
        addLog(`💥 ${getEquipName()} 강화 실패 → 장비 파괴`);
      } else {
        addLog(`💢 ${getEquipName()} +${level} 강화 실패`);
      }
    }

    if (levelEl) levelEl.textContent = `현재 강화 단계: +${level}`;
    if (totalCostEl) totalCostEl.textContent = totalCost.toLocaleString() + " S";
    if (statusEl)
      statusEl.textContent = `성공확률 ${(successRate * 100).toFixed(1)}% | 소모 ${cost.toLocaleString()} S`;
  }

  // ⚙️ 자동 강화 (목표 단계까지)
  async function autoEnhance(target) {
    if (level >= target) return;
    addLog(`🪄 자동 강화 시작 (+${target} 목표)`);
    while (level < target && level < 10) {
      upgradeOnce();
      await new Promise(r => setTimeout(r, 150)); // 살짝 텀
    }
    addLog(`✅ 자동 강화 종료 (현재 +${level})`);
  }

  // 💎 큐브 선택 (일반 / 레어)
  document.querySelectorAll(".cube").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".cube").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedCube.rate = parseFloat(btn.dataset.rate);
      selectedCube.mult = parseFloat(btn.dataset.mult);
      selectedCube.isRare = btn.dataset.rare === "true";
      updateStatusPreview();
    };
  });

  // ✨ 보조제 선택 (없음 ~ +20%)
  document.querySelectorAll(".booster").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".booster").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedBooster = parseFloat(btn.dataset.bonus);
      updateStatusPreview();
    };
  });

  // ⚔️ 장비 선택
  document.querySelectorAll(".equip").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".equip").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      currentEquip = btn.dataset.type;
      resetAll(true);
    };
  });

  // 🪄 버튼 동작
  document.getElementById("upgradeBtn").onclick = () => upgradeOnce();
  document.getElementById("resetBtn").onclick = () => resetAll(false);
  document.getElementById("sim6").onclick = () => autoEnhance(6);
  document.getElementById("sim8").onclick = () => autoEnhance(8);
  document.getElementById("sim10").onclick = () => autoEnhance(10);

  // 💡 상태 미리보기
  function updateStatusPreview() {
    const base = upgradeData[level] || upgradeData[0];
    const previewRate = Math.min(1, base.success + selectedCube.rate + selectedBooster);
    const costPreview = base.cost * (selectedCube.isRare ? 2 : selectedCube.mult);
    if (statusEl)
      statusEl.textContent = `💡 예상 성공확률 ${(previewRate * 100).toFixed(1)}% | 예상 소모 ${costPreview.toLocaleString()} S`;
  }

  updateStatusPreview();
}


/* =========================
   📊 성장률 계산기
========================= */
async function initGrowthCalculator() {
  let SPETS = [];
  try {
    const res = await fetch("https://raw.githubusercontent.com/atorazi/291/main/data/spet.json");
    SPETS = await res.json();
  } catch (e) {
    console.error("성장률 데이터 불러오기 실패:", e);
  }

  const nameInput = document.getElementById("growthName");
  const resultBox = document.getElementById("growthResult");
  const runBtn = document.getElementById("growthRun");

  runBtn.onclick = () => {
    const name = nameInput.value.trim().toLowerCase();
    const level = parseFloat(document.getElementById("growthLevel").value);
    const hp = parseFloat(document.getElementById("growthHP").value);
    const atk = parseFloat(document.getElementById("growthAtk").value);
    const def = parseFloat(document.getElementById("growthDef").value);
    const agi = parseFloat(document.getElementById("growthAgi").value);

    if (!name) {
      resultBox.innerHTML = "⚠️ 펫 이름을 입력하세요.";
      return;
    }

    const f = SPETS.find(x => x.이름?.toLowerCase() === name || x.name?.toLowerCase() === name);
    if (!f) {
      resultBox.innerHTML = `❌ [${name}] 데이터를 찾을 수 없습니다.`;
      return;
    }

    const init = f["초기치(stat)"];
    const up = f["성장률(up)"];

    // 내 성장률 계산
    function calc(my, base) {
      return level > 1 ? (my - base) / (level - 1) : 0;
    }

    const myUp = {
      HP: calc(hp, init["내구력(HP)"]),
      Atk: calc(atk, init["공격력(Atk)"]),
      Def: calc(def, init["방어력(Def)"]),
      Agi: calc(agi, init["순발력(Agi)"])
    };

    function fmt(num) {
      return isFinite(num) ? num.toFixed(7) : "-";
    }

    function diff(my, s) {
      const d = my - s;
      const c = d > 0 ? "plus" : d < 0 ? "minus" : "zero";
      return `<span class="${c}">${d > 0 ? "+" : ""}${d.toFixed(7)}</span>`;
    }

    resultBox.innerHTML = `
      <table class="growthCompare">
        <thead>
          <tr>
            <th>구분</th>
            <th>체력(HP)</th>
            <th>공격력(Atk)</th>
            <th>방어력(Def)</th>
            <th>순발력(Agi)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><b>S급 기준치</b></td>
            <td>${init["내구력(HP)"]}</td>
            <td>${init["공격력(Atk)"]}</td>
            <td>${init["방어력(Def)"]}</td>
            <td>${init["순발력(Agi)"]}</td>
          </tr>
          <tr>
            <td><b>S급 성장률</b></td>
            <td>${fmt(up["내구력(HP)"])}</td>
            <td>${fmt(up["공격력(Atk)"])}</td>
            <td>${fmt(up["방어력(Def)"])}</td>
            <td>${fmt(up["순발력(Agi)"])}</td>
          </tr>
          <tr>
            <td><b>내 성장률</b></td>
            <td>${fmt(myUp.HP)}</td>
            <td>${fmt(myUp.Atk)}</td>
            <td>${fmt(myUp.Def)}</td>
            <td>${fmt(myUp.Agi)}</td>
          </tr>
          <tr>
            <td><b>차이</b></td>
            <td>${diff(myUp.HP, up["내구력(HP)"])}</td>
            <td>${diff(myUp.Atk, up["공격력(Atk)"])}</td>
            <td>${diff(myUp.Def, up["방어력(Def)"])}</td>
            <td>${diff(myUp.Agi, up["순발력(Agi)"])}</td>
          </tr>
        </tbody>
      </table>`;
  };
}


