// === Chatbot vocal responsive avec HTML, images, historique, suggestions, mobile friendly ===

// Ajout : charge la lib Markdown (NE CHARGE QU’UNE SEULE FOIS !)
if (!window._markedLoaded) {
  const markedScript = document.createElement('script');
  markedScript.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
  document.head.appendChild(markedScript);
  window._markedLoaded = true;
}

declareSpeechRecognition();

function declareSpeechRecognition() {
  if (!window._speechDeclared) {
    window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    window._speechDeclared = true;
  }
  if (!window.SpeechRecognition) alert("❌ Chatbot vocal non supporté sur ce navigateur");
  else loadAndInitChatbot();
}

async function loadAndInitChatbot() {
  const scriptTag = document.currentScript || document.querySelector('script[data-client-id]');
  const clientId = scriptTag?.getAttribute('data-client-id') || "novacorp";
  const backendUrl = scriptTag?.getAttribute('data-backend-url') || "https://chatbot-vocal-backend.onrender.com";
  let config = {
    color: "#0078d4",
    logoUrl: null,
    suggestions: [
      "Je souhaite prendre rendez-vous",
      "Quels sont vos services ?",
      "J’aimerais en savoir plus sur vos tarifs"
    ],
    rgpdLink: "/politique-confidentialite.html"
  };
  try {
    const res = await fetch(${backendUrl}/config/${clientId}.json);
    if (res.ok) config = await res.json();
  } catch (e) {
    console.warn("[Chatbot] Config non chargée, fallback utilisé.");
  }
  initChatbot(config, backendUrl, clientId);
}

function initChatbot(config, backendUrl, clientId) {
  const recognition = new window.SpeechRecognition();
  recognition.lang = 'fr-FR';
  recognition.continuous = false;
  recognition.interimResults = false;

  const userId = localStorage.getItem('chatbotUserId') || (() => {
    const id = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('chatbotUserId', id);
    return id;
  })();

  let isTextMode = true;
  let isListening = false;
  let currentAudio = null;

  // ---- SHADOW DOM START ----
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.zIndex = '9999';
  // Pour debug visibilité si besoin :
  // container.style.background = 'rgba(255,0,0,0.05)';
  document.body.appendChild(container);

  const shadow = container.attachShadow({ mode: 'open' });

  // === Launcher button (🤖) ===
  const launcher = document.createElement('button');
  launcher.textContent = '🤖';
  Object.assign(launcher.style, {
    fontSize: '28px', border: 'none', background: config.color,
    color: '#fff', borderRadius: '50%', padding: '10px', cursor: 'pointer'
  });
  shadow.appendChild(launcher);

  // === Widget panel principal ===
  const widget = document.createElement('div');
  Object.assign(widget.style, {
    display: 'none', flexDirection: 'column', width: '350px', maxWidth: '90vw',
    background: linear-gradient(to bottom, ${config.color}, #d7dcfa),
    color: '#000', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    padding: '20px', fontFamily: 'sans-serif', maxHeight: '90vh', overflow: 'hidden'
  });
  widget.classList.add('custom-chatbot-widget');
  shadow.appendChild(widget);

  launcher.onclick = () => {
    launcher.style.display = 'none';
    widget.style.display = 'flex';
    setTimeout(() => {
      if (isTextMode) input.focus();
    }, 300);
  };

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';

  const logo = document.createElement('img');
  logo.src = config.logoUrl || '';
  logo.alt = 'Logo';
  logo.style.height = '30px';
  header.appendChild(logo);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  Object.assign(closeBtn.style, {
    border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer'
  });
  closeBtn.onclick = () => {
    widget.style.display = 'none';
    launcher.style.display = 'inline-block';
  };
  header.appendChild(closeBtn);
  widget.appendChild(header);

  // -- Message d'accueil dynamique selon l'heure --
  function getWelcomeMsg() {
    const h = new Date().getHours();
    if (h < 6) return "🌙 Bonsoir !<br><strong>Que puis-je faire pour vous ?</strong>";
    if (h < 12) return "☀️ Bonjour !<br><strong>Que puis-je faire pour vous ?</strong>";
    if (h < 18) return "👋 Bonjour !<br><strong>Que puis-je faire pour vous ?</strong>";
    return "🌙 Bonsoir !<br><strong>Que puis-je faire pour vous ?</strong>";
  }

  const title = document.createElement('h2');
  title.innerHTML = getWelcomeMsg();
  title.style.margin = '16px 0';
  title.style.color = '#fff';
  widget.appendChild(title);

  // Suggestions rapides
  const suggBox = document.createElement('div');
  Object.assign(suggBox.style, {
    background: '#fff', borderRadius: '12px', padding: '12px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)', marginBottom: '12px'
  });
  config.suggestions.forEach(s => {
    const item = document.createElement('div');
    item.textContent = s;
    Object.assign(item.style, {
      padding: '8px 0', borderBottom: '1px solid #eee', cursor: 'pointer'
    });
    item.onclick = () => handleMessage(s);
    suggBox.appendChild(item);
  });
  widget.appendChild(suggBox);

  // Zone de discussion + bouton expand intégré dedans
  const chatLog = document.createElement('div');
  chatLog.style.flex = '1';
  chatLog.style.overflowY = 'auto';
  chatLog.style.maxHeight = '160px';
  chatLog.style.marginBottom = '10px';
  chatLog.style.padding = '8px';
  chatLog.style.background = '#fdfdfd';
  chatLog.style.borderRadius = '10px';
  chatLog.style.position = 'relative';
  chatLog.style.transition = 'max-height 0.25s cubic-bezier(0.4,0.3,0.6,1)';

  // === Bouton expand/reduce ===
  const expandBtn = document.createElement('button');
  expandBtn.innerHTML = '🗖';
  Object.assign(expandBtn.style, {
    position: 'absolute',
    top: '8px',
    right: '10px',
    background: '#fff',
    border: 'none',
    color: '#888',
    fontSize: '18px',
    cursor: 'pointer',
    zIndex: '10'
  });
  chatLog.appendChild(expandBtn);

  const reduceBtn = document.createElement('button');
  reduceBtn.textContent = '✕';
  Object.assign(reduceBtn.style, {
    position: 'absolute',
    top: '8px',
    right: '10px',
    background: '#fff',
    border: 'none',
    color: '#888',
    fontSize: '20px',
    cursor: 'pointer',
    zIndex: '10',
    display: 'none'
  });
  chatLog.appendChild(reduceBtn);

  let isExpanded = false;
  expandBtn.onclick = () => {
    isExpanded = true;
    chatLog.style.maxHeight = '74vh';
    chatLog.style.minHeight = '320px';
    expandBtn.style.display = 'none';
    reduceBtn.style.display = 'inline-block';
    widget.style.maxHeight = '85vh';
  };
  reduceBtn.onclick = () => {
    isExpanded = false;
    chatLog.style.maxHeight = '160px';
    chatLog.style.minHeight = '';
    expandBtn.style.display = 'inline-block';
    reduceBtn.style.display = 'none';
    widget.style.maxHeight = '90vh';
  };

  widget.appendChild(chatLog);

  // ======== INPUT & MIC/CTA VOCAL ========
  const inputBox = document.createElement('div');
  inputBox.style.display = 'flex';
  inputBox.style.background = '#fff';
  inputBox.style.borderRadius = '16px';
  inputBox.style.alignItems = 'center';
  inputBox.style.overflow = 'hidden';

  const input = document.createElement('input');
  input.placeholder = 'Votre message...';
  Object.assign(input.style, {
    flex: '1', padding: '10px', border: 'none', outline: 'none'
  });

  // Ancien bouton micro (on ne l'affiche plus du tout)
  // const micBtn = document.createElement('button');
  // micBtn.textContent = '🎤';

  const sendBtn = document.createElement('button');
  sendBtn.textContent = '➤';
  Object.assign(sendBtn.style, {
    border: 'none', background: config.color, color: '#fff',
    padding: '10px', cursor: 'pointer'
  });

  inputBox.appendChild(input);
  inputBox.appendChild(sendBtn);
  widget.appendChild(inputBox);

  // ======= BOUTON VOCAL MODE CTA (mode vocal uniquement) =========
  const vocalCtaBox = document.createElement('div');
  vocalCtaBox.style.display = 'none';
  vocalCtaBox.style.justifyContent = 'center';
  vocalCtaBox.style.alignItems = 'center';
  vocalCtaBox.style.margin = '12px 0 0 0';
  vocalCtaBox.style.height = '46px';

  // Le bouton noir CTA
  const vocalCtaBtn = document.createElement('button');
  vocalCtaBtn.innerHTML = `<span style="font-size:1.25em;vertical-align:middle;margin-right:6px;">📞</span><b>CHAT VOCAL</b>`;
  Object.assign(vocalCtaBtn.style, {
    background: '#111', color: '#fff', border: 'none', borderRadius: '26px',
    padding: '8px 28px', fontSize: '1.15em', cursor: 'pointer', fontWeight: 'bold',
    display: 'flex', alignItems: 'center', gap: '7px', letterSpacing: '0.5px',
    boxShadow: '0 2px 14px #181e3625', outline: 'none', minWidth: '170px',
    transition: 'background 0.2s, color 0.2s'
  });

  vocalCtaBtn.onclick = () => {
    // Si lecture audio => coupe
    if (currentAudio && !currentAudio.paused) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
      vocalCtaBtn.innerHTML = `<span style="font-size:1.25em;vertical-align:middle;margin-right:6px;">📞</span><b>CHAT VOCAL</b>`;
      vocalCtaBtn.style.background = "#111";
      return;
    }
    if (!isListening) recognition.start();
    else recognition.stop();
  };

  vocalCtaBox.appendChild(vocalCtaBtn);
  widget.appendChild(vocalCtaBox);

  // Tabs texte/vocal
  const footerNav = document.createElement('div');
  footerNav.style.display = 'flex';
  footerNav.style.justifyContent = 'space-around';
  footerNav.style.marginTop = '16px';
  footerNav.style.background = '#fff';
  footerNav.style.borderRadius = '12px';
  footerNav.style.padding = '8px';

  const vocalTab = document.createElement('div');
  vocalTab.innerHTML = '🎙️ Vocal';
  vocalTab.style.cursor = 'pointer';
  vocalTab.style.fontWeight = 'bold';

  const textTab = document.createElement('div');
  textTab.innerHTML = '💬 Texte';
  textTab.style.cursor = 'pointer';

  vocalTab.onclick = () => {
    isTextMode = false;
    vocalTab.style.color = config.color;
    textTab.style.color = '#000';
    updateModeUI();
  };
  textTab.onclick = () => {
    isTextMode = true;
    textTab.style.color = config.color;
    vocalTab.style.color = '#000';
    updateModeUI();
  };
  function updateModeUI() {
    if (isTextMode) {
      inputBox.style.display = 'flex';
      sendBtn.style.display = 'inline-block';
      vocalCtaBox.style.display = 'none';
      setTimeout(() => input.focus(), 100);
    } else {
      inputBox.style.display = 'none';
      vocalCtaBox.style.display = 'flex';
    }
  }
  footerNav.appendChild(vocalTab);
  footerNav.appendChild(textTab);
  widget.appendChild(footerNav);

  // RGPD
  const rgpd = document.createElement('a');
  rgpd.href = config.rgpdLink;
  rgpd.textContent = 'Politique de confidentialité';
  rgpd.target = '_blank';
  Object.assign(rgpd.style, {
    fontSize: '11px', color: '#eee', marginTop: '6px', textAlign: 'right'
  });
  widget.appendChild(rgpd);

  // --- Gestion vocale (bouton CTA noir + anim) ---
  recognition.onstart = () => {
    isListening = true;
    vocalCtaBtn.innerHTML = `<span style="font-size:1.2em;margin-right:6px;">🛑</span><b>ARRÊTER</b>`;
    vocalCtaBtn.style.background = "#e32525";
    vocalCtaBtn.style.color = "#fff";
    vocalCtaBtn.style.boxShadow = "0 0 0 8px #e3252535";
  };
  recognition.onend = () => {
    isListening = false;
    vocalCtaBtn.innerHTML = `<span style="font-size:1.25em;margin-right:6px;">📞</span><b>CHAT VOCAL</b>`;
    vocalCtaBtn.style.background = "#111";
    vocalCtaBtn.style.color = "#fff";
    vocalCtaBtn.style.boxShadow = "0 2px 14px #181e3625";
  };
  recognition.onresult = e => {
    const txt = e.results[e.results.length - 1][0].transcript;
    handleMessage(txt);
  };

  sendBtn.onclick = () => {
    if (input.value.trim()) {
      handleMessage(input.value);
      input.value = '';
    }
  };

  // Accessibilité
  document.addEventListener('keydown', (e) => {
    if (e.key === "Escape" && widget.style.display !== 'none') {
      widget.style.display = 'none';
      launcher.style.display = 'inline-block';
    }
    if (e.key === "Enter" && isTextMode && document.activeElement === input && input.value.trim()) {
      handleMessage(input.value);
      input.value = '';
    }
  });

  // Ajout loader à ce niveau
  let loader = null;
  function showLoader() {
    if (!loader) {
      loader = document.createElement('div');
      loader.className = 'chatbot-loader-bubbles';
      loader.innerHTML = <span></span><span></span><span></span>;
      loader.style.alignSelf = 'flex-start';
      loader.style.margin = '6px 0';
      loader.style.background = '#f4f4f4';
      loader.style.padding = '8px 12px';
      loader.style.borderRadius = '14px';
      loader.style.maxWidth = '85%';
      loader.style.display = 'flex';
      loader.style.gap = '3px';
    }
    chatLog.appendChild(loader);
    chatLog.scrollTop = chatLog.scrollHeight;
  }
  function hideLoader() {
    if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
  }

  // === ICI SEULEMENT la modif : audio uniquement en mode vocal ===
  function handleMessage(msg) {
    suggBox.style.display = 'none';
    appendMessage(msg, 'user');
    showLoader();
    fetch(`${backendUrl}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, message: msg, clientId, vocalMode: !isTextMode })
  // Ici, vocalMode sera true si tu es en mode vocal, false sinon !
    })
      .then(r => r.json())
      .then(data => {
        hideLoader();
        appendMessage(data.text || '(Pas de réponse)', 'bot', true);
        // Ne joue l'audio QUE si on est en mode vocal
        if (!isTextMode && data.audioUrl) new Audio(data.audioUrl).play();
      })
      .catch(() => {
        hideLoader();
        appendMessage("Désolé, le serveur est injoignable.", 'bot');
      });
  }

  function appendMessage(msg, sender, isHTML = false) {
    const msgRow = document.createElement('div');
    msgRow.style.display = 'flex';
    msgRow.style.alignItems = 'flex-end';
    msgRow.style.margin = '8px 0';
    msgRow.style.opacity = '0';
    msgRow.style.transition = 'opacity 0.28s';

    setTimeout(() => { msgRow.style.opacity = 1; }, 50); // Anim fadeIn

    if (sender === 'bot') {
      // Avatar bot à gauche
      const avatar = document.createElement('span');
      avatar.textContent = '🤖'; // Tu peux mettre une image ici si tu veux !
      avatar.style.fontSize = "22px";
      avatar.style.marginRight = "8px";
      msgRow.appendChild(avatar);
    } else {
      msgRow.style.justifyContent = "flex-end";
    }

    const div = document.createElement('div');
    div.style.alignSelf = sender === 'user' ? 'flex-end' : 'flex-start';
    div.style.background = sender === 'user' ? '#d0eaff' : '#f4f4f4';
    div.style.padding = '8px 12px';
    div.style.borderRadius = '14px';
    div.style.maxWidth = '85%';
    div.style.overflowWrap = 'break-word';
    div.style.fontSize = "1em";
    if (isHTML && sender === 'bot') {
      // Ici marked et DOMPurify sont dispo grâce aux balises <script> dans le <head>
      const html = marked.parse(msg);
      div.innerHTML = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['b', 'i', 'strong', 'a', 'img', 'br', 'ul', 'li', 'p'],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target']
      });
    } else {
      div.textContent = msg;
    }
    msgRow.appendChild(div);
    chatLog.appendChild(msgRow);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  // ===== LOGIQUE D'ENVOI DE MESSAGE =====
  function handleMessage(msg) {
    suggBox.style.display = 'none';
    appendMessage(msg, 'user');
    showLoader();
    // Si audio en cours, coupe
    if (currentAudio && !currentAudio.paused) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
    fetch(`${backendUrl}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, message: msg, clientId, vocalMode: !isTextMode })
    })
      .then(r => r.json())
      .then(data => {
        hideLoader();
        appendMessage(data.text || '(Pas de réponse)', 'bot', true);
        // Audio seulement en mode vocal
        if (!isTextMode && data.audioUrl) {
          currentAudio = new Audio(data.audioUrl);
          currentAudio.play();
        }
      })
      .catch(() => {
        hideLoader();
        appendMessage("Désolé, le serveur est injoignable.", 'bot');
      });
  }

  updateModeUI();

  // Place bien les STYLES DANS le SHADOW DOM !
  const style = document.createElement('style');
  style.textContent = 
    @media (max-width: 480px) {
      .custom-chatbot-widget { width: 92vw !important; max-height: 85vh !important; border-radius: 16px !important; }
    }
    .custom-chatbot-widget img { max-width: 100%; border-radius: 10px; margin-top: 6px; }
    .custom-chatbot-widget a { color: ${config.color}; text-decoration: underline; }
    .chatbot-loader-bubbles {
      display: flex; align-items: center; height: 22px;
    }
    .chatbot-loader-bubbles span {
      width: 6px; height: 6px; margin: 0 2px;
      background: #a6b5df;
      border-radius: 50%; display: inline-block;
      opacity: 0.7; animation: chatbot-bounce 1s infinite both;
    }
    .chatbot-loader-bubbles span:nth-child(2) { animation-delay: 0.15s; }
    .chatbot-loader-bubbles span:nth-child(3) { animation-delay: 0.3s; }
    @keyframes chatbot-bounce {
      0%, 80%, 100% { transform: scale(0.8); opacity: 0.7; }
      40% { transform: scale(1.3); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}
