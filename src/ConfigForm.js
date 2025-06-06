import Réagir, { useState } depuis 'réagir';          // 1er import
import { VERSION_WIDGET } depuis './widgetVersion';   // 2ème import

const URL_BACKEND = "https://chatbot-vocal-backend.onrender.com";
const URL_WIDGET = `https://chatbot-vocal-frontend.onrender.com/ChatbotWidget.js?v=${VERSION_WIDGET}`;

function ConfigForm() {
  const [clientId, setClientId] = useState('');
  const [color, setColor] = useState('#0078d4');
  const [logoUrl, setLogoUrl] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [rgpdLink, setRgpdLink] = useState('');
  const [resultScript, setResultScript] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      clientId,
      color,
      logo: logoUrl,
      suggestions: suggestions
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      rgpdLink,
    };
    try {
      await fetch(`${BACKEND_URL}/api/create-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setStatus('Configuration enregistr\u00e9e !');
      setResultScript(
        `<script src="${WIDGET_URL}" data-client-id="${clientId}" data-backend-url="${BACKEND_URL}"></script>`
      );
    } catch (err) {
      console.error(err);
      setStatus("Erreur lors de l'enregistrement");
    }
  };

  return (
    <div className="config-form">
      <h2>Configurer mon chatbot</h2>
      <form onSubmit={handleSubmit}>
        <label>
          ID client
          <input value={clientId} onChange={(e) => setClientId(e.target.value)} required />
        </label>
        <label>
          Couleur principale
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
        <label>
          URL du logo
          <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
        </label>
        <label>
          Suggestions (une par ligne)
          <textarea value={suggestions} onChange={(e) => setSuggestions(e.target.value)} />
        </label>
        <label>
          Lien vers la politique RGPD
          <input value={rgpdLink} onChange={(e) => setRgpdLink(e.target.value)} />
        </label>
        <button type="submit">Cr\u00e9er la configuration</button>
      </form>
      {status && <p>{status}</p>}
      {resultScript && (
        <pre className="generated-script"><code>{resultScript}</code></pre>
      )}
    </div>
  );
}

export default ConfigForm;
