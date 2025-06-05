const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
  alert("❌ Chatbot vocal non supporté sur ce navigateur");
} else {
  // Charge le widget (après config)
  loadAndInitChatbot();
}

async function loadAndInitChatbot() {
  // 🔥 Récupère dynamiquement le clientId ET le backendUrl depuis le tag d’injection HTML
  let clientId = null;
  let backendUrl = null;
  const widgetScript = document.currentScript || document.querySelector('script[data-client-id]');
  if (widgetScript && widgetScript.getAttribute('data-client-id')) {
    clientId = widgetScript.getAttribute('data-client-id');
  } else {
    clientId = "client_demo"; // fallback si jamais
  }
  // === Ajout backend dynamique ===
  if (widgetScript && widgetScript.getAttribute('data-backend-url')) {
    backendUrl = widgetScript.getAttribute('data-backend-url');
  } else {
    backendUrl = "https://chatbot-vocal-backend.onrender.com";
  }

  // 🔥 CHARGE LA CONFIG CLIENT DYNAMIQUE
  let clientConfig = {
    color: "#0078d4",
    suggestions: [
      "Je souhaite prendre rendez-vous",
      "Quels sont vos services ?",
      "J’aimerais en savoir plus sur vos tarifs"
    ],
    rgpdLink: "/politique-confidentialite.html"
  };
  try {
    const configUrl = `${backendUrl}/config/${clientId}.json`;
    const res = await fetch(configUrl);
    if (res.ok) {
      clientConfig = await res.json();
    } else {
      console.warn("[Chatbot] Fichier config non trouvé, fallback par défaut.");
    }
  } catch (e) {
    console.warn("[Chatbot] Impossible de charger la config, fallback.");
  }

  initChatbot(clientConfig, backendUrl, clientId);
}

function initChatbot(config, backendUrl, clientId) {
  // Génération d’un userId unique par visiteur
  let userId = localStorage.getItem('chatbotUserId');
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('chatbotUserId', userId);
  }

  // Reconnaissance vocale
  const recognition = new SpeechRecognition();
  recognition.lang = 'fr-FR';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  let isTextMode = false;
  let isMinimized = false;

  // Création de l'UI
  const container = document.createElement('div');
  Object.assign(container.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: '1000',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '8px',
    transition: 'opacity .3s, transform .3s'
  });
  document.body.appendChild(container);

  // 0) Bouton de lancement (SVG stylé)
  const launchBtn = document.createElement('button');
  launchBtn.innerHTML = `<svg height="38" width="38" viewBox="0 0 38 38" fill="none"><circle cx="19" cy="19" r="19" fill="${config.color}"/><path d="M26 19l-8 5V14l8 5z" fill="#fff"/></svg>`;
  Object.assign(launchBtn.style, {
    border: 'none',
    background: 'transparent',
    boxShadow: '0 2px 6px rgba(0,0,0,0.20)',
    padding: 0,
    cursor: 'pointer',
    outline: 'none',
    display: 'block',
    transition: 'opacity .2s',
  });
  container.appendChild(launchBtn);

  // Affiche/masque le widget (animation fade-in)
  function openWidget() {
    launchBtn.style.display = 'none';
    mainWidget.style.display = 'flex';
    mainWidget.style.opacity = 1;
    mainWidget.style.transform = 'translateY(0)';
    isMinimized = false;
  }
  function closeWidget() {
    mainWidget.style.opacity = 0;
    mainWidget.style.transform = 'translateY(60px)';
    setTimeout(() => {
      mainWidget.style.display = 'none';
      launchBtn.style.display = 'block';
      isMinimized = true;
    }, 300);
  }
  launchBtn.onclick = openWidget;

  // Main Widget
  const mainWidget = document.createElement('div');
  Object.assign(mainWidget.style, {
    display: 'none',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '8px',
    opacity: 0,
    background: 'none',
    transition: 'opacity .3s, transform .3s',
    transform: 'translateY(60px)',
    minWidth: '310px',
    maxWidth: '96vw'
  });
  container.appendChild(mainWidget);

  // 1) Bouton Minimiser (croix SVG)
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = `<svg width="26" height="26" viewBox="0 0 26 26"><circle cx="13" cy="13" r="13" fill="#f5f5f5"/><path d="M8 8l10 10M18 8L8 18" stroke="#666" stroke-width="2" stroke-linecap="round"/></svg>`;
  Object.assign(closeBtn.style, {
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    alignSelf: 'flex-end',
    marginBottom: '-2px',
    marginRight: '2px',
    padding: '2px'
  });
  closeBtn.onclick = closeWidget;
  mainWidget.appendChild(closeBtn);

  // 2) Flèche swipe dynamique (en haut)
  const arrowBtn = document.createElement('button');
  arrowBtn.innerHTML = '⬆︎';
  Object.assign(arrowBtn.style, {
    padding: '8px',
    borderRadius: '50%',
    background: config.color,
    color: '#fff',
    fontSize: '20px',
    cursor: 'pointer',
    border: 'none',
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
    transition: 'transform .3s'
  });
  mainWidget.appendChild(arrowBtn);

  // 3) Suggestions verticales stylées (mode vocal et texte)
  const quickContainer = document.createElement('div');
  quickContainer.style.display = 'flex';
  quickContainer.style.margin = '0 0 8px 0';
  quickContainer.style.transition = 'opacity .2s';
  quickContainer.style.width = '100%';
  quickContainer.style.flexDirection = 'column';
  quickContainer.style.alignItems = 'stretch';

  // ⬇️ Utilisation des suggestions dynamiques issues de la config
  const quickReplies = Array.isArray(config.suggestions) && config.suggestions.length > 0 ? config.suggestions : [
    "Je souhaite prendre rendez-vous",
    "Quels sont vos services ?",
    "J’aimerais en savoir plus sur vos tarifs"
  ];
  quickReplies.forEach(q => {
    const btn = document.createElement('button');
    btn.textContent = q;
    btn.className = "quick-btn";
    btn.style.margin = '0 0 10px 0';
    btn.onclick = () => {
      if (!isTextMode) {
        const placeholder = appendLoadingBubble();
        askBot(q).then(d => {
          const rep = d.text?.trim()||'(Pas de réponse)';
          if (placeholder && placeholder.parentNode) {
            placeholder.parentNode.removeChild(placeholder);
          }
          playMp3FromBackend(d.audioUrl, rep);
        });
      } else {
        textInput.value = q;
        sendBtn.click();
      }
      quickContainer.style.display = 'none';
    };
    quickContainer.appendChild(btn);
  });
  mainWidget.appendChild(quickContainer);

  // 4) Formulaire texte (caché par défaut)
  const textForm = document.createElement('div');
  Object.assign(textForm.style, {
    display: 'none',
    flexDirection: 'row',
    alignItems: 'center',
    background: '#fff',
    borderRadius: '30px',
    padding: '6px',
    border: `1px solid ${config.color}`
  });
  const textInput = document.createElement('input');
  textInput.type = 'text';
  textInput.placeholder = 'Votre message…';
  Object.assign(textInput.style, {
    padding: '6px 10px',
    width: '180px',
    borderRadius: '20px',
    border: `1px solid ${config.color}`,
    outline: 'none',
    minHeight: '44px'
  });
  const sendBtn = document.createElement('button');
  sendBtn.textContent = '➤';
  Object.assign(sendBtn.style, {
    marginLeft: '6px',
    width: '44px',
    height: '44px',
    padding: '0',
    borderRadius: '50%',
    background: config.color,
    color: '#fff',
    fontSize: '20px',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  });
  textForm.appendChild(textInput);
  textForm.appendChild(sendBtn);
  mainWidget.appendChild(textForm);

  // 5) Conteneur de chat texte
  const chatContainer = document.createElement('div');
  Object.assign(chatContainer.style, {
    width: '300px',
    maxWidth: '98vw',
    maxHeight: '50vh',
    overflowY: 'auto',
    background: '#fff',
    border: '1px solid #ccc',
    borderRadius: '8px',
    padding: '10px',
    fontFamily: 'sans-serif',
    fontSize: '14px',
    color: '#000',
    display: 'none',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  });
  mainWidget.appendChild(chatContainer);

  // 6) Bouton vocal
  const vocalBtn = document.createElement('button');
  vocalBtn.textContent = '📞 CHAT VOCAL';
  Object.assign(vocalBtn.style, {
    padding: '12px 24px',
    borderRadius: '30px',
    background: '#000',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
  });
  mainWidget.appendChild(vocalBtn);

  // 7) Lien RGPD dynamique
  const rgpd = document.createElement('div');
  rgpd.innerHTML = `<a href="${config.rgpdLink || '/politique-confidentialite.html'}" target="_blank" style="font-size:11px;color:#888;display:block;margin-top:5px;text-align:right">Politique de confidentialité</a>`;
  mainWidget.appendChild(rgpd);

  // === Utilitaires ===
  function appendMessage(txt, sender = 'bot', isError = false) {
    const msg = document.createElement('div');
    msg.className = `chat-bubble ${sender}${isError ? ' error' : ''}`;
    msg.textContent = txt;
    chatContainer.appendChild(msg);
    if (chatContainer.style.display === 'none') chatContainer.style.display = 'block';
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return msg;
  }

  function appendLoadingBubble() {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble bot loading-bubble';
    bubble.innerHTML = `<span class="dot-loader"><span>.</span><span>.</span><span>.</span></span>`;
    chatContainer.appendChild(bubble);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return bubble;
  }

  // ⚡️ ENVOI AU BACKEND DYNAMIQUE
  function askBot(msg) {
    return fetch(`${backendUrl}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userId, message: msg, clientId: clientId }) // <--- Ajout clientId ici !
    })
      .then(r => r.json())
      .catch(e => {
        return { text: null, audioUrl: null };
      });
  }

  // Fonction TTS côté client : lit le MP3 généré par ton backend (plus de clé AWS ici !)
  function playMp3FromBackend(audioUrl, fallbackText) {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    } else if (fallbackText) {
      // Fallback simple avec synthèse vocale navigateur
      if ('speechSynthesis' in window) {
        const utter = new SpeechSynthesisUtterance(fallbackText);
        utter.lang = 'fr-FR';
        speechSynthesis.speak(utter);
      }
    }
  }

  // === Événements ===

  // Bascule mode TEXTE ↔ VOCAL
  arrowBtn.onclick = () => {
    isTextMode = !isTextMode;
    if (isTextMode) {
      arrowBtn.innerHTML = '⬇︎';
      textForm.style.display      = 'flex';
      chatContainer.style.display = chatContainer.childElementCount ? 'block' : 'none';
      vocalBtn.style.display      = 'none';
      quickContainer.style.display = 'flex';
      textInput.focus();
    } else {
      arrowBtn.innerHTML = '⬆︎';
      textForm.style.display      = 'none';
      chatContainer.style.display = 'none';
      vocalBtn.style.display      = 'block';
      quickContainer.style.display = 'flex';
    }
  };

  // Cache suggestions si on tape du texte (mode texte)
  textInput.addEventListener('input', () => {
    if (textInput.value.trim().length > 0) {
      quickContainer.style.display = 'none';
    }
  });

  // Démarrage appel vocal
  vocalBtn.onclick = () => {
    recognition.start();
    vocalBtn.disabled    = true;
    vocalBtn.textContent = '🎙️ EN ÉCOUTE';
  };
  recognition.onend = () => {
    vocalBtn.disabled    = false;
    vocalBtn.textContent = '📞 CHAT VOCAL';
  };

  // Réception résultat reconnaissance vocale
  recognition.onresult = e => {
    const txt = e.results[e.results.length-1][0].transcript.trim();
    if (isTextMode) appendMessage(txt, 'user');
    const placeholder = appendLoadingBubble();
    quickContainer.style.display = 'none';
    askBot(txt).then(d => {
      const rep = d.text?.trim()||'(Pas de réponse)';
      if (isTextMode) {
        placeholder.classList.remove('loading-bubble');
        placeholder.innerHTML = rep;
      } else {
        if (placeholder && placeholder.parentNode) {
          placeholder.parentNode.removeChild(placeholder);
        }
      }
      playMp3FromBackend(d.audioUrl, rep);
    });
  };

  // Envoi en mode texte
  sendBtn.onclick = () => {
    const t = textInput.value.trim();
    if (!t) return;
    textInput.value = '';
    appendMessage(t, 'user');
    const placeholder = appendLoadingBubble();
    quickContainer.style.display = 'none';
    askBot(t).then(d => {
      const r = d.text?.trim()||'(Pas de réponse)';
      placeholder.classList.remove('loading-bubble');
      placeholder.innerHTML = r;
      playMp3FromBackend(d.audioUrl, r);
    });
  };
  textInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') sendBtn.click();
  });

  // === Styles des bulles + suggestions verticales ===
  const style = document.createElement('style');
  style.textContent = `
    .chat-bubble {
      max-width:80%; margin:6px 0;
      padding:10px 14px; border-radius:18px;
      line-height:1.4; font-size:14px;
      box-shadow:0 2px 6px rgba(0,0,0,0.1);
      word-wrap:break-word;
    }
    .chat-bubble.user{ background:#dce8ff; margin-left:auto; text-align:right }
    .chat-bubble.bot { background:#f4f4f4; margin-right:auto; text-align:left }
    .chat-bubble.error{ background:#ffe5e5; color:#a00; font-style:italic; padding:6px; font-size:12px }
    /* Loader animé "..." */
    .loading-bubble .dot-loader {
      display: inline-block; font-size: 22px; letter-spacing: 2px;
    }
    .loading-bubble .dot-loader span {
      opacity: 0.4;
      animation: blink 1.2s infinite;
    }
    .loading-bubble .dot-loader span:nth-child(2) { animation-delay: 0.2s; }
    .loading-bubble .dot-loader span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes blink {
      0%, 80%, 100% { opacity: 0.4; }
      40% { opacity: 1; }
    }
    /* Suggestions verticales et larges */
    .quick-btn {
      background:#eaf4ff; color:${config.color}; border:1px solid ${config.color};
      border-radius:22px; margin:0 0 10px 0; padding:10px 16px;
      font-size:15px; font-weight:500; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,0.03);
      transition:background 0.15s;
      width: 100%; text-align: left;
      outline: none;
    }
    .quick-btn:hover { background: #d1e7ff; }
    .quick-btn:last-child { margin-bottom: 0; }
    /* Responsive mobile */
    @media (max-width: 600px) {
      .chat-bubble, .quick-btn { font-size:13px; padding:8px 10px;}
      .quick-btn { min-height: 38px; }
      .mainWidget { min-width: 98vw; }
    }
  `;
  document.head.appendChild(style);

  // Animation fade-in widget au démarrage (optionnel, UX)
  setTimeout(() => {
    if (!isMinimized) mainWidget.style.opacity = 1;
  }, 100);
}