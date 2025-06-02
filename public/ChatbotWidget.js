// === Chatbot vocal responsive avec HTML, images, historique, suggestions, mobile friendly ===

// (SUPPRIMÉ : le bloc de chargement dynamique de marked.min.js, car on le charge en dur dans le <head>)

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
    const res = await fetch(`${backendUrl}/config/${clientId}.json`);
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
    background: `linear-gradient(to bottom, ${config.color}, #d7dcfa)`,
    color: '#000', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    padding: '20px', fontFamily: 'sans-serif', maxHeight: '90vh', overflow: 'hidden'
  });
  widget.classList.add('custom-chatbot-widget');
  shadow.appendChild(widget);

  launcher.onclick = () => {
    launcher.style.display = 'none';
    widget.style.display = 'flex';
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

  const title = document.createElement('h2');
  title.innerHTML = "👋 Bonjour<br><strong>Que puis-je faire pour vous ?</strong>";
  title.style.margin = '16px 0';
  title.style.color = '#fff';
  widget.appendChild(title);

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

  // === AJOUT : Bouton expand/reduce ===
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

  const micBtn = document.createElement('button');
  micBtn.textContent = '🎤';
  Object.assign(micBtn.style, {
    border: 'none', background: config.color, color: '#fff',
    padding: '10px', cursor: 'pointer'
  });

  const sendBtn = document.createElement('button');
  sendBtn.textContent = '➤';
  Object.assign(sendBtn.style, {
    border: 'none', background: config.color, color: '#fff',
    padding: '10px', cursor: 'pointer'
  });

  inputBox.appendChild(input);
  inputBox.appendChild(micBtn);
  inputBox.appendChild(sendBtn);
  widget.appendChild(inputBox);

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
      input.style.display = 'inline-block';
      sendBtn.style.display = 'inline-block';
      micBtn.style.display = 'none';
    } else {
      input.style.display = 'none';
      sendBtn.style.display = 'none';
      micBtn.style.display = 'inline-block';
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

  micBtn.onclick = () => recognition.start();

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

  // Ajout loader à ce niveau
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
    const div = document.createElement('div');
    div.style.margin = '6px 0';
    div.style.alignSelf = sender === 'user' ? 'flex-end' : 'flex-start';
    div.style.background = sender === 'user' ? '#d0eaff' : '#f4f4f4';
    div.style.padding = '8px 12px';
    div.style.borderRadius = '14px';
    div.style.maxWidth = '85%';
    div.style.overflowWrap = 'break-word';
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
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  updateModeUI();

  // Place bien les STYLES DANS le SHADOW DOM !
  const style = document.createElement('style');
  style.textContent = `
    @media (max-width: 480px) {
      .custom-chatbot-widget {
        width: 92vw !important;
        max-height: 85vh !important;
        border-radius: 16px !important;
      }
    }
    .custom-chatbot-widget img {
      max-width: 100%;
      border-radius: 10px;
      margin-top: 6px;
    }
    .custom-chatbot-widget a {
      color: ${config.color};
      text-decoration: underline;
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
    .chatbot-loader-bubbles span:nth-child(2) {
      animation-delay: 0.15s;
    }
    .chatbot-loader-bubbles span:nth-child(3) {
      animation-delay: 0.3s;
    }
    @keyframes chatbot-bounce {
      0%, 80%, 100% { transform: scale(0.8); opacity: 0.7; }
      40% { transform: scale(1.3); opacity: 1; }
    }
  `;
  shadow.appendChild(style);
}
