const API_BASE_URL = "https://media2.edu.metropolia.fi/restaurant/api/v1";

const registerForm = document.getElementById("register-form");
const registerMessageEl = document.getElementById("register-message");

function setRegisterMessage(text, type = "info") {
  if (!registerMessageEl) return;
  registerMessageEl.textContent = text;
  registerMessageEl.className = `auth-message ${type}`;
}

// Jos käyttäjä on jo kirjautunut, ohjataan sovellukseen
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("authToken");
  const user = localStorage.getItem("currentUser");
  if (token && user) {
    window.location.href = "app.html";
  }
});

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("register-username").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;

    if (!username || !email || !password) {
      setRegisterMessage("Täytä kaikki kentät.", "error");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setRegisterMessage(
          data.message || "Rekisteröinti epäonnistui.",
          "error"
        );
        return;
      }

      setRegisterMessage(
        "Rekisteröinti onnistui! Voit nyt kirjautua sisään.",
        "success"
      );

      setTimeout(() => {
        window.location.href = "login.html";
      }, 800);
    } catch (error) {
      console.error("Virhe rekisteröinnissä:", error);
      setRegisterMessage(
        "Virhe palvelimeen yhdistettäessä. Yritä myöhemmin uudelleen.",
        "error"
      );
    }
  });
}
