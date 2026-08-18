const CONFIG = {
  courseName: "Economics of Sustainability and the Environment",
  databaseRoot: "courseQuestionnaire2026",
  discussionSections: [
    { value: "wednesday-6pm", label: "Wednesday, 6:00 PM" },
    { value: "wednesday-7pm", label: "Wednesday, 7:00 PM" },
    { value: "wednesday-8pm", label: "Wednesday, 8:00 PM" },
    { value: "friday-8am", label: "Friday, 8:00 AM" },
    { value: "friday-9am", label: "Friday, 9:00 AM" },
    { value: "friday-10am", label: "Friday, 10:00 AM" }
  ],
  firebase: {
    apiKey: globalThis.FIREBASE_CONFIG?.apiKey || "",
    authDomain: "j-colmer.firebaseapp.com",
    databaseURL: "https://j-colmer-default-rtdb.firebaseio.com",
    projectId: "j-colmer",
    storageBucket: "j-colmer.firebasestorage.app",
    messagingSenderId: "801031852610",
    appId: "1:801031852610:web:25c1665d1dcdaafe2e53db"
  }
};

const COURSES = ["ECON 2010", "ECON 2020", "ECON 3010", "ECON 3110", "ECON 3020", "ECON 3720", "Calculus I", "Calculus II", "STAT 2101"];
const LEARNING_OPTIONS = [
  { value: "Working through problems or examples step-by-step", dashboardLabel: "Step-by-step problems", icon: "ƒ", title: "Working through problems or examples step-by-step" },
  { value: "Discussing concepts or problem-solving strategies with classmates or the instructor", dashboardLabel: "Discussion", icon: "◎", title: "Discussing concepts or problem-solving strategies with classmates or the instructor" },
  { value: "Watching visual explanations, such as graphs, charts, or video tutorials", dashboardLabel: "Visual explanations", icon: "◫", title: "Watching visual explanations, such as graphs, charts, or video tutorials" },
  { value: "Reading and reviewing detailed explanations or textbook examples", dashboardLabel: "Detailed reading", icon: "¶", title: "Reading and reviewing detailed explanations or textbook examples" },
  { value: "Applying concepts to real-world scenarios or case studies", dashboardLabel: "Real-world applications", icon: "↗", title: "Applying concepts to real-world scenarios or case studies" },
  { value: "Other", dashboardLabel: "Other", icon: "+", title: "Other" }
];
const YEAR_LABELS = { "1": "First year", "2": "Second year", "3": "Third year", "4": "Fourth year" };
const PARAMS = new URLSearchParams(location.search);
const DASHBOARD_MODE = PARAMS.get("view") === "dashboard" || PARAMS.get("role") === "presenter";
const DEMO = PARAMS.get("demo") === "1";
const LOCAL_RESPONSE_KEY = "courseQuestionnaireResponse2026";

const els = Object.fromEntries([
  "loadingView", "studentView", "thanksView", "authView", "dashboardView", "viewBadge", "connectionStatus",
  "questionnaireForm", "firstName", "lastName", "email", "preferredName", "hometown", "sectionChoices",
  "courseChoices", "majorMinor", "learningChoices", "learningCount", "otherLearningField", "otherLearning", "careerGoals", "careerCount", "uniqueFact",
  "factCount", "formError", "submitButton", "thanksName", "editResponseButton", "dashboardLoginForm", "dashboardEmail",
  "dashboardPassword", "passwordSignInButton", "resetPasswordButton", "signInButton", "authError",
  "copyLinkButton", "downloadButton", "signOutButton", "totalResponses", "responseUpdate", "sectionsRepresented",
  "sectionSummary", "topYear", "topYearCount", "topLearning", "topLearningCount", "yearChart", "learningChart",
  "courseChart", "majorCloud", "studentSearch", "sectionFilter", "directoryEmpty", "studentDirectory",
  "studentDialog", "studentDialogContent", "toast"
].map(id => [id, document.getElementById(id)]));

let firebase = null;
let authApi = null;
let db = null;
let auth = null;
let responses = {};
let unsubscribeResponses = null;
let toastTimer = null;

const DEMO_RESPONSES = {
  "demo-1": { firstName: "Maya", lastName: "Patel", preferredName: "Maya", email: "maya.patel@virginia.edu", hometown: "Richmond, Virginia", section: "wednesday-6pm", year: "3", courses: ["ECON 2010", "ECON 2020", "ECON 3010", "Calculus I", "STAT 2101"], learning: ["Working through problems or examples step-by-step", "Applying concepts to real-world scenarios or case studies"], majorMinor: "Economics major, Data Science minor", careerGoals: "I am interested in environmental policy or climate analytics, possibly in government.", uniqueFact: "I have visited 18 national parks and keep a watercolor journal for each one.", submittedAt: 1787041800000 },
  "demo-2": { firstName: "Jordan", lastName: "Lee", preferredName: "Jo", email: "jordan.lee@virginia.edu", hometown: "Seattle, Washington", section: "wednesday-6pm", year: "2", courses: ["ECON 2010", "ECON 2020", "Calculus I", "Calculus II"], learning: ["Watching visual explanations, such as graphs, charts, or video tutorials", "Discussing concepts or problem-solving strategies with classmates or the instructor"], majorMinor: "Environmental Sciences and Economics", careerGoals: "Still exploring. I would like work that combines science, public service, and communication.", uniqueFact: "I can identify most North American birds by their calls.", submittedAt: 1787042400000 },
  "demo-3": { firstName: "Amara", lastName: "Johnson", preferredName: "", email: "amara.johnson@virginia.edu", hometown: "Atlanta, Georgia", section: "wednesday-7pm", year: "4", courses: ["ECON 2010", "ECON 2020", "ECON 3010", "ECON 3020", "ECON 3720", "STAT 2101"], learning: ["Applying concepts to real-world scenarios or case studies", "Discussing concepts or problem-solving strategies with classmates or the instructor"], majorMinor: "Public Policy major, minor in Economics", careerGoals: "Urban climate resilience, ideally working with cities in the Southeast.", uniqueFact: "My family runs a small peach orchard.", submittedAt: 1787042700000 },
  "demo-4": { firstName: "Eli", lastName: "Rosen", preferredName: "", email: "eli.rosen@virginia.edu", hometown: "Baltimore, Maryland", section: "wednesday-8pm", year: "3", courses: ["ECON 2010", "ECON 2020", "ECON 3010", "ECON 3110", "Calculus I"], learning: ["Working through problems or examples step-by-step", "Reading and reviewing detailed explanations or textbook examples"], majorMinor: "Economics and Mathematics", careerGoals: "Economic consulting for a few years, then perhaps graduate school.", uniqueFact: "I once solved a Rubik’s cube underwater.", submittedAt: 1787043300000 },
  "demo-5": { firstName: "Sofia", lastName: "Martinez", preferredName: "Sofi", email: "sofia.martinez@virginia.edu", hometown: "San Juan, Puerto Rico", section: "friday-8am", year: "2", courses: ["ECON 2010", "Calculus I"], learning: ["Watching visual explanations, such as graphs, charts, or video tutorials", "Applying concepts to real-world scenarios or case studies"], majorMinor: "Undecided — considering Commerce, Economics, or Global Studies", careerGoals: "Not sure yet. Something international and connected to sustainability.", uniqueFact: "I make a very good tembleque using my grandmother’s recipe.", submittedAt: 1787043900000 },
  "demo-6": { firstName: "Noah", lastName: "Williams", preferredName: "", email: "noah.williams@virginia.edu", hometown: "Charlottesville, Virginia", section: "friday-9am", year: "1", courses: [], learning: ["Other", "Applying concepts to real-world scenarios or case studies"], otherLearning: "Explaining a concept aloud to someone else", majorMinor: "Undecided, maybe Environmental Thought and Practice", careerGoals: "I want to learn what kinds of climate careers exist.", uniqueFact: "I built a canoe with my grandfather last summer.", submittedAt: 1787044500000 },
  "demo-7": { firstName: "Priya", lastName: "Shah", preferredName: "", email: "priya.shah@virginia.edu", hometown: "Mumbai, India", section: "friday-10am", year: "4", courses: ["ECON 2010", "ECON 2020", "ECON 3010", "ECON 3020", "Calculus I", "Calculus II", "STAT 2101"], learning: ["Reading and reviewing detailed explanations or textbook examples", "Discussing concepts or problem-solving strategies with classmates or the instructor"], majorMinor: "Economics and Foreign Affairs", careerGoals: "International development with a focus on energy access.", uniqueFact: "I speak four languages and am learning a fifth.", submittedAt: 1787045100000 },
  "demo-8": { firstName: "Theo", lastName: "Nguyen", preferredName: "", email: "theo.nguyen@virginia.edu", hometown: "Arlington, Virginia", section: "friday-10am", year: "3", courses: ["ECON 2010", "ECON 2020", "ECON 3010", "ECON 3110", "STAT 2101"], learning: ["Working through problems or examples step-by-step", "Watching visual explanations, such as graphs, charts, or video tutorials"], majorMinor: "Computer Science with an Economics minor", careerGoals: "Build better tools for measuring emissions and energy use.", uniqueFact: "I compose music for small video games.", submittedAt: 1787045700000 }
};

function showOnly(id) {
  ["loadingView", "studentView", "thanksView", "authView", "dashboardView"].forEach(key => {
    els[key].hidden = key !== id;
  });
}

function setConnection(state, label) {
  els.connectionStatus.className = `connection-status ${state}`;
  els.connectionStatus.lastElementChild.textContent = label;
}

function cleanText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function sectionLabel(value) {
  return CONFIG.discussionSections.find(section => section.value === String(value))?.label || String(value || "Unassigned");
}

function populateChoices() {
  CONFIG.discussionSections.forEach(section => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "section";
    input.value = section.value;
    input.required = true;
    const text = document.createElement("span");
    text.textContent = section.label;
    label.append(input, text);
    els.sectionChoices.append(label);

    const option = new Option(section.label, section.value);
    els.sectionFilter.add(option);
  });

  COURSES.forEach(course => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = "courses";
    input.value = course;
    const text = document.createElement("span");
    text.textContent = course;
    label.append(input, text);
    els.courseChoices.append(label);
  });

  LEARNING_OPTIONS.forEach(option => {
    const label = document.createElement("label");
    label.className = "learning-choice";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = "learning";
    input.value = option.value;
    const card = document.createElement("span");
    const icon = document.createElement("span");
    icon.className = "learning-icon";
    icon.textContent = option.icon;
    const copy = document.createElement("span");
    copy.className = "learning-copy";
    const title = document.createElement("strong");
    title.textContent = option.title;
    copy.append(title);
    if (option.detail) {
      const detail = document.createElement("small");
      detail.textContent = option.detail;
      copy.append(detail);
    }
    card.append(icon, copy);
    label.append(input, card);
    els.learningChoices.append(label);
  });
}

function bindEvents() {
  els.questionnaireForm.addEventListener("submit", submitQuestionnaire);
  els.editResponseButton.addEventListener("click", editSavedResponse);
  els.careerGoals.addEventListener("input", () => { els.careerCount.textContent = els.careerGoals.value.length; });
  els.uniqueFact.addEventListener("input", () => { els.factCount.textContent = els.uniqueFact.value.length; });
  els.learningChoices.addEventListener("change", enforceLearningLimit);
  els.dashboardLoginForm.addEventListener("submit", signInWithPassword);
  els.resetPasswordButton.addEventListener("click", resetDashboardPassword);
  els.signInButton.addEventListener("click", signIn);
  els.signOutButton.addEventListener("click", signOut);
  els.copyLinkButton.addEventListener("click", copyQuestionnaireLink);
  els.downloadButton.addEventListener("click", downloadCsv);
  els.studentSearch.addEventListener("input", renderDirectory);
  els.sectionFilter.addEventListener("change", renderDirectory);
  els.studentDirectory.addEventListener("click", event => {
    const button = event.target.closest("[data-response-id]");
    if (button) openStudent(button.dataset.responseId);
  });
  els.studentDialog.querySelector(".dialog-close").addEventListener("click", () => els.studentDialog.close());
  els.studentDialog.addEventListener("click", event => {
    if (event.target === els.studentDialog) els.studentDialog.close();
  });
}

function enforceLearningLimit() {
  const checked = [...document.querySelectorAll('input[name="learning"]:checked')];
  const atLimit = checked.length >= 2;
  document.querySelectorAll('input[name="learning"]').forEach(input => {
    input.disabled = atLimit && !input.checked;
  });
  els.learningCount.textContent = `${checked.length} of 2 selected`;
  els.learningCount.classList.toggle("at-limit", atLimit);
  const otherSelected = checked.some(input => input.value === "Other");
  els.otherLearningField.hidden = !otherSelected;
  els.otherLearning.required = otherSelected;
  if (!otherSelected) {
    els.otherLearning.value = "";
    els.otherLearning.classList.remove("invalid");
  }
}

function selectedValues(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(input => input.value);
}

function clearValidation() {
  els.formError.hidden = true;
  document.querySelectorAll(".invalid").forEach(element => element.classList.remove("invalid"));
}

function validateForm() {
  clearValidation();
  const requiredText = [
    [els.firstName, "first name"], [els.lastName, "last name"], [els.email, "email address"],
    [els.hometown, "hometown"], [els.majorMinor, "major or minor"]
  ];
  const missing = [];
  requiredText.forEach(([field, label]) => {
    if (!cleanText(field.value)) { missing.push(label); field.classList.add("invalid"); }
  });
  if (els.email.value && !els.email.validity.valid) {
    missing.push("a valid email address");
    els.email.classList.add("invalid");
  }
  const section = document.querySelector('input[name="section"]:checked');
  const year = document.querySelector('input[name="year"]:checked');
  const learning = selectedValues("learning");
  if (!section) missing.push("discussion section");
  if (!year) missing.push("year in school");
  if (!learning.length) missing.push("at least one learning preference");
  if (learning.includes("Other") && !cleanText(els.otherLearning.value)) {
    missing.push("your other learning approach");
    els.otherLearning.classList.add("invalid");
  }
  if (missing.length) {
    const unique = [...new Set(missing)];
    els.formError.textContent = `Please add: ${unique.join(", ")}.`;
    els.formError.hidden = false;
    els.formError.scrollIntoView({ behavior: "smooth", block: "center" });
    return null;
  }
  return {
    firstName: cleanText(els.firstName.value),
    lastName: cleanText(els.lastName.value),
    email: cleanText(els.email.value).toLowerCase(),
    preferredName: cleanText(els.preferredName.value),
    hometown: cleanText(els.hometown.value),
    section: section.value,
    year: year.value,
    courses: selectedValues("courses"),
    learning,
    otherLearning: learning.includes("Other") ? cleanText(els.otherLearning.value) : "",
    majorMinor: cleanText(els.majorMinor.value),
    careerGoals: cleanText(els.careerGoals.value),
    uniqueFact: cleanText(els.uniqueFact.value),
    submittedAt: firebase?.serverTimestamp ? firebase.serverTimestamp() : Date.now()
  };
}

function saveLocalResponse(response) {
  localStorage.setItem(LOCAL_RESPONSE_KEY, JSON.stringify({ ...response, submittedAt: Date.now() }));
}

function localResponse() {
  try { return JSON.parse(localStorage.getItem(LOCAL_RESPONSE_KEY) || "null"); }
  catch { return null; }
}

function showThanks(response) {
  els.thanksName.textContent = response.preferredName || response.firstName || "there";
  showOnly("thanksView");
}

function hydrateForm(response) {
  if (!response) return;
  ["firstName", "lastName", "email", "preferredName", "hometown", "majorMinor", "otherLearning", "careerGoals", "uniqueFact"].forEach(key => {
    els[key].value = response[key] || "";
  });
  document.querySelectorAll('input[name="section"]').forEach(input => { input.checked = input.value === String(response.section); });
  document.querySelectorAll('input[name="year"]').forEach(input => { input.checked = input.value === String(response.year); });
  document.querySelectorAll('input[name="courses"]').forEach(input => { input.checked = (response.courses || []).includes(input.value); });
  document.querySelectorAll('input[name="learning"]').forEach(input => { input.checked = (response.learning || []).includes(input.value); });
  els.careerCount.textContent = els.careerGoals.value.length;
  els.factCount.textContent = els.uniqueFact.value.length;
  enforceLearningLimit();
}

function editSavedResponse() {
  hydrateForm(localResponse());
  showOnly("studentView");
}

async function submitQuestionnaire(event) {
  event.preventDefault();
  const response = validateForm();
  if (!response) return;
  els.submitButton.disabled = true;
  els.submitButton.textContent = "Sending…";
  try {
    if (!DEMO) {
      if (!firebase || !db || !auth?.currentUser) throw new Error("Database is not connected");
      await firebase.set(firebase.ref(db, `${CONFIG.databaseRoot}/responses/${auth.currentUser.uid}`), response);
    }
    saveLocalResponse(response);
    showThanks(response);
  } catch (error) {
    console.error(error);
    els.formError.textContent = "We could not save your answers. Check your connection and try again.";
    els.formError.hidden = false;
  } finally {
    els.submitButton.disabled = false;
    els.submitButton.textContent = "Send my questionnaire";
  }
}

async function initFirebase({ includeAuth = false } = {}) {
  try {
    if (!CONFIG.firebase.apiKey) throw new Error("Firebase API key is not configured");
    const appApi = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
    firebase = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js");
    const app = appApi.initializeApp(CONFIG.firebase);
    db = firebase.getDatabase(app);
    firebase.onValue(firebase.ref(db, ".info/connected"), snapshot => {
      setConnection(snapshot.val() ? "connected" : "offline", snapshot.val() ? "Live" : "Offline");
    });
    if (includeAuth) {
      authApi = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
      auth = authApi.getAuth(app);
    }
    return true;
  } catch (error) {
    console.error(error);
    setConnection("offline", "Offline");
    return false;
  }
}

function initStudent() {
  const saved = localResponse();
  if (saved) showThanks(saved);
  else showOnly("studentView");
}

async function initStudentAuth() {
  try {
    if (!auth.currentUser) await authApi.signInAnonymously(auth);
    initStudent();
  } catch (error) {
    console.error(error);
    showOnly("studentView");
    els.formError.textContent = error.code === "auth/operation-not-allowed"
      ? "The questionnaire is not accepting responses yet. Anonymous sign-in must be enabled in Firebase."
      : "The questionnaire could not establish a secure response session. Refresh and try again.";
    els.formError.hidden = false;
    els.submitButton.disabled = true;
  }
}

function initDashboardAuth() {
  authApi.onAuthStateChanged(auth, user => {
    if (!user || user.isAnonymous) {
      if (unsubscribeResponses) unsubscribeResponses();
      responses = {};
      showOnly("authView");
      return;
    }
    els.dashboardPassword.value = "";
    showOnly("dashboardView");
    subscribeResponses();
  });
}

function setAuthBusy(busy) {
  els.passwordSignInButton.disabled = busy;
  els.signInButton.disabled = busy;
  els.resetPasswordButton.disabled = busy;
  els.passwordSignInButton.textContent = busy ? "Checking…" : "Unlock dashboard";
}

function showAuthError(message) {
  els.authError.textContent = message;
  els.authError.hidden = false;
}

async function signInWithPassword(event) {
  event.preventDefault();
  const email = cleanText(els.dashboardEmail.value).toLowerCase();
  const password = els.dashboardPassword.value;
  els.authError.hidden = true;
  if (!email || !els.dashboardEmail.validity.valid || !password) {
    showAuthError("Enter the email address and password for your approved teaching-team account.");
    return;
  }
  setAuthBusy(true);
  try {
    await authApi.signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error(error);
    showAuthError(error.code === "auth/operation-not-allowed"
      ? "Email and password sign-in is not enabled for this Firebase project yet."
      : "That email and password were not recognized, or the account is not available.");
  } finally {
    setAuthBusy(false);
  }
}

async function resetDashboardPassword() {
  const email = cleanText(els.dashboardEmail.value).toLowerCase();
  els.authError.hidden = true;
  if (!email || !els.dashboardEmail.validity.valid) {
    showAuthError("Enter your account email above, then select “Forgot password?” again.");
    return;
  }
  setAuthBusy(true);
  try {
    await authApi.sendPasswordResetEmail(auth, email);
    showToast("If that approved account exists, a password-reset email has been sent.", 5200);
  } catch (error) {
    console.error(error);
    showToast("If that approved account exists, a password-reset email has been sent.", 5200);
  } finally {
    setAuthBusy(false);
  }
}

async function signIn() {
  setAuthBusy(true);
  els.authError.hidden = true;
  try {
    const provider = new authApi.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await authApi.signInWithPopup(auth, provider);
  } catch (error) {
    console.error(error);
    els.authError.textContent = error.code === "auth/operation-not-allowed"
      ? "Google sign-in is not enabled for this Firebase project yet. See the README setup steps."
      : "Sign-in did not finish. Try again or ask the course administrator to authorize your account.";
    els.authError.hidden = false;
  } finally {
    setAuthBusy(false);
  }
}

async function signOut() {
  if (DEMO) { showToast("Demo mode does not have a signed-in account."); return; }
  await authApi.signOut(auth);
}

function subscribeResponses() {
  if (unsubscribeResponses) unsubscribeResponses();
  unsubscribeResponses = firebase.onValue(
    firebase.ref(db, `${CONFIG.databaseRoot}/responses`),
    snapshot => {
      responses = snapshot.val() || {};
      renderDashboard();
    },
    error => {
      console.error(error);
      setConnection("offline", "Access denied");
      showOnly("authView");
      els.authError.textContent = "This account is valid, but it is not on the questionnaire’s approved teaching-team list. Sign in with another account or ask the course administrator to approve it.";
      els.authError.hidden = false;
    }
  );
}

function responseList() {
  return Object.entries(responses || {}).filter(([, response]) => response).map(([id, response]) => ({ id, ...response }));
}

function countBy(data, accessor, order = null) {
  const counts = new Map();
  data.forEach(item => {
    const values = accessor(item);
    (Array.isArray(values) ? values : [values]).filter(Boolean).forEach(value => counts.set(value, (counts.get(value) || 0) + 1));
  });
  const entries = [...counts].map(([label, value]) => ({ label, value }));
  return entries.sort((a, b) => order ? order.indexOf(a.label) - order.indexOf(b.label) : b.value - a.value || a.label.localeCompare(b.label));
}

function topEntry(entries) {
  return [...entries].sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))[0] || null;
}

function renderHorizontalChart(container, entries, emptyLabel = "No responses yet") {
  container.replaceChildren();
  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "field-help";
    empty.textContent = emptyLabel;
    container.append(empty);
    return;
  }
  const max = Math.max(...entries.map(entry => entry.value), 1);
  entries.forEach(entry => {
    const row = document.createElement("div");
    row.className = "chart-row";
    row.setAttribute("aria-label", `${entry.label}: ${entry.value}`);
    const label = document.createElement("span");
    label.className = "chart-label";
    label.textContent = entry.label;
    label.title = entry.label;
    const track = document.createElement("span");
    track.className = "chart-track";
    const fill = document.createElement("span");
    fill.className = "chart-fill";
    fill.style.width = `${(entry.value / max) * 100}%`;
    track.append(fill);
    const value = document.createElement("span");
    value.className = "chart-value";
    value.textContent = entry.value;
    row.append(label, track, value);
    container.append(row);
  });
}

const INTEREST_CATEGORIES = [
  { label: "Economics", aliases: ["economics", "econ"] },
  { label: "Environmental Sciences", aliases: ["environmental sciences", "environmental science"] },
  { label: "Environmental Thought & Practice", aliases: ["environmental thought and practice", "environmental thought & practice", "etp"] },
  { label: "Data Science", aliases: ["data science"] },
  { label: "Computer Science", aliases: ["computer science"] },
  { label: "Public Policy", aliases: ["public policy"] },
  { label: "Foreign Affairs", aliases: ["foreign affairs"] },
  { label: "Global Studies", aliases: ["global studies"] },
  { label: "Political Philosophy, Policy & Law", aliases: ["political philosophy, policy, and law", "political philosophy policy and law", "ppl"] },
  { label: "Politics", aliases: ["politics", "political science"] },
  { label: "Commerce", aliases: ["commerce", "business"] },
  { label: "Mathematics", aliases: ["mathematics", "math"] },
  { label: "Statistics", aliases: ["statistics", "stats"] },
  { label: "Systems Engineering", aliases: ["systems engineering"] },
  { label: "Civil Engineering", aliases: ["civil engineering"] },
  { label: "Mechanical Engineering", aliases: ["mechanical engineering"] },
  { label: "Biomedical Engineering", aliases: ["biomedical engineering"] },
  { label: "Engineering", aliases: ["engineering"] },
  { label: "Architecture", aliases: ["architecture"] },
  { label: "Biology", aliases: ["biology", "biological sciences"] },
  { label: "Chemistry", aliases: ["chemistry"] },
  { label: "Physics", aliases: ["physics"] },
  { label: "Psychology", aliases: ["psychology"] },
  { label: "Sociology", aliases: ["sociology"] },
  { label: "Anthropology", aliases: ["anthropology"] },
  { label: "History", aliases: ["history"] },
  { label: "English", aliases: ["english"] },
  { label: "Philosophy", aliases: ["philosophy"] },
  { label: "Media Studies", aliases: ["media studies"] },
  { label: "Education", aliases: ["education"] },
  { label: "Finance", aliases: ["finance"] },
  { label: "Neuroscience", aliases: ["neuroscience"] },
  { label: "Nursing", aliases: ["nursing"] },
  { label: "Undecided", aliases: ["undecided", "not sure", "exploring"] }
];

function interestThemes(data) {
  const counts = new Map();
  let uncategorized = 0;
  data.forEach(item => {
    const answer = cleanText(item.majorMinor).toLowerCase();
    const matches = INTEREST_CATEGORIES.filter(category => category.aliases.some(alias => answer.includes(alias)));
    const specificMatches = matches.filter(category => category.label !== "Engineering" || !matches.some(other => other.label.endsWith("Engineering") && other.label !== "Engineering"));
    if (!specificMatches.length && answer) uncategorized += 1;
    specificMatches.forEach(category => {
      counts.set(category.label, (counts.get(category.label) || 0) + 1);
    });
  });
  if (uncategorized) counts.set("Other stated interests", uncategorized);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 18);
}

function renderInterestCloud(data) {
  els.majorCloud.replaceChildren();
  const themes = interestThemes(data);
  if (!themes.length) {
    const empty = document.createElement("p");
    empty.className = "field-help";
    empty.textContent = "No responses yet";
    els.majorCloud.append(empty);
    return;
  }
  const max = Math.max(...themes.map(([, count]) => count), 1);
  themes.forEach(([label, count]) => {
    const tag = document.createElement("span");
    tag.className = "interest-tag";
    tag.style.fontSize = `${12 + (count / max) * 10}px`;
    tag.append(document.createTextNode(label));
    const countBadge = document.createElement("small");
    countBadge.textContent = count;
    tag.append(countBadge);
    tag.title = `${count} ${count === 1 ? "mention" : "mentions"}`;
    tag.setAttribute("aria-label", `${label}: ${count} ${count === 1 ? "mention" : "mentions"}`);
    els.majorCloud.append(tag);
  });
}

function renderDashboard() {
  const data = responseList();
  const sectionCounts = countBy(data, item => item.section);
  const yearCounts = countBy(data, item => item.year, Object.keys(YEAR_LABELS));
  const learningCounts = countBy(data, item => item.learning || []);
  const courseCounts = countBy(data, item => item.courses || [], COURSES);
  const leadingYear = topEntry(yearCounts);
  const leadingLearning = topEntry(learningCounts);

  els.totalResponses.textContent = data.length;
  els.responseUpdate.textContent = data.length ? `${data.length === 1 ? "Student" : "Students"} on the roster` : "Waiting for students";
  els.sectionsRepresented.textContent = sectionCounts.length;
  els.sectionSummary.textContent = `of ${CONFIG.discussionSections.length} sections`;
  els.topYear.textContent = leadingYear ? YEAR_LABELS[leadingYear.label] || leadingYear.label : "—";
  els.topYearCount.textContent = leadingYear ? `${leadingYear.value} ${leadingYear.value === 1 ? "student" : "students"}` : "No responses yet";
  els.topLearning.textContent = leadingLearning ? learningDashboardLabel(leadingLearning.label) : "—";
  els.topLearningCount.textContent = leadingLearning ? `${leadingLearning.value} selections` : "No responses yet";

  renderHorizontalChart(els.yearChart, yearCounts.map(entry => ({ ...entry, label: YEAR_LABELS[entry.label] || entry.label })));
  renderHorizontalChart(els.learningChart, learningCounts.map(entry => ({ ...entry, label: learningDashboardLabel(entry.label) })));
  renderHorizontalChart(els.courseChart, courseCounts);
  renderInterestCloud(data);
  renderDirectory();
  els.downloadButton.disabled = data.length === 0;
}

function searchableText(response) {
  return [response.firstName, response.lastName, response.preferredName, response.email, response.hometown, response.majorMinor, response.careerGoals, response.uniqueFact].join(" ").toLowerCase();
}

function filteredResponses() {
  const query = cleanText(els.studentSearch.value).toLowerCase();
  const section = els.sectionFilter.value;
  return responseList().filter(response => {
    const matchesSearch = !query || searchableText(response).includes(query);
    const matchesSection = section === "all" || response.section === section;
    return matchesSearch && matchesSection;
  }).sort((a, b) => sectionLabel(a.section).localeCompare(sectionLabel(b.section)) || a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
}

function studentDisplayName(response) {
  const preferred = cleanText(response.preferredName);
  return preferred && preferred.toLowerCase() !== cleanText(response.firstName).toLowerCase()
    ? `${preferred} ${response.lastName}`
    : `${response.firstName} ${response.lastName}`;
}

function renderDirectory() {
  const data = filteredResponses();
  els.studentDirectory.replaceChildren();
  els.directoryEmpty.hidden = data.length > 0;
  els.studentDirectory.hidden = data.length === 0;
  if (!data.length) {
    const hasResponses = responseList().length > 0;
    els.directoryEmpty.querySelector("h3").textContent = hasResponses ? "No students match this filter." : "Responses will appear here.";
    els.directoryEmpty.querySelector("p").textContent = hasResponses ? "Try another section or search term." : "Share the questionnaire link with students to begin.";
    return;
  }

  const groups = new Map();
  data.forEach(response => {
    const key = response.section || "Unassigned";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(response);
  });
  groups.forEach((students, section) => {
    const group = document.createElement("section");
    group.className = "section-group";
    const heading = document.createElement("div");
    heading.className = "section-title";
    heading.append(document.createTextNode(sectionLabel(section)));
    const count = document.createElement("span");
    count.textContent = students.length;
    heading.append(count);
    const list = document.createElement("div");
    list.className = "student-list";
    students.forEach(response => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "student-row";
      button.dataset.responseId = response.id;
      button.setAttribute("aria-label", `Open answers for ${studentDisplayName(response)}`);
      const avatar = document.createElement("span");
      avatar.className = "student-avatar";
      avatar.textContent = `${response.firstName?.[0] || ""}${response.lastName?.[0] || ""}`.toUpperCase();
      const copy = document.createElement("span");
      const name = document.createElement("span");
      name.className = "student-name";
      name.textContent = studentDisplayName(response);
      const meta = document.createElement("span");
      meta.className = "student-meta";
      meta.textContent = `${response.email} · ${response.hometown}`;
      copy.append(name, meta);
      const year = document.createElement("span");
      year.className = "student-year";
      year.textContent = `Year ${response.year}`;
      button.append(avatar, copy, year);
      list.append(button);
    });
    group.append(heading, list);
    els.studentDirectory.append(group);
  });
}

function detailBlock(label, content, pills = false) {
  const block = document.createElement("section");
  block.className = "answer-block";
  const heading = document.createElement("h3");
  heading.textContent = label;
  block.append(heading);
  if (pills) {
    const list = document.createElement("div");
    list.className = "answer-pills";
    (content?.length ? content : ["None listed"]).forEach(value => {
      const pill = document.createElement("span");
      pill.textContent = value;
      list.append(pill);
    });
    block.append(list);
  } else {
    const text = document.createElement("p");
    text.textContent = content || "No answer provided.";
    block.append(text);
  }
  return block;
}

function learningDashboardLabel(value) {
  return LEARNING_OPTIONS.find(option => option.value === value)?.dashboardLabel || value;
}

function learningAnswers(response) {
  return (response.learning || []).map(value => value === "Other" && response.otherLearning ? `Other: ${response.otherLearning}` : value);
}

function openStudent(id) {
  const response = responseList().find(item => item.id === id);
  if (!response) return;
  els.studentDialogContent.replaceChildren();
  const header = document.createElement("header");
  header.className = "student-detail-header";
  const eyebrow = document.createElement("div");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = `${sectionLabel(response.section)} · ${YEAR_LABELS[response.year] || `Year ${response.year}`}`;
  const name = document.createElement("h2");
  name.textContent = studentDisplayName(response);
  const email = document.createElement("a");
  email.href = `mailto:${response.email}`;
  email.textContent = response.email;
  const summary = document.createElement("div");
  summary.className = "student-detail-summary";
  [response.preferredName ? `First name: ${response.firstName}` : "", response.hometown].filter(Boolean).forEach(value => {
    const tag = document.createElement("span");
    tag.textContent = value;
    summary.append(tag);
  });
  header.append(eyebrow, name, email, summary);
  const body = document.createElement("div");
  body.className = "student-detail-body";
  body.append(
    detailBlock("Major or minor", response.majorMinor),
    detailBlock("Classes taken", response.courses || [], true),
    detailBlock("Learning preferences", learningAnswers(response), true),
    detailBlock("Career goals or plans", response.careerGoals),
    detailBlock("A unique fact", response.uniqueFact)
  );
  els.studentDialogContent.append(header, body);
  els.studentDialog.showModal();
}

function questionnaireLink() {
  const url = new URL(location.href);
  url.search = "";
  return url.href;
}

async function copyQuestionnaireLink() {
  try {
    await navigator.clipboard.writeText(questionnaireLink());
    showToast("Questionnaire link copied.");
  } catch {
    showToast("Could not copy the link automatically.");
  }
}

function csvCell(value) {
  let string = Array.isArray(value) ? value.join("; ") : String(value ?? "");
  if (/^[=+\-@]/.test(string)) string = `'${string}`;
  return `"${string.replace(/"/g, '""')}"`;
}

function downloadCsv() {
  const rows = [["Last name", "First name", "Preferred name", "Email", "Discussion section", "Hometown", "Year", "Classes taken", "Learning preferences", "Other learning preference", "Major/minor", "Career goals", "Unique fact", "Submitted at"]];
  responseList().sort((a, b) => a.section.localeCompare(b.section) || a.lastName.localeCompare(b.lastName)).forEach(item => rows.push([
    item.lastName, item.firstName, item.preferredName, item.email, sectionLabel(item.section), item.hometown,
    YEAR_LABELS[item.year] || item.year, item.courses || [], item.learning || [], item.otherLearning || "", item.majorMinor, item.careerGoals,
    item.uniqueFact, typeof item.submittedAt === "number" ? new Date(item.submittedAt).toISOString() : ""
  ]));
  const csv = rows.map(row => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `course-questionnaire-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function showToast(message, duration = 2600) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.hidden = false;
  toastTimer = setTimeout(() => { els.toast.hidden = true; }, duration);
}

async function start() {
  populateChoices();
  bindEvents();
  if (DASHBOARD_MODE) {
    document.title = `Teaching Team · ${document.title}`;
    els.viewBadge.hidden = false;
  }

  if (DEMO) {
    setConnection("connected", "Demo data");
    if (DASHBOARD_MODE) {
      responses = DEMO_RESPONSES;
      showOnly("dashboardView");
      renderDashboard();
    } else {
      initStudent();
    }
    return;
  }

  const connected = await initFirebase({ includeAuth: true });
  if (!connected) {
    showOnly(DASHBOARD_MODE ? "authView" : "studentView");
    if (DASHBOARD_MODE) {
      els.authError.textContent = "The dashboard could not connect. Check your internet connection and refresh.";
      els.authError.hidden = false;
      els.signInButton.disabled = true;
      els.passwordSignInButton.disabled = true;
      els.resetPasswordButton.disabled = true;
    } else {
      els.formError.textContent = "The questionnaire is offline. Check your internet connection before submitting.";
      els.formError.hidden = false;
    }
    return;
  }
  if (DASHBOARD_MODE) initDashboardAuth();
  else initStudentAuth();
}

start().catch(error => {
  console.error(error);
  setConnection("offline", "Needs refresh");
  showOnly("loadingView");
  els.loadingView.querySelector(".loader").hidden = true;
  els.loadingView.querySelector("h1").textContent = "This page did not finish loading.";
  els.loadingView.querySelector("p").textContent = "Refresh once to load the latest version of the questionnaire.";
});
