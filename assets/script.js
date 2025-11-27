// BACKEND CONFIG
const BACKEND_URL = "https://script.google.com/macros/s/AKfycbwtQGPGIlAJQMIuPDD4BMMjMmodcK13wRIkVAadPWYd97nYDcaoMMkKyjP9XhBrBuC5/exec";
const ADMIN_WA_NUMBER = "6285399652487";

const TEST_TITLES = [
  "Prometric Test Level 1",
  "Prometric Test Level 2",
  "Prometric Test Level 3",
  "Prometric Test Level 4",
  "Prometric Test Level 5"
];

const TESTS = [
  [{question:"Level1 Q1", options:["A","B","C","D"], answer:0, rationale:"Sample."}],
  [{question:"Level2 Q1", options:["A","B","C","D"], answer:0, rationale:"Sample."}],
  [{question:"Level3 Q1", options:["A","B","C","D"], answer:0, rationale:"Sample."}],
  [{question:"Level4 Q1", options:["A","B","C","D"], answer:0, rationale:"Sample."}],
  [{question:"Level5 Q1", options:["A","B","C","D"], answer:0, rationale:"Sample."}]
];

// STATE
let studentName="", studentWA="", unlockCode="";
let currentTestIndex=-1, questions=[], qIndex=0, correct=0, incorrect=0, timer=null, elapsed=0;

// UI
const registrationCard = document.getElementById('registrationCard');
const confirmMessage = document.getElementById('confirmMessage');
const waNotifyArea = document.getElementById('waNotifyArea');
const waNotifyBtn = document.getElementById('waNotifyBtn');
const unlockCard = document.getElementById('unlockCard');
const unlockMessage = document.getElementById('unlockMessage');
const dashboardCard = document.getElementById('dashboardCard');
const welcomeMsg = document.getElementById('welcomeMsg');
const testGrid = document.getElementById('testGrid');
const quizCard = document.getElementById('quizCard');
const progressInfo = document.getElementById('progressInfo');
const questionText = document.getElementById('questionText');
const optionsDiv = document.getElementById('options');
const resultCard = document.getElementById('resultCard');
const summaryDiv = document.getElementById('summary');
const answersDiv = document.getElementById('answers');

// SUBMIT REGISTRATION
function submitConfirmation(){
  const name = document.getElementById('regName').value.trim();
  const wa = document.getElementById('regWA').value.trim();
  if(!name||!wa){confirmMessage.innerText="Fill both name & WA."; return;}
  confirmMessage.innerText="Submitting...";
  const payload = {action:"register", name:name, wa:wa};
  fetch(BACKEND_URL, {method:"POST", body:JSON.stringify(payload)})
    .then(res=>res.json().catch(()=>({})))
    .then(data=>{
      studentName=name; studentWA=wa;
      confirmMessage.innerText="Confirmation received. Notify admin to share Unlock Code.";
      waNotifyArea.classList.remove('hidden');
      unlockCard.classList.remove('hidden');
      const textRaw=`Payment Confirmed,%0AName: ${encodeURIComponent(name)}%0AWhatsApp: ${encodeURIComponent(wa)}%0AShare Proof QR IDR 50k to get the Unlock Code`;
      const waLink=`https://wa.me/${ADMIN_WA_NUMBER}?text=${textRaw}`;
      waNotifyBtn.setAttribute('href',waLink);
      setTimeout(()=>{registrationCard.classList.add('hidden');},700);
    })
    .catch(err=>{console.error(err); confirmMessage.innerText="Server error."});
}

// VERIFY CODE
function verifyCode(){
  const code = document.getElementById('unlockInput').value.trim();
  if(!code){unlockMessage.innerText="Enter code."; return;}
  unlockMessage.innerText="Validating...";
  fetch(`${BACKEND_URL}?action=validate&code=${encodeURIComponent(code)}`)
    .then(res=>res.json().catch(()=>({})))
    .then(data=>{
      if(data.status==="valid"){ unlockCode=code; unlockMessage="Code valid."; setTimeout(()=>{unlockCard.classList.add('hidden'); showDashboard();},700);}
      else if(data.status==="used") unlockMessage="Code already used.";
      else unlockMessage="Invalid code.";
    })
    .catch(err=>{console.error(err); unlockMessage="Server error."});
}

// DASHBOARD
function showDashboard(){
  if(!dashboardCard) return;
  welcomeMsg.innerText=`Welcome, ${studentName}. Choose test:`;
  testGrid.innerHTML="";
  TEST_TITLES.forEach((t,i)=>{
    const div=document.createElement('div');
    div.className='test-card';
    div.innerHTML=`<h3>${t}</h3><p class="muted">Passing score:75% | Timer:120min</p><button onclick="startTest(${i})">Start</button>`;
    testGrid.appendChild(div);
  });
  dashboardCard.classList.remove('hidden');
}

// START TEST
function startTest(i){
  currentTestIndex=i;
  questions=TESTS[i].slice();
  qIndex=0; correct=0; incorrect=0; elapsed=0;
  dashboardCard.classList.add('hidden'); quizCard.classList.remove('hidden');
  startTimer(); showQuestion();
}

// TIMER
function startTimer(){ clearInterval(timer); timer=setInterval(()=>{elapsed++; updateProgress();},1000); }
function updateProgress(){ progressInfo.innerText=`⏱ ${formatTime()} | Q ${qIndex+1}/${questions.length} | ✅ ${correct} | ❌ ${incorrect}`; }

// QUESTIONS
function showQuestion(){
  const q=questions[qIndex];
  questionText.innerText=q.question;
  optionsDiv.innerHTML="";
  q.options.forEach((o,idx)=>{ optionsDiv.insertAdjacentHTML('beforeend',`<div class="option"><label><input type="radio" name="opt" value="${idx}"> ${o}</label></div>`); });
  updateProgress();
}

function nextQuestion(){
  const sel=document.querySelector("input[name='opt']:checked");
  if(!sel) return;
  (+sel.value===questions[qIndex].answer)?correct++:incorrect++;
  qIndex++;
  (qIndex<questions.length)?showQuestion():finishQuiz();
}

// FINISH
function finishQuiz(){
  clearInterval(timer);
  quizCard.classList.add('hidden'); resultCard.classList.remove('hidden');
  const score=Math.round((correct/questions.length)*100);
  const status=score>=75?"PASS":"FAIL";
  const timeUsed=formatTime();
  summaryDiv.innerHTML=`<b>Score:</b> ${score}%<br><b>Correct:</b> ${correct}<br><b>Incorrect:</b> ${incorrect}<br><b>Time Used:</b> ${timeUsed}<br><b>Status:</b> ${status}`;
  answersDiv.innerHTML="";
  questions.forEach((q, idx)=>{ answersDiv.insertAdjacentHTML('beforeend',`<div><b>Q${idx+1}.</b> ${q.question}<br><b>Answer:</b> ${q.options[q.answer]}<br><b>Rationale:</b> ${q.rationale}</div>`); });

  const payload={
    action:"save",
    name:studentName,
    wa:studentWA,
    code:unlockCode,
    score:score,
    duration:timeUsed,
    details:`Test:${TEST_TITLES[currentTestIndex]}|Correct:${correct}|Incorrect:${incorrect}`
  };
  fetch(BACKEND_URL, {method:"POST", body:JSON.stringify(payload)}).catch(e=>console.warn(e));
}

// HELPERS
function formatTime(){const m=Math.floor(elapsed/60), s=elapsed%60; return `${m}m ${s}s`;}
function goToDashboard(){resultCard.classList.add('hidden'); showDashboard();}
function logout(){ dashboardCard.classList.add('hidden'); registrationCard.classList.remove('hidden'); studentName=""; studentWA=""; unlockCode=""; waNotifyArea.classList.add('hidden'); }
