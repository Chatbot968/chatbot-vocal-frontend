// =========== PATCH ANTI-DOUBLE-INJECTION & VERSIONNING CHATBOTWIDGET ===========
if (window.__CHATBOT_WIDGET_LOADED__) {
  console.warn('[ChatbotWidget] Script déjà injecté, on stoppe pour éviter bug ou duplication.');
  throw new Error('ChatbotWidget déjà injecté');
}
window.__CHATBOT_WIDGET_LOADED__ = true;

window.CHATBOT_WIDGET_VERSION = 'v11 - ' + new Date().toISOString();
console.log('🟢 [ChatbotWidget] Version chargée :', window.CHATBOT_WIDGET_VERSION);

// --- Gestion multi-sessions ---
const SESSION_KEY = 'chatbotSessions';
const CURRENT_KEY = 'chatbotCurrentSession';
let sessions = [];
let currentSessionId;
let renderHistory = () => {};

function loadScript(src) {
  return new Promise(res => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => res();
    document.head.appendChild(s);
  });
}

function ensureMarkdownDeps() {
  const tasks = [];
  if (!window.marked) tasks.push(loadScript('https://cdn.jsdelivr.net/npm/marked/marked.min.js'));
  if (!window.DOMPurify) tasks.push(loadScript('https://cdn.jsdelivr.net/npm/dompurify@3.0.3/dist/purify.min.js'));
  return Promise.all(tasks);
}

(function() {
  const allContainers = document.querySelectorAll('div[style*="z-index: 9999"]');
  allContainers.forEach(el => el.parentNode && el.parentNode.removeChild(el));
  const oldAlerts = document.querySelectorAll('#chatbot-global-alert');
  oldAlerts.forEach(el => el.parentNode && el.parentNode.removeChild(el));
})();

function ChatMessage(_ref){var markdown=_ref.markdown;return React.createElement(window.ReactMarkdown,{components:{a:function(props){return React.createElement("a",Object.assign({},props,{target:"_blank",rel:"noopener noreferrer"}))},img:function(props){return React.createElement("img",props);}},children:markdown});}
window.ChatMessage=ChatMessage;

function loadSessions() {
  try {
    sessions = JSON.parse(localStorage.getItem(SESSION_KEY) || '[]');
  } catch (e) {
    sessions = [];
  }
  currentSessionId = localStorage.getItem(CURRENT_KEY) || null;
}

function saveSessions() {
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
}

function getCurrentSession() {
  return sessions.find(s => s.id === currentSessionId);
}

function setCurrentSession(id) {
  currentSessionId = id;
  localStorage.setItem(CURRENT_KEY, id);
  if (typeof renderHistory === 'function') renderHistory();
  if (typeof renderSessions === 'function') renderSessions();
  saveSessions();
}

function deleteSession(id) {
  const idx = sessions.findIndex(s => s.id === id);
  if (idx === -1) return;
  const wasCurrent = id === currentSessionId;
  sessions.splice(idx, 1);
  saveSessions();
  if (sessions.length === 0) {
    createNewSession();
    return;
  }
  if (wasCurrent) {
    setCurrentSession(sessions[0].id);
  } else {
    if (typeof renderSessions === 'function') renderSessions();
    if (typeof renderHistory === 'function') renderHistory();
  }
}

function createNewSession() {
  const session = { id: 'chat_' + Date.now(), title: 'Nouvelle discussion', history: [] };
  sessions.push(session);
  saveSessions();
  setCurrentSession(session.id);
  hasOpenedChat = false;
  localStorage.setItem('chatbotHasOpened', 'false');
  if (chatLog) {
    chatLog.innerHTML = '';
    if (typeof expandBtn !== 'undefined' && expandBtn) chatLog.appendChild(expandBtn);
    if (typeof reduceBtn !== 'undefined' && reduceBtn) chatLog.appendChild(reduceBtn);
    if (expandBtn) expandBtn.style.display = 'inline-block';
    if (reduceBtn) reduceBtn.style.display = 'none';
    chatLog.style.display = 'none';
  }
  if (inputBox) inputBox.style.display = 'none';
  if (vocalCtaBox) vocalCtaBox.style.display = 'none';
  if (suggBox) suggBox.style.display = '';
  notifyHistory();
  if (typeof renderSessions === 'function') renderSessions();
}

let renderSessions = () => {};

ensureMarkdownDeps().then(declareSpeechRecognition);

function declareSpeechRecognition() {
  if (!window._speechDeclared) {
    window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    window._speechDeclared = true;
  }
  const supported = !!window.SpeechRecognition;
  if (!supported) {
    alert("⚠️ Chatbot vocal non disponible sur ce navigateur. Mode texte uniquement.");
  }
  loadAndInitChatbot(supported);
}

async function loadAndInitChatbot(speechSupported) {
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
  initChatbot(config, backendUrl, clientId, speechSupported);
}

function showAlert(msg) {
  let exist = document.querySelector('#chatbot-global-alert');
  if (exist) exist.remove();
  const div = document.createElement('div');
  div.id = 'chatbot-global-alert';
  div.style.position = 'fixed';
  div.style.bottom = 'calc(10px + env(safe-area-inset-bottom))';
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

function initChatbot(config, backendUrl, clientId, speechSupported) {
  // Toutes les variables (comme avant)
  let widget, launcher, chatLog, inputBox, vocalCtaBox, suggBox, input,
      expandBtn, reduceBtn, sidebar, sessionList,
      isWidgetOpen = false;

  loadSessions();
  if (sessions.length === 0) {
    const s = { id: 'chat_' + Date.now(), title: 'Nouvelle discussion', history: [] };
    sessions.push(s);
    saveSessions();
    currentSessionId = s.id;
    localStorage.setItem(CURRENT_KEY, s.id);
  }
  if (typeof renderSessions === 'function') renderSessions();


  
  function closeWidget() {
    if (typeof widget !== "undefined" && widget) widget.style.display = 'none';
    if (typeof launcher !== "undefined" && launcher) launcher.style.display = 'inline-block';
    isWidgetOpen = false;
    if (sidebar) sidebar.style.display = 'none';
    if (container) container.style.transform = 'translateY(0)';
    if (typeof chatLog !== "undefined" && chatLog) chatLog.style.display = 'none';
    if (typeof inputBox !== "undefined" && inputBox) inputBox.style.display = 'none';
    if (typeof vocalCtaBox !== "undefined" && vocalCtaBox) vocalCtaBox.style.display = 'none';
    if (typeof suggBox !== "undefined" && suggBox) suggBox.style.display = '';
    if (typeof widget !== "undefined" && widget) widget.blur?.();
  }

  function disableChatbot() {
    quotaExceeded = true;
    localStorage.setItem('chatbotQuotaExceeded', 'true');
    if (recognition) recognition.abort();
    closeWidget();
    if (launcher) launcher.style.display = 'none';
    if (container) container.style.display = 'none';
    showAlert('Quota atteint, veuillez contacter le support pour continuer');
  }

  // NE PAS TOUCHER AU CONTAINER !! Il doit rester dans le DOM
  let container = document.querySelector('#chatbot-widget-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'chatbot-widget-container';
    container.style.position = 'fixed';
    container.style.bottom = 'calc(20px + env(safe-area-inset-bottom))';
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
  }

  let recognition = null;
  if (speechSupported) {
    recognition = new window.SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;
  }

  const userId = localStorage.getItem('chatbotUserId') || (() => {
    const id = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('chatbotUserId', id);
    return id;
  })();

  let isTextMode = true;
  let isListening = false;
  let currentAudio = null;

  function sanitizeForSpeech(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    tmp.querySelectorAll('a').forEach(a => {
      const txt = document.createTextNode(a.textContent);
      a.parentNode && a.parentNode.replaceChild(txt, a);
    });
    tmp.querySelectorAll('img').forEach(el => el.remove());
    let text = tmp.textContent || tmp.innerText || '';
    text = text.replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim();
    return text;
  }

  function extractProductSentence(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const nameEl = tmp.querySelector('.product-name, [data-product-name]');
    const priceEl = tmp.querySelector('.product-price, [data-product-price], .price');
    if (nameEl && priceEl) {
      const name = nameEl.textContent.trim();
      const price = priceEl.textContent.trim();
      if (name && price) {
        return `${name} pour ${price}`;
      }
    }
    return null;
  }

  function speakText(html) {
    if (!window.speechSynthesis) return;
    const product = extractProductSentence(html);
    const text = product || sanitizeForSpeech(html);
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  }

  function htmlToMarkdown(html) {
    if (window.TurndownService) {
      const t = new window.TurndownService();
      return t.turndown(html);
    }
    return html;
  }

  // --- GESTION DE L'HISTORIQUE & DE L'OUVERTURE CHAT ---
  function notifyHistory() {
    const hist = getCurrentSession()?.history || [];
    window.chatHistory = hist.slice();
    window.dispatchEvent(new Event('chatHistoryUpdate'));
  }
  notifyHistory();
  let hasOpenedChat = false;
  try {
    hasOpenedChat = !!JSON.parse(localStorage.getItem('chatbotHasOpened') || 'false');
  } catch (e) {}

  let quotaExceeded = false;
  try {
    quotaExceeded = !!JSON.parse(localStorage.getItem('chatbotQuotaExceeded') || 'false');
  } catch (e) {}

  // ---- SHADOW DOM START ----
  container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.bottom = 'calc(20px + env(safe-area-inset-bottom))';
  container.style.right = '20px';
  container.style.zIndex = '9999';
  document.body.appendChild(container);

  sidebar = document.createElement('div');
  sidebar.style.position = 'fixed';
  sidebar.style.bottom = container.style.bottom;
  sidebar.style.right = 'calc(20px + 370px)';
  sidebar.style.width = '180px';
  sidebar.style.maxHeight = 'calc(90vh - 40px)';
  sidebar.style.overflowY = 'auto';
  sidebar.style.background = '#fff';
  sidebar.style.borderRadius = '12px';
  sidebar.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
  sidebar.style.padding = '10px';
  sidebar.style.display = 'none';
  sidebar.style.zIndex = '9999';
  document.body.appendChild(sidebar);

  sessionList = document.createElement('div');
  sidebar.appendChild(sessionList);
  const newBtn = document.createElement('button');
  newBtn.textContent = '+ Nouveau Chat';
  newBtn.style.marginTop = '8px';
  newBtn.style.width = '100%';
  newBtn.onclick = createNewSession;
  sidebar.appendChild(newBtn);

  renderSessions = function() {
    if (!sessionList) return;
    sessionList.innerHTML = '';
    sessions.forEach(s => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.marginBottom = '6px';

      const btn = document.createElement('button');
      btn.textContent = s.title || s.id;
      btn.style.flex = '1';
      btn.style.textAlign = 'left';
      btn.style.padding = '6px 8px';
      btn.style.border = 'none';
      btn.style.borderRadius = '6px';
      btn.style.cursor = 'pointer';
      if (s.id === currentSessionId) {
        btn.style.background = config.color;
        btn.style.color = '#fff';
      } else {
        btn.style.background = '#f4f4f4';
        btn.style.color = '#000';
      }
      btn.onclick = () => setCurrentSession(s.id);
      row.appendChild(btn);

      const del = document.createElement('button');
      del.textContent = '🗑';
      del.style.marginLeft = '4px';
      del.style.border = 'none';
      del.style.background = 'transparent';
      del.style.cursor = 'pointer';
      del.onclick = (e) => { e.stopPropagation(); deleteSession(s.id); };
      row.appendChild(del);

      sessionList.appendChild(row);
    });
  };
  renderSessions();

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
    display: 'flex',
    flexDirection: 'column',
    width: '350px',
    maxWidth: '90vw',
    background: `linear-gradient(to bottom, ${config.color}, #d7dcfa)`,
    color: '#000',
    borderRadius: '20px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    padding: '20px',
    fontFamily: 'sans-serif',
    height: 'auto',
    maxHeight: 'calc(90vh - 40px)',
    overflow: 'hidden'
  });
  widget.classList.add('custom-chatbot-widget');
  shadow.appendChild(widget);

  // Flex layout containers
  const headerContainer = document.createElement('div');
  headerContainer.className = 'chatbot-header';
  headerContainer.style.flexShrink = '0';

  const bodyContainer = document.createElement('div');
  bodyContainer.className = 'chatbot-body';
  bodyContainer.style.flex = '1';
  bodyContainer.style.display = 'flex';
  bodyContainer.style.flexDirection = 'column';
  bodyContainer.style.overflowY = 'auto';
  bodyContainer.style.minHeight = '200px';

  const footerContainer = document.createElement('div');
  footerContainer.className = 'chatbot-footer';
  footerContainer.style.flexShrink = '0';

  widget.appendChild(headerContainer);
  widget.appendChild(bodyContainer);
  widget.appendChild(footerContainer);


  // === OUVERTURE/FERMETURE PATCHÉE ===
  function openWidget() {
    if (quotaExceeded) {
      showAlert('Quota atteint, veuillez contacter le support pour continuer');
      return;
    }
    if (typeof container !== "undefined" && container) container.style.display = '';
    if (typeof widget !== "undefined" && widget) widget.style.display = 'flex';
    if (typeof launcher !== "undefined" && launcher) launcher.style.display = 'none';
    isWidgetOpen = true;
    if (sidebar) sidebar.style.display = isExpanded ? 'block' : 'none';
    setTimeout(() => {
      if (isTextMode && typeof input !== "undefined" && input && input.focus) input.focus();
    }, 300);

    if (hasOpenedChat) {
      if (typeof chatLog !== "undefined" && chatLog) chatLog.style.display = '';
      if (typeof suggBox !== "undefined" && suggBox) suggBox.style.display = 'none';
      if (typeof renderHistory === "function") renderHistory();
    } else {
      if (typeof chatLog !== "undefined" && chatLog) chatLog.style.display = 'none';
      if (typeof suggBox !== "undefined" && suggBox) suggBox.style.display = '';
    }
    updateModeUI();
  }
  launcher.onclick = openWidget;


  // ========== UI DU CHATBOT (header, etc...) ==========
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'center';
  header.style.alignItems = 'center';
  header.style.position = 'relative';

  const logo = document.createElement('img');
  logo.src = config.logoUrl || config.logo || '';
  logo.alt = 'Logo';
  logo.style.height = '50px';
  logo.onerror = () => { logo.style.display = "none"; };
  header.appendChild(logo);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  Object.assign(closeBtn.style, {
    border: 'none',
    background: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    zIndex: '100001',
    position: 'absolute',
    right: '0'
  });
  closeBtn.onclick = closeWidget;
  header.appendChild(closeBtn);

  headerContainer.appendChild(header);

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
  headerContainer.appendChild(title);

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
  bodyContainer.appendChild(suggBox);

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
  chatLog.classList.add('chat-log');

  expandBtn = document.createElement('button');
  expandBtn.innerHTML = '🗖';
  expandBtn.title = 'Agrandir';
  Object.assign(expandBtn.style, {
    position: 'absolute',
    top: '8px',
    right: '10px',

    padding: '2px 6px',
    borderRadius: '6px',

    background: '#fff',
    border: 'none',
    color: '#888',
    fontSize: '18px',
    cursor: 'pointer',

    zIndex: '10',
    padding: '2px 6px',
    borderRadius: '6px'

  });
  chatLog.appendChild(expandBtn);

  reduceBtn = document.createElement('button');
  reduceBtn.innerHTML = '🗕';
  reduceBtn.title = 'Réduire';
  Object.assign(reduceBtn.style, {
    position: 'absolute',
    top: '8px',
    right: '10px',

    padding: '2px 6px',
    borderRadius: '6px',

    background: '#fff',
    border: 'none',
    color: '#888',
    fontSize: '18px',
    cursor: 'pointer',
    zIndex: '10',

    padding: '2px 6px',
    borderRadius: '6px',

    display: 'none'
  });
  chatLog.appendChild(reduceBtn);

  let isExpanded = false;
  expandBtn.onclick = () => {
    isExpanded = true;
    expandBtn.style.display = 'none';
    reduceBtn.style.display = 'inline-block';
    if (widget) widget.classList.add('fullscreen-mode');
    if (container) container.classList.add('fullscreen-mode');
    if (sidebar) sidebar.style.display = 'block';
  };
  reduceBtn.onclick = () => {
    isExpanded = false;
    expandBtn.style.display = 'inline-block';
    reduceBtn.style.display = 'none';
    if (widget) widget.classList.remove('fullscreen-mode');
    if (container) container.classList.remove('fullscreen-mode');
    if (sidebar) sidebar.style.display = 'none';

  };

 



  bodyContainer.appendChild(chatLog);

  inputBox = document.createElement('div');
  inputBox.classList.add('chat-input-box');
  inputBox.style.display = hasOpenedChat ? 'flex' : 'none';
  inputBox.style.background = '#fff';
  inputBox.style.borderRadius = '16px';
  inputBox.style.alignItems = 'center';
  inputBox.style.overflow = 'hidden';
  inputBox.style.padding = '0 4px';
  inputBox.style.position = 'sticky';
  inputBox.style.bottom = '0';
  inputBox.style.zIndex = '10';

  input = document.createElement('input');
  input.placeholder = 'Votre message...';
  Object.assign(input.style, {
    flex: '1',
    padding: '10px',
    border: 'none',
    outline: 'none',
    minHeight: '44px'
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      handleMessage(input.value);
      input.value = '';
    }
  });

  inputBox.appendChild(input);
  footerContainer.appendChild(inputBox);

  vocalCtaBox = document.createElement('div');
  vocalCtaBox.style.display = hasOpenedChat ? 'none' : 'flex';
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
    if (!recognition) return;
    if (!isListening) recognition.start();
    else recognition.stop();
  };

  vocalCtaBox.appendChild(vocalCtaBtn);
  if (speechSupported) footerContainer.appendChild(vocalCtaBox);

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
    if (!speechSupported) {
      if (inputBox) inputBox.style.display = 'flex';
      if (vocalCtaBox) vocalCtaBox.style.display = 'none';
      return;
    }
    if (isTextMode) {
      if (inputBox) inputBox.style.display = 'flex';
      if (vocalCtaBox) vocalCtaBox.style.display = 'none';
      setTimeout(() => {
        if (isTextMode && typeof input !== "undefined" && input && input.focus) input.focus();
      }, 100);
    } else {
      if (inputBox) inputBox.style.display = 'none';
      if (vocalCtaBox) vocalCtaBox.style.display = 'flex';
    }
  }
  if (speechSupported) footerNav.appendChild(vocalTab);
  footerNav.appendChild(textTab);
  footerContainer.appendChild(footerNav);

  const rgpd = document.createElement('a');
  rgpd.href = config.rgpdLink;
  rgpd.textContent = 'Politique de confidentialité';
  rgpd.target = '_blank';
  Object.assign(rgpd.style, {
    fontSize: '11px', color: '#eee', marginTop: '6px', textAlign: 'right'
  });
  footerContainer.appendChild(rgpd);

  const clearHistory = document.createElement('a');
  clearHistory.href = "#";
  clearHistory.textContent = "Effacer l'historique";
  clearHistory.style.fontSize = "11px";
  clearHistory.style.marginLeft = "16px";
  clearHistory.style.color = "#bbb";
  clearHistory.style.textDecoration = "underline";
  clearHistory.onclick = (e) => {
    e.preventDefault();
    const s = getCurrentSession();
    if (s) s.history = [];
    saveSessions();
    hasOpenedChat = false;
    localStorage.setItem('chatbotHasOpened', 'false');
    if (chatLog) {
      chatLog.innerHTML = '';
      if (expandBtn) chatLog.appendChild(expandBtn);
      if (reduceBtn) chatLog.appendChild(reduceBtn);
      if (isExpanded) {
        expandBtn.style.display = 'none';
        reduceBtn.style.display = 'inline-block';
      } else {
        expandBtn.style.display = 'inline-block';
        reduceBtn.style.display = 'none';
      }
    }
    if (chatLog) chatLog.style.display = 'none';
    if (inputBox) inputBox.style.display = 'none';
    if (vocalCtaBox) vocalCtaBox.style.display = 'none';
    if (suggBox) suggBox.style.display = '';
    closeWidget();
    notifyHistory();
  };
  rgpd.parentNode.insertBefore(clearHistory, rgpd.nextSibling);

  if (recognition) {
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
  }


  document.addEventListener('keydown', (e) => {
    if (e.key === "Escape" && isWidgetOpen) {
      closeWidget();
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
    if (isHTML && sender === 'bot' && window.React && window.ReactDOM && window.ReactMarkdown) {
      ReactDOM.createRoot(div).render(
        React.createElement(ChatMessage, { markdown: msg })
      );
    } else if (isHTML && sender === 'bot' && window.marked && window.DOMPurify) {
      const html = marked.parse(msg);
      div.innerHTML = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['b', 'i', 'strong', 'a', 'img', 'br', 'ul', 'li', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'em', 'ol', 'blockquote'],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target']
      });
      div.querySelectorAll('a').forEach(a => {
        a.style.background = config.color;
        a.style.color = '#fff';
        a.style.padding = '6px 10px';
        a.style.borderRadius = '8px';
        a.style.display = 'inline-block';
        a.style.textDecoration = 'none';
        a.style.marginTop = '4px';
      });
    } else {
      div.textContent = msg;
    }
    msgRow.appendChild(div);
    chatLog.appendChild(msgRow);
    chatLog.scrollTop = chatLog.scrollHeight;
    return msgRow;
  }

  function renderHistory() {
    if (!chatLog) return;
    chatLog.innerHTML = '';
    if (expandBtn) chatLog.appendChild(expandBtn);
    if (reduceBtn) chatLog.appendChild(reduceBtn);
    if (isExpanded) {
      expandBtn.style.display = 'none';
      reduceBtn.style.display = 'inline-block';
    } else {
      expandBtn.style.display = 'inline-block';
      reduceBtn.style.display = 'none';
    }
    const hist = getCurrentSession()?.history || [];
    hist.forEach(item => appendMessage(item.msg, item.sender, item.isHTML));
  }

  function handleMessage(msg) {
    if (quotaExceeded) {
      showAlert('Quota atteint, veuillez contacter le support pour continuer');
      return;
    }
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
    const cur = getCurrentSession();
    if (cur) cur.history.push({ msg, sender: 'user', isHTML: false });
    saveSessions();
    notifyHistory();
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
      .then(async r => {
        let data = {};
        try { data = await r.json(); } catch (e) {}
        if (r.status === 403 || (data && data.error === 'quota_exceeded')) {
          disableChatbot();
          throw new Error('quota_exceeded');
        }
        return data;
      })
      .then(data => {
        hideLoader();
        let text = data.text || '(Pas de réponse)';
        if (/<[a-z][\s\S]*>/i.test(text)) {
          text = htmlToMarkdown(text);
        }
        const msgEl = appendMessage(text, 'bot', true);
        const cur = getCurrentSession();
        if (cur) cur.history.push({ msg: text, sender: 'bot', isHTML: true });
        saveSessions();
        notifyHistory();
        if (!isTextMode) {
          if (data.audioUrl) {
            currentAudio = new Audio(data.audioUrl);
            currentAudio.play().catch(err => {
              console.error('Erreur lecture audio:', err);
              showAlert('Erreur lecture audio: ' + err.message);
              const playBtn = document.createElement('button');
              playBtn.textContent = 'Écouter la réponse';
              playBtn.style.marginLeft = '8px';
              playBtn.onclick = () => {
                playBtn.disabled = true;
                currentAudio.play().catch(e => {
                  console.error('Erreur lecture audio:', e);
                  showAlert('Erreur lecture audio: ' + e.message);
                  speakText(data.text || '');
                });
              };
              msgEl.appendChild(playBtn);
              speakText(data.text || '');
            });
          } else {
            appendMessage("(Réponse vocale indisponible pour ce message)", 'bot');
            const cur2 = getCurrentSession();
            if (cur2) cur2.history.push({ msg: "(Réponse vocale indisponible pour ce message)", sender: 'bot', isHTML: false });
            saveSessions();
            notifyHistory();
            speakText(data.text || '');
          }
        }
      })
      .catch((err) => {
        hideLoader();
        if (err.message === 'quota_exceeded') return;
        appendMessage("Désolé, le serveur est injoignable.", 'bot');
        const cur3 = getCurrentSession();
        if (cur3) cur3.history.push({ msg: "Désolé, le serveur est injoignable.", sender: 'bot', isHTML: false });
        saveSessions();
        notifyHistory();
        showAlert("Erreur : le backend du chatbot n'est pas joignable.");
      });
  }



  // PATCH DIEGO : widget TOUJOURS fermé au démarrage, même si historique
  closeWidget();

  updateModeUI();
  if (quotaExceeded) {
    disableChatbot();
  }

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
        bottom: calc(2vw + env(safe-area-inset-bottom)) !important;
        border-radius: 18px !important;
        box-shadow: 0 8px 32px #0002 !important;
        padding: 4vw 2vw 2vw 2vw !important;
        font-size: 1.06em !important;
        max-height: 65svh !important;
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
      .chatbot-header img {
        height: 40px;
      }
    }
    .custom-chatbot-widget img { max-width: 100%; border-radius: 10px; margin-top: 6px; display: block; }
    .custom-chatbot-widget a {
      display: inline-block;
      background: ${config.color};
      color: #fff;
      padding: 6px 10px;
      border-radius: 8px;
      text-decoration: none;
      font-size: 0.95em;
      margin-top: 4px;
    }
    .custom-chatbot-widget h1,
    .custom-chatbot-widget h2,
    .custom-chatbot-widget h3,
    .custom-chatbot-widget h4,
    .custom-chatbot-widget h5,
    .custom-chatbot-widget h6 {
      margin: 0.4em 0;
      font-size: 1.1em;
    }
    .custom-chatbot-widget p {
      margin: 0.4em 0;
    }
    .custom-chatbot-widget ul,
    .custom-chatbot-widget ol {
      margin: 0.4em 0 0.4em 1.2em;
      padding-left: 1em;
    }
    .custom-chatbot-widget blockquote {
      margin: 0.4em 0;
      padding-left: 0.8em;
      border-left: 3px solid #ccc;
      color: #555;
    }
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
    .custom-chatbot-widget .chat-input-box {
      position: sticky;
      bottom: 0;
      height: 60px;
      min-height: 60px;
      max-height: 60px;
      z-index: 9999;
      padding-bottom: env(safe-area-inset-bottom, 20px);
    }
    .custom-chatbot-widget.fullscreen-mode {
      width: 100vw !important;
      height: calc(100vh - env(safe-area-inset-bottom)) !important;
      max-width: 100vw !important;
      max-height: calc(100vh - env(safe-area-inset-bottom)) !important;
      border-radius: 0 !important;
      padding: 20px !important;
      box-sizing: border-box !important;
    }
    .custom-chatbot-widget.fullscreen-mode .chat-log {
      max-height: none !important;
    }
  `;
  const demoMsg = '# Exemple de markdown\n\n**Bienvenue** sur le *chatbot*.\n\n- Premier\n- Deuxième\n\n![Image](https://via.placeholder.com/150)\n\n[Visiter le site](https://example.com)';
  appendMessage(demoMsg, 'bot', true);
  shadow.appendChild(style);

  const globalStyle = document.createElement('style');
  globalStyle.textContent = `
    #chatbot-widget-container.fullscreen-mode {
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      transform: none !important;
    }
  `;
  document.head.appendChild(globalStyle);
}
