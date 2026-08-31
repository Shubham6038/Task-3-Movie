BASE_URL = 'https://api.tvmaze.com'; 
// Global application state
let currentMovies = [];
let favoriteMovies = JSON.parse(localStorage.getItem('movieFavs')) || [];
let loggedInUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let isLoginMode = true;

// DOM Elements Selection
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authSwitch = document.getElementById('auth-switch');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');

const movieDisplayGrid = document.getElementById('movie-display-grid');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const genreFilter = document.getElementById('genre-filter');
const yearFilter = document.getElementById('year-filter');
const movieSort = document.getElementById('movie-sort');
const contentTitle = document.getElementById('content-title');
const controlsPanel = document.getElementById('controls-panel');

const movieModal = document.getElementById('movie-modal');
const modalDataBody = document.getElementById('modal-data-body');
const closeModalBtn = document.getElementById('close-modal-btn');

const navHome = document.getElementById('nav-home');
const navFav = document.getElementById('nav-fav');
const themeToggle = document.getElementById('theme-toggle');
const logoutBtn = document.getElementById('logout-btn');

// --- 1. ROUTING & AUTHENTICATION ---
function checkAuth() {
    if (!loggedInUser) {
        appContainer.classList.add('hidden');
        authContainer.classList.remove('hidden');
    } else {
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        initDashboard();
    }
}

authSwitch.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    authTitle.innerText = isLoginMode ? 'Welcome to CineExplore' : 'Create Account';
    authSubmitBtn.innerText = isLoginMode ? 'Login' : 'Register';
    document.getElementById('auth-toggle-text').innerHTML = isLoginMode ? 
        `Don't have an account? <span id="auth-switch">Register here</span>` :
        `Already have an account? <span id="auth-switch">Login here</span>`;
    
    document.getElementById('auth-switch').addEventListener('click', () => authSwitch.click());
});

authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = authEmail.value;
    const password = authPassword.value;

    if (isLoginMode) {
        const registeredUsers = JSON.parse(localStorage.getItem('usersList')) || [];
        const userFound = registeredUsers.find(u => u.email === email && u.password === password);
        
        if (userFound || (email === "admin@gmail.com" && password === "123456")) {
            localStorage.setItem('currentUser', JSON.stringify({ email }));
            loggedInUser = { email };
            checkAuth();
        } else {
            alert("Invalid Credentials! Register first or use: admin@gmail.com / 123456");
        }
    } else {
        let registeredUsers = JSON.parse(localStorage.getItem('usersList')) || [];
        if (registeredUsers.some(u => u.email === email)) {
            alert("User already exists!");
            return;
        }
        registeredUsers.push({ email, password });
        localStorage.setItem('usersList', JSON.stringify(registeredUsers));
        alert("Registration Successful! Please login.");
        authSwitch.click();
    }
    authForm.reset();
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    loggedInUser = null;
    checkAuth();
});

// --- 2. DARK / LIGHT MODE ---
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

themeToggle.addEventListener('click', () => {
    const activeTheme = document.documentElement.getAttribute('data-theme');
    const targetTheme = activeTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', targetTheme);
    localStorage.setItem('theme', targetTheme);
});

// --- 3. PURE ASYNC/AWAIT FETCH FROM API ---
async function initDashboard() {
    setupDropdownFilters();
    loadTrendingMovies();
}

async function loadTrendingMovies() {
    contentTitle.innerText = "Trending Shows";
    controlsPanel.classList.remove('hidden');
    movieDisplayGrid.innerHTML = "<p>Fetching dynamic live updates from Public API...</p>";
    
    try {
        const response = await fetch(`${BASE_URL}/shows`);
        const data = await response.json();
        
        // Formatting standard keys according to specification requirements
        currentMovies = data.slice(0, 20).map(item => ({
            id: item.id,
            title: item.name,
            poster_path: item.image ? item.image.medium : '',
            release_date: item.premiered || 'N/A',
            vote_average: item.rating ? (item.rating.average || 7.5) : 7.5,
            genres: item.genres || [],
            overview: item.summary ? item.summary.replace(/<[^>]*>/g, '') : 'No summary available.',
            runtime: item.runtime || 60
        }));
        
        displayMovies(currentMovies);
    } catch (error) {
        console.error("API Call failed:", error);
        movieDisplayGrid.innerHTML = "<p>API Connection failed. Please check internet connection.</p>";
    }
}

// --- 4. RENDER METHOD ---
function displayMovies(movies) {
    movieDisplayGrid.innerHTML = "";
    if (!movies || movies.length === 0) {
        movieDisplayGrid.innerHTML = `<p class="no-results">⚠️ No Results Found. Try another filter.</p>`;
        return;
    }

    movies.forEach(movie => {
        const isFav = favoriteMovies.some(f => f.id === movie.id);
        const card = document.createElement('div');
        card.classList.add('movie-card');
        
        const posterSrc = movie.poster_path || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=500';
        const year = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';

        card.innerHTML = `
            <img src="${posterSrc}" alt="${movie.title}">
            <button class="fav-badge">${isFav ? '❤️' : '🤍'}</button>
            <div class="movie-info" onclick="openMovieDetails(${movie.id})">
                <h3>${movie.title}</h3>
                <div class="movie-meta">
                    <span>📅 ${year}</span>
                    <span>⭐ ${movie.vote_average.toFixed(1)}</span>
                </div>
            </div>
        `;

        card.querySelector('.fav-badge').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(movie, e.target);
        });

        movieDisplayGrid.appendChild(card);
    });
}

// --- 5. EXTENDED VIEW DETAIL MODAL ---
function openMovieDetails(movieId) {
    const movie = currentMovies.find(m => m.id === movieId) || favoriteMovies.find(m => m.id === movieId);
    if (!movie) return;

    const posterSrc = movie.poster_path || 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=500';
    const genreText = movie.genres && movie.genres.length > 0 ? movie.genres.join(', ') : 'Drama';

    modalDataBody.innerHTML = `
        <div class="modal-layout">
            <img src="${posterSrc}" alt="${movie.title}">
            <div class="modal-info-pane">
                <h2>${movie.title}</h2>
                <div class="modal-meta-strip">
                    <span>📅 Premiered: ${movie.release_date}</span> | 
                    <span>⏱️ ${movie.runtime} Mins</span> | 
                    <span>⭐ Rating: ${movie.vote_average}</span>
                </div>
                <p><strong>Genre:</strong> ${genreText}</p>
                <p><strong>Overview:</strong> ${movie.overview}</p>
            </div>
        </div>
    `;
    movieModal.style.display = 'flex';
}

// --- 6. LIVE SEARCH API ROUTE ---
async function runMovieSearch() {
    const query = searchInput.value.trim();
    if (!query) return;

    contentTitle.innerText = `Search Results for "${query}"`;
    movieDisplayGrid.innerHTML = "<p>Searching public API database...</p>";

    try {
        const response = await fetch(`${BASE_URL}/search/shows?q=${encodeURIComponent(query)}`);
        const rawData = await response.json();

        currentMovies = rawData.map(res => {
            const item = res.show;
            return {
                id: item.id,
                title: item.name,
                poster_path: item.image ? item.image.medium : '',
                release_date: item.premiered || 'N/A',
                vote_average: item.rating ? (item.rating.average || 7.0) : 7.0,
                genres: item.genres || [],
                overview: item.summary ? item.summary.replace(/<[^>]*>/g, '') : 'No summary.',
                runtime: item.runtime || 60
            };
        });

        displayMovies(currentMovies);
    } catch (err) {
        console.error("Search API error:", err);
    }
}

searchBtn.addEventListener('click', runMovieSearch);
searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') runMovieSearch(); });

// --- 7. FILTER & CLIENT SORT ENGINE ---
function setupDropdownFilters() {
    yearFilter.innerHTML = '<option value="">All Years</option>';
    for (let y = 2026; y >= 2010; y--) {
        yearFilter.innerHTML += `<option value="${y}">${y}</option>`;
    }
    
    const staticGenres = ["Drama", "Action", "Science-Fiction", "Comedy", "Horror", "Thriller", "Romance"];
    genreFilter.innerHTML = '<option value="">All Genres</option>';
    staticGenres.forEach(g => {
        genreFilter.innerHTML += `<option value="${g}">${g}</option>`;
    });
}

function applyFiltersAndSorting() {
    let dataset = [...currentMovies];
    const gen = genreFilter.value;
    const yr = yearFilter.value;
    const sortBy = movieSort.value;

    if (gen) {
        dataset = dataset.filter(m => m.genres && m.genres.includes(gen));
    }
    if (yr) {
        dataset = dataset.filter(m => m.release_date && m.release_date.startsWith(yr));
    }

    if (sortBy === 'rating-desc') {
        dataset.sort((a, b) => b.vote_average - a.vote_average);
    } else if (sortBy === 'date-desc') {
        dataset.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
    } else if (sortBy === 'alpha-asc') {
        dataset.sort((a, b) => a.title.localeCompare(b.title));
    }

    displayMovies(dataset);
}

genreFilter.addEventListener('change', applyFiltersAndSorting);
yearFilter.addEventListener('change', applyFiltersAndSorting);
movieSort.addEventListener('change', applyFiltersAndSorting);

// --- 8. FAVORITES LOCAL STORAGE ENGINE ---
function toggleFavorite(movie, element) {
    const idx = favoriteMovies.findIndex(f => f.id === movie.id);
    if (idx > -1) {
        favoriteMovies.splice(idx, 1);
        element.innerText = '🤍';
    } else {
        favoriteMovies.push(movie);
        element.innerText = '❤️';
    }
    localStorage.setItem('movieFavs', JSON.stringify(favoriteMovies));
    if (contentTitle.innerText === "Your Favorites") showFavoritesPage();
}

function showFavoritesPage() {
    contentTitle.innerText = "Your Favorites";
    controlsPanel.classList.add('hidden');
    displayMovies(favoriteMovies);
}

// --- 9. NAV BUTTONS BINDINGS ---
navHome.addEventListener('click', () => {
    navHome.classList.add('active');
    navFav.classList.remove('active');
    loadTrendingMovies();
});

navFav.addEventListener('click', () => {
    navFav.classList.add('active');
    navHome.classList.remove('active');
    showFavoritesPage();
});

document.getElementById('nav-logo').addEventListener('click', () => navHome.click());
closeModalBtn.addEventListener('click', () => movieModal.style.display = 'none');
window.addEventListener('click', (e) => { if (e.target === movieModal) movieModal.style.display = 'none'; });

// Initialize System
initTheme();
checkAuth();