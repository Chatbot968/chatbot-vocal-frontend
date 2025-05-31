// === Chatbot vocal avec visuel "app mobile" stylé, toggle vocal/texte, logo client, responsive, RGPD ===
// === Version longue fidèle au code original de Diego ===

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
  alert("❌ Chatbot vocal non supporté sur ce navigateur");
} else {
  loadAndInitChatbot();
}

async function loadAndInitChatbot() {
  const script = document.currentScript || document.querySelector('script[data-client-id]');
  const clientId = script?.getAttribute('data-client-id') || "novacorp";
  const backendUrl = script?.getAttribute('data-backend-url') || "https://chatbot-vocal-backend.onrender.com";

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
    console.warn("[Chatbot] Erreur de chargement de config, fallback utilisé.");
  }

  initChatbot(config, backendUrl, clientId);
}

function initChatbot(config, backendUrl, clientId) {
  const userId = localStorage.getItem('chatbotUserId') || (() => {
    const id = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('chatbotUserId', id);
    return id;
  })();

  const recognition = new SpeechRecognition();
  recognition.lang = 'fr-FR';
  recognition.continuous = false;
  recognition.interimResults = false;

  let isTextMode = false;

  // Création du conteneur principal
  const container = document.createElement('div');
  Object.assign(container.style, {
    position: 'fixed', bottom: '20px', right: '20px', zIndex: '9999',
    display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
    maxWidth: '96vw'
  });
  document.body.appendChild(container);

  // Bouton d'ouverture
  const openBtn = document.createElement('button');
  openBtn.innerHTML = `<svg height="40" width="40" viewBox="0 0 38 38" fill="none">
    <circle cx="19" cy="19" r="19" fill="${config.color}"/>
    <path d="M26 19l-8 5V14l8 5z" fill="#fff"/></svg>`;
  Object.assign(openBtn.style, {
    background: 'transparent', border: 'none', cursor: 'pointer', display: 'block'
  });
  container.appendChild(openBtn);

  const widget = document.createElement('div');
  Object.assign(widget.style, {
    display: 'none', flexDirection: 'column', background: '#fff',
    border: `1px solid ${config.color}`, borderRadius: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '12px 14px',
    width: '320px', maxWidth: '96vw', fontFamily: 'sans-serif'
  });
  container.appendChild(widget);

  // Header : logo + bouton fermer
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';

  const logo = document.createElement('img');
  logo.src = config.logoUrl || '';
  logo.style.height = '32px';
  logo.style.objectFit = 'contain';
  logo.style.flex = '1';
  header.appendChild(logo);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  Object.assign(closeBtn.style, {
    background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer'
  });
  header.appendChild(closeBtn);
  widget.appendChild(header);

  // Contenu suggestions
  const quickReplies = config.suggestions || [];
  const quickDiv = document.createElement('div');
  quickReplies.forEach(txt => {
    const b = document.createElement('button');
    b.textContent = txt;
    Object.assign(b.style, {
      display: 'block', padding: '8px 12px', margin: '6px 0',
      background: '#f4f4f4', border: '1px solid #ccc', borderRadius: '12px',
      cursor: 'pointer', fontSize: '14px', textAlign: 'left'
    });
    b.onclick = () => handleMessage(txt);
    quickDiv.appendChild(b);
  });
  widget.appendChild(quickDiv);

  // Chat container
  const chat = document.createElement('div');
  Object.assign(chat.style, {
    overflowY: 'auto', maxHeight: '200px', marginTop: '10px'
  });
  widget.appendChild(chat);

  // Zone saisie
  const footer = document.createElement('div');
  footer.style.display = 'flex';
  footer.style.alignItems = 'center';
  footer.style.gap = '6px';

  const input = document.createElement('input');
  input.placeholder = 'Parlez ou tapez ici...';
  Object.assign(input.style, {
    flex: 1, padding: '10px', borderRadius: '18px',
    border: `1px solid ${config.color}`
  });
  const micBtn = document.createElement('button');
  micBtn.textContent = '🎤';
  const sendBtn = document.createElement('button');
  sendBtn.textContent = '➤';

  [micBtn, sendBtn].forEach(btn => {
    Object.assign(btn.style, {
      padding: '10px', borderRadius: '50%', border: 'none',
      background: config.color, color: '#fff', cursor: 'pointer'
    });
  });

  footer.appendChild(input);
  footer.appendChild(micBtn);
  footer.appendChild(sendBtn);
  widget.appendChild(footer);

  // RGPD
  const rgpd = document.createElement('a');
  rgpd.href = config.rgpdLink;
  rgpd.target = '_blank';
  rgpd.textContent = 'Politique de confidentialité';
  Object.assign(rgpd.style, {
    fontSize: '10px', color: '#888', marginTop: '6px', alignSelf: 'flex-end'
  });
  widget.appendChild(rgpd);

  openBtn.onclick = () => {
    widget.style.display = 'flex';
    openBtn.style.display = 'none';
  };
  closeBtn.onclick = () => {
    widget.style.display = 'none';
    openBtn.style.display = 'block';
  };

  micBtn.onclick = () => {
    recognition.start();
    micBtn.disabled = true;
    micBtn.textContent = '🎙️';
  };

  recognition.onresult = e => {
    const txt = e.results[e.results.length - 1][0].transcript;
    micBtn.disabled = false;
    micBtn.textContent = '🎤';
    handleMessage(txt);
  };

  sendBtn.onclick = () => {
    const msg = input.value.trim();
    if (msg) handleMessage(msg);
    input.value = '';
  };

  function appendMessage(text, sender = 'bot') {
    const msg = document.createElement('div');
    msg.textContent = text;
    Object.assign(msg.style, {
      margin: '6px 0', alignSelf: sender === 'user' ? 'flex-end' : 'flex-start',
      background: sender === 'user' ? '#dceeff' : '#f4f4f4',
      padding: '8px 12px', borderRadius: '14px', maxWidth: '85%'
    });
    chat.appendChild(msg);
    chat.scrollTop = chat.scrollHeight;
  }

  function handleMessage(text) {
    appendMessage(text, 'user');
    fetch(`${backendUrl}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, message: text, clientId })
    })
      .then(res => res.json())
      .then(data => {
        appendMessage(data.text || '(Pas de réponse)', 'bot');
        if (data.audioUrl) new Audio(data.audioUrl).play();
      });
  }
}
