const API_BASE_URL = "https://media2.edu.metropolia.fi/restaurant/api/v1";

const loginForm = document.getElementById("login-form");
const loginMessageEl = document.getElementById("login-message");

function setLoginMessage(text, type = "info") {
  if (!loginMessageEl) return;
  loginMessageEl.textContent = text;
  loginMessageEl.className = `auth-message ${type}`;
}

// Jos käyttäjä on jo kirjautunut, ohjataan suoraan sovellukseen
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("authToken");
  const user = localStorage.getItem("currentUser");
  if (token && user) {
    window.location.href = "app.html";
  }
});

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;

    if (!username || !password) {
      setLoginMessage("Syötä käyttäjänimi ja salasana.", "error");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.token) {
        setLoginMessage(data.message || "Kirjautuminen epäonnistui.", "error");
        return;
      }

      localStorage.setItem("authToken", data.token);
      localStorage.setItem("currentUser", JSON.stringify(data.data));

      setLoginMessage(
        "Kirjautuminen onnistui. Siirrytään sovellukseen...",
        "success"
      );

      // Lyhyt viive ja sitten sovellukseen
      setTimeout(() => {
        window.location.href = "app.html";
      }, 500);
    } catch (error) {
      console.error("Virhe kirjautumisessa:", error);
      setLoginMessage(
        "Virhe palvelimeen yhdistettäessä. Yritä myöhemmin uudelleen.",
        "error"
      );
    }
  });
}
