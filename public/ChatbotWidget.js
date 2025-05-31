// === Chatbot vocal avec layout "app mobile" moderne, switch vocal/texte, logo client, suggestions dynamiques ===

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

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.zIndex = '9999';
  document.body.appendChild(container);

  const launcher = document.createElement('button');
  launcher.textContent = '🤖';
  launcher.style.fontSize = '28px';
  launcher.style.border = 'none';
  launcher.style.background = config.color;
  launcher.style.color = '#fff';
  launcher.style.borderRadius = '50%';
  launcher.style.padding = '10px';
  launcher.style.cursor = 'pointer';
  container.appendChild(launcher);

  const widget = document.createElement('div');
  widget.style.display = 'none';
  widget.style.flexDirection = 'column';
  widget.style.width = '350px';
  widget.style.maxWidth = '90vw';
  widget.style.background = 'linear-gradient(to bottom, #2d6cdf, #d7dcfa)';
  widget.style.color = '#000';
  widget.style.borderRadius = '20px';
  widget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
  widget.style.padding = '20px';
  widget.style.fontFamily = 'sans-serif';
  container.appendChild(widget);

  launcher.onclick = () => {
    launcher.style.display = 'none';
    widget.style.display = 'flex';
  };

  // Header avec logo + bouton fermeture
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
  closeBtn.style.border = 'none';
  closeBtn.style.background = 'none';
  closeBtn.style.fontSize = '20px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.onclick = () => {
    widget.style.display = 'none';
    launcher.style.display = 'inline-block';
  };
  header.appendChild(closeBtn);
  widget.appendChild(header);

  const title = document.createElement('h2');
  title.innerHTML = "Hi there 👋<br><strong>How can we help?</strong>";
  title.style.margin = '16px 0';
  title.style.color = '#fff';
  widget.appendChild(title);

  // Suggestions
  const suggBox = document.createElement('div');
  suggBox.style.background = '#fff';
  suggBox.style.borderRadius = '12px';
  suggBox.style.padding = '12px';
  suggBox.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';

  config.suggestions.forEach(s => {
    const item = document.createElement('div');
    item.textContent = s;
    item.style.padding = '8px 0';
    item.style.borderBottom = '1px solid #eee';
    item.style.cursor = 'pointer';
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
  input.placeholder = 'Parlez ou tapez ici...';
  input.style.flex = '1';
  input.style.padding = '10px';
  input.style.border = 'none';
  input.style.outline = 'none';

  const micBtn = document.createElement('button');
  micBtn.textContent = '🎤';
  micBtn.style.border = 'none';
  micBtn.style.background = config.color;
  micBtn.style.color = '#fff';
  micBtn.style.padding = '10px';
  micBtn.style.cursor = 'pointer';

  const sendBtn = document.createElement('button');
  sendBtn.textContent = '➤';
  sendBtn.style.border = 'none';
  sendBtn.style.background = config.color;
  sendBtn.style.color = '#fff';
  sendBtn.style.padding = '10px';
  sendBtn.style.cursor = 'pointer';

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
  vocalTab.textContent = '🎤 Vocal';
  vocalTab.style.cursor = 'pointer';
  vocalTab.style.fontWeight = 'bold';

  const textTab = document.createElement('div');
  textTab.textContent = '💬 Texte';
  textTab.style.cursor = 'pointer';

  [vocalTab, textTab].forEach(tab => {
    tab.onclick = () => {
      vocalTab.style.color = textTab.style.color = '#000';
      tab.style.color = config.color;
    };
  });

  footerNav.appendChild(vocalTab);
  footerNav.appendChild(textTab);
  widget.appendChild(footerNav);

  const rgpd = document.createElement('a');
  rgpd.href = config.rgpdLink;
  rgpd.textContent = 'Politique de confidentialité';
  rgpd.target = '_blank';
  rgpd.style.fontSize = '11px';
  rgpd.style.color = '#eee';
  rgpd.style.marginTop = '6px';
  rgpd.style.textAlign = 'right';
  widget.appendChild(rgpd);

  // Envoi vocal ou texte
  micBtn.onclick = () => {
    recognition.start();
  };

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
