import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
  doc,
  writeBatch
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
   2) Firebase 초기화
   ===================================================== */
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

/* =====================================================
   3) 샘플 데이터
   ===================================================== */
const sampleUnits = [
  {
    id: "unit1",
    name: "1단원 큰 수",
    description: "큰 수를 읽고, 쓰고, 크기를 비교해요.",
    subject: "math",
    grade: 4,
    semester: 1,
    order: 1,
    isActive: true
  },
  {
    id: "unit2",
    name: "2단원 각도",
    description: "각의 크기를 이해하고 각도를 재고 그려요.",
    subject: "math",
    grade: 4,
    semester: 1,
    order: 2,
    isActive: true
  },
  {
    id: "unit3",
    name: "3단원 곱셈과 나눗셈",
    description: "곱셈과 나눗셈 계산을 정확하게 해요.",
    subject: "math",
    grade: 4,
    semester: 1,
    order: 3,
    isActive: true
  }
];

const sampleQuestions = [
  {
    id: "q1",
    unitId: "unit1",
    order: 1,
    question: "10000보다 1000 큰 수는 무엇인가요?",
    choices: ["11000", "10100", "10010", "20000"],
    answer: "11000",
    explanation: "10000에 1000을 더하면 11000입니다.",
    isPublished: true
  },
  {
    id: "q2",
    unitId: "unit1",
    order: 2,
    question: "다음 수 중 가장 큰 수는 무엇인가요?",
    choices: ["9800", "10080", "10008", "9999"],
    answer: "10080",
    explanation: "10080은 만보다 크고, 나머지보다도 큽니다.",
    isPublished: true
  },
  {
    id: "q3",
    unitId: "unit1",
    order: 3,
    question: "칠만오천삼백이십을 숫자로 바르게 쓴 것은?",
    choices: ["75320", "705320", "750320", "703520"],
    answer: "75320",
    explanation: "칠만=70000, 오천=5000, 삼백=300, 이십=20 이므로 75320입니다.",
    isPublished: true
  },
  {
    id: "q4",
    unitId: "unit1",
    order: 4,
    question: "45000과 40500 중 더 큰 수는 무엇인가요?",
    choices: ["45000", "40500", "둘이 같다", "알 수 없다"],
    answer: "45000",
    explanation: "만의 자리 다음 천의 자리까지 비교하면 45000이 더 큽니다.",
    isPublished: true
  },
  {
    id: "q5",
    unitId: "unit1",
    order: 5,
    question: "9999보다 1 큰 수는 무엇인가요?",
    choices: ["10000", "9998", "1000", "90000"],
    answer: "10000",
    explanation: "9999 다음 수는 10000입니다.",
    isPublished: true
  },

  {
    id: "q6",
    unitId: "unit2",
    order: 1,
    question: "직각의 크기는 몇 도인가요?",
    choices: ["45도", "90도", "180도", "360도"],
    answer: "90도",
    explanation: "직각은 90도입니다.",
    isPublished: true
  },
  {
    id: "q7",
    unitId: "unit2",
    order: 2,
    question: "90도보다 작은 각은 무엇이라고 하나요?",
    choices: ["둔각", "직각", "예각", "평각"],
    answer: "예각",
    explanation: "90도보다 작은 각은 예각입니다.",
    isPublished: true
  },
  {
    id: "q8",
    unitId: "unit2",
    order: 3,
    question: "180도인 각은 무엇이라고 하나요?",
    choices: ["예각", "평각", "직각", "둔각"],
    answer: "평각",
    explanation: "180도인 각은 평각입니다.",
    isPublished: true
  },
  {
    id: "q9",
    unitId: "unit2",
    order: 4,
    question: "다음 중 둔각인 것은 무엇인가요?",
    choices: ["30도", "60도", "90도", "120도"],
    answer: "120도",
    explanation: "90도보다 크고 180도보다 작은 각은 둔각입니다.",
    isPublished: true
  },
  {
    id: "q10",
    unitId: "unit2",
    order: 5,
    question: "각도기를 사용해 재는 대상은 무엇인가요?",
    choices: ["길이", "무게", "넓이", "각의 크기"],
    answer: "각의 크기",
    explanation: "각도기는 각의 크기를 재는 도구입니다.",
    isPublished: true
  },

  {
    id: "q11",
    unitId: "unit3",
    order: 1,
    question: "24 × 3의 값은 무엇인가요?",
    choices: ["62", "72", "82", "96"],
    answer: "72",
    explanation: "24를 3번 더하면 72입니다.",
    isPublished: true
  },
  {
    id: "q12",
    unitId: "unit3",
    order: 2,
    question: "96 ÷ 4의 값은 무엇인가요?",
    choices: ["24", "26", "28", "32"],
    answer: "24",
    explanation: "96을 4로 나누면 24입니다.",
    isPublished: true
  },
  {
    id: "q13",
    unitId: "unit3",
    order: 3,
    question: "35 × 2의 값은 무엇인가요?",
    choices: ["60", "65", "70", "75"],
    answer: "70",
    explanation: "35를 2배 하면 70입니다.",
    isPublished: true
  },
  {
    id: "q14",
    unitId: "unit3",
    order: 4,
    question: "81 ÷ 9의 값은 무엇인가요?",
    choices: ["7", "8", "9", "10"],
    answer: "9",
    explanation: "9 × 9 = 81 이므로 81 ÷ 9 = 9 입니다.",
    isPublished: true
  },
  {
    id: "q15",
    unitId: "unit3",
    order: 5,
    question: "48 ÷ 6의 값은 무엇인가요?",
    choices: ["6", "7", "8", "9"],
    answer: "8",
    explanation: "6 × 8 = 48 이므로 48 ÷ 6 = 8 입니다.",
    isPublished: true
  }
];

/* =====================================================
   4) 앱 상태
   ===================================================== */
const app = document.getElementById("app");

const state = {
  user: null,
  units: [],
  attempts: [],
  currentUnitId: null,
  currentQuestions: [],
  lastWrongIds: []
};

/* =====================================================
   5) 공통 함수
   ===================================================== */
function renderLoading(message = "불러오는 중입니다...") {
  app.innerHTML = `
    <section class="card empty">
      <h2>${message}</h2>
      <p class="info-text">잠시만 기다려 주세요.</p>
    </section>
  `;
}

function renderError(message) {
  app.innerHTML = `
    <section class="card">
      <h2>오류가 발생했어요</h2>
      <p class="info-text">${message}</p>
      <div class="button-row">
        <button class="btn-secondary" onclick="location.reload()">새로고침</button>
      </div>
    </section>
  `;
}

function getCurrentUnit() {
  return state.units.find(unit => unit.id === state.currentUnitId);
}

function formatDate(timestamp) {
  if (!timestamp || !timestamp.seconds) return "방금 전";
  const date = new Date(timestamp.seconds * 1000);
  return date.toLocaleString("ko-KR");
}

/* =====================================================
   6) Firestore 로드 함수
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
   7) 통계 계산
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

    if (!unitWrongMap[unitName]) {
      unitWrongMap[unitName] = 0;
    }
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
   8) 홈 화면
   ===================================================== */
function renderHome() {
  const shortUid = state.user ? state.user.uid.slice(0, 8) : "로그인 안됨";

  if (state.units.length === 0) {
    app.innerHTML = `
      <section class="card">
        <h2>단원 데이터가 아직 없어요</h2>
        <p class="info-text">
          아래 버튼을 누르면 초4 수학 샘플 단원과 문제가 Firestore에 저장됩니다.
        </p>
        <p>
          <span class="badge badge-blue">로그인됨</span>
          사용자 ID: ${shortUid}
        </p>
        <div class="button-row">
          <button class="btn-primary" onclick="seedSampleData()">샘플 데이터 넣기</button>
          <button class="btn-secondary" onclick="reloadAllData()">다시 불러오기</button>
        </div>
      </section>
    `;
    return;
  }

  const stats = getDashboardStats();

  app.innerHTML = `
    <section class="card">
      <h2>안녕하세요 👋</h2>
      <p class="info-text">
        초등학교 4학년 수학 단원을 선택해서 문제를 풀어보세요.
        아래에서 최근 학습 기록도 함께 볼 수 있어요.
      </p>
      <p>
        <span class="badge badge-blue">로그인됨</span>
        사용자 ID: ${shortUid}
      </p>
      <div class="button-row">
        <button class="btn-secondary" onclick="reloadAllData()">기록 새로고침</button>
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
              .map(
                item => `
                <div class="result-item wrong">
                  <p><strong>${item.unitName}</strong></p>
                  <p>누적 오답 ${item.wrongCount}개</p>
                </div>
              `
              )
              .join("")
      }
    </section>

    <section class="card">
      <h3>단원 선택</h3>
      <div class="unit-grid">
        ${state.units.map(unit => `
          <div class="unit-card">
            <div class="unit-title">${unit.name}</div>
            <div class="unit-desc">${unit.description}</div>
            <div class="button-row">
              <button class="btn-primary" onclick="startQuiz('${unit.id}')">문제 풀기</button>
            </div>
          </div>
        `).join("")}
      </div>
    </section>

    <section class="card">
      <h3>최근 풀이 기록</h3>
      ${
        state.attempts.length === 0
          ? `<div class="empty">아직 저장된 풀이 기록이 없어요.</div>`
          : state.attempts
              .slice(0, 5)
              .map(
                item => `
                <div class="result-item ${item.score >= 80 ? "correct" : "wrong"}">
                  <p><strong>${item.unitName || item.unitId}</strong></p>
                  <p>점수: ${item.score}점</p>
                  <p>정답 수: ${item.correctCount} / ${item.totalQuestions}</p>
                  <p>시간: ${formatDate(item.createdAt)}</p>
                </div>
              `
              )
              .join("")
      }
    </section>
  `;
}

/* =====================================================
   9) 샘플 데이터 입력
   ===================================================== */
window.seedSampleData = async function () {
  try {
    renderLoading("샘플 데이터를 Firestore에 저장하는 중입니다...");

    const batch = writeBatch(db);

    sampleUnits.forEach(unit => {
      const { id, ...data } = unit;
      batch.set(doc(db, "units", id), data);
    });

    sampleQuestions.forEach(question => {
      const { id, ...data } = question;
      batch.set(doc(db, "questions", id), data);
    });

    await batch.commit();
    await loadUnitsFromFirestore();
    await loadAttemptsFromFirestore();
    renderHome();

    alert("샘플 데이터 저장이 완료됐어요.");
  } catch (error) {
    console.error(error);
    renderError("샘플 데이터 저장에 실패했어요.");
  }
};

/* =====================================================
   10) 전체 새로고침
   ===================================================== */
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

    state.currentQuestions = unitQuestions;
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
        <h2>${unit ? unit.name : "문제 풀이"}</h2>
        <p class="info-text">총 ${state.currentQuestions.length}문제입니다.</p>
        <div class="button-row">
          <button class="btn-secondary" onclick="renderHome()">홈으로</button>
        </div>
      </section>

      <section class="card">
        <form id="quizForm">
          ${state.currentQuestions.map((q, index) => `
            <div class="question-box">
              <div class="question-title">${index + 1}. ${q.question}</div>
              ${(q.choices || []).map(choice => `
                <label class="choice">
                  <input type="radio" name="${q.id}" value="${choice}" />
                  ${choice}
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
   12) 시도 기록 저장
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
    alert("채점은 되었지만 Firebase 저장에 실패했어요.");
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
      <h2>${unit ? unit.name : "결과"} 결과</h2>

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
          <div class="question-title">${index + 1}. ${item.question}</div>
          <p>
            ${item.isCorrect
              ? '<span class="badge badge-green">정답</span>'
              : '<span class="badge badge-red">오답</span>'}
          </p>
          <p><strong>내 답:</strong> ${item.userAnswer}</p>
          <p><strong>정답:</strong> ${item.answer}</p>
          <p><strong>해설:</strong> ${item.explanation}</p>
        </div>
      `).join("")}
    </section>
  `;
}

window.renderHome = renderHome;

/* =====================================================
   15) 로그인 및 초기화
   ===================================================== */
async function startAnonymousLogin() {
  try {
    await signInAnonymously(auth);
  } catch (error) {
    console.error(error);
    renderError("익명 로그인에 실패했어요. Authentication 설정을 확인해 주세요.");
  }
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    state.user = user;

    try {
      renderLoading("홈 데이터를 불러오는 중입니다...");
      await loadUnitsFromFirestore();
      await loadAttemptsFromFirestore();
      renderHome();
    } catch (error) {
      console.error(error);
      renderError("초기 데이터를 불러오지 못했어요.");
    }
  } else {
    await startAnonymousLogin();
  }
});

renderLoading("Firebase 연결 중입니다...");
