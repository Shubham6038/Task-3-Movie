// Global State aur API URLs
const API_URL = 'https://www.themealdb.com/api/json/v1/1/';
let favorites = JSON.parse(localStorage.getItem('recipeFavs')) || [];

// HTML Elements Selection
const recipeDisplay = document.getElementById('recipe-display');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const categorySelect = document.getElementById('category-select');
const areaSelect = document.getElementById('area-select');
const pageTitle = document.getElementById('page-title');
const recipeModal = document.getElementById('recipe-modal');
const modalBody = document.getElementById('modal-body');
const closeModal = document.getElementById('close-modal');

// Navigation Buttons
const homeBtn = document.getElementById('home-btn');
const favBtn = document.getElementById('fav-btn');
const randomBtn = document.getElementById('random-btn');
const logoBtn = document.getElementById('logo-btn');
const controlsSec = document.getElementById('controls-sec');

// --- API FETCH FUNCTIONS ---

// Generic Fetch function taaki code repeat na ho
async function fetchData(endpoint) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`);
        const data = await response.json();
        return data.meals;
    } catch (error) {
        console.error("Error fetching data:", error);
        return null;
    }
}

// Initial/Random Recipes load karne ke liye
async function loadDefaultRecipes() {
    pageTitle.innerText = "Trending Recipes";
    recipeDisplay.innerHTML = "<p>Loading recipes...</p>";
    
    // Default par 8 random recipes load karenge
    let recipes = [];
    for(let i=0; i<8; i++) {
        const meal = await fetchData('random.php');
        if(meal) recipes.push(meal[0]);
    }
    displayRecipes(recipes);
}

// Search Function
async function searchRecipes(query) {
    if(!query.trim()) return;
    pageTitle.innerText = `Search Results for "${query}"`;
    recipeDisplay.innerHTML = "<p>Searching...</p>";
    
    const meals = await fetchData(`search.php?s=${query}`);
    displayRecipes(meals);
}

// --- DISPLAY & UI RENDER FUNCTIONS ---

function displayRecipes(meals) {
    recipeDisplay.innerHTML = "";
    if (!meals || meals.length === 0) {
        recipeDisplay.innerHTML = `<p class="no-results">No recipes found. Try another search!</p>`;
        return;
    }

    meals.forEach(meal => {
        const isFav = favorites.includes(meal.idMeal);
        const card = document.createElement('div');
        card.classList.add('recipe-card');
        
        card.innerHTML = `
            <img src="${meal.strMealThumb}" alt="${meal.strMeal}">
            <button class="fav-icon-btn" data-id="${meal.idMeal}">
                ${isFav ? '❤️' : '🤍'}
            </button>
            <div class="card-info" onclick="openRecipeDetails('${meal.idMeal}')">
                <h3>${meal.strMeal}</h3>
                <div class="tags">
                    <span class="tag">${meal.strCategory || 'General'}</span>
                    <span class="tag">📍 ${meal.strArea || 'Global'}</span>
                </div>
            </div>
        `;
        
        // Favorite button logic
        card.querySelector('.fav-icon-btn').addEventListener('click', (e) => {
            e.stopPropagation(); // Card click event ko trigger hone se rokega
            toggleFavorite(meal.idMeal, e.target);
        });

        recipeDisplay.appendChild(card);
    });
}

// Detailed Modal Content Loader
async function openRecipeDetails(id) {
    const meals = await fetchData(`lookup.php?i=${id}`);
    if(!meals) return;
    const meal = meals[0];

    // Ingredients aur Measurements ko ek sath filter karna
    let ingredientsHTML = '';
    for (let i = 1; i <= 20; i++) {
        const ingredient = meal[`strIngredient${i}`];
        const measure = meal[`strMeasure${i}`];
        if (ingredient && ingredient.trim() !== "") {
            ingredientsHTML += `<li><strong>${measure}</strong> ${ingredient}</li>`;
        }
    }

    modalBody.innerHTML = `
        <div class="modal-hero">
            <img src="${meal.strMealThumb}" alt="${meal.strMeal}">
        </div>
        <div class="modal-details">
            <h2>${meal.strMeal}</h2>
            <p><strong>Category:</strong> ${meal.strCategory} | <strong>Cuisine:</strong> ${meal.strArea}</p>
            
            <h3>Ingredients</h3>
            <ul class="ingredients-list">${ingredientsHTML}</ul>
            
            <h3>Instructions</h3>
            <p class="instructions">${meal.strInstructions.replace(/\n/g, '<br><br>')}</p>
            
            ${meal.strYoutube ? `<a href="${meal.strYoutube}" target="_blank" class="video-btn">📺 Watch Cooking Video</a>` : ''}
        </div>
    `;
    recipeModal.style.display = 'flex';
}

// --- FAVORITES LOGIC ---

function toggleFavorite(id, buttonEl) {
    if (favorites.includes(id)) {
        favorites = favorites.filter(favId => favId !== id);
        buttonEl.innerText = '🤍';
    } else {
        favorites.push(id);
        buttonEl.innerText = '❤️';
    }
    localStorage.setItem('recipeFavs', JSON.stringify(favorites));
    
    // Agar favorites page par hain aur item remove kiya to list refresh ho jaye
    if(pageTitle.innerText === "Your Favorite Recipes") {
        showFavoritesPage();
    }
}

async function showFavoritesPage() {
    pageTitle.innerText = "Your Favorite Recipes";
    controlsSec.style.display = 'none'; // Filters hide karein
    
    if (favorites.length === 0) {
        recipeDisplay.innerHTML = "<p>No favorites saved yet. Go explore some recipes!</p>";
        return;
    }

    recipeDisplay.innerHTML = "<p>Loading Favorites...</p>";
    let favMeals = [];
    for(let id of favorites) {
        const res = await fetchData(`lookup.php?i=${id}`);
        if(res) favMeals.push(res[0]);
    }
    displayRecipes(favMeals);
}

// --- FILTERS & SETUP DROPDOWNS ---

async function setupDropdowns() {
    const categories = await fetchData('list.php?c=list');
    const areas = await fetchData('list.php?a=list');

    if(categories) {
        categories.forEach(cat => {
            categorySelect.innerHTML += `<option value="${cat.strCategory}">${cat.strCategory}</option>`;
        });
    }
    if(areas) {
        areas.forEach(area => {
            areaSelect.innerHTML += `<option value="${area.strArea}">${area.strArea}</option>`;
        });
    }
}

// Filter Function
async function filterRecipes() {
    const cat = categorySelect.value;
    const area = areaSelect.value;
    
    recipeDisplay.innerHTML = "<p>Filtering...</p>";

    // API restriction ke chalte hum pehle ek param se select karenge fir JS se validate karenge
    let meals = [];
    if(cat) {
        meals = await fetchData(`filter.php?c=${cat}`) || [];
    } else if(area) {
        meals = await fetchData(`filter.php?a=${area}`) || [];
    } else {
        loadDefaultRecipes();
        return;
    }
    
    displayRecipes(meals);
}

// --- EVENT LISTENERS ---

searchBtn.addEventListener('click', () => searchRecipes(searchInput.value));
searchInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') searchRecipes(searchInput.value); });

categorySelect.addEventListener('change', filterRecipes);
areaSelect.addEventListener('change', filterRecipes);

// Navigation links
homeBtn.addEventListener('click', () => {
    controlsSec.style.display = 'flex';
    homeBtn.classList.add('active');
    favBtn.classList.remove('active');
    loadDefaultRecipes();
});

logoBtn.addEventListener('click', () => homeBtn.click());

favBtn.addEventListener('click', () => {
    favBtn.classList.add('active');
    homeBtn.classList.remove('active');
    showFavoritesPage();
});

randomBtn.addEventListener('click', async () => {
    const meal = await fetchData('random.php');
    if(meal) openRecipeDetails(meal[0].idMeal);
});

// Modal close behavior
closeModal.addEventListener('click', () => recipeModal.style.display = 'none');
window.addEventListener('click', (e) => { if(e.target === recipeModal) recipeModal.style.display = 'none'; });

// Application Init
setupDropdowns();
loadDefaultRecipes();