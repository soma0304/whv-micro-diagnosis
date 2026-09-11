const questions = [
  { id: 'timing', title: '渡航予定はいつですか？', hint: '準備期間と、渡航後すぐ働く必要性を見ます。', choices: [
    ['within_3', '3か月以内', '到着後すぐ仕事を始めたい'], ['within_6', '4〜6か月後', '準備に少し時間を使える'], ['later', '7か月以上先', '英語や資金を整えてから行きたい']
  ]},
  { id: 'english', title: '今の英語力に一番近いのは？', hint: '自己評価で大丈夫です。正解・不正解はありません。', choices: [
    ['beginner', '簡単な挨拶・単語なら分かる', '面接や会話にはかなり不安がある'], ['basic', '簡単な会話ならできる', 'ゆっくりなら質問を理解できる'], ['intermediate', '日常会話や面接に対応できる', '分からない時に聞き返せる']
  ]},
  { id: 'goal', title: 'ワーホリで一番重視したいことは？', hint: '複数ある場合は、今いちばん優先したいものを選んでください。', choices: [
    ['job', '現地で仕事を見つける', 'できればローカルの職場で働きたい'], ['english', '英語を伸ばす', '英語を使う環境を増やしたい'], ['saving', 'できるだけ貯金する', '支出を抑えて働く時間を増やしたい'], ['experience', '旅行や経験を重視する', '仕事と生活のバランスを取りたい']
  ]},
  { id: 'job', title: '希望する仕事に近いのは？', hint: 'まだ決まっていなければ、一番興味があるものを選んでください。', choices: [
    ['local', 'ローカルの接客・オフィス', '英語での面接や接客が必要'], ['japanese', '日本食店・日本語環境', 'まずは仕事を得ることを優先'], ['farm', 'ファーム・地方の仕事', '移動や車が必要になる場合がある'], ['undecided', 'まだ決めていない', '現地で選択肢を見ながら決めたい']
  ]},
  { id: 'budget', title: '渡航時に使える初期資金は？', hint: '学費を払った後に、仕事が決まるまでの生活費が残るかを見ます。', choices: [
    ['low', '80万円未満', '費用と無収入期間をかなり抑えたい'], ['mid', '80〜150万円', '短期の準備なら検討できる'], ['high', '150万円以上', '準備期間にある程度投資できる']
  ]},
  { id: 'environment', title: '渡航後、自分で英語環境を作れそう？', hint: '学校以外の環境も大切です。', choices: [
    ['hard', '難しそう', '日本語環境に流れそう／一人だと不安'], ['maybe', '努力すればできそう', '仕事や住居次第で変わりそう'], ['easy', '作れそう', '英語の職場や住居を自分で探せる']
  ]}
];

const state = { index: 0, answers: {} };
const questionArea = document.querySelector('#question-area');
const nextBtn = document.querySelector('#next-btn');
const backBtn = document.querySelector('#back-btn');
const quiz = document.querySelector('#quiz');
const result = document.querySelector('#result');

function track(event, details = {}) {
  const key = 'whv_micro_diagnosis_events';
  const events = JSON.parse(localStorage.getItem(key) || '[]');
  const record = { event, details, at: new Date().toISOString() };
  events.push(record);
  localStorage.setItem(key, JSON.stringify(events));
  if (location.protocol !== 'file:') {
    fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record), keepalive: true }).catch(() => {});
  }
}

function render() {
  const q = questions[state.index];
  const answer = state.answers[q.id];
  questionArea.innerHTML = `<p class="question-kicker">QUESTION ${String(state.index + 1).padStart(2, '0')}</p><h2 class="question-title">${q.title}</h2><p class="question-hint">${q.hint}</p><div class="choices">${q.choices.map(([value, title, note]) => `<button type="button" class="choice ${answer === value ? 'selected' : ''}" data-value="${value}"><span class="choice-dot"></span><span><strong>${title}</strong><small>${note}</small></span></button>`).join('')}</div>`;
  questionArea.querySelectorAll('.choice').forEach(button => button.addEventListener('click', () => {
    state.answers[q.id] = button.dataset.value;
    track('answer_selected', { question: q.id, value: button.dataset.value, step: state.index + 1 });
    render();
  }));
  const percent = Math.round(((state.index + 1) / questions.length) * 100);
  document.querySelector('#step-label').textContent = `${state.index + 1} / ${questions.length}`;
  document.querySelector('#progress-percent').textContent = `${percent}%`;
  document.querySelector('#progress-bar').style.width = `${percent}%`;
  nextBtn.disabled = !answer;
  nextBtn.textContent = state.index === questions.length - 1 ? '結果を見る' : '次へ';
  backBtn.hidden = state.index === 0;
}

function calculate() {
  const a = state.answers;
  let school = 0;
  let short = 0;
  if (a.english === 'beginner') school += 3; else if (a.english === 'basic') short += 2;
  if (a.goal === 'english' || a.job === 'local') school += 2;
  if (a.timing === 'later') short += 1; else if (a.timing === 'within_3') school -= 1;
  if (a.budget === 'low') { school -= 3; short += 2; }
  else if (a.budget === 'mid') short += 2; else school += 1;
  if (a.environment === 'hard') school += 2; else if (a.environment === 'easy') school -= 1;
  if (a.goal === 'saving' || a.job === 'japanese') school -= 2;
  if (school >= 4) return { key: 'school', title: '短期の語学学校を比較する価値が高そうです', summary: '英語力・希望する仕事・英語環境の条件から、学校を使うことで仕事探しや生活開始の不安を下げられる可能性があります。ただし、長期コースではなく、資金を残せる期間から比較してください。', options: [['短期コース', '4〜8週間で面接・生活英語を準備', true], ['学校なしで渡航', '資金を優先し、現地で英語環境を探す', false], ['オンライン準備', '渡航前に低コストで基礎を整える', false]], checks: ['学費を払った後に、仕事が決まるまでの生活費が残るか', '希望校のクラス人数・日本人比率・仕事支援の実態', '学校に行かない場合の英語環境をどう作るか'] };
  if (short >= 2 || a.budget === 'mid') return { key: 'short', title: '短期・低コストの準備から比べるのがよさそうです', summary: '語学学校の効果はありそうですが、長期コースは費用と無収入期間の負担が大きくなりやすい条件です。まず短期コースやオンライン英語と比較すると、判断しやすくなります。', options: [['短期コース', '必要な場面だけ集中して準備', true], ['オンライン英語', '渡航前に費用を抑えて練習', false], ['学校なしで渡航', '資金を仕事探しに残す', false]], checks: ['学校費用と、働けない期間の生活費を合算する', '学ぶ内容を面接・接客など具体的にする', '学校を使わない場合の代替策を決める'] };
  return { key: 'none', title: '今は学校費用を仕事・生活資金に残す選択が有力です', summary: '現在の条件では、語学学校の費用が初期資金や就労開始までの余力を圧迫する可能性があります。学校に行かない選択と、現地で必要になった時に短期利用する選択を比較してください。', options: [['学校なしで渡航', '資金を生活費・求職に残す', true], ['オンライン英語', '低コストで必要な部分だけ学ぶ', false], ['短期コース', '資金に余裕が出た時の候補', false]], checks: ['仕事が決まるまで何週間生活できるか', '希望職種に必要な英語力を確認する', '現地で英語を使う仕事・住居の候補を準備する'] };
}

function showResult() {
  const r = calculate();
  track('diagnosis_completed', { result: r.key, answers: state.answers });
  document.querySelector('#result-title').textContent = r.title;
  document.querySelector('#result-summary').textContent = r.summary;
  document.querySelector('#result-options').innerHTML = r.options.map(([title, text, recommended]) => `<div class="option ${recommended ? 'recommended' : ''}"><div class="option-title"><span>${title}</span>${recommended ? '<span class="tag">比較の第一候補</span>' : ''}</div><p>${text}</p></div>`).join('');
  document.querySelector('#next-checks').innerHTML = r.checks.map(x => `<li>${x}</li>`).join('');
  quiz.hidden = true; result.hidden = false; window.scrollTo({ top: 0, behavior: 'smooth' });
  const feedback = {};
  document.querySelectorAll('.feedback-choices').forEach(group => group.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
    group.querySelectorAll('button').forEach(item => item.classList.remove('selected'));
    button.classList.add('selected');
    feedback[group.dataset.feedback] = button.dataset.value;
    track('feedback_answered', { result: r.key, feedback: { ...feedback } });
    if (Object.keys(feedback).length === 3) document.querySelector('#feedback-thanks').hidden = false;
  })));
  document.querySelectorAll('[data-partner]').forEach(link => link.addEventListener('click', (e) => { e.preventDefault(); track('partner_click', { partner: link.dataset.partner, result: r.key }); alert('仮診断のため、提携先リンクはまだ設定していません。クリック意向を記録しました。'); }));
}

track('diagnosis_started');
nextBtn.addEventListener('click', () => { if (state.index === questions.length - 1) showResult(); else { state.index += 1; render(); } });
backBtn.addEventListener('click', () => { if (state.index > 0) { state.index -= 1; render(); } });
document.querySelector('#restart-btn').addEventListener('click', () => { state.index = 0; state.answers = {}; result.hidden = true; quiz.hidden = false; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
render();
