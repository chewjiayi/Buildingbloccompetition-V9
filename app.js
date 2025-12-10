(function () {

  const qs = s => document.querySelector(s); // This selects a single element
  const qsa = s => document.querySelectorAll(s);// This selects multiple elements
  const nowISO = () => new Date().toISOString();// Current time in ISO format

  function load(key, def) {// these two functions load/save data to localStorage, this allows the app to remeber user data between sessions, even if refresh
    try { return JSON.parse(localStorage.getItem(key)) ?? def; }
    catch { return def; }
  }

  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  
  //USER & PER-USER STORAGE KEYS
  const USERS_KEY = "cmn_users";// all registered users
  const CURRENT_USER_KEY = "cmn_current_user";// currently logged-in user

  function getCurrentUser() {// get the current user from localStorage
    return load(CURRENT_USER_KEY, null);
  }

  function setCurrentUser(user) {// set the current user in localStorage
    if (user) save(CURRENT_USER_KEY, user);
    else localStorage.removeItem(CURRENT_USER_KEY);
  }

  function keyFor(base) {// generate a per-user storage key, this allows data to be stored separately for each user, even though all data is in the local storage
    const u = getCurrentUser();
    const id = u ? u.email : "guest";
    return `${base}_${id}`;
  }

  const BASE_MOOD = "cmn_mood";// per-user mood entries
  const BASE_BOOK = "cmn_bookings";// per-user bookings
  const BASE_JOUR = "cmn_journal";// per-user journal entries
  const BASE_TOOL = "cmn_tools";// per-user tool usage

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];// pick a random item from an array
 
  // TEXT TO SPEECH
  function speak(text, cb) { // speak text aloud using the Web Speech API
    if (!("speechSynthesis" in window)) return; //if not supported

    const u = new SpeechSynthesisUtterance(text);// create utterance
    u.lang = "en-US";
    u.rate = 0.9;
    u.pitch = 1.05;
    u.volume = 1;
    u.onend = () => cb && cb();

    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  //MOOD + CRISIS DETECTION
  const crisisWords = [ // words/phrases indicating crisis
  "suicide",
  "kill myself",
  "end my life",
  "jump down",
  "i wanna die",
  "i want to die",
  "want to die",
  "don't want to live",
  "no point living",
  "i feel like dying",
  "i don't want to be here",
  "self harm",
  "cut myself"
];


  function detectMood(text) {// basic keyword-based mood detection
    if (!text) return "neutral";
    const t = text.toLowerCase();

    if (crisisWords.some(w => t.includes(w))) return "crisis";

    const sad = ["sad", "down", "depressed", "cry", "lonely", "hopeless", "empty", "tired"];
    const anx = ["anx", "panic", "scared", "overwhelmed", "worry", "stressed"];
    const angry = ["angry", "annoyed", "frustrated", "pissed", "irritated", "mad"];
    const happy = ["happy", "good", "great", "ok", "fine", "better"];

    if (sad.some(w => t.includes(w))) return "sad";// if the text include the words in the array it will be displaued
    if (anx.some(w => t.includes(w))) return "anxious";
    if (angry.some(w => t.includes(w))) return "angry";
    if (happy.some(w => t.includes(w))) return "happy";

    return "neutral";// default to neutral if no keywords matched
  }

  
  const ReplyBlocks = {// predefined reply blocks for different moods
    crisis: {
      empathy: [
        "Thank you for telling me this. Im really glad you chose to say it out loud instead of keeping it all inside.",
        "It sounds incredibly heavy and painful, and Im really sorry you are going through this alone.",
        "Hearing how much you're struggling matters to me. You don't deserve to suffer in silence."
      ],
      validation: [
        "Your feelings are real and important, even if other people don't understand them yet.",
        "Wanting the pain to stop doesnt mean you are weak, it just means things have been too much for too long.",
        "It makes sense that your mind is exhausted when you have been holding all of this on your own."
      ],
      support: [
        "You deserve support from a safe adult or professional who can walk through this with you.",
        "If you can, please reach out to a trusted adult, school counsellor, or local helpline.",
        "If you ever feel in immediate danger, please contact emergency services in your area as soon as possible."
      ],
      gentleQuestion: [
        "Right now, what is one small thing that might make this moment 1% safer for you?",
        "Is there anyone—friend, family, teacher—you could message and just say ‘I am not okay’?",
        "Would you like to use the Crisis Support page after this to see some options?"
      ]
    },
    sad: {
      empathy: [
        "It really sounds like you are carrying a lot inside your chest today.",
        "I can hear that your heart feels heavy right now.",
        "It seems like you have been feeling low for a while, and that is really tiring."
      ],
      validation: [
        "It is okay to feel sad or drained. Your emotions are not ‘too much’.",
        "You don’t have to pretend to be okay with me.",
        "Feeling this way doesn’t mean you’re failing at anything—it just means you’re human."
      ],
      suggestion: [
        "We can slow down together and maybe try a small grounding or breathing exercise.",
        "If you want, you could also write a few lines in a private journal about what triggered this.",
        "Even one tiny act of care, like drinking some water or stretching, can be a small first step."
      ],
      gentleQuestion: [
        "What do you think contributed most to you feeling this way today?",
        "If your friend felt like this, what would you want to say to them?",
        "Where in your body do you feel this sadness the most right now?"
      ]
    },
    anxious: {
      empathy: [
        "It sounds like your thoughts are running really fast and it’s hard to slow them down.",
        "I can tell that your body and mind are feeling on high alert right now.",
        "Anxiety can feel really loud and overwhelming, especially when you’re alone with it."
      ],
      validation: [
        "You’re not weird or broken for feeling anxious—this is a very human reaction.",
        "Your brain is trying to protect you, even if it doesn’t always feel helpful.",
        "It makes sense that you’re tense after everything your mind is juggling."
      ],
      suggestion: [
        "We can try a gentle breathing rhythm together to tell your body it’s safe enough in this moment.",
        "You might try naming three things you can see, two things you can touch, and one thing you can hear.",
        "Sometimes writing your worries down and sorting them into ‘I can control’ vs ‘I can’t control’ helps."
      ],
      gentleQuestion: [
        "If your anxiety could speak, what do you think it would say it’s trying to protect you from?",
        "Is there a specific situation or thought that triggered this spike in anxiety?",
        "What usually helps you feel even a tiny bit calmer when this happens?"
      ]
    },
    angry: {
      empathy: [
        "It really sounds like something has pushed you to your limit.",
        "I can hear that you’re feeling very frustrated and heated right now.",
        "Anger often shows up when something important to us feels disrespected."
      ],
      validation: [
        "It’s okay to feel angry—anger is a signal that something doesn’t feel fair or safe.",
        "You’re allowed to be upset; it doesn’t make you a bad person.",
        "Your anger might be trying to protect a part of you that’s been hurt before."
      ],
      suggestion: [
        "We can try to slow the moment down so you don’t have to react on impulse.",
        "Sometimes writing an ‘unsent message’ to the person or situation can help release some of the heat.",
        "A short grounding technique—like clenching and slowly releasing your fists—might help a bit."
      ],
      gentleQuestion: [
        "If you pause for a moment, what do you think your anger is trying to tell you?",
        "Underneath this anger, is there also hurt, fear, or disappointment?",
        "What would ‘standing up for yourself safely’ look like in this situation?"
      ]
    },
    happy: {
      empathy: [
        "I’m really glad to hear a brighter moment from you.",
        "It’s so nice to hear that something is going well for you.",
        "Those sparks of joy really matter, even if they feel small."
      ],
      validation: [
        "You deserve good moments like this.",
        "Your happiness is just as important to notice as your struggles.",
        "It’s okay to enjoy this without feeling guilty."
      ],
      suggestion: [
        "If you want, you could store this memory in your mood history so you can look back on it.",
        "You could write a quick note about what made today feel better than usual.",
        "Noticing what helped today might make it easier to repeat in the future."
      ],
      gentleQuestion: [
        "What do you think contributed to you feeling better today?",
        "Is there anyone you’d like to share this good moment with?",
        "What’s one small thing you’d like to remember about this feeling?"
      ]
    },
    neutral: {
      empathy: [
        "Thank you for sharing that with me.",
        "I’m here with you while you figure out how you feel.",
        "Sometimes it’s hard to name emotions, and that’s okay."
      ],
      validation: [
        "You don’t always need to know exactly what you’re feeling for it to matter.",
        "Just showing up and typing is already a form of caring for yourself.",
        "Even ‘numb’ or ‘not sure’ is still an important signal from your mind."
      ],
      suggestion: [
        "We can explore what’s on your mind slowly, without any pressure.",
        "You could try describing your day like a short story—sometimes feelings appear in the details.",
        "If you like, we can start with a small grounding or reflection question."
      ],
      gentleQuestion: [
        "If you had to guess, do you feel more tired, stressed, or okay today?",
        "Is there something specific you’d like to unpack with me?",
        "What made you decide to open this app right now?"
      ]
    }
  };

  function buildCounsellingReply(mood, userText, history, channel) {// build a counselling reply based on mood, user text, chat history, and channel (chat or call)
    const block = ReplyBlocks[mood] || ReplyBlocks.neutral;
    const parts = [];
    parts.push(pick(block.empathy));
    parts.push(pick(block.validation));
    parts.push(pick(block.suggestion));

    const lastUserMessages = history
      .filter(m => m.who === "you")
      .slice(-3)
      .map(m => m.text.toLowerCase())
      .join(" ");

    if (lastUserMessages && /school|exam|assignment|test|teacher/.test(lastUserMessages)) { // detect school-related issues
      parts.push("It also sounds like school or studies have been weighing on you quite a bit.");
    } else if (lastUserMessages && /friend|friends|relationship|boyfriend|girlfriend|family|parent/.test(lastUserMessages)) {// detect relationship issue
      parts.push("I’m noticing that relationships keep coming up for you, which is totally understandable—they affect us a lot.");
    }

    parts.push(pick(block.gentleQuestion));// add a gentle question

    if (mood === "crisis") {
      parts.push(
        "If at any point you feel you might act on these thoughts, please contact local emergency services or a trusted adult immediately. Your safety matters more than anything."
      );
    }

    if (channel === "call") {
      return parts.slice(0, 4).join(" ");
    } else {
      return parts.join(" ");
    }
  }

  function saveMoodEntry(text) {
    const mood = detectMood(text);
    const entry = {
      text: text.slice(0, 200),
      mood,
      crisis: mood === "crisis",
      time: nowISO()
    };

    const list = load(keyFor(BASE_MOOD), []);
    list.unshift(entry);
    save(keyFor(BASE_MOOD), list);
    return entry;
  }

 
  // TOOL TRACKING

  function recordTool(name) {
    const key = keyFor(BASE_TOOL);
    let tools = load(key, []);

    tools = tools.map(t => (typeof t === "object" && t.name ? t.name : t));
    if (!tools.includes(name)) tools.push(name);
    save(key, tools);
  }

  //login
  if (qs("#login-form")) {
    qs("#login-form").addEventListener("submit", e => {
      e.preventDefault();
      const email = qs("#login-email").value.trim().toLowerCase();
      const password = qs("#login-password").value.trim();

      const users = load(USERS_KEY, []);
      const found = users.find(u => u.email === email && u.password === password);

      const msg = qs("#login-msg");

      if (!found) {
        msg.textContent = "Incorrect email or password.";
        msg.style.color = "var(--danger)";
      } else {
        setCurrentUser(found);
        window.location.href = "dashboard.html";
      }
    });
  }

 //Sign up
  if (qs("#signup-form")) {
    qs("#signup-form").addEventListener("submit", e => {
      e.preventDefault();
      const name = qs("#signup-name").value.trim();
      const email = qs("#signup-email").value.trim().toLowerCase();
      const password = qs("#signup-password").value.trim();
      const msg = qs("#signup-msg");

      const users = load(USERS_KEY, []);

      if (users.some(u => u.email === email)) {
        msg.textContent = "Account already exists.";
        msg.style.color = "var(--danger)";
        return;
      }

      users.push({ name, email, password });
      save(USERS_KEY, users);
      setCurrentUser({ name, email });

      msg.textContent = "Account created. Redirecting…";
      msg.style.color = "green";
      setTimeout(() => window.location.href = "dashboard.html", 700);
    });
  }

  //AI Chat Page
  if (qs("#chat-form")) {
    const chatArea = qs("#chat-area");
    const input = qs("#chat-input");
    const send = qs("#send-btn");
    const voice = qs("#voice-btn");

    const chatHistory = [];
    let typingEl = null;

    function showTyping() {
      if (typingEl) return;
      typingEl = document.createElement("div");
      typingEl.className = "bot-msg";
      typingEl.textContent = "AI is thinking…";
      chatArea.appendChild(typingEl);
      chatArea.scrollTop = chatArea.scrollHeight;
    }

    function hideTyping() {
      if (typingEl && typingEl.parentNode) {
        typingEl.parentNode.removeChild(typingEl);
      }
      typingEl = null;
    }

    function addUser(msg) {
      const el = document.createElement("div");
      el.className = "user-msg";
      el.textContent = msg;
      chatArea.appendChild(el);
      chatArea.scrollTop = chatArea.scrollHeight;
      chatHistory.push({ who: "you", text: msg, time: nowISO() });
    }

    function addBot(msg) {
      const el = document.createElement("div");
      el.className = "bot-msg";
      el.textContent = msg;
      chatArea.appendChild(el);
      chatArea.scrollTop = chatArea.scrollHeight;
      chatHistory.push({ who: "ai", text: msg, time: nowISO() });
      speak(msg);
    }

    function handle(text) {
      addUser(text);

      const entry = saveMoodEntry(text);
      const mood = entry.crisis ? "crisis" : entry.mood;

      let reply = buildCounsellingReply(mood, text, chatHistory, "chat");

      // crisis alert
      if (entry.crisis) {
        alert(
          "⚠️ Crisis Detected\n\n" +
          "Your message sounds very serious.\n" +
          "Please reach out to a trusted adult, counsellor, or emergency services immediately."
        );

        const crisisBanner = document.createElement("div");
        crisisBanner.style.background = "#ffd0d9";
        crisisBanner.style.border = "1px solid #ff5580";
        crisisBanner.style.padding = "14px";
        crisisBanner.style.borderRadius = "12px";
        crisisBanner.style.margin = "12px 0";
        crisisBanner.style.color = "#850028";
        crisisBanner.style.fontWeight = "600";
        crisisBanner.textContent =
          "⚠️ Crisis detected: Please contact emergency services or someone you trust right now.";
        chatArea.appendChild(crisisBanner);
        chatArea.scrollTop = chatArea.scrollHeight;
      }

      showTyping();

      setTimeout(() => {
        hideTyping();
        addBot(reply);
      }, 800 + reply.length * 10);
    }

    send.addEventListener("click", () => {
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      handle(text);
    });

    input.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        send.click();
      }
    });

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      voice.disabled = true;
      voice.textContent = "No mic";
    } else {
      const recog = new SR();
      recog.lang = "en-US";
      recog.continuous = false;
      recog.interimResults = false;

      recog.onresult = e => {
        const text = e.results[0][0].transcript;
        handle(text);
      };

      voice.addEventListener("mousedown", () => {
        recog.start();
        voice.textContent = "Listening…";
      });

      ["mouseup", "mouseleave"].forEach(evt => {
        voice.addEventListener(evt, () => {
          recog.stop();
          voice.textContent = "Hold to talk";
        });
      });
    }
  }

 //Call page
  if (qs(".page-call")) {
    const timer = qs("#call-timer");

    let sec = 0;
    setInterval(() => {
      sec++;
      timer.textContent =
        `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
    }, 1000);

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SR) {
      const recog = new SR();
      recog.lang = "en-US";
      recog.continuous = false;
      recog.interimResults = false;

      let busy = false;
      let started = false;

      function startMic() {
        if (!busy) {
          try { recog.start(); } catch (e) { }
        }
      }

      recog.onresult = e => {
        busy = true;

        const text = e.results[0][0].transcript.trim();
        if (!text) {
          busy = false;
          return startMic();
        }

        const moodEntry = saveMoodEntry(text);
        const mood = moodEntry.crisis ? "crisis" : moodEntry.mood;

        let reply =
          pick(ReplyBlocks[mood].empathy) + " " +
          pick(ReplyBlocks[mood].validation) + " " +
          pick(ReplyBlocks[mood].suggestion);

        if (moodEntry.crisis) {
          reply += " Please reach out to a trusted adult or emergency services if you feel unsafe.";
        }

        speak(reply, () => {
          busy = false;
          setTimeout(startMic, 300);
        });
      };

      recog.onerror = () => {
        busy = false;
        setTimeout(startMic, 500);
      };

      recog.onend = () => {
        if (!busy) setTimeout(startMic, 300);
      };

      document.body.addEventListener("click", () => {
        if (!started) {
          started = true;
          startMic();
        }
      });
    }

    const endBtn = qs("#end-call");
    if (endBtn) {
      endBtn.addEventListener("click", () => {
        speechSynthesis.cancel();
        window.location.href = "ai.html";
      });
    }
  }

  //Booking page
  if (qs("#booking-form")) {
    qs("#booking-form").addEventListener("submit", e => {
      e.preventDefault();
      const name = qs("#bk-name").value.trim();
      const email = qs("#bk-email").value.trim();
      const datetime = qs("#bk-datetime").value;
      const note = qs("#bk-note").value.trim();

      const list = load(keyFor(BASE_BOOK), []);
      list.push({ name, email, datetime, note, created: nowISO() });
      save(keyFor(BASE_BOOK), list);

      qs("#booking-msg").textContent = "Booking saved.";
    });
  }

  

  // Breathing circle + whispers
  if (qs("#start-breath")) {
    const circle = qs("#breath-circle");
    const start = qs("#start-breath");
    const stop = qs("#stop-breath");

    let breathingActive = false;
    let whisperTimer = null;

    function scheduleWhispers() {
      const script = [
        "Let's slow down together. You don't have to rush anything right now.",
        "Inhale gently through your nose… hold for a moment… and exhale slowly.",
        "If your thoughts wander, that's okay. Just come back to your breathing.",
        "You're doing enough just by being here and breathing with me.",
        "Your feelings are valid, and you're allowed to take this pause."
      ];
      let i = 0;

      function nextLine() {
        if (!breathingActive) return;
        speak(script[i]);
        i = (i + 1) % script.length;
        whisperTimer = setTimeout(nextLine, 10000);
      }

      nextLine();
    }

    start.addEventListener("click", () => {
      if (!circle) return;
      circle.classList.add("breathing-active");
      breathingActive = true;
      recordTool("Guided Breathing");
      if (whisperTimer) clearTimeout(whisperTimer);
      scheduleWhispers();
    });

    stop.addEventListener("click", () => {
      if (!circle) return;
      circle.classList.remove("breathing-active");
      breathingActive = false;
      if (whisperTimer) clearTimeout(whisperTimer);
      speechSynthesis.cancel();
    });
  }

  // Self-compassion prompt
  if (qs("#compassion-next")) {
    const btn = qs("#compassion-next");
    const output = qs("#compassion-output");

    const prompts = [
      "Imagine your closest friend felt exactly how you feel now. What would you want to say to comfort them?",
      "Finish this sentence: ‘Right now, I find it hard to be kind to myself because…’",
      "List three things you’ve survived or handled before that prove you’re stronger than you feel.",
      "Write one sentence that starts with: ‘Even though I feel ___, I am still worthy of ___.’",
      "Think of a younger version of you. What kind, gentle advice would you give them about this day?"
    ];

    btn.addEventListener("click", () => {
      recordTool("Self-Compassion Prompt");
      const text = pick(prompts);
      if (output) output.textContent = text;
      speak("Here’s a gentle self compassion prompt for you. " + text);
    });
  }

  // Meditation background music
  if (qs("#med-start")) {
    const medStart = qs("#med-start");
    const medStop = qs("#med-stop");
    const medStatus = qs("#med-status");
    const medAudio = new Audio("meditation.mp3");
    medAudio.loop = true;

    medStart.addEventListener("click", () => {
      recordTool("Guided Meditation");
      medAudio.play().catch(() => { });
      if (medStatus) {
        medStatus.textContent = "Meditation playing… You can close your eyes and just listen.";
      }
      speak(
        "Let’s take this time just for you. Find a comfortable position. You don’t have to fix anything right now. Just notice your breath, gently moving in and out."
      );
    });

    if (medStop) {
      medStop.addEventListener("click", () => {
        medAudio.pause();
        medAudio.currentTime = 0;
        if (medStatus) medStatus.textContent = "Meditation stopped.";
      });
    }
  }

  // Worry dump & reframe
  if (qs("#worry-process")) {
    const worryInput = qs("#worry-input");
    const worryOut = qs("#worry-output");

    qs("#worry-process").addEventListener("click", () => {
      recordTool("Worry Dump & Reframe");
      const text = worryInput ? worryInput.value.trim() : "";
      if (!text) {
        if (worryOut) {
          worryOut.textContent =
            "Try typing at least one worry first. It doesn’t have to be perfect or logical.";
        }
        return;
      }

      const mood = detectMood(text);
      let reframe = "Thank you for putting that into words. ";

      if (mood === "anxious") {
        reframe +=
          "Anxiety often exaggerates worst-case scenarios. You could ask yourself: ‘What is the most realistic outcome, not just the scariest one?’";
      } else if (mood === "sad") {
        reframe +=
          "Sadness can make everything look darker than it really is. You might try asking: ‘What would I say to a friend who felt this exact way?’";
      } else {
        reframe +=
          "You might try separating this into two columns: ‘Things I can control’ and ‘Things I cannot control’. Focus gently on the first column.";
      }

      if (worryOut) worryOut.textContent = reframe;
      speak(reframe);
    });
  }

  // Journal save
  if (qs("#save-journal")) {
    const textarea = qs("#journal-text");
    const feedback = qs("#journal-feedback");

    if (textarea) {
      textarea.value = load(keyFor(BASE_JOUR), "");
    }

    qs("#save-journal").addEventListener("click", () => {
      if (!textarea) return;
      save(keyFor(BASE_JOUR), textarea.value.trim());
      recordTool("Journal Tool");
      if (feedback) {
        feedback.textContent = "Journal saved locally on this device.";
        setTimeout(() => feedback.textContent = "", 2500);
      }
    });
  }

  //Dashboard
  if (qs("#dashboard-root")) {
    const moods = load(keyFor(BASE_MOOD), []);
    const rawTools = load(keyFor(BASE_TOOL), []);
    const tools = rawTools.map(t => (typeof t === "object" ? t.name : t));
    const bookings = load(keyFor(BASE_BOOK), []);
    const moodList = qs("#moodList");
    const toolList = qs("#toolList");
    const bookingList = qs("#bookingList");
    const badgeList = qs("#badgeList");
    const alertBox = qs("#dashboard-alert");
    if (moods.some(m => m.crisis)) {
      alertBox.style.display = "block";
      alertBox.textContent =
        "Some entries suggest emotional distress. If anything feels unsafe, please reach out to a trusted adult or counsellor.";
    }

    moodList.innerHTML =
      moods.length === 0
        ? "<li class='muted'>No entries</li>"
        : moods.slice(0, 8).map(m =>
            `<li>${
              m.crisis
                ? "<span class='crisis-text'>CRISIS</span>"
                : m.mood.toUpperCase()
            } — ${m.text}<br><span class='muted'>${new Date(m.time).toLocaleString()}</span></li>`
          ).join("");

    toolList.innerHTML =
      tools.length === 0
        ? "<li class='muted'>No tools used</li>"
        : tools.map(t => `<li>${t}</li>`).join("");

    bookingList.innerHTML =
      bookings.length === 0
        ? "<li class='muted'>No bookings</li>"
        : bookings
            .slice()
            .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
            .map(b =>
              `<li><strong>${b.name}</strong> — ${new Date(b.datetime).toLocaleString()}
               <br><span class='muted'>${b.note || ""}</span></li>`
            ).join("");

    const badges = [];
    if (moods.length >= 1) badges.push("💬 First Check-In");
    if (moods.length >= 5) badges.push("📈 Mood Tracker (5+)");
    if (tools.length >= 1) badges.push("🧘 First Tool Used");
    if (bookings.length >= 1) badges.push("📅 Session Planner");

    badgeList.innerHTML =
      badges.length === 0
        ? "<li class='muted'>No badges</li>"
        : badges.map(b => `<li>${b}</li>`).join("");

    if (qs("#moodChart") && moods.length > 0) {
      new Chart(qs("#moodChart"), {
        type: "line",
        data: {
          labels: moods.slice().reverse().map(m => new Date(m.time).toLocaleDateString()),
          datasets: [{
            data: moods.slice().reverse().map(m =>
              ({
                crisis: 0,
                sad: 1,
                angry: 1,
                anxious: 2,
                neutral: 3,
                happy: 4
              }[m.mood] ?? 3)
            ),
            borderColor: "#8a6fff",
            backgroundColor: "rgba(138,111,255,0.2)",
            fill: true,
            tension: .35
          }]
        },
        options: {
          plugins: { legend: { display: false } },
          scales: {
            y: {
              min: 0, max: 4,
              ticks: {
                callback: v => ["Crisis", "Sad/Angry", "Anxious", "Neutral", "Happy"][v]
              }
            }
          }
        }
      });
    }
  }

  //Profile page
  if (qs("#profile-root")) {
    const user = getCurrentUser();

    qs("#profile-name").textContent = user ? user.name : "Guest";
    qs("#profile-email").textContent = user ? user.email : "Not logged in";

    const moods = load(keyFor(BASE_MOOD), []);
    const tools = load(keyFor(BASE_TOOL), []);
    const bookings = load(keyFor(BASE_BOOK), []);
    const crisis = moods.filter(m => m.crisis).length;

    qs("#profile-stats").innerHTML = `
      <p><strong>Mood entries:</strong> ${moods.length}</p>
      <p><strong>Tools used:</strong> ${tools.length}</p>
      <p><strong>Bookings made:</strong> ${bookings.length}</p>
      <p><strong>Crisis-flagged:</strong> ${crisis}</p>
    `;

    // optional logout button (if exists)
    const logoutBtn = qs("#logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        // clear per-user data
        localStorage.removeItem(CURRENT_USER_KEY);
        localStorage.removeItem(keyFor(BASE_MOOD));
        localStorage.removeItem(keyFor(BASE_BOOK));
        localStorage.removeItem(keyFor(BASE_JOUR));
        localStorage.removeItem(keyFor(BASE_TOOL));

        window.location.href = "index.html";
      });
    }
  }

})();
