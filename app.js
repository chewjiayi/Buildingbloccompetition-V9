(function () {

  const qs = s => document.querySelector(s);
  const qsa = s => document.querySelectorAll(s);
  const nowISO = () => new Date().toISOString();

  function load(key, def) {
    try { return JSON.parse(localStorage.getItem(key)) ?? def; }
    catch { return def; }
  }

  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // USER STORAGE KEYS
  const USERS_KEY = "cmn_users";
  const CURRENT_USER_KEY = "cmn_current_user";

  function getCurrentUser() {
    return load(CURRENT_USER_KEY, null);
  }

  function setCurrentUser(user) {
    if (user) save(CURRENT_USER_KEY, user);
    else localStorage.removeItem(CURRENT_USER_KEY);
  }

  function keyFor(base) {
    const u = getCurrentUser();
    const id = u ? u.email : "guest";
    return `${base}_${id}`;
  }

  const BASE_MOOD = "cmn_mood";
  const BASE_BOOK = "cmn_bookings";
  const BASE_JOUR = "cmn_journal";
  const BASE_TOOL = "cmn_tools";

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  // ---------- TEXT-TO-SPEECH ----------
  function speak(text, cb) {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.9;
    u.pitch = 1.05;
    u.volume = 1;
    u.onend = () => cb && cb();
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  // ---------- MOOD & CRISIS DETECTION ----------
  function detectMood(text) {
    if (!text) return "neutral";

    const t = text.toLowerCase().trim().replace(/[^\w\s]/g, "");

    const crisisWords = [
      "suicide", "kill myself", "end my life", "jump down",
      "i wanna die", "wanna die", "i want to die", "want to die",
      "dont want to live", "no point living", "feel like dying",
      "i dont want to be here", "self harm", "hurt myself",
      "cut myself", "die"
    ];

    if (crisisWords.some(w => t.includes(w))) return "crisis";

    const sad = ["sad", "down", "depressed", "cry", "lonely", "hopeless", "empty", "tired"];
    const anx = ["anx", "panic", "scared", "overwhelmed", "worry", "stressed"];
    const angry = ["angry", "annoyed", "frustrated", "pissed", "irritated", "mad"];
    const happy = ["happy", "good", "great", "ok", "fine", "better"];

    if (sad.some(w => t.includes(w))) return "sad";
    if (anx.some(w => t.includes(w))) return "anxious";
    if (angry.some(w => t.includes(w))) return "angry";
    if (happy.some(w => t.includes(w))) return "happy";

    return "neutral";
  }

  // ---------- FIXED REPLY BLOCKS ----------
  const ReplyBlocks = {

    crisis: {
      empathy: [
        "Thank you for telling me this. I'm really glad you said it.",
        "It sounds incredibly heavy and painful.",
        "Hearing how much you're struggling matters to me."
      ],
      validation: [
        "Your feelings are real and important.",
        "Wanting the pain to stop doesn’t mean you are weak.",
        "It makes sense that you're exhausted from holding all of this alone."
      ],
      suggestion: [
        "You don’t have to face this alone — reaching out to a safe adult can help.",
        "If you can, take a small breath and try to stay with me for a moment.",
        "You deserve immediate support from someone you trust."
      ],
      gentleQuestion: [
        "What could make this moment slightly safer?",
        "Is there anyone you could message now to say 'I am not okay'?",
        "Do you want me to guide you to the crisis support page?"
      ]
    },

    sad: {
      empathy: [
        "It really sounds like you are carrying a lot inside.",
        "Your heart feels heavy right now.",
        "It seems like you've been feeling low, and that's exhausting."
      ],
      validation: [
        "It's okay to feel sad — it doesn't make you weak.",
        "You don't need to pretend to be fine with me.",
        "Feeling this way shows you're human, not failing."
      ],
      suggestion: [
        "Maybe we can slow down together.",
        "If you want, you could journal a little.",
        "Even drinking water or stretching can help."
      ],
      gentleQuestion: [
        "What do you think triggered this?",
        "If someone you love felt like this, what would you say?",
        "Where in your body do you feel this sadness?"
      ]
    },

    anxious: {
      empathy: [
        "It sounds like your thoughts are racing.",
        "Your body feels on alert right now.",
        "Anxiety can be overwhelming, especially alone."
      ],
      validation: [
        "You're not broken for feeling this way.",
        "Your brain is trying to protect you.",
        "Your tension makes sense after everything you're handling."
      ],
      suggestion: [
        "Let's try a slow breath together.",
        "Try naming 3 things you see and 2 things you can touch.",
        "You can separate worries into 'control' vs 'no control'."
      ],
      gentleQuestion: [
        "What do you think your anxiety is trying to protect you from?",
        "Was there something specific that triggered this?",
        "What usually helps you calm down?"
      ]
    },

    angry: {
      empathy: [
        "It feels like something pushed you to your limit.",
        "You sound really frustrated.",
        "Anger often protects something important inside."
      ],
      validation: [
        "Your anger is valid — it doesn't make you bad.",
        "You're upset because something mattered to you.",
        "Under the anger, there may be hurt too."
      ],
      suggestion: [
        "Let's slow this moment down.",
        "Try writing an unsent message.",
        "Try clenching & releasing your fists slowly."
      ],
      gentleQuestion: [
        "What is your anger trying to tell you?",
        "Is there hurt behind the anger?",
        "What would 'standing up for yourself safely' look like?"
      ]
    },

    happy: {
      empathy: [
        "I'm really glad to hear something bright from you.",
        "It’s nice that something went well for you.",
        "These small sparks matter."
      ],
      validation: [
        "You deserve good moments.",
        "Your joy is important.",
        "It's okay to enjoy this without guilt."
      ],
      suggestion: [
        "You could save this in your mood history.",
        "Maybe write what made today better.",
        "Noticing what helps makes it easier to repeat later."
      ],
      gentleQuestion: [
        "What contributed to you feeling better?",
        "Anyone you’d like to share this with?",
        "What part of this feeling would you like to remember?"
      ]
    },

    neutral: {
      empathy: [
        "Thank you for sharing that.",
        "I'm here with you while you figure things out.",
        "It's okay if emotions feel unclear."
      ],
      validation: [
        "Your feelings matter even if you can't label them.",
        "Showing up is already self-care.",
        "Even 'not sure' is a real emotion."
      ],
      suggestion: [
        "We can explore slowly.",
        "Maybe describe your day like a story.",
        "We can start with a small reflection question."
      ],
      gentleQuestion: [
        "Do you feel tired, stressed, or okay today?",
        "Anything specific you'd like to unpack?",
        "What made you open this app right now?"
      ]
    }
  };

  // ---------- REPLY BUILDER ----------
  function buildCounsellingReply(mood, userText, history, channel) {
    const block = ReplyBlocks[mood] || ReplyBlocks.neutral;
    const parts = [
      pick(block.empathy),
      pick(block.validation),
      pick(block.suggestion)
    ];

    const lastUserText = history
      .filter(m => m.who === "you")
      .slice(-3)
      .map(m => m.text.toLowerCase())
      .join(" ");

    if (/school|exam|assignment/.test(lastUserText)) {
      parts.push("It sounds like school has been adding pressure on you.");
    }

    if (/friend|family|relationship/.test(lastUserText)) {
      parts.push("Relationships can affect our emotions deeply, so it makes sense this is affecting you.");
    }

    parts.push(pick(block.gentleQuestion));

    if (mood === "crisis") {
      parts.push("If you feel unsafe, please reach out to a trusted adult or emergency services.");
    }

    return channel === "call"
      ? parts.slice(0, 4).join(" ")
      : parts.join(" ");
  }

  // ---------- SAVE MOOD ENTRY ----------
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

  // ---------- TOOL TRACKING ----------
  function recordTool(name) {
    const key = keyFor(BASE_TOOL);
    let tools = load(key, []);
    tools = tools.map(t => (typeof t === "object" ? t.name : t));
    if (!tools.includes(name)) tools.push(name);
    save(key, tools);
  }

  // ---------- LOGIN ----------
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

  // ---------- SIGNUP ----------
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

  // ---------- AI CHAT PAGE ----------
  if (qs("#chat-form")) {

    console.log("CHAT BLOCK LOADED!");

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
      if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
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

      const reply = buildCounsellingReply(mood, text, chatHistory, "chat");

      if (entry.crisis === true) {
        setTimeout(() => {
          alert(
            "⚠️ Crisis Detected\n\n" +
            "Your message sounds very serious.\n" +
            "Please reach out to a trusted adult, counsellor, or emergency services immediately."
          );
        }, 150);

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

    // VOICE INPUT
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

  // ---------- CALL PAGE (VOICE CALL) ----------
  if (qs(".page-call")) {

    const timer = qs("#call-timer");

    let sec = 0;
    setInterval(() => {
      sec++;
      timer.textContent = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
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
          try { recog.start(); } catch (e) {}
        }
      }

      recog.onresult = e => {
        busy = true;

        const text = e.results[0][0].transcript.trim();
        if (!text) {
          busy = false;
          return startMic();
        }

        const entry = saveMoodEntry(text);
        const mood = entry.crisis ? "crisis" : entry.mood;

        const reply = buildCounsellingReply(mood, text, [], "call");

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

  // ---------- BOOKING PAGE ----------
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

  // ---------- BREATHING TOOL ----------
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
      circle.classList.add("breathing-active");
      breathingActive = true;
      recordTool("Guided Breathing");
      if (whisperTimer) clearTimeout(whisperTimer);
      scheduleWhispers();
    });

    stop.addEventListener("click", () => {
      circle.classList.remove("breathing-active");
      breathingActive = false;
      if (whisperTimer) clearTimeout(whisperTimer);
      speechSynthesis.cancel();
    });
  }
  // ---------- SELF-COMPASSION PROMPTS ----------
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
      speak("Here’s a gentle self-compassion prompt for you. " + text);
    });
  }

  // ---------- MEDITATION MUSIC ----------
  if (qs("#med-start")) {

    const medStart = qs("#med-start");
    const medStop = qs("#med-stop");
    const medStatus = qs("#med-status");

    const medAudio = new Audio("meditation.mp3");
    medAudio.loop = true;

    medStart.addEventListener("click", () => {
      recordTool("Guided Meditation");
      medAudio.play().catch(() => {});
      if (medStatus) medStatus.textContent = "Meditation playing… relax and breathe.";
      speak("Take a deep breath… relax your shoulders. You are safe.");
    });

    if (medStop) {
      medStop.addEventListener("click", () => {
        medAudio.pause();
        medAudio.currentTime = 0;
        if (medStatus) medStatus.textContent = "Meditation stopped.";
      });
    }
  }

  // ---------- WORRY DUMP ----------
  if (qs("#worry-process")) {

    const worryInput = qs("#worry-input");
    const worryOut = qs("#worry-output");

    qs("#worry-process").addEventListener("click", () => {

      recordTool("Worry Dump & Reframe");

      const text = worryInput ? worryInput.value.trim() : "";
      if (!text) {
        if (worryOut) worryOut.textContent =
          "Try typing at least one worry first. It doesn't have to be perfect.";
        return;
      }

      const mood = detectMood(text);
      let reframe = "Thank you for putting that into words. ";

      if (mood === "anxious") {
        reframe +=
          "Anxiety often imagines the worst case. Try asking yourself: ‘What is the realistic outcome?’";
      } else if (mood === "sad") {
        reframe +=
          "Sadness can make everything appear darker. Try asking: ‘What would I tell a friend feeling this way?’";
      } else {
        reframe +=
          "Try dividing this into two lists: ‘Things I can control’ and ‘Things I cannot control’.";
      }

      if (worryOut) worryOut.textContent = reframe;
      speak(reframe);
    });
  }

  // ---------- JOURNAL ----------
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

      feedback.textContent = "Journal saved.";
      setTimeout(() => feedback.textContent = "", 2500);
    });
  }

  // ---------- DASHBOARD ----------
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

    // Crisis Warning
    if (moods.some(m => m.crisis)) {
      alertBox.style.display = "block";
      alertBox.textContent =
      "Some entries suggest emotional distress. If anything feels unsafe, please reach out to a trusted adult or counsellor.";
    }

    // Mood entries
    moodList.innerHTML =
      moods.length === 0
        ? "<li class='muted'>No entries</li>"
        : moods.slice(0, 8).map(m =>
            `<li>
              ${m.crisis ? "<span class='crisis-text'>CRISIS</span>" : m.mood.toUpperCase()}
               — ${m.text}
              <br><span class='muted'>${new Date(m.time).toLocaleString()}</span>
            </li>`
          ).join("");

    // Tool usage
    toolList.innerHTML =
      tools.length === 0
        ? "<li class='muted'>No tools used</li>"
        : tools.map(t => `<li>${t}</li>`).join("");

    // Bookings
    bookingList.innerHTML =
      bookings.length === 0
        ? "<li class='muted'>No bookings</li>"
        : bookings
          .slice()
          .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
          .map(b =>
            `<li>
              <strong>${b.name}</strong> — ${new Date(b.datetime).toLocaleString()}
              <br><span class='muted'>${b.note || ""}</span>
            </li>`
          ).join("");

    // Badges
    const badges = [];
    if (moods.length >= 1) badges.push("💬 First Check-In");
    if (moods.length >= 5) badges.push("📈 Mood Tracker (5+)");
    if (tools.length >= 1) badges.push("🧘 First Tool Used");
    if (bookings.length >= 1) badges.push("📅 Session Planner");

    badgeList.innerHTML =
      badges.length === 0
        ? "<li class='muted'>No badges</li>"
        : badges.map(b => `<li>${b}</li>`).join("");

    // Mood Chart
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
              min: 0,
              max: 4,
              ticks: {
                callback: v => ["Crisis", "Sad/Angry", "Anxious", "Neutral", "Happy"][v]
              }
            }
          }
        }
      });
    }
  }

  // ---------- PROFILE PAGE ----------
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

    const logoutBtn = qs("#logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem(CURRENT_USER_KEY);
        localStorage.removeItem(keyFor(BASE_MOOD));
        localStorage.removeItem(keyFor(BASE_BOOK));
        localStorage.removeItem(keyFor(BASE_JOUR));
        localStorage.removeItem(keyFor(BASE_TOOL));

        window.location.href = "index.html";
      });
    }
  }

})(); // END OF APP
