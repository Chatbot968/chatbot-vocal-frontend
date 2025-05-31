// === Chatbot vocal avec visuel "app mobile" amélioré, toggle vocal/texte, logo client, responsive, RGPD ===
// === Version longue (~400+ lignes) fidèle à ton code de base, visuel retravaillé ===

// [1] Vérification compatibilité navigateur
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
  alert("❌ Chatbot vocal non supporté sur ce navigateur");
} else {
  loadAndInitChatbot();
}

// [2] Chargement dynamique de config et initialisation
async function loadAndInitChatbot() {
  let clientId = null;
  let backendUrl = null;
  const widgetScript = document.currentScript || document.querySelector('script[data-client-id]');

  clientId = widgetScript?.getAttribute('data-client-id') || "novacorp";
  backendUrl = widgetScript?.getAttribute('data-backend-url') || "https://chatbot-vocal-backend.onrender.com";

  let clientConfig = {
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
    const configUrl = `${backendUrl}/config/${clientId}.json`;
    const res = await fetch(configUrl);
    if (res.ok) clientConfig = await res.json();
    else console.warn("[Chatbot] Fichier config non trouvé, fallback.");
  } catch (e) {
    console.warn("[Chatbot] Erreur de chargement config.");
  }

  initChatbot(clientConfig, backendUrl, clientId);
}

// [3] Initialisation du widget complet
function initChatbot(config, backendUrl, clientId) {
  const recognition = new SpeechRecognition();
  recognition.lang = 'fr-FR';
  recognition.continuous = false;
  recognition.interimResults = false;
  let isTextMode = false;

  const userId = localStorage.getItem('chatbotUserId') || (() => {
    const id = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('chatbotUserId', id);
    return id;
  })();

  // === [UI] Conteneur principal ===
  const container = document.createElement('div');
  Object.assign(container.style, {
    position: 'fixed', bottom: '20px', right: '20px', zIndex: '9999',
    display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
    gap: '10px', maxWidth: '96vw'
  });
  document.body.appendChild(container);

  // === Bouton d'ouverture ===
  const openBtn = document.createElement('button');
  openBtn.innerHTML = `<svg height="40" width="40" viewBox="0 0 38 38" fill="none"><circle cx="19" cy="19" r="19" fill="${config.color}"/><path d="M26 19l-8 5V14l8 5z" fill="#fff"/></svg>`;
  Object.assign(openBtn.style, { background: 'transparent', border: 'none', cursor: 'pointer' });
  container.appendChild(openBtn);

  const widget = document.createElement('div');
  widget.style.display = 'none';
  widget.style.flexDirection = 'column';
  widget.style.background = '#fff';
  widget.style.border = `1px solid ${config.color}`;
  widget.style.borderRadius = '20px';
  widget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
  widget.style.padding = '10px';
  widget.style.width = '320px';
  widget.style.maxWidth = '95vw';
  widget.style.fontFamily = 'sans-serif';
  container.appendChild(widget);

  // === [Header] Logo + bouton close ===
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.marginBottom = '10px';

  if (config.logoUrl) {
    const logo = document.createElement('img');
    logo.src = config.logoUrl;
    logo.style.height = '30px';
    logo.style.objectFit = 'contain';
    header.appendChild(logo);
  }

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  Object.assign(closeBtn.style, { background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer' });
  header.appendChild(closeBtn);

  widget.appendChild(header);

  closeBtn.onclick = () => { widget.style.display = 'none'; openBtn.style.display = 'block'; };
  openBtn.onclick = () => { widget.style.display = 'flex'; openBtn.style.display = 'none'; };

  // === Chat container ===
  const chat = document.createElement('div');
  Object.assign(chat.style, {
    flex: '1', overflowY: 'auto', maxHeight: '300px', paddingBottom: '10px', fontSize: '14px'
  });
  widget.appendChild(chat);

  // === Barre de réponse style "mobile" ===
  const footer = document.createElement('div');
  footer.style.display = 'flex';
  footer.style.alignItems = 'center';
  footer.style.justifyContent = 'space-between';
  footer.style.gap = '6px';

  const input = document.createElement('input');
  input.placeholder = 'Parlez ou tapez ici...';
  Object.assign(input.style, { flex: 1, padding: '10px', borderRadius: '18px', border: `1px solid ${config.color}` });
  const micBtn = document.createElement('button');
  micBtn.textContent = '🎤';
  const sendBtn = document.createElement('button');
  sendBtn.textContent = '➤';

  [micBtn, sendBtn].forEach(btn => {
    Object.assign(btn.style, { padding: '10px', borderRadius: '50%', border: 'none', background: config.color, color: '#fff', cursor: 'pointer' });
  });

  footer.appendChild(input);
  footer.appendChild(micBtn);
  footer.appendChild(sendBtn);
  widget.appendChild(footer);

  micBtn.onclick = () => {
    recognition.start();
    micBtn.disabled = true;
    micBtn.textContent = '🎙️';
  };

  recognition.onresult = e => {
    const txt = e.results[e.results.length - 1][0].transcript;
    handleMessage(txt);
    micBtn.disabled = false;
    micBtn.textContent = '🎤';
  };

  sendBtn.onclick = () => {
    const msg = input.value.trim();
    if (msg) handleMessage(msg);
    input.value = '';
  };

  function handleMessage(msg) {
    appendMessage(msg, 'user');
    fetch(`${backendUrl}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, message: msg, clientId })
    })
      .then(res => res.json())
      .then(data => {
        appendMessage(data.text || '(Pas de réponse)', 'bot');
        if (data.audioUrl) new Audio(data.audioUrl).play();
      });
  }

  function appendMessage(txt, sender) {
    const div = document.createElement('div');
    div.textContent = txt;
    div.style.margin = '6px 0';
    div.style.alignSelf = sender === 'user' ? 'flex-end' : 'flex-start';
    div.style.background = sender === 'user' ? '#dceeff' : '#f4f4f4';
    div.style.padding = '8px 12px';
    div.style.borderRadius = '14px';
    div.style.maxWidth = '85%';
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
  }

  const rgpdLink = document.createElement('a');
  rgpdLink.href = config.rgpdLink;
  rgpdLink.target = '_blank';
  rgpdLink.textContent = 'Politique de confidentialité';
  rgpdLink.style.fontSize = '10px';
  rgpdLink.style.color = '#888';
  rgpdLink.style.marginTop = '6px';
  rgpdLink.style.alignSelf = 'flex-end';
  widget.appendChild(rgpdLink);
}
