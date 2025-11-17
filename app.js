/* ============================================================
   APP.JS — YKSINKERTAINEN & MODERNI VERSIO
   ✔ Kartta + lähin ravintola
   ✔ Filtterit (kaupunki, company)
   ✔ Useita suosikkeja (⭐ localStorage)
   ✔ Klikkaus listasta tai kartalta → ruokalista vasemmassa sarakkeessa
   ✔ Päivä / viikko -valinta kiinni ruokalistassa
   ✔ Profiili-avatar headerissa
=============================================================== */

const API_ROOT = "https://media2.edu.metropolia.fi/restaurant";
const API_BASE_URL = `${API_ROOT}/api/v1`;
const MENU_LANGUAGE = "fi";

// Kartta
let map;
let markers = [];

// DOM
const restaurantListEl = document.getElementById("restaurant-list");
const filterCityEl = document.getElementById("filter-city");
const filterCompanyEl = document.getElementById("filter-company");

const userNameEl = document.getElementById("user-name");
const logoutButton = document.getElementById("logout-button");
const headerAvatarEl = document.getElementById("header-avatar");

const menuRestaurantTitleEl = document.getElementById("menu-restaurant-title");
const menuContentEl = document.getElementById("menu-content");
const menuTypeInputs = document.querySelectorAll('input[name="menu-type"]');

let selectedRestaurantId = null;
let selectedMenuType = "day";

let allRestaurants = [];
let favouriteRestaurantIds = [];

// -----------------------
// Alustus
// -----------------------
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("authToken");
  const userJson = localStorage.getItem("currentUser");

  if (!token || !userJson) {
    window.location.href = "login.html";
    return;
  }

  try {
    const user = JSON.parse(userJson);
    userNameEl.textContent = user.username || "Käyttäjä";

    // Header-avatar
    if (user.avatar) {
      headerAvatarEl.style.backgroundImage = `url(${API_ROOT}/uploads/${user.avatar})`;
      headerAvatarEl.textContent = "";
    } else if (user.username) {
      headerAvatarEl.textContent = user.username[0].toUpperCase();
    } else {
      headerAvatarEl.textContent = "👤";
    }

    // Suosikit localStoragesta
    try {
      favouriteRestaurantIds = JSON.parse(
        localStorage.getItem("favouriteRestaurants") || "[]"
      );
    } catch {
      favouriteRestaurantIds = [];
    }

    // Yksi pääsuosikki back-endissä -> lisätään listaan jos puuttuu
    if (
      user.favouriteRestaurant &&
      !favouriteRestaurantIds.includes(user.favouriteRestaurant)
    ) {
      favouriteRestaurantIds.push(user.favouriteRestaurant);
    }

    saveFavouritesToLocalStorage();
  } catch (e) {
    console.error("Virhe käyttäjädatan lukemisessa:", e);
  }

  logoutButton.onclick = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");
    window.location.href = "login.html";
  };

  // Päivä / viikko -valinta
  menuTypeInputs.forEach((input) => {
    input.addEventListener("change", () => {
      selectedMenuType = input.value;
      if (selectedRestaurantId) {
        loadMenu(selectedRestaurantId, selectedMenuType);
      }
    });
  });

  initMap();
  loadRestaurants();
});

function saveFavouritesToLocalStorage() {
  localStorage.setItem(
    "favouriteRestaurants",
    JSON.stringify(favouriteRestaurantIds)
  );
}

// -----------------------
// Kartta
// -----------------------
function initMap() {
  map = L.map("map").setView([60.1699, 24.9384], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);
}

function clearMarkers() {
  markers.forEach((m) => map.removeLayer(m));
  markers = [];
}

function addRestaurantMarkers(restaurants) {
  clearMarkers();

  restaurants.forEach((r) => {
    if (!r.location || !r.location.coordinates) return;
    const [lon, lat] = r.location.coordinates;

    const marker = L.marker([lat, lon]).addTo(map);
    marker.bindPopup(`<b>${r.name}</b><br>${r.city || ""}`);

    marker.on("click", () => {
      openMenuForRestaurant(r);
    });

    markers.push(marker);
  });
}

function highlightClosestRestaurant(coords, restaurants) {
  let closest = null;
  let minDist = Infinity;

  restaurants.forEach((r) => {
    if (!r.location || !r.location.coordinates) return;
    const [lon, lat] = r.location.coordinates;
    const dist = haversine(coords.lat, coords.lon, lat, lon);

    if (dist < minDist) {
      minDist = dist;
      closest = { r, lat, lon };
    }
  });

  if (closest) {
    L.marker([closest.lat, closest.lon], {
      icon: L.icon({
        iconUrl: "https://cdn-icons-png.flaticon.com/512/685/685815.png",
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      }),
    })
      .addTo(map)
      .bindPopup(`<b>Lähin ravintola:</b><br>${closest.r.name}`)
      .openPopup();
  }
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const dφ = ((lat2 - lat1) * Math.PI) / 180;
  const dλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// -----------------------
// Ravintolat
// -----------------------
async function loadRestaurants() {
  restaurantListEl.innerHTML = "<li>Ladataan ravintoloita...</li>";

  try {
    const res = await fetch(`${API_BASE_URL}/restaurants`);
    const data = await res.json();

    const restaurants = Array.isArray(data)
      ? data
      : Array.isArray(data.restaurants)
      ? data.restaurants
      : [];

    allRestaurants = restaurants;

    renderFilterOptions(allRestaurants);
    renderRestaurantList(allRestaurants);
    addRestaurantMarkers(allRestaurants);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        };
        highlightClosestRestaurant(coords, allRestaurants);
      });
    }
  } catch (e) {
    console.error("Virhe ravintoloiden haussa:", e);
    restaurantListEl.innerHTML =
      "<li>Ravintoloiden lataus epäonnistui. Tarkista VPN-yhteys.</li>";
  }
}

// -----------------------
// Filtterit
// -----------------------
function renderFilterOptions(restaurants) {
  const cities = [
    ...new Set(restaurants.map((r) => r.city).filter(Boolean)),
  ].sort();
  const companies = [
    ...new Set(restaurants.map((r) => r.company).filter(Boolean)),
  ].sort();

  cities.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    filterCityEl.appendChild(opt);
  });

  companies.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    filterCompanyEl.appendChild(opt);
  });

  filterCityEl.onchange = applyFilters;
  filterCompanyEl.onchange = applyFilters;
}

function applyFilters() {
  const city = filterCityEl.value;
  const company = filterCompanyEl.value;

  let result = [...allRestaurants];

  if (city) result = result.filter((r) => r.city === city);
  if (company) result = result.filter((r) => r.company === company);

  renderRestaurantList(result);
  addRestaurantMarkers(result);
}

// -----------------------
// Suosikit (monta)
// -----------------------
async function toggleFavourite(restaurantId) {
  const token = localStorage.getItem("authToken");
  if (!token) return;

  const index = favouriteRestaurantIds.indexOf(restaurantId);
  if (index >= 0) {
    favouriteRestaurantIds.splice(index, 1);
  } else {
    favouriteRestaurantIds.push(restaurantId);
  }

  saveFavouritesToLocalStorage();

  // Synkkaa backendille yksi pääsuosikki (ensimmäinen listassa)
  const primaryFavourite =
    favouriteRestaurantIds.length > 0 ? favouriteRestaurantIds[0] : null;

  const body = { favouriteRestaurant: primaryFavourite };

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
      console.error("Suosikin päivitys epäonnistui:", data.message);
      return;
    }

    const updatedUser = data.data || data;
    localStorage.setItem("currentUser", JSON.stringify(updatedUser));

    applyFilters();
  } catch (e) {
    console.error("Suosikin tallennus epäonnistui:", e);
  }
}

// -----------------------
// Ravintolalista UI
// -----------------------
function renderRestaurantList(restaurants) {
  restaurantListEl.innerHTML = "";

  restaurants.forEach((restaurant) => {
    const li = document.createElement("li");
    li.dataset.id = restaurant._id;

    const star = document.createElement("span");
    star.classList.add("star-icon");
    if (favouriteRestaurantIds.includes(restaurant._id)) {
      star.classList.add("favourite");
      star.textContent = "★";
    } else {
      star.textContent = "☆";
    }

    star.onclick = (e) => {
      e.stopPropagation();
      toggleFavourite(restaurant._id);
    };

    const info = document.createElement("div");
    info.classList.add("restaurant-info");

    const nameEl = document.createElement("div");
    nameEl.classList.add("restaurant-name");
    nameEl.textContent = restaurant.name || "Nimetön ravintola";

    const metaEl = document.createElement("div");
    metaEl.classList.add("restaurant-meta");
    const metaParts = [];
    if (restaurant.city) metaParts.push(restaurant.city);
    if (restaurant.company) metaParts.push(restaurant.company);
    metaEl.textContent = metaParts.join(" • ");

    info.appendChild(nameEl);
    info.appendChild(metaEl);

    li.appendChild(star);
    li.appendChild(info);

    li.onclick = () => {
      openMenuForRestaurant(restaurant);
    };

    restaurantListEl.appendChild(li);
  });
}

function highlightActiveRestaurantInList(id) {
  document.querySelectorAll("#restaurant-list li").forEach((li) => {
    li.classList.toggle("active", li.dataset.id === id);
  });
}

// -----------------------
// Ruokalista (vasemman sarakkeen paneeli)
// -----------------------
function openMenuForRestaurant(restaurant) {
  selectedRestaurantId = restaurant._id;
  if (!selectedRestaurantId) return;

  highlightActiveRestaurantInList(selectedRestaurantId);
  menuRestaurantTitleEl.textContent = restaurant.name || "Ruokalista";

  loadMenu(selectedRestaurantId, selectedMenuType);
}

async function loadMenu(id, type) {
  const url =
    type === "day"
      ? `${API_BASE_URL}/restaurants/daily/${id}/${MENU_LANGUAGE}`
      : `${API_BASE_URL}/restaurants/weekly/${id}/${MENU_LANGUAGE}`;

  menuContentEl.innerHTML = "Ladataan ruokalistaa...";

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error();

    const data = await res.json();
    if (type === "day") renderDailyMenu(data);
    else renderWeeklyMenu(data);
  } catch (e) {
    console.error("Virhe ruokalistan haussa:", e);
    menuContentEl.textContent =
      "Ruokalistan lataus epäonnistui. Yritä myöhemmin uudelleen.";
  }
}

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

function renderWeeklyMenu(data) {
  const days = Array.isArray(data.days) ? data.days : [];

  if (days.length === 0) {
    menuContentEl.textContent = "Viikon ruokalistaa ei löytynyt.";
    return;
  }

  menuContentEl.innerHTML = "";

  days.forEach((day) => {
    const wrapper = document.createElement("div");
    wrapper.style.marginBottom = "1.5rem";

    const dateHeading = document.createElement("h4");
    dateHeading.textContent = formatDate(day.date);
    wrapper.appendChild(dateHeading);

    const ul = document.createElement("ul");
    const courses = Array.isArray(day.courses) ? day.courses : [];

    if (courses.length === 0) {
      const li = document.createElement("li");
      li.textContent = "Ei ruokia tälle päivälle.";
      ul.appendChild(li);
    } else {
      courses.forEach((course) => {
        const li = document.createElement("li");
        const name = course.name || "Nimetön ruoka";
        const price = course.price ? ` — ${course.price} €` : "";
        const diets = course.diets ? ` (${course.diets})` : "";
        li.textContent = `${name}${diets}${price}`;
        ul.appendChild(li);
      });
    }

    wrapper.appendChild(ul);
    menuContentEl.appendChild(wrapper);
  });
}

function formatDate(dateStr) {
  if (!dateStr) return "Päivä tuntematon";
  const [year, month, day] = dateStr.split("-");
  return `${day}.${month}.${year}`;
}
