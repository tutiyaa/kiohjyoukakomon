
"use strict";

// ========================================
// 1. 問題データの読み込み
// ========================================

const questionSets = [
  window.questions2018,
  window.questions2019,
  window.questions2020,
  window.questions2021,
  window.questions2022,
  window.questions2023,
  window.questions2024,
  window.questions2025
];

const questions = questionSets.flatMap(set =>
  Array.isArray(set) ? set : []
);

// 以前の問題データで確認された正解番号の補正
// 2024年度 Q24026：正解は120万円（2番目）
// 2025年度 Q25031：正解は11（3番目）
const answerCorrections = new Map([
  [24026, 1],
  [25031, 2]
]);

questions.forEach(question => {
  if (answerCorrections.has(question.id)) {
    question.answer = answerCorrections.get(question.id);
  }
});

// ========================================
// 2. 保存データ
// ========================================

const STORAGE_KEY = "feStudy480Data";

function createInitialStats() {
  return {
    answered: 0,
    correct: 0,
    incorrectIds: [],
    categoryStats: {}
  };
}

function loadStats() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return createInitialStats();
    }

    const data = JSON.parse(saved);

    return {
      answered: Number(data.answered) || 0,
      correct: Number(data.correct) || 0,
      incorrectIds: Array.isArray(data.incorrectIds)
        ? data.incorrectIds
        : [],
      categoryStats:
        data.categoryStats &&
        typeof data.categoryStats === "object"
          ? data.categoryStats
          : {}
    };
  } catch (error) {
    console.error("保存データの読み込みに失敗しました。", error);
    return createInitialStats();
  }
}

let stats = loadStats();

function saveStats() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (error) {
    console.error("成績の保存に失敗しました。", error);
  }
}

// ========================================
// 3. 画面要素の取得
// ========================================

const homeScreen = document.getElementById("home-screen");
const quizScreen = document.getElementById("quiz-screen");
const resultScreen = document.getElementById("result-screen");

const yearSelect = document.getElementById("year-select");
const subjectSelect = document.getElementById("subject-select");
const categorySelect = document.getElementById("category-select");

const startButton = document.getElementById("start-button");
const homeReviewButton = document.getElementById("home-review-button");
const quitButton = document.getElementById("quit-button");
const nextButton = document.getElementById("next-button");
const homeButton = document.getElementById("home-button");
const resultReviewButton = document.getElementById("result-review-button");
const homeLogo = document.getElementById("home-logo");

const totalAnswered = document.getElementById("total-answered");
const totalCorrect = document.getElementById("total-correct");
const totalRate = document.getElementById("total-rate");
const totalMistakes = document.getElementById("total-mistakes");

const availableCount = document.getElementById("available-count");
const weakArea = document.getElementById("weak-area");
const dataStatus = document.getElementById("data-status");

const questionNumber = document.getElementById("question-number");
const progressPercent = document.getElementById("progress-percent");
const progressBar = document.getElementById("progress-bar");
const quizMode = document.getElementById("quiz-mode");

const questionYear = document.getElementById("question-year");
const questionSubject = document.getElementById("question-subject");
const questionCategory = document.getElementById("question-category");
const questionText = document.getElementById("question-text");
const choicesContainer = document.getElementById("choices");

const feedback = document.getElementById("feedback");
const feedbackTitle = document.getElementById("feedback-title");
const feedbackExplanation = document.getElementById("feedback-explanation");

const resultRate = document.getElementById("result-rate");
const resultTotal = document.getElementById("result-total");
const resultCorrect = document.getElementById("result-correct");
const resultWrong = document.getElementById("result-wrong");
const resultMessage = document.getElementById("result-message");
const resultMistakes = document.getElementById("result-mistakes");

// ========================================
// 4. 学習状態
// ========================================

let currentQuestions = [];
let currentIndex = 0;
let sessionResults = [];
let answeredCurrent = false;
let currentMode = "normal";

// ========================================
// 5. 画面切り替え
// ========================================

function showScreen(screen) {
  homeScreen.classList.add("hidden");
  quizScreen.classList.add("hidden");
  resultScreen.classList.add("hidden");

  screen.classList.remove("hidden");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

// ========================================
// 6. 問題データの確認
// ========================================

function checkQuestionData() {
  const errors = [];

  if (questions.length === 0) {
    errors.push("問題データが読み込まれていません。");
  }

  const expectedYears = [
    2018, 2019, 2020, 2021,
    2022, 2023, 2024, 2025
  ];

  expectedYears.forEach(year => {
    const yearQuestions = questions.filter(q => q.year === year);

    const subjectA = yearQuestions.filter(q => q.subject === "A").length;
    const subjectB = yearQuestions.filter(q => q.subject === "B").length;

    if (subjectA !== 30 || subjectB !== 30) {
      errors.push(
        `${year}年度：科目A ${subjectA}問、科目B ${subjectB}問`
      );
    }
  });

  const ids = questions.map(q => q.id);
  const uniqueIds = new Set(ids);

  if (uniqueIds.size !== ids.length) {
    errors.push("問題IDが重複しています。");
  }

  questions.forEach(q => {
    if (
      !Array.isArray(q.choices) ||
      q.choices.length !== 4 ||
      !Number.isInteger(q.answer) ||
      q.answer < 0 ||
      q.answer > 3
    ) {
      errors.push(`問題ID ${q.id} の選択肢または正解番号に問題があります。`);
    }
  });

  if (errors.length > 0) {
    dataStatus.textContent =
      "データ確認：問題があります。 " + errors.join(" / ");
    dataStatus.classList.add("error");
  } else {
    dataStatus.textContent =
      `問題データを正常に読み込みました。全${questions.length}問`;
    dataStatus.classList.remove("error");
  }
}

// ========================================
// 7. ホーム画面の成績表示
// ========================================

function updateHomeStats() {
  totalAnswered.textContent = stats.answered;
  totalCorrect.textContent = stats.correct;

  const rate = stats.answered > 0
    ? Math.round(stats.correct / stats.answered * 100)
    : 0;

  totalRate.textContent = rate + "%";
  totalMistakes.textContent = stats.incorrectIds.length;

  homeReviewButton.disabled = stats.incorrectIds.length === 0;

  resultReviewButton.disabled = stats.incorrectIds.length === 0;

  updateWeakAreas();
}

// ========================================
// 8. 苦手分野の表示
// ========================================

function updateWeakAreas() {
  weakArea.replaceChildren();

  const categories = Object.entries(stats.categoryStats)
    .map(([name, data]) => ({
      name,
      answered: Number(data.answered) || 0,
      correct: Number(data.correct) || 0
    }))
    .filter(data => data.answered > 0)
    .sort((a, b) => {
      const rateA = a.correct / a.answered;
      const rateB = b.correct / b.answered;
      return rateA - rateB;
    });

  if (categories.length === 0) {
    const message = document.createElement("p");
    message.className = "empty-message";
    message.textContent =
      "まだ学習履歴がありません。まずは問題に挑戦してみよう！";

    weakArea.appendChild(message);
    return;
  }

  categories.slice(0, 5).forEach(category => {
    const rate = Math.round(
      category.correct / category.answered * 100
    );

    const item = document.createElement("div");
    item.className = "weak-item";

    const name = document.createElement("span");
    name.textContent =
      `${category.name}（${category.answered}問解答）`;

    const score = document.createElement("strong");
    score.textContent = `${rate}%`;

    item.append(name, score);
    weakArea.appendChild(item);
  });
}

// ========================================
// 9. 分野選択の更新
// ========================================

function updateCategoryOptions() {
  const year = yearSelect.value;
  const subject = subjectSelect.value;

  const filtered = questions.filter(q => {
    const yearMatch =
      year === "all" || String(q.year) === year;

    const subjectMatch =
      subject === "all" || q.subject === subject;

    return yearMatch && subjectMatch;
  });

  const categories = [
    ...new Set(filtered.map(q => q.category))
  ].sort();

  const previousValue = categorySelect.value;

  categorySelect.replaceChildren();

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "すべての分野";
  categorySelect.appendChild(allOption);

  categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });

  if (categories.includes(previousValue)) {
    categorySelect.value = previousValue;
  }

  updateAvailableCount();
}

// ========================================
// 10. 出題対象の絞り込み
// ========================================

function getFilteredQuestions() {
  const year = yearSelect.value;
  const subject = subjectSelect.value;
  const category = categorySelect.value;

  return questions.filter(q => {
    const yearMatch =
      year === "all" || String(q.year) === year;

    const subjectMatch =
      subject === "all" || q.subject === subject;

    const categoryMatch =
      category === "all" || q.category === category;

    return yearMatch && subjectMatch && categoryMatch;
  });
}

function updateAvailableCount() {
  const filtered = getFilteredQuestions();

  availableCount.textContent =
    `出題できる問題：${filtered.length}問`;

  startButton.disabled = filtered.length === 0;
}

// ========================================
// 11. 学習開始
// ========================================

function startQuiz(questionList, mode = "normal") {
  if (!questionList || questionList.length === 0) {
    alert("出題できる問題がありません。");
    return;
  }

  currentQuestions = [...questionList];
  currentIndex = 0;
  sessionResults = [];
  answeredCurrent = false;
  currentMode = mode;

  quizMode.textContent =
    mode === "review" ? "間違えた問題の復習" : "通常学習";

  showScreen(quizScreen);
  showQuestion();
}

// ========================================
// 12. 問題表示
// ========================================

function showQuestion() {
  const question = currentQuestions[currentIndex];

  if (!question) {
    finishQuiz();
    return;
  }

  answeredCurrent = false;

  questionNumber.textContent =
    `問題 ${currentIndex + 1} / ${currentQuestions.length}`;

  const percent = Math.round(
    currentIndex / currentQuestions.length * 100
  );

  progressPercent.textContent = percent + "%";
  progressBar.style.width = percent + "%";

  questionYear.textContent = `${question.year}年度`;
  questionSubject.textContent =
    question.subject === "A" ? "科目A" : "科目B";

  questionCategory.textContent = question.category;
  questionText.textContent = question.question;

  choicesContainer.replaceChildren();

  feedback.classList.add("hidden");
  feedback.classList.remove("correct", "incorrect");
  nextButton.classList.add("hidden");

  question.choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-button";

    const number = document.createElement("span");
    number.className = "choice-number";
    number.textContent = String(index + 1);

    const text = document.createElement("span");
    text.textContent = choice;

    button.append(number, text);

    button.addEventListener("click", () => {
      answerQuestion(index);
    });

    choicesContainer.appendChild(button);
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

// ========================================
// 13. 解答処理
// ========================================

function answerQuestion(selectedIndex) {
  if (answeredCurrent) {
    return;
  }

  answeredCurrent = true;

  const question = currentQuestions[currentIndex];
  const isCorrect = selectedIndex === question.answer;

  // 選択肢の見た目を更新
  const buttons = choicesContainer.querySelectorAll("button");

  buttons.forEach((button, index) => {
    button.disabled = true;

    if (index === question.answer) {
      button.classList.add("correct");
    }

    if (index === selectedIndex && !isCorrect) {
      button.classList.add("incorrect");
    }
  });

  // フィードバック表示
  feedback.classList.remove("hidden");
  feedback.classList.add(
    isCorrect ? "correct" : "incorrect"
  );

  feedbackTitle.textContent =
    isCorrect ? "正解！" : "不正解";

  feedbackExplanation.textContent =
    question.explanation || "解説はありません。";

  // 学習記録
  sessionResults.push({
    question,
    selectedIndex,
    isCorrect
  });

  recordAnswer(question, isCorrect);

  // 進捗更新
  const percent = Math.round(
    (currentIndex + 1) / currentQuestions.length * 100
  );

  progressPercent.textContent = percent + "%";
  progressBar.style.width = percent + "%";

  nextButton.textContent =
    currentIndex === currentQuestions.length - 1
      ? "結果を見る"
      : "次の問題へ";

  nextButton.classList.remove("hidden");
}

// ========================================
// 14. 成績を記録
// ========================================

function recordAnswer(question, isCorrect) {
  stats.answered++;

  if (isCorrect) {
    stats.correct++;
  }

  const category = question.category || "その他";

  if (!stats.categoryStats[category]) {
    stats.categoryStats[category] = {
      answered: 0,
      correct: 0
    };
  }

  stats.categoryStats[category].answered++;

  if (isCorrect) {
    stats.categoryStats[category].correct++;

    // 正解した問題は復習リストから除く
    stats.incorrectIds = stats.incorrectIds.filter(
      id => id !== question.id
    );
  } else {
    // 間違えた問題を復習リストに追加
    if (!stats.incorrectIds.includes(question.id)) {
      stats.incorrectIds.push(question.id);
    }
  }

  saveStats();
  updateHomeStats();
}

// ========================================
// 15. 次の問題へ
// ========================================

function nextQuestion() {
  if (!answeredCurrent) {
    return;
  }

  currentIndex++;

  if (currentIndex >= currentQuestions.length) {
    finishQuiz();
  } else {
    showQuestion();
  }
}

// ========================================
// 16. 結果画面
// ========================================

function finishQuiz() {
  const total = sessionResults.length;

  const correct = sessionResults.filter(
    result => result.isCorrect
  ).length;

  const wrong = total - correct;

  const rate = total > 0
    ? Math.round(correct / total * 100)
    : 0;

  resultRate.textContent = rate + "%";
  resultTotal.textContent = total + "問";
  resultCorrect.textContent = correct + "問";
  resultWrong.textContent = wrong + "問";

  if (rate === 100) {
    resultMessage.textContent =
      "全問正解！すばらしい！";
  } else if (rate >= 80) {
    resultMessage.textContent =
      "いい調子！合格に向けて順調だよ。";
  } else if (rate >= 60) {
    resultMessage.textContent =
      "あと少し！間違えた問題を復習しよう。";
  } else {
    resultMessage.textContent =
      "復習のチャンス！一つずつ覚えていこう。";
  }

  showResultMistakes();

  resultReviewButton.disabled =
    stats.incorrectIds.length === 0;

  showScreen(resultScreen);
}

// ========================================
// 17. 間違えた問題の一覧
// ========================================

function showResultMistakes() {
  resultMistakes.replaceChildren();

  const mistakes = sessionResults.filter(
    result => !result.isCorrect
  );

  if (mistakes.length === 0) {
    const message = document.createElement("p");
    message.className = "empty-message";
    message.textContent = "全問正解！間違えた問題はありません。";

    resultMistakes.appendChild(message);
    return;
  }

  mistakes.forEach((result, index) => {
    const question = result.question;

    const item = document.createElement("article");
    item.className = "mistake-item";

    const heading = document.createElement("h3");
    heading.textContent =
      `不正解 ${index + 1}：${question.year}年度・${question.category}`;

    const questionTextElement = document.createElement("p");
    questionTextElement.textContent = question.question;

    const yourAnswer = document.createElement("p");
    yourAnswer.className = "mistake-your-answer";
    yourAnswer.textContent =
      `あなたの回答：${question.choices[result.selectedIndex]}`;

    const correctAnswer = document.createElement("p");
    correctAnswer.className = "mistake-answer";
    correctAnswer.textContent =
      `正解：${question.choices[question.answer]}`;

    const explanation = document.createElement("p");
    explanation.textContent =
      `解説：${question.explanation || "解説はありません。"}`;

    item.append(
      heading,
      questionTextElement,
      yourAnswer,
      correctAnswer,
      explanation
    );

    resultMistakes.appendChild(item);
  });
}

// ========================================
// 18. 間違えた問題を復習
// ========================================

function startReview() {
  const incorrectSet = new Set(stats.incorrectIds);

  const reviewQuestions = questions.filter(
    question => incorrectSet.has(question.id)
  );

  if (reviewQuestions.length === 0) {
    alert("復習する問題はありません。");
    return;
  }

  startQuiz(reviewQuestions, "review");
}

// ========================================
// 19. ホームへ戻る
// ========================================

function goHome() {
  updateHomeStats();
  updateCategoryOptions();
  showScreen(homeScreen);
}

// ========================================
// 20. イベント設定
// ========================================

yearSelect.addEventListener("change", updateCategoryOptions);

subjectSelect.addEventListener("change", updateCategoryOptions);

categorySelect.addEventListener("change", updateAvailableCount);

startButton.addEventListener("click", () => {
  startQuiz(getFilteredQuestions(), "normal");
});

homeReviewButton.addEventListener("click", startReview);

resultReviewButton.addEventListener("click", startReview);

nextButton.addEventListener("click", nextQuestion);

quitButton.addEventListener("click", () => {
  const shouldQuit = confirm(
    "学習を終了してホームに戻りますか？\n今回の途中経過は成績に保存されています。"
  );

  if (shouldQuit) {
    goHome();
  }
});

homeButton.addEventListener("click", goHome);

homeLogo.addEventListener("click", event => {
  event.preventDefault();
  goHome();
});

// ========================================
// 21. アプリ起動
// ========================================

checkQuestionData();
updateHomeStats();
updateCategoryOptions();
showScreen(homeScreen);
