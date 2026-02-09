/**
 * Financial Articles Web App
 * Fetches and displays articles from Google Cloud Storage
 * No external dependencies - pure vanilla JavaScript
 */

// ========== CONFIGURATION ==========
const CONFIG = {
    // GCS bucket URL - update this with your actual bucket URL
    bucketUrl: 'https://storage.googleapis.com/finance-articles-bucket/',
    // For local testing, use sample data
    useSampleData: false,
    sampleDataPath: 'sample-data/'
};

// ========== STATE MANAGEMENT ==========
const state = {
    articles: [],
    filteredArticles: [],
    currentArticle: null,
    categories: new Set(),
    selectedCategory: 'all'
};

// ========== DOM ELEMENTS ==========
const elements = {
    // List view
    articlesListSection: document.getElementById('articlesListSection'),
    loadingState: document.getElementById('loadingState'),
    errorState: document.getElementById('errorState'),
    errorMessage: document.getElementById('errorMessage'),
    retryButton: document.getElementById('retryButton'),
    articlesGrid: document.getElementById('articlesGrid'),
    categoryFilter: document.getElementById('categoryFilter'),

    // Detail view
    articleDetailSection: document.getElementById('articleDetailSection'),
    articleLoadingState: document.getElementById('articleLoadingState'),
    articleContent: document.getElementById('articleContent'),
    backButton: document.getElementById('backButton')
};

// ========== UTILITY FUNCTIONS ==========

/**
 * Formats ISO date string to readable format
 * @param {string} isoDate - ISO 8601 date string
 * @returns {string} Formatted date
 */
function formatDate(isoDate) {
    const date = new Date(isoDate);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Escapes HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Fetches JSON data from URL with error handling
 * @param {string} url - URL to fetch
 * @returns {Promise<Object>} Parsed JSON data
 */
async function fetchJson(url) {
    try {
        // Build URL with cache busting to ensure we get fresh data from GCS
        const cacheBuster = `cacheBust=${Date.now()}`;
        const finalUrl = url.includes('?') ? `${url}&${cacheBuster}` : `${url}?${cacheBuster}`;

        const response = await fetch(finalUrl);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

// ========== DATA FETCHING ==========

/**
 * Loads the articles index from GCS
 * @returns {Promise<void>}
 */
async function loadArticlesIndex() {
    try {
        // Show loading state
        showLoadingState();

        // Construct index URL
        const baseUrl = CONFIG.useSampleData ? CONFIG.sampleDataPath : CONFIG.bucketUrl;
        const indexUrl = `${baseUrl}index.json`;

        // Fetch index
        const data = await fetchJson(indexUrl);

        // Validate data structure
        if (!data.articles || !Array.isArray(data.articles)) {
            throw new Error('Invalid data structure: articles array not found');
        }

        // Store articles and extract categories
        state.articles = data.articles;
        state.articles.forEach(article => {
            if (article.category) {
                state.categories.add(article.category);
            }
        });

        // Sort articles by date (newest first)
        state.articles.sort((a, b) => {
            return new Date(b.publishedAt) - new Date(a.publishedAt);
        });

        // Initialize filtered articles
        state.filteredArticles = [...state.articles];

        // Populate category filter
        populateCategoryFilter();

        // Render articles
        renderArticlesList();

        // Hide loading, show grid
        hideLoadingState();
        elements.articlesGrid.style.display = 'grid';

    } catch (error) {
        console.error('Failed to load articles:', error);
        showErrorState(error.message);
    }
}

/**
 * Loads a single article by ID
 * @param {string} articleId - Article ID
 * @returns {Promise<void>}
 */
async function loadArticle(articleId) {
    try {
        // Find article metadata
        const articleMeta = state.articles.find(a => a.id === articleId);

        if (!articleMeta) {
            throw new Error('Article not found');
        }

        // Show article detail section
        showArticleDetailSection();

        // Show loading state
        elements.articleLoadingState.style.display = 'block';
        elements.articleContent.style.display = 'none';

        // Construct article URL
        const baseUrl = CONFIG.useSampleData ? CONFIG.sampleDataPath : CONFIG.bucketUrl;
        const articleUrl = CONFIG.useSampleData
            ? `${baseUrl}${articleId}.json`
            : `${baseUrl}${articleMeta.filePath}`;

        // Fetch article content
        const articleData = await fetchJson(articleUrl);

        // Store current article
        state.currentArticle = articleData;

        // Render article
        renderArticleDetail(articleData);

        // Hide loading, show content
        elements.articleLoadingState.style.display = 'none';
        elements.articleContent.style.display = 'block';

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        console.error('Failed to load article:', error);
        // Show error in article section
        elements.articleLoadingState.style.display = 'none';
        elements.articleContent.innerHTML = `
            <div class="error-state">
                <h3>Failed to load article</h3>
                <p>${escapeHtml(error.message)}</p>
                <button onclick="showArticlesListSection()" class="btn-retry">Back to Articles</button>
            </div>
        `;
        elements.articleContent.style.display = 'block';
    }
}

// ========== UI STATE MANAGEMENT ==========

/**
 * Shows loading state
 */
function showLoadingState() {
    elements.loadingState.style.display = 'block';
    elements.errorState.style.display = 'none';
    elements.articlesGrid.style.display = 'none';
}

/**
 * Hides loading state
 */
function hideLoadingState() {
    elements.loadingState.style.display = 'none';
}

/**
 * Shows error state with message
 * @param {string} message - Error message
 */
function showErrorState(message) {
    elements.loadingState.style.display = 'none';
    elements.articlesGrid.style.display = 'none';
    elements.errorState.style.display = 'block';
    elements.errorMessage.textContent = message;
}

/**
 * Shows articles list section
 */
function showArticlesListSection() {
    elements.articlesListSection.style.display = 'block';
    elements.articleDetailSection.style.display = 'none';
}

/**
 * Shows article detail section
 */
function showArticleDetailSection() {
    elements.articlesListSection.style.display = 'none';
    elements.articleDetailSection.style.display = 'block';
}

// ========== RENDERING FUNCTIONS ==========

/**
 * Populates the category filter dropdown
 */
function populateCategoryFilter() {
    // Clear existing options (except "All Categories")
    elements.categoryFilter.innerHTML = '<option value="all">All Categories</option>';

    // Add category options
    const sortedCategories = Array.from(state.categories).sort();
    sortedCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        elements.categoryFilter.appendChild(option);
    });
}

/**
 * Renders the articles list
 */
function renderArticlesList() {
    // Clear grid
    elements.articlesGrid.innerHTML = '';

    // Check if there are articles to display
    if (state.filteredArticles.length === 0) {
        elements.articlesGrid.innerHTML = `
            <div class="error-state" style="grid-column: 1 / -1;">
                <p>No articles found in this category.</p>
            </div>
        `;
        return;
    }

    // Render each article card
    state.filteredArticles.forEach(article => {
        const card = createArticleCard(article);
        elements.articlesGrid.appendChild(card);
    });
}

/**
 * Creates an article card element
 * @param {Object} article - Article metadata
 * @returns {HTMLElement} Article card element
 */
function createArticleCard(article) {
    const card = document.createElement('div');
    card.className = 'article-card';
    card.onclick = () => loadArticle(article.id);

    card.innerHTML = `
        <div class="article-meta">
            <span class="category-badge">${escapeHtml(article.category)}</span>
            <span class="article-date">${formatDate(article.publishedAt)}</span>
        </div>
        <h3>${escapeHtml(article.title)}</h3>
        <p class="article-excerpt">${escapeHtml(article.excerpt)}</p>
        <div class="article-footer">
            <span class="article-author">By ${escapeHtml(article.author)}</span>
            <span class="read-more">
                Read more
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12h14M12 5l7 7-7 7"></path>
                </svg>
            </span>
        </div>
    `;

    return card;
}

/**
 * Renders the article detail view
 * @param {Object} article - Full article data
 */
function renderArticleDetail(article) {
    // Create article header
    const headerHtml = `
        <div class="article-header">
            <h1 class="article-title">${escapeHtml(article.title)}</h1>
            <div class="article-info">
                <span class="article-info-item">
                    <strong>By</strong> ${escapeHtml(article.author)}
                </span>
                <span class="article-info-item">
                    <strong>Published</strong> ${formatDate(article.publishedAt)}
                </span>
                <span class="article-info-item">
                    <strong>${escapeHtml(article.readTime)}</strong>
                </span>
            </div>
            ${article.tags ? `
                <div class="article-tags">
                    ${article.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
                </div>
            ` : ''}
        </div>
    `;

    // Create article body
    const bodyHtml = `
        <div class="article-body">
            ${(article.content && Array.isArray(article.content))
            ? article.content.map(block => renderContentBlock(block)).join('')
            : '<p>No content available for this article.</p>'}
        </div>
    `;

    // Combine and set content
    elements.articleContent.innerHTML = headerHtml + bodyHtml;
}

/**
 * Renders a content block based on its type
 * @param {Object} block - Content block
 * @returns {string} HTML string
 */
function renderContentBlock(block) {
    switch (block.type) {
        case 'paragraph':
            return `<p>${escapeHtml(block.text)}</p>`;

        case 'heading':
            return `<h2>${escapeHtml(block.text)}</h2>`;

        case 'list':
            return `
                <ul>
                    ${block.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
                </ul>
            `;

        case 'quote':
            return `
                <blockquote class="article-quote">
                    ${escapeHtml(block.text)}
                    ${block.author ? `<span class="quote-author">— ${escapeHtml(block.author)}</span>` : ''}
                </blockquote>
            `;

        default:
            return '';
    }
}

// ========== EVENT HANDLERS ==========

/**
 * Handles category filter change
 */
function handleCategoryFilter() {
    const selectedCategory = elements.categoryFilter.value;
    state.selectedCategory = selectedCategory;

    // Filter articles
    if (selectedCategory === 'all') {
        state.filteredArticles = [...state.articles];
    } else {
        state.filteredArticles = state.articles.filter(
            article => article.category === selectedCategory
        );
    }

    // Re-render list
    renderArticlesList();
}

/**
 * Handles retry button click
 */
function handleRetry() {
    loadArticlesIndex();
}

/**
 * Handles back button click
 */
function handleBackButton() {
    showArticlesListSection();
}

// ========== EVENT LISTENERS ==========

// Category filter
elements.categoryFilter.addEventListener('change', handleCategoryFilter);

// Retry button
elements.retryButton.addEventListener('click', handleRetry);

// Back button
elements.backButton.addEventListener('click', handleBackButton);

// ========== INTERACTIVE THEME ELEMENTS (MATCH HOME PAGE) ==========

/**
 * Initializes the custom cursor
 */
function initCursor() {
    const cursor = document.querySelector(".cursor");

    document.addEventListener("mousemove", (dets) => {
        cursor.style.left = dets.x + 20 + "px";
        cursor.style.top = dets.y + 20 + "px";
        cursor.style.display = "block";
    });

    // Handle cursor on interactive elements
    const interactiveElements = document.querySelectorAll("a, button, .article-card, .filter-select");
    interactiveElements.forEach(el => {
        el.addEventListener("mouseenter", () => {
            cursor.style.transform = "scale(1.5)";
            cursor.style.backgroundColor = "rgba(21, 255, 0, 0.4)";
        });
        el.addEventListener("mouseleave", () => {
            cursor.style.transform = "scale(1)";
            cursor.style.backgroundColor = "#15ff00";
        });
    });
}

/**
 * Initializes navigation hover effects
 */
function initNavEffects() {
    const navLinks = document.querySelectorAll("#nav2 h4");
    const purple = document.getElementById("purple");

    navLinks.forEach(link => {
        link.addEventListener("mouseenter", () => {
            purple.style.display = "block";
            purple.style.opacity = "0.2"; // Subtle effect
        });
        link.addEventListener("mouseleave", () => {
            purple.style.display = "none";
            purple.style.opacity = "0";
        });
    });
}

// ========== INITIALIZATION ==========

/**
 * Initializes the application
 */
function init() {
    console.log('Initializing Financial Articles App with Home Theme...');
    loadArticlesIndex();
    initCursor();
    initNavEffects();
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
