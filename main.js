// ==============================
// Asetukset
// ==============================

// Perus-URL Student Restaurants API:lle
const API_BASE_URL = "https://media2.edu.metropolia.fi/restaurant/api/v1";

// Käytettävä kieli ruokalistoissa: "fi" tai "en"
const MENU_LANGUAGE = "fi";

// ==============================
// DOM-elementit
// ==============================

const restaurantListEl = document.getElementById("restaurant-list");
const menuContentEl = document.getElementById("menu-content");
const menuTypeInputs = document.querySelectorAll('input[name="menu-type"]');

// Sovelluksen tila
let selectedRestaurantId = null;
let selectedMenuType = "day"; // "day" tai "week"

// ==============================
// Apufunktiot API-osoitteille
// ==============================

function getRestaurantsUrl() {
  return `${API_BASE_URL}/restaurants`;
}

function getDailyMenuUrl(restaurantId) {
  return `${API_BASE_URL}/restaurants/daily/${restaurantId}/${MENU_LANGUAGE}`;
}

function getWeeklyMenuUrl(restaurantId) {
  return `${API_BASE_URL}/restaurants/weekly/${restaurantId}/${MENU_LANGUAGE}`;
}

function getMenuUrl(restaurantId, menuType) {
  return menuType === "day"
    ? getDailyMenuUrl(restaurantId)
    : getWeeklyMenuUrl(restaurantId);
}

// ==============================
// Alustus
// ==============================

document.addEventListener("DOMContentLoaded", () => {
  // Ladataan ravintolat heti kun sivu on valmis
  loadRestaurants();

  // Kuunnellaan valintaa: päivän / viikon ruokalista
  menuTypeInputs.forEach((input) => {
    input.addEventListener("change", () => {
      selectedMenuType = input.value; // "day" tai "week"
      if (selectedRestaurantId) {
        loadMenu(selectedRestaurantId, selectedMenuType);
      }
    });
  });
});

// ==============================
// Ravintoloiden haku ja listaus
// ==============================

async function loadRestaurants() {
  restaurantListEl.innerHTML = "<li>Ladataan ravintoloita...</li>";

  try {
    const response = await fetch(getRestaurantsUrl());
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();

    // API-dokumentin mukaan vastausmuoto on:
    // { restaurants: [ { _id, name, address, city, ... } ] }
    const restaurants = Array.isArray(data)
      ? data
      : Array.isArray(data.restaurants)
      ? data.restaurants
      : [];

    if (restaurants.length === 0) {
      restaurantListEl.innerHTML =
        "<li>Ravintoloita ei löytynyt. Kokeile myöhemmin uudelleen.</li>";
      return;
    }

    renderRestaurantList(restaurants);
  } catch (err) {
    console.error("Virhe ravintoloiden haussa:", err);
    restaurantListEl.innerHTML =
      "<li>Ravintoloiden lataus epäonnistui. Tarkista VPN-yhteys.</li>";
  }
}

function renderRestaurantList(restaurants) {
  restaurantListEl.innerHTML = "";

  restaurants.forEach((restaurant) => {
    const li = document.createElement("li");

    const name = restaurant.name || "Nimetön ravintola";
    const city = restaurant.city ? ` (${restaurant.city})` : "";
    li.textContent = `${name}${city}`;

    li.addEventListener("click", () => {
      // Poistetaan vanha aktiivinen
      document
        .querySelectorAll("#restaurant-list li")
        .forEach((item) => item.classList.remove("active"));

      // Merkitään valittu aktiiviseksi
      li.classList.add("active");

      // Tallennetaan valittu ravintola ja ladataan sen ruokalista
      selectedRestaurantId = restaurant._id;
      if (!selectedRestaurantId) {
        menuContentEl.textContent =
          "Tälle ravintolalle ei löytynyt tunnistetta (_id).";
        return;
      }

      loadMenu(selectedRestaurantId, selectedMenuType);
    });

    restaurantListEl.appendChild(li);
  });
}

// ==============================
// Ruokalistojen haku
// ==============================

async function loadMenu(restaurantId, menuType) {
  const url = getMenuUrl(restaurantId, menuType);

  menuContentEl.innerHTML = "Ladataan ruokalistaa...";

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();

    if (menuType === "day") {
      renderDailyMenu(data);
    } else {
      renderWeeklyMenu(data);
    }
  } catch (err) {
    console.error("Virhe ruokalistan haussa:", err);
    menuContentEl.textContent =
      "Ruokalistan lataus epäonnistui. Tarkista VPN-yhteys tai yritä myöhemmin uudelleen.";
  }
}

// ==============================
// Päivän ruokalista
// ==============================
//
// Odotettu muoto dokumentin mukaan:
// {
//   "courses": [
//     { "name": "...", "price": "...", "diets": "..." },
//     ...
//   ]
// }

function renderDailyMenu(data) {
  const courses = Array.isArray(data.courses) ? data.courses : [];

  if (courses.length === 0) {
    menuContentEl.textContent = "Tälle päivälle ei löytynyt ruokalistaa.";
    return;
  }

  const ul = document.createElement("ul");

  courses.forEach((course) => {
    const li = document.createElement("li");

    const name = course.name || "Nimetön ruoka";
    const price = course.price ? ` — ${course.price} €` : "";
    const diets = course.diets ? ` (${course.diets})` : "";

    li.textContent = `${name}${diets}${price}`;
    ul.appendChild(li);
  });

  menuContentEl.innerHTML = "";
  menuContentEl.appendChild(ul);
}

// ==============================
// Viikon ruokalista
// ==============================
//
// Odotettu muoto dokumentin mukaan:
// {
//   "days": [
//     {
//       "date": "...",
//       "courses": [
//         { "name": "...", "price": "...", "diets": "..." }
//       ]
//     },
//     ...
//   ]
// }

function renderWeeklyMenu(data) {
  const days = Array.isArray(data.days) ? data.days : [];

  if (days.length === 0) {
    menuContentEl.textContent = "Viikon ruokalistaa ei löytynyt.";
    return;
  }

  menuContentEl.innerHTML = "";

  days.forEach((day) => {
    const dayWrapper = document.createElement("div");
    dayWrapper.style.marginBottom = "1.5rem";

    const dateHeading = document.createElement("h4");
    dateHeading.textContent = formatDate(day.date);
    dayWrapper.appendChild(dateHeading);

    const ul = document.createElement("ul");

    const courses = Array.isArray(day.courses) ? day.courses : [];
    courses.forEach((course) => {
      const li = document.createElement("li");

      const name = course.name || "Nimetön ruoka";
      const price = course.price ? ` — ${course.price} €` : "";
      const diets = course.diets ? ` (${course.diets})` : "";

      li.textContent = `${name}${diets}${price}`;
      ul.appendChild(li);
    });

    if (courses.length === 0) {
      const li = document.createElement("li");
      li.textContent = "Ei ruokia tälle päivälle.";
      ul.appendChild(li);
    }

    dayWrapper.appendChild(ul);
    menuContentEl.appendChild(dayWrapper);
  });
}

// ==============================
// Apufunktio päivämäärän näyttämiseen
// ==============================

function formatDate(dateStr) {
  if (!dateStr) return "Päivä tuntematon";

  // Jos muoto on esim. "2025-11-17"
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}.${month}.${year}`;
  }

  // Jos API palauttaa jonkin muun muodon, näytetään sellaisenaan
  return dateStr;
}
