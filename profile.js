/* ============================================================
   PROFILE.JS — LOPULLINEN VERSIO (monen suosikin tuki)
=============================================================== */

const API_BASE_URL = "https://media2.edu.metropolia.fi/restaurant/api/v1";
const API_ROOT = "https://media2.edu.metropolia.fi/restaurant";

// DOM
const headerNameEl = document.getElementById("header-name");
const profileAvatarEl = document.getElementById("profile-avatar");

const infoUsernameEl = document.getElementById("info-username");
const infoEmailEl = document.getElementById("info-email");
const infoIdEl = document.getElementById("info-id");

const favouriteListEl = document.getElementById("favourite-list");

const updateForm = document.getElementById("update-form");
const updateEmailInput = document.getElementById("update-email");
const updateUsernameInput = document.getElementById("update-username");
const updatePasswordInput = document.getElementById("update-password");

const avatarButton = document.getElementById("avatar-button");
const avatarInput = document.getElementById("avatar-input");

const profileMessageEl = document.getElementById("profile-message");
const logoutButton = document.getElementById("logout-button");

let token = null;

function showMessage(text, type = "info") {
  profileMessageEl.textContent = text;
  profileMessageEl.className = `auth-message ${type}`;
}

// --------------------
// Alustus
// --------------------
document.addEventListener("DOMContentLoaded", () => {
  token = localStorage.getItem("authToken");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  loadProfile();

  logoutButton.onclick = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");
    window.location.href = "login.html";
  };

  // Moderni "Vaihda profiilikuva" -nappi
  avatarButton.addEventListener("click", () => {
    avatarInput.click();
  });

  avatarInput.addEventListener("change", () => {
    if (avatarInput.files && avatarInput.files[0]) {
      uploadAvatar(avatarInput.files[0]);
    }
  });
});

// --------------------
// Profiilin haku
// --------------------
async function loadProfile() {
  try {
    const res = await fetch(`${API_BASE_URL}/users/token`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (!res.ok) {
      showMessage(data.message || "Profiilin lataus epäonnistui.", "error");
      return;
    }

    const user = data.data || data;

    headerNameEl.textContent = user.username || "Käyttäjä";

    if (user.avatar) {
      profileAvatarEl.src = `${API_ROOT}/uploads/${user.avatar}`;
    } else {
      profileAvatarEl.src = "https://via.placeholder.com/150?text=Avatar";
    }

    infoUsernameEl.textContent = user.username || "-";
    infoEmailEl.textContent = user.email || "-";
    infoIdEl.textContent = user._id || "-";

    // Suosikkilista: ensin localStoragesta
    let favouriteIds = [];
    try {
      favouriteIds = JSON.parse(
        localStorage.getItem("favouriteRestaurants") || "[]"
      );
    } catch {
      favouriteIds = [];
    }

    // jos ei löydy localStoragesta, käytä backendin yksittäistä suosikkia
    if (!favouriteIds.length && user.favouriteRestaurant) {
      favouriteIds = [user.favouriteRestaurant];
    }

    if (!favouriteIds.length) {
      favouriteListEl.innerHTML = "<li>Ei suosikkiravintoloita.</li>";
    } else {
      loadFavouriteRestaurants(favouriteIds);
    }

    localStorage.setItem("currentUser", JSON.stringify(user));
  } catch (err) {
    console.error(err);
    showMessage("Profiilin lataus epäonnistui.", "error");
  }
}

// --------------------
// Useamman suosikin haku
// --------------------
async function loadFavouriteRestaurants(ids) {
  favouriteListEl.innerHTML = "";

  for (const id of ids) {
    try {
      const res = await fetch(`${API_BASE_URL}/restaurants/${id}`);
      const data = await res.json();

      if (!res.ok) continue;

      const r = data.data || data;

      const li = document.createElement("li");
      li.innerHTML = `⭐ <strong>${r.name}</strong>${
        r.city ? " (" + r.city + ")" : ""
      }`;
      favouriteListEl.appendChild(li);
    } catch (err) {
      console.error("Suosikkiravintolan haku epäonnistui:", err);
    }
  }

  if (!favouriteListEl.children.length) {
    favouriteListEl.innerHTML =
      "<li>Suosikkiravintoloiden haku epäonnistui.</li>";
  }
}

// --------------------
// Tietojen päivitys
// --------------------
updateForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const body = {};
  if (updateEmailInput.value.trim()) body.email = updateEmailInput.value.trim();
  if (updateUsernameInput.value.trim())
    body.username = updateUsernameInput.value.trim();
  if (updatePasswordInput.value.trim())
    body.password = updatePasswordInput.value.trim();

  if (!Object.keys(body).length) {
    showMessage("Ei päivitettäviä tietoja.", "error");
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/users`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      showMessage(data.message || "Tietojen päivitys epäonnistui.", "error");
      return;
    }

    showMessage("Tiedot päivitetty onnistuneesti!", "success");
    loadProfile();
    updateForm.reset();
  } catch (err) {
    console.error(err);
    showMessage("Tietojen päivitys epäonnistui.", "error");
  }
});

// --------------------
// Profiilikuvan lataus
// --------------------
async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append("avatar", file);

  try {
    const res = await fetch(`${API_BASE_URL}/users/avatar`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      showMessage(
        data.message || data.error || "Profiilikuvan lataus epäonnistui.",
        "error"
      );
      return;
    }

    const user = data.data || data;
    if (user.avatar) {
      profileAvatarEl.src = `${API_ROOT}/uploads/${user.avatar}`;
    }

    const current = JSON.parse(localStorage.getItem("currentUser") || "{}");
    current.avatar = user.avatar;
    localStorage.setItem("currentUser", JSON.stringify(current));

    showMessage("Profiilikuva ladattu onnistuneesti!", "success");
  } catch (err) {
    console.error(err);
    showMessage("Profiilikuvan lataus epäonnistui.", "error");
  }
}
