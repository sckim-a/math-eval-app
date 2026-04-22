import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
  writeBatch,
  doc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

/* =====================================================
   1) Firebase 설정
   ===================================================== */
const firebaseConfig = {
  apiKey: "AIzaSyCNPsi-ue01TxnJjVtM7T7aBG0QU_o1vOE",
  authDomain: "math-eval-app.firebaseapp.com",
  projectId: "math-eval-app",
  storageBucket: "math-eval-app.firebasestorage.app",
  messagingSenderId: "55851882707",
  appId: "1:55851882707:web:20c58b18f2d52c6a839c26"
};

/* =====================================================
   2) 관리자 이메일
   - 여기에 관리자 이메일 추가
   ===================================================== */
const ADMIN_EMAILS = [
  "sckim6022@gmail.com"
];

/* =====================================================
   3) Firebase 초기화
   ===================================================== */
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

/* =====================================================
   4) 앱 상태
   ===================================================== */
const app = document.getElementById("app");

const state = {
  user: null,
  isAdmin: false,
  units: [],
  attempts: [],
  currentUnitId: null,
  currentQuestions: [],
  lastWrongIds: []
};

/* =====================================================
   5) 공통 유틸
   ===================================================== */
function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderLoading(message = "불러오는 중입니다...") {
  app.innerHTML = `
    <section class="card empty">
      <h2>${escapeHtml(message)}</h2>
      <p class="info-text">잠시만 기다려 주세요.</p>
    </section>
  `;
}

function renderError(message) {
  app.innerHTML = `
    <section class="card">
      <h2>오류가 발생했어요</h2>
      <p class="info-text">${escapeHtml(message)}</p>
      <div class="button-row">
        <button class="btn-secondary" onclick="location.reload()">새로고침</button>
      </div>
    </section>
  `;
}

function formatDate(timestamp) {
  if (!timestamp || !timestamp.seconds) return "방금 전";
  const date = new Date(timestamp.seconds * 1000);
  return date.toLocaleString("ko-KR");
}

function getCurrentUnit() {
  return state.units.find(unit => unit.id === state.currentUnitId);
}

/* =====================================================
   6) 로그인 화면
   ===================================================== */
function renderAuthPage() {
  app.innerHTML = `
    <section class="card auth-box">
      <h2>로그인</h2>
      <p class="info-text">
        이제 익명 로그인이 아니라 이메일/비밀번호로 로그인합니다.
      </p>

      <div class="form-group">
        <label for="loginEmail">이메일</label>
        <input type="email" id="loginEmail" placeholder="example@email.com" />
      </div>

      <div class="form-group">
        <label for="loginPassword">비밀번호</label>
        <input type="password" id="loginPassword" placeholder="비밀번호 입력" />
      </div>

      <div class="button-row">
        <button class="btn-primary" onclick="handleLogin()">로그인</button>
        <button class="btn-secondary" onclick="handleSignup()">회원가입</button>
      </div>

      <p class="admin-note">
        관리자 이메일로 로그인하면 홈 화면에 "문제 일괄 등록" 버튼이 보입니다.
      </p>
    </section>
  `;
}

window.handleSignup = async function () {
  const email = document.getElementById("loginEmail")?.value.trim();
  const password = document.getElementById("loginPassword")?.value.trim();

  if (!email || !password) {
    alert("이메일과 비밀번호를 입력해 주세요.");
    return;
  }

  try {
    renderLoading("회원가입 처리 중입니다...");
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error(error);
    alert("회원가입 실패: " + (error.message || "알 수 없는 오류"));
    renderAuthPage();
  }
};

window.handleLogin = async function () {
  const email = document.getElementById("loginEmail")?.value.trim();
  const password = document.getElementById("loginPassword")?.value.trim();

  if (!email || !password) {
    alert("이메일과 비밀번호를 입력해 주세요.");
    return;
  }

  try {
    renderLoading("로그인 처리 중입니다...");
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error(error);
    alert("로그인 실패: " + (error.message || "알 수 없는 오류"));
    renderAuthPage();
  }
};

window.handleLogout = async function () {
  try {
    await signOut(auth);
  } catch (error) {
    console.error(error);
    alert("로그아웃 실패");
  }
};

/* =====================================================
   7) Firestore 로드
   ===================================================== */
async function loadUnitsFromFirestore() {
  const snapshot = await getDocs(collection(db, "units"));

  state.units = snapshot.docs
    .map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }))
    .filter(unit => unit.isActive !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

async function loadQuestionsByUnit(unitId) {
  const q = query(collection(db, "questions"), where("unitId", "==", unitId));
  const snapshot = await getDocs(q);

  return snapshot.docs
    .map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }))
    .filter(question => question.isPublished !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

async function loadAttemptsFromFirestore() {
  if (!state.user) return;

  const q = query(collection(db, "attempts"), where("uid", "==", state.user.uid));
  const snapshot = await getDocs(q);

  state.attempts = snapshot.docs
    .map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }))
    .sort((a, b) => {
      const aSec = a.createdAt?.seconds || 0;
      const bSec = b.createdAt?.seconds || 0;
      return bSec - aSec;
    });
}

/* =====================================================
   8) 대시보드 통계
   ===================================================== */
function getDashboardStats() {
  const attempts = state.attempts;
  const totalAttempts = attempts.length;

  if (totalAttempts === 0) {
    return {
      totalAttempts: 0,
      averageScore: 0,
      totalWrongCount: 0,
      weakUnits: []
    };
  }

  const averageScore = Math.round(
    attempts.reduce((sum, item) => sum + (item.score || 0), 0) / totalAttempts
  );

  const totalWrongCount = attempts.reduce(
    (sum, item) => sum + ((item.totalQuestions || 0) - (item.correctCount || 0)),
    0
  );

  const unitWrongMap = {};

  attempts.forEach(item => {
    const wrongCount = (item.totalQuestions || 0) - (item.correctCount || 0);
    const unitName = item.unitName || item.unitId || "알 수 없는 단원";

    if (!unitWrongMap[unitName]) unitWrongMap[unitName] = 0;
    unitWrongMap[unitName] += wrongCount;
  });

  const weakUnits = Object.entries(unitWrongMap)
    .map(([unitName, wrongCount]) => ({ unitName, wrongCount }))
    .sort((a, b) => b.wrongCount - a.wrongCount)
    .slice(0, 3);

  return {
    totalAttempts,
    averageScore,
    totalWrongCount,
    weakUnits
  };
}

/* =====================================================
   9) 홈 화면
   ===================================================== */
function renderHome() {
  const stats = getDashboardStats();
  const email = state.user?.email || "로그인 안됨";

  app.innerHTML = `
    <section class="card">
      <h2>안녕하세요 👋</h2>
      <p class="info-text">
        초등학교 4학년 수학 단원을 선택해서 문제를 풀어보세요.
      </p>
      <p>
        <span class="badge badge-blue">로그인됨</span>
        ${escapeHtml(email)}
      </p>

      <div class="top-actions">
        <button class="btn-secondary" onclick="reloadAllData()">기록 새로고침</button>
        ${
          state.isAdmin
            ? `<button class="btn-primary" onclick="openBulkUploadPage()">문제 일괄 등록</button>`
            : ""
        }
        <button class="btn-danger" onclick="handleLogout()">로그아웃</button>
      </div>
    </section>

    <section class="card">
      <h3>내 학습 요약</h3>
      <div class="result-item">
        <p><strong>총 풀이 횟수:</strong> ${stats.totalAttempts}회</p>
        <p><strong>평균 점수:</strong> ${stats.averageScore}점</p>
        <p><strong>누적 오답 수:</strong> ${stats.totalWrongCount}개</p>
      </div>
    </section>

    <section class="card">
      <h3>자주 틀린 단원</h3>
      ${
        stats.weakUnits.length === 0
          ? `<div class="empty">아직 풀이 기록이 없어요.</div>`
          : stats.weakUnits
              .map(item => `
                <div class="result-item wrong">
                  <p><strong>${escapeHtml(item.unitName)}</strong></p>
                  <p>누적 오답 ${item.wrongCount}개</p>
                </div>
              `)
              .join("")
      }
    </section>

    <section class="card">
      <h3>단원 선택</h3>
      ${
        state.units.length === 0
          ? `<div class="empty">units 컬렉션이 비어 있어요.</div>`
          : `
            <div class="unit-grid">
              ${state.units.map(unit => `
                <div class="unit-card">
                  <div class="unit-title">${escapeHtml(unit.name)}</div>
                  <div class="unit-desc">${escapeHtml(unit.description || "")}</div>
                  <div class="button-row">
                    <button class="btn-primary" onclick="startQuiz('${unit.id}')">문제 풀기</button>
                  </div>
                </div>
              `).join("")}
            </div>
          `
      }
    </section>

    <section class="card">
      <h3>최근 풀이 기록</h3>
      ${
        state.attempts.length === 0
          ? `<div class="empty">아직 저장된 풀이 기록이 없어요.</div>`
          : state.attempts
              .slice(0, 5)
              .map(item => `
                <div class="result-item ${item.score >= 80 ? "correct" : "wrong"}">
                  <p><strong>${escapeHtml(item.unitName || item.unitId)}</strong></p>
                  <p>점수: ${item.score}점</p>
                  <p>정답 수: ${item.correctCount} / ${item.totalQuestions}</p>
                  <p>시간: ${formatDate(item.createdAt)}</p>
                </div>
              `)
              .join("")
      }
    </section>
  `;
}

window.renderHome = renderHome;

window.reloadAllData = async function () {
  try {
    renderLoading("데이터를 다시 불러오는 중입니다...");
    await loadUnitsFromFirestore();
    await loadAttemptsFromFirestore();
    renderHome();
  } catch (error) {
    console.error(error);
    renderError("데이터를 다시 불러오는 데 실패했어요.");
  }
};

/* =====================================================
   10) 문제 일괄 등록 화면
   - 단원을 하나 선택하고
   - 엑셀/구글시트에서 여러 줄 복사해서 붙여넣기
   - 탭(TSV) 기준으로 저장
   ===================================================== */
window.openBulkUploadPage = function () {
  if (!state.isAdmin) {
    alert("관리자만 접근할 수 있어요.");
    return;
  }

  if (state.units.length === 0) {
    alert("먼저 units 컬렉션이 있어야 합니다.");
    return;
  }

  app.innerHTML = `
    <section class="card">
      <h2>문제 일괄 등록</h2>
      <p class="admin-note">
        엑셀 또는 구글 시트에서 여러 행을 복사해서 아래에 붙여넣으면 됩니다.<br />
        선택한 단원으로 한 번에 여러 문제가 등록됩니다.
      </p>
      <div class="button-row">
        <button class="btn-secondary" onclick="renderHome()">홈으로</button>
      </div>
    </section>

    <section class="card">
      <div class="form-group">
        <label for="bulkUnitId">등록할 단원</label>
        <select id="bulkUnitId">
          ${state.units.map(unit => `
            <option value="${unit.id}">${escapeHtml(unit.name)}</option>
          `).join("")}
        </select>
      </div>

      <div class="form-group">
        <label for="bulkInput">엑셀 내용 붙여넣기</label>
        <textarea id="bulkInput" placeholder="order[TAB]question[TAB]choice1[TAB]choice2[TAB]choice3[TAB]choice4[TAB]answer[TAB]explanation"></textarea>
      </div>

      <p class="small-text">헤더 줄이 있어도 되고 없어도 됩니다.</p>

      <div class="code-sample">order\tquestion\tchoice1\tchoice2\tchoice3\tchoice4\tanswer\texplanation
1\t10000보다 1000 큰 수는 무엇인가요?\t11000\t10100\t10010\t20000\t11000\t10000에 1000을 더하면 11000입니다.
2\t9999보다 1 큰 수는 무엇인가요?\t10000\t9998\t1000\t90000\t10000\t9999 다음 수는 10000입니다.</div>

      <div class="button-row" style="margin-top:12px;">
        <button class="btn-primary" onclick="handleBulkUpload()">일괄 등록 실행</button>
        <button class="btn-secondary" onclick="fillBulkExample()">예시 넣기</button>
      </div>
    </section>
  `;
};

window.fillBulkExample = function () {
  const textarea = document.getElementById("bulkInput");
  if (!textarea) return;

  textarea.value = `order\tquestion\tchoice1\tchoice2\tchoice3\tchoice4\tanswer\texplanation
1\t25000보다 10000 큰 수는 무엇인가요?\t26000\t35000\t15000\t25010\t35000\t25000에 10000을 더하면 35000입니다.
2\t45000과 40500 중 더 큰 수는 무엇인가요?\t45000\t40500\t둘이 같다\t알 수 없다\t45000\t만의 자리 다음 천의 자리까지 비교하면 45000이 더 큽니다.`;
};

window.handleBulkUpload = async function () {
  const unitId = document.getElementById("bulkUnitId")?.value;
  const raw = document.getElementById("bulkInput")?.value.trim();

  if (!unitId) {
    alert("단원을 선택해 주세요.");
    return;
  }

  if (!raw) {
    alert("붙여넣을 내용을 입력해 주세요.");
    return;
  }

  try {
    const rows = parseBulkText(raw);

    if (rows.length === 0) {
      alert("등록할 행이 없어요.");
      return;
    }

    renderLoading("문제를 일괄 등록하는 중입니다...");

    const batch = writeBatch(db);

    rows.forEach((row, index) => {
      const order = Number(row.order || index + 1);
      const question = row.question?.trim();
      const choices = [
        row.choice1?.trim(),
        row.choice2?.trim(),
        row.choice3?.trim(),
        row.choice4?.trim()
      ];
      const answer = row.answer?.trim();
      const explanation = row.explanation?.trim();

      if (!question) {
        throw new Error(`${index + 1}번째 행: 문제 문장이 비어 있습니다.`);
      }

      if (choices.some(choice => !choice)) {
        throw new Error(`${index + 1}번째 행: 보기 4개를 모두 입력해야 합니다.`);
      }

      if (!choices.includes(answer)) {
        throw new Error(`${index + 1}번째 행: 정답은 보기 4개 중 하나와 정확히 일치해야 합니다.`);
      }

      if (!explanation) {
        throw new Error(`${index + 1}번째 행: 해설이 비어 있습니다.`);
      }

      const newRef = doc(collection(db, "questions"));

      batch.set(newRef, {
        unitId,
        order,
        question,
        choices,
        answer,
        explanation,
        isPublished: true,
        createdAt: serverTimestamp(),
        createdBy: state.user?.email || state.user?.uid || "unknown"
      });
    });

    await batch.commit();

    alert(`${rows.length}개 문제가 등록됐어요.`);
    renderHome();
  } catch (error) {
    console.error(error);
    alert("일괄 등록 실패: " + (error.message || "알 수 없는 오류"));
  }
};

function parseBulkText(raw) {
  const lines = raw
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  let startIndex = 0;
  const firstCells = lines[0].split("\t").map(item => item.trim().toLowerCase());

  if (
    firstCells.includes("order") &&
    firstCells.includes("question") &&
    firstCells.includes("choice1")
  ) {
    startIndex = 1;
  }

  const rows = [];

  for (let i = startIndex; i < lines.length; i++) {
    const cells = lines[i].split("\t");

    if (cells.length < 8) {
      throw new Error(`${i + 1}번째 줄의 칸 수가 부족합니다. (필수 8칸)`);
    }

    rows.push({
      order: cells[0],
      question: cells[1],
      choice1: cells[2],
      choice2: cells[3],
      choice3: cells[4],
      choice4: cells[5],
      answer: cells[6],
      explanation: cells.slice(7).join("\t")
    });
  }

  return rows;
}

/* =====================================================
   11) 퀴즈 시작
   ===================================================== */
window.startQuiz = async function (unitId, wrongOnly = false) {
  try {
    renderLoading("문제를 불러오는 중입니다...");

    state.currentUnitId = unitId;
    let unitQuestions = await loadQuestionsByUnit(unitId);

    if (wrongOnly) {
      unitQuestions = unitQuestions.filter(q => state.lastWrongIds.includes(q.id));
    }

    // ✅ 랜덤 섞기 (Fisher-Yates shuffle)
    for (let i = unitQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unitQuestions[i], unitQuestions[j]] = [unitQuestions[j], unitQuestions[i]];
    }

    // ✅ 최대 20개만 사용
    state.currentQuestions = unitQuestions.slice(0, 20);

    const unit = getCurrentUnit();

    if (state.currentQuestions.length === 0) {
      app.innerHTML = `
        <section class="card empty">
          <h2>문제가 없어요</h2>
          <p>아직 등록된 문제가 없거나 다시 풀 문제가 없습니다.</p>
          <div class="button-row">
            <button class="btn-secondary" onclick="renderHome()">홈으로</button>
          </div>
        </section>
      `;
      return;
    }

    app.innerHTML = `
      <section class="card">
        <h2>${unit ? escapeHtml(unit.name) : "문제 풀이"}</h2>
        <p class="info-text">총 ${state.currentQuestions.length}문제입니다.</p>
        <div class="button-row">
          <button class="btn-secondary" onclick="renderHome()">홈으로</button>
        </div>
      </section>

      <section class="card">
        <form id="quizForm">
          ${state.currentQuestions.map((q, index) => `
            <div class="question-box">
              <div class="question-title">${index + 1}. ${escapeHtml(q.question)}</div>
              ${(q.choices || []).map(choice => `
                <label class="choice">
                  <input type="radio" name="${q.id}" value="${escapeHtml(choice)}" />
                  ${escapeHtml(choice)}
                </label>
              `).join("")}
            </div>
          `).join("")}

          <div class="button-row">
            <button type="submit" class="btn-primary">채점하기</button>
            <button type="button" class="btn-secondary" onclick="renderHome()">취소</button>
          </div>
        </form>
      </section>
    `;

    document.getElementById("quizForm").addEventListener("submit", submitQuiz);
  } catch (error) {
    console.error(error);
    renderError("문제를 불러오는 데 실패했어요.");
  }
};

/* =====================================================
   12) 시도 저장
   ===================================================== */
async function saveAttemptToFirestore(score, correctCount, total, wrongIds) {
  if (!state.user) return;

  await addDoc(collection(db, "attempts"), {
    uid: state.user.uid,
    unitId: state.currentUnitId,
    unitName: getCurrentUnit()?.name || "",
    score,
    correctCount,
    totalQuestions: total,
    wrongQuestionIds: wrongIds,
    createdAt: serverTimestamp()
  });
}

/* =====================================================
   13) 채점
   ===================================================== */
async function submitQuiz(event) {
  event.preventDefault();

  let correctCount = 0;
  const results = [];
  const wrongIds = [];

  state.currentQuestions.forEach(q => {
    const selected = document.querySelector(`input[name="${q.id}"]:checked`);
    const userAnswer = selected ? selected.value : "선택 안 함";
    const isCorrect = userAnswer === q.answer;

    if (isCorrect) {
      correctCount++;
    } else {
      wrongIds.push(q.id);
    }

    results.push({
      ...q,
      userAnswer,
      isCorrect
    });
  });

  state.lastWrongIds = wrongIds;

  const total = state.currentQuestions.length;
  const score = Math.round((correctCount / total) * 100);

  try {
    await saveAttemptToFirestore(score, correctCount, total, wrongIds);
    await loadAttemptsFromFirestore();
  } catch (error) {
    console.error(error);
    alert("채점은 되었지만 기록 저장에 실패했어요.");
  }

  renderResult(results, correctCount, total);
}

/* =====================================================
   14) 결과 화면
   ===================================================== */
function renderResult(results, correctCount, total) {
  const score = Math.round((correctCount / total) * 100);
  const unit = getCurrentUnit();

  app.innerHTML = `
    <section class="card">
      <h2>${unit ? escapeHtml(unit.name) : "결과"} 결과</h2>

      <div class="score-box">
        <div>점수</div>
        <div class="score-number">${score}점</div>
        <div>${correctCount} / ${total} 문제 정답</div>
      </div>

      <div class="button-row">
        <button class="btn-primary" onclick="startQuiz('${state.currentUnitId}')">다시 풀기</button>
        <button class="btn-secondary" onclick="startQuiz('${state.currentUnitId}', true)">틀린 문제 다시 풀기</button>
        <button class="btn-secondary" onclick="renderHome()">홈으로</button>
      </div>
    </section>

    <section class="card">
      <h3>문항별 결과</h3>
      ${results.map((item, index) => `
        <div class="result-item ${item.isCorrect ? "correct" : "wrong"}">
          <div class="question-title">${index + 1}. ${escapeHtml(item.question)}</div>
          <p>
            ${item.isCorrect
              ? '<span class="badge badge-green">정답</span>'
              : '<span class="badge badge-red">오답</span>'}
          </p>
          <p><strong>내 답:</strong> ${escapeHtml(item.userAnswer)}</p>
          <p><strong>정답:</strong> ${escapeHtml(item.answer)}</p>
          <p><strong>해설:</strong> ${escapeHtml(item.explanation)}</p>
        </div>
      `).join("")}
    </section>
  `;
}

/* =====================================================
   15) 인증 상태 처리
   ===================================================== */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    state.user = null;
    state.isAdmin = false;
    state.units = [];
    state.attempts = [];
    renderAuthPage();
    return;
  }

  state.user = user;
  state.isAdmin = ADMIN_EMAILS.includes((user.email || "").toLowerCase());

  try {
    renderLoading("데이터를 불러오는 중입니다...");
    await loadUnitsFromFirestore();
    await loadAttemptsFromFirestore();
    renderHome();
  } catch (error) {
    console.error(error);
    renderError("초기 데이터를 불러오지 못했어요.");
  }
});

renderLoading("앱을 준비하는 중입니다...");

window.seedUnits = async function () {
  if (state.units.length > 0) {
    if (!confirm("이미 단원이 존재합니다. 계속 추가할까요?")) return;
  }

  if (!state.isAdmin) {
    alert("관리자만 실행할 수 있어요.");
    return;
  }

  const units = [
    { name: "4. 평면도형의 이동", order: 4 },
    { name: "5. 막대그래프", order: 5 },
    { name: "6. 규칙 찾기", order: 6 },
    { name: "7. 분수의 덧셈과 뺄셈", order: 7 },
    { name: "8. 삼각형", order: 8 },
    { name: "9. 소수의 덧셈과 뺄셈", order: 9 },
    { name: "10. 사각형", order: 10 },
    { name: "11. 꺾은선그래프", order: 11 },
    { name: "12. 다각형", order: 12 }
  ];

  try {
    renderLoading("단원 추가 중입니다...");

    const batch = writeBatch(db);

    units.forEach(u => {
      const ref = doc(collection(db, "units"));
      batch.set(ref, {
        name: u.name,
        description: "",
        order: u.order,
        isActive: true
      });
    });

    await batch.commit();

    alert("4학년 단원 추가 완료!");
    await loadUnitsFromFirestore();
    renderHome();
  } catch (e) {
    console.error(e);
    alert("단원 추가 실패");
  }
};