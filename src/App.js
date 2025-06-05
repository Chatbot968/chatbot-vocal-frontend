import React, { useEffect } from "react";
import "./App.css";
import ConfigForm from "./ConfigForm";

function App() {
  useEffect(() => {
    // Définis ici l'ID du client et l'URL du backend
    const CLIENT_ID = "novacorp"; // ← L'ID pour charger config/novacorp.json
    const BACKEND_URL = "https://chatbot-vocal-backend.onrender.com";
    const FRONTEND_WIDGET_URL = "https://chatbot-vocal-frontend.onrender.com/ChatbotWidget.js";
    
    // Injecte dynamiquement le widget chatbot vocal
    const script = document.createElement('script');
    script.src = FRONTEND_WIDGET_URL;
    script.setAttribute('data-client-id', CLIENT_ID); // ← Utilisé par le widget JS pour charger la config du bon client !
    script.setAttribute('data-backend-url', BACKEND_URL); // ← URL du backend
    script.defer = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="site-factice">
      <header>
        <h1>NovaCorp</h1>
        <p>Innovations durables pour un futur meilleur 🌱</p>
      </header>

      <section>
        <h2>Nos Services</h2>
        <ul>
          <li>Consulting en énergie verte</li>
          <li>Automatisation intelligente</li>
          <li>Analyse de données environnementales</li>
        </ul>
      </section>

      <section>
        <h2>Qui sommes-nous ?</h2>
        <p>
          NovaCorp est une entreprise fictive spécialisée dans la tech verte.
          Ce site est un prototype pour tester un assistant vocal.
        </p>
      </section>

      <footer>
        <p>© 2025 NovaCorp - Tous droits factices réservés.</p>
      </footer>

      <ConfigForm />
    </div>
  );
}

export default App;