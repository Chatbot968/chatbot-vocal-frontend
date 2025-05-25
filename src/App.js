import React from "react";
import "./App.css";

function App() {
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
    </div>
  );
}

export default App;
