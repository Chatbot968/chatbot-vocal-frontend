// =========== PATCH ANTI-DOUBLE-INJECTION & VERSIONNING CHATBOTWIDGET ===========
if (window.__CHATBOT_WIDGET_LOADED__) {
  console.warn('[ChatbotWidget] Script déjà injecté, on stoppe pour éviter bug ou duplication.');
  throw new Error('ChatbotWidget déjà injecté');
}
window.__CHATBOT_WIDGET_LOADED__ = true;

window.CHATBOT_WIDGET_VERSION = 'v10 - ' + new Date().toISOString();
console.log('🟢 [ChatbotWidget] Version chargée :', window.CHATBOT_WIDGET_VERSION);

(function() {
  const allContainers = document.querySelectorAll('div[style*="z-index: 9999"]');
  allContainers.forEach(el => el.parentNode && el.parentNode.removeChild(el));
  const oldAlerts = document.querySelectorAll('#chatbot-global-alert');
  oldAlerts.forEach(el => el.parentNode && el.parentNode.removeChild(el));
})();

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
    logo: null,
    suggestions: [
      "Je souhaite prendre rendez-vous",
      "Quels sont vos services ?",
      "J’aimerais en savoir plus sur vos tarifs"
    ],
    rgpdLink: "/politique-confidentialite.html"
  };
  try {
    const res = await fetch(`${backendUrl}/config/${clientId}.json`);
    if (res.ok) {
      const cfg = await res.json();
      config = { ...config, ...cfg };
      if (cfg.logo && !cfg.logoUrl) config.logoUrl = cfg.logo;
      if (!cfg.logo && cfg.logoUrl) config.logo = cfg.logoUrl;
    } else {
      showAlert("Erreur de config : impossible de charger la configuration client.");
    }
  } catch (e) {
    showAlert("Erreur réseau : la configuration du chatbot n'a pas pu être chargée.");
  }
  initChatbot(config, backendUrl, clientId);
}

function showAlert(msg) {
  let exist = document.querySelector('#chatbot-global-alert');
  if (exist) exist.remove();
  const div = document.createElement('div');
  div.id = 'chatbot-global-alert';
  div.style.position = 'fixed';
  div.style.bottom = '10px';
  div.style.right = '10px';
  div.style.background = '#f23';
  div.style.color = '#fff';
  div.style.fontWeight = 'bold';
  div.style.padding = '16px 24px';
  div.style.borderRadius = '12px';
  div.style.zIndex = '999999';
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(() => { if (div.parentNode) div.parentNode.removeChild(div); }, 6500);
}

function initChatbot(config, backendUrl, clientId) {
  // Toutes les variables (comme avant)
  let widget, launcher, chatLog, inputBox, vocalCtaBox, suggBox, input, isWidgetOpen = false;

  // -------- PATCH ADAPT MOBILE 65vw/65vh -----------
  function adaptMobile() {
    if (window.innerWidth < 500) {
      widget.style.width = "65vw";
      widget.style.maxWidth = "65vw";
      widget.style.minWidth = "0";
      widget.style.left = "";
      widget.style.right = "2vw";
      widget.style.bottom = "2vw";
      widget.style.top = "";
      widget.style.borderRadius = "18px";
      widget.style.padding = "4vw 2vw 2vw 2vw";
      widget.style.position = "fixed";
      widget.style.height = "auto";
      widget.style.maxHeight = (window.innerHeight * 0.65) + "px";
      container.style.position = "fixed";
      container.style.left = "";
      container.style.right = "2vw";
      container.style.bottom = "2vw";
      container.style.top = "";
      container.style.width = "";
      container.style.height = "";
      document.body.style.overflow = '';
    } else {
      widget.style.width = "350px";
      widget.style.maxWidth = "90vw";
      widget.style.borderRadius = "20px";
      widget.style.left = "";
      widget.style.right = "20px";
      widget.style.top = "";
      widget.style.bottom = "20px";
      widget.style.position = "fixed";
      widget.style.height = "auto";
      widget.style.maxHeight = "90vh";
      container.style.position = "fixed";
      container.style.left = "";
      container.style.right = "20px";
      container.style.bottom = "20px";
      container.style.top = "";
      container.style.width = "";
      container.style.height = "";
      document.body.style.overflow = '';
    }
  }
  // ----------- PATCH FERMETURE --------
  function closeWidget() {
    if (typeof widget !== "undefined" && widget) widget.style.display = 'none';
    if (typeof launcher !== "undefined" && launcher) launcher.style.display = 'inline-block';
    isWidgetOpen = false;
    if (typeof chatLog !== "undefined" && chatLog) chatLog.style.display = 'none';
    if (typeof inputBox !== "undefined" && inputBox) inputBox.style.display = 'none';
    if (typeof vocalCtaBox !== "undefined" && vocalCtaBox) vocalCtaBox.style.display = 'none';
    if (typeof suggBox !== "undefined" && suggBox) suggBox.style.display = '';
    if (window.innerWidth < 500) {
      document.body.style.overflow = '';
      window.scrollTo(0, 0);
    }
    if (typeof widget !== "undefined" && widget) widget.blur?.();
  }

  // NE PAS TOUCHER AU CONTAINER !! Il doit rester dans le DOM
  let container = document.querySelector('#chatbot-widget-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'chatbot-widget-container';
    container.style.position = 'fixed';
    container.style.bottom = '20px';
    container.style.right = '20px';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
  } else {
    container.style.display = '';
    isWidgetOpen = false;
    if (typeof widget !== "undefined" && widget) widget.style.display = 'none';
    if (typeof launcher !== "undefined" && launcher) launcher.style.display = 'inline-block';
    if (typeof chatLog !== "undefined" && chatLog) chatLog.style.display = 'none';
    if (typeof inputBox !== "undefined" && inputBox) inputBox.style.display = 'none';
    if (typeof vocalCtaBox !== "undefined" && vocalCtaBox) vocalCtaBox.style.display = 'none';
    if (typeof suggBox !== "undefined" && suggBox) suggBox.style.display = '';
    if (window.innerWidth < 500) {
      document.body.style.overflow = '';
      window.scrollTo(0, 0);
    }
  }

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

  // --- GESTION DE L'HISTORIQUE & DE L'OUVERTURE CHAT ---
  let chatHistory = [];
  try {
    chatHistory = JSON.parse(localStorage.getItem('chatbotChatHistory') || '[]');
  } catch (e) {}
  let hasOpenedChat = false;
  try {
    hasOpenedChat = !!JSON.parse(localStorage.getItem('chatbotHasOpened') || 'false');
  } catch (e) {}

  // ---- SHADOW DOM START ----
  container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.zIndex = '9999';
  document.body.appendChild(container);

  const shadow = container.attachShadow({ mode: 'open' });

  // === Launcher button (🤖) ===
  launcher = document.createElement('button');
  launcher.textContent = '🤖';
  Object.assign(launcher.style, {
    fontSize: '28px', border: 'none', background: config.color,
    color: '#fff', borderRadius: '50%', padding: '10px', cursor: 'pointer'
  });
  shadow.appendChild(launcher);

  // === Widget panel principal ===
  widget = document.createElement('div');
  Object.assign(widget.style, {
    display: 'none',
    flexDirection: 'column', width: '350px', maxWidth: '90vw',
    background: `linear-gradient(to bottom, ${config.color}, #d7dcfa)`,
    color: '#000', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    padding: '20px', fontFamily: 'sans-serif', maxHeight: '90vh', overflow: 'hidden'
  });
  widget.classList.add('custom-chatbot-widget');
  shadow.appendChild(widget);

  // === RESPONSIVITÉ PATCHÉE ===
  window.addEventListener('resize', adaptMobile);
  window.addEventListener('orientationchange', adaptMobile);

  // === OUVERTURE/FERMETURE PATCHÉE ===
  function openWidget() {
    if (typeof container !== "undefined" && container) container.style.display = '';
    if (typeof widget !== "undefined" && widget) widget.style.display = 'flex';
    if (typeof launcher !== "undefined" && launcher) launcher.style.display = 'none';
    isWidgetOpen = true;
    adaptMobile();
    setTimeout(() => {
      if (isTextMode && typeof input !== "undefined" && input && input.focus) input.focus();
    }, 300);

    if (hasOpenedChat) {
      if (typeof chatLog !== "undefined" && chatLog) chatLog.style.display = '';
      if (typeof inputBox !== "undefined" && inputBox) inputBox.style.display = isTextMode ? 'flex' : 'none';
      if (typeof vocalCtaBox !== "undefined" && vocalCtaBox) vocalCtaBox.style.display = isTextMode ? 'none' : 'flex';
      if (typeof suggBox !== "undefined" && suggBox) suggBox.style.display = 'none';
      if (typeof renderHistory === "function") renderHistory();
    } else {
      if (typeof chatLog !== "undefined" && chatLog) chatLog.style.display = 'none';
      if (typeof inputBox !== "undefined" && inputBox) inputBox.style.display = 'none';
      if (typeof vocalCtaBox !== "undefined" && vocalCtaBox) vocalCtaBox.style.display = 'none';
      if (typeof suggBox !== "undefined" && suggBox) suggBox.style.display = '';
    }
  }
  launcher.onclick = openWidget;

  // Ferme le widget au resize/orientationchange si ouvert (et réadapte)
  window.addEventListener('resize', () => {
    adaptMobile();
    if (window.innerWidth < 500 && isWidgetOpen) {
      if (widget) widget.scrollTop = 0;
      if (widget) widget.style.top = '';
      if (widget) widget.style.bottom = window.innerHeight > 200 ? "2vw" : "0";
    }
  });

  // ========== UI DU CHATBOT (header, etc...) ==========
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';

  const logo = document.createElement('img');
  logo.src = config.logoUrl || config.logo || '';
  logo.alt = 'Logo';
  logo.style.height = '30px';
  logo.onerror = () => { logo.style.display = "none"; };
  header.appendChild(logo);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  Object.assign(closeBtn.style, {
    border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', zIndex: '100001'
  });
  closeBtn.onclick = closeWidget;
  header.appendChild(closeBtn);
  widget.appendChild(header);

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

  suggBox = document.createElement('div');
  Object.assign(suggBox.style, {
    background: '#fff', borderRadius: '12px', padding: '12px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)', marginBottom: '12px'
  });
  (config.suggestions || []).forEach(s => {
    const item = document.createElement('div');
    item.textContent = s;
    Object.assign(item.style, {
      padding: '8px 0', borderBottom: '1px solid #eee', cursor: 'pointer'
    });
    item.onclick = () => handleMessage(s);
    suggBox.appendChild(item);
  });
  widget.appendChild(suggBox);

  chatLog = document.createElement('div');
  chatLog.style.flex = '1';
  chatLog.style.overflowY = 'auto';
  chatLog.style.maxHeight = '160px';
  chatLog.style.marginBottom = '10px';
  chatLog.style.padding = '8px';
  chatLog.style.background = '#fdfdfd';
  chatLog.style.borderRadius = '10px';
  chatLog.style.position = 'relative';
  chatLog.style.transition = 'max-height 0.25s cubic-bezier(0.4,0.3,0.6,1)';
  chatLog.style.display = hasOpenedChat ? '' : 'none';

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
    if (chatLog) {
      chatLog.style.maxHeight = '74vh';
      chatLog.style.minHeight = '320px';
    }
    expandBtn.style.display = 'none';
    reduceBtn.style.display = 'inline-block';
    if (widget) widget.style.maxHeight = '85vh';
  };
  reduceBtn.onclick = () => {
    isExpanded = false;
    if (chatLog) {
      chatLog.style.maxHeight = '160px';
      chatLog.style.minHeight = '';
    }
    expandBtn.style.display = 'inline-block';
    reduceBtn.style.display = 'none';
    if (widget) widget.style.maxHeight = '90vh';
  };

  widget.appendChild(chatLog);

  inputBox = document.createElement('div');
  inputBox.style.display = hasOpenedChat ? 'flex' : 'none';
  inputBox.style.background = '#fff';
  inputBox.style.borderRadius = '16px';
  inputBox.style.alignItems = 'center';
  inputBox.style.overflow = 'hidden';

  input = document.createElement('input');
  input.placeholder = 'Votre message...';
  Object.assign(input.style, {
    flex: '1', padding: '10px', border: 'none', outline: 'none'
  });

  const sendBtn = document.createElement('button');
  sendBtn.textContent = '➤';
  Object.assign(sendBtn.style, {
    border: 'none', background: config.color, color: '#fff',
    padding: '10px', cursor: 'pointer'
  });

  inputBox.appendChild(input);
  inputBox.appendChild(sendBtn);
  widget.appendChild(inputBox);

  vocalCtaBox = document.createElement('div');
  vocalCtaBox.style.display = hasOpenedChat ? 'none' : 'none';
  vocalCtaBox.style.justifyContent = 'center';
  vocalCtaBox.style.alignItems = 'center';
  vocalCtaBox.style.margin = '12px 0 0 0';
  vocalCtaBox.style.height = '46px';

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
    if (!hasOpenedChat) {
      if (inputBox) inputBox.style.display = 'none';
      if (vocalCtaBox) vocalCtaBox.style.display = 'none';
      return;
    }
    if (isTextMode) {
      if (inputBox) inputBox.style.display = 'flex';
      if (sendBtn) sendBtn.style.display = 'inline-block';
      if (vocalCtaBox) vocalCtaBox.style.display = 'none';
      setTimeout(() => {
        if (isTextMode && typeof input !== "undefined" && input && input.focus) input.focus();
      }, 100);
    } else {
      if (inputBox) inputBox.style.display = 'none';
      if (vocalCtaBox) vocalCtaBox.style.display = 'flex';
    }
  }
  footerNav.appendChild(vocalTab);
  footerNav.appendChild(textTab);
  widget.appendChild(footerNav);

  const rgpd = document.createElement('a');
  rgpd.href = config.rgpdLink;
  rgpd.textContent = 'Politique de confidentialité';
  rgpd.target = '_blank';
  Object.assign(rgpd.style, {
    fontSize: '11px', color: '#eee', marginTop: '6px', textAlign: 'right'
  });
  widget.appendChild(rgpd);

  const clearHistory = document.createElement('a');
  clearHistory.href = "#";
  clearHistory.textContent = "Effacer l'historique";
  clearHistory.style.fontSize = "11px";
  clearHistory.style.marginLeft = "16px";
  clearHistory.style.color = "#bbb";
  clearHistory.style.textDecoration = "underline";
  clearHistory.onclick = (e) => {
    e.preventDefault();
    chatHistory = [];
    localStorage.setItem('chatbotChatHistory', '[]');
    hasOpenedChat = false;
    localStorage.setItem('chatbotHasOpened', 'false');
    if (chatLog) chatLog.innerHTML = '';
    if (chatLog) chatLog.style.display = 'none';
    if (inputBox) inputBox.style.display = 'none';
    if (vocalCtaBox) vocalCtaBox.style.display = 'none';
    if (suggBox) suggBox.style.display = '';
    closeWidget();
  };
  rgpd.parentNode.insertBefore(clearHistory, rgpd.nextSibling);

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

  document.addEventListener('keydown', (e) => {
    if (e.key === "Escape" && isWidgetOpen) {
      closeWidget();
    }
    if (e.key === "Enter" && isTextMode && document.activeElement === input && input.value.trim()) {
      handleMessage(input.value);
      input.value = '';
    }
  });

  let loader = null;
  function showLoader() {
    if (!loader) {
      loader = document.createElement('div');
      loader.className = 'chatbot-loader-bubbles';
      loader.innerHTML = `<span></span><span></span><span></span>`;
      loader.style.alignSelf = 'flex-start';
      loader.style.margin = '6px 0';
      loader.style.background = '#f4f4f4';
      loader.style.padding = '8px 12px';
      loader.style.borderRadius = '14px';
      loader.style.maxWidth = '85%';
      loader.style.display = 'flex';
      loader.style.gap = '3px';
    }
    if (chatLog) {
      chatLog.appendChild(loader);
      chatLog.scrollTop = chatLog.scrollHeight;
    }
  }
  function hideLoader() {
    if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
  }

  function appendMessage(msg, sender, isHTML = false) {
    if (!chatLog) return;
    const msgRow = document.createElement('div');
    msgRow.style.display = 'flex';
    msgRow.style.alignItems = 'flex-end';
    msgRow.style.margin = '8px 0';
    msgRow.style.opacity = '0';
    msgRow.style.transition = 'opacity 0.28s';

    setTimeout(() => { msgRow.style.opacity = 1; }, 50);

    if (sender === 'bot') {
      const avatar = document.createElement('span');
      avatar.textContent = '🤖';
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
    if (isHTML && sender === 'bot' && window.marked && window.DOMPurify) {
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

  function renderHistory() {
    if (!chatLog) return;
    chatLog.innerHTML = '';
    chatHistory.forEach(item => appendMessage(item.msg, item.sender, item.isHTML));
  }

  function handleMessage(msg) {
    if (!chatLog) return;
    if (!hasOpenedChat) {
      hasOpenedChat = true;
      localStorage.setItem('chatbotHasOpened', 'true');
      if (chatLog) chatLog.style.display = '';
      if (inputBox) inputBox.style.display = isTextMode ? 'flex' : 'none';
      if (vocalCtaBox) vocalCtaBox.style.display = isTextMode ? 'none' : 'flex';
      if (suggBox) suggBox.style.display = 'none';
      renderHistory();
    }

    if (suggBox) suggBox.style.display = 'none';
    appendMessage(msg, 'user');
    chatHistory.push({ msg, sender: 'user', isHTML: false });
    localStorage.setItem('chatbotChatHistory', JSON.stringify(chatHistory));
    showLoader();
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
        chatHistory.push({ msg: data.text || '(Pas de réponse)', sender: 'bot', isHTML: true });
        localStorage.setItem('chatbotChatHistory', JSON.stringify(chatHistory));
        if (!isTextMode) {
          if (data.audioUrl) {
            currentAudio = new Audio(data.audioUrl);
            currentAudio.play();
          } else {
            appendMessage("(Réponse vocale indisponible pour ce message)", 'bot');
            chatHistory.push({ msg: "(Réponse vocale indisponible pour ce message)", sender: 'bot', isHTML: false });
            localStorage.setItem('chatbotChatHistory', JSON.stringify(chatHistory));
          }
        }
      })
      .catch((err) => {
        hideLoader();
        appendMessage("Désolé, le serveur est injoignable.", 'bot');
        chatHistory.push({ msg: "Désolé, le serveur est injoignable.", sender: 'bot', isHTML: false });
        localStorage.setItem('chatbotChatHistory', JSON.stringify(chatHistory));
        showAlert("Erreur : le backend du chatbot n'est pas joignable.");
      });
  }

  // ============ PATCH SWIPE DOWN TO CLOSE (UX mobile) ===========
  let touchStartY = null;
  widget.addEventListener('touchstart', e => {
    if (e.touches.length === 1) touchStartY = e.touches[0].clientY;
  });
  widget.addEventListener('touchmove', e => {
    if (touchStartY !== null && e.touches.length === 1) {
      const dy = e.touches[0].clientY - touchStartY;
      if (dy > 60) { closeWidget(); touchStartY = null; }
    }
  });
  widget.addEventListener('touchend', () => { touchStartY = null; });

  // PATCH DIEGO : widget TOUJOURS fermé au démarrage, même si historique
  closeWidget();
  adaptMobile(); // pour forcer le style dès le boot

  updateModeUI();

  // === CSS ULTRA RESPONSIVE ===
  const style = document.createElement('style');
  style.textContent = `
    @media (max-width: 500px) {
      .custom-chatbot-widget {
        width: 65vw !important;
        max-width: 65vw !important;
        min-width: 0 !important;
        left: unset !important;
        right: 2vw !important;
        bottom: 2vw !important;
        border-radius: 18px !important;
        box-shadow: 0 8px 32px #0002 !important;
        padding: 4vw 2vw 2vw 2vw !important;
        font-size: 1.06em !important;
        max-height: 65vh !important;
        height: auto !important;
        display: flex;
        flex-direction: column !important;
        position: fixed !important;
        z-index: 99999 !important;
        top: unset !important;
      }
      .custom-chatbot-widget h2 {
        font-size: 1.09em !important;
        margin-top: 0.3em !important;
        margin-bottom: 1em !important;
        word-break: break-word;
        text-align: left !important;
      }
      .custom-chatbot-widget input {
        font-size: 1em !important;
      }
      .custom-chatbot-widget .msg-fadein {
        animation: fadeInUp 0.4s;
      }
      .custom-chatbot-widget {
        overflow: auto !important;
      }
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
    button:focus { outline: 2px solid #009fff77 !important; }
    .msg-fadein { animation: fadeInUp 0.4s; }
    @keyframes fadeInUp { from { opacity:0; transform:translateY(12px);} to{opacity:1; transform:translateY(0);} }
  `;
  shadow.appendChild(style);
}