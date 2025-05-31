const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) alert("❌ Chatbot vocal non supporté sur ce navigateur");
else loadAndInitChatbot();

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
  const recognition = new SpeechRecognition();
  recognition.lang = 'fr-FR';
  recognition.continuous = false;
  recognition.interimResults = false;

  const userId = localStorage.getItem('chatbotUserId') || (() => {
    const id = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('chatbotUserId', id);
    return id;
  })();

  let isTextMode = true;

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.zIndex = '9999';
  document.body.appendChild(container);

  const launcher = document.createElement('button');
  launcher.textContent = '🤖';
  Object.assign(launcher.style, {
    fontSize: '28px', border: 'none', background: config.color,
    color: '#fff', borderRadius: '50%', padding: '10px', cursor: 'pointer'
  });
  container.appendChild(launcher);

  const widget = document.createElement('div');
  Object.assign(widget.style, {
    display: 'none', flexDirection: 'column', width: '350px',
    maxWidth: '90vw', background: `linear-gradient(to bottom, ${config.color}, #d7dcfa)`,
    color: '#000', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    padding: '20px', fontFamily: 'sans-serif'
  });
  container.appendChild(widget);

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
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
  });

  config.suggestions.forEach(s => {
    const item = document.createElement('div');
    item.textContent = s;
    Object.assign(item.style, {
      padding: '8px 0', borderBottom: '1px solid #eee', cursor: 'pointer'
    });
    item.onclick = () => sendMessage(s);
    suggBox.appendChild(item);
  });
  widget.appendChild(suggBox);

  const inputBox = document.createElement('div');
  inputBox.style.display = 'flex';
  inputBox.style.marginTop = '14px';
  inputBox.style.background = '#fff';
  inputBox.style.borderRadius = '16px';
  inputBox.style.alignItems = 'center';
  inputBox.style.overflow = 'hidden';

  const input = document.createElement('input');
  input.placeholder = 'Écrivez votre message...';
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

  footerNav.appendChild(vocalTab);
  footerNav.appendChild(textTab);
  widget.appendChild(footerNav);

  updateModeUI();

  const rgpd = document.createElement('a');
  rgpd.href = config.rgpdLink;
  rgpd.textContent = 'Politique de confidentialité';
  rgpd.target = '_blank';
  rgpd.style.fontSize = '11px';
  rgpd.style.color = '#eee';
  rgpd.style.marginTop = '6px';
  rgpd.style.textAlign = 'right';
  widget.appendChild(rgpd);

  micBtn.onclick = () => recognition.start();

  recognition.onresult = e => {
    const txt = e.results[e.results.length - 1][0].transcript;
    sendMessage(txt);
  };

  sendBtn.onclick = () => {
    if (input.value.trim()) {
      sendMessage(input.value);
      input.value = '';
    }
  };

  function sendMessage(msg) {
    fetch(`${backendUrl}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, message: msg, clientId })
    })
      .then(r => r.json())
      .then(data => {
        if (data.audioUrl) new Audio(data.audioUrl).play();
      });
  }
}