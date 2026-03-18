/**
 * PrivQuotes – Gallery Component
 * Manages the quote grid: rendering, filtering, pagination
 *
 * PrivMITLab · Open Source · Privacy First
 */

'use strict';

import { renderCard, toggleLoading, toggleEmptyState, updateStatsBar } from './renderer.js';

/**
 * Gallery state.
 */
const state = {
    allQuotes: [],
    filteredQuotes: [],
    openModal: null,  // Will be set from outside (modal.open)
};

/**
 * Initialise the gallery with quotes data.
 * @param {Array}    quotes     - All quotes from JSON
 * @param {Function} onCardClick - Callback when a card is clicked
 */
export function initGallery(quotes, onCardClick) {
    state.allQuotes = quotes;
    state.filteredQuotes = [...quotes];
    state.openModal = onCardClick;

    toggleLoading(false);
    renderGallery(state.filteredQuotes);
}

/**
 * Render the gallery grid from a list of quotes.
 * Uses DocumentFragment for performance (single DOM insertion).
 * @param {Array} quotes
 */
export function renderGallery(quotes) {
    const galleryEl = document.getElementById('gallery');
    if (!galleryEl) return;

    // Clear existing content
    galleryEl.innerHTML = '';

    if (!quotes || quotes.length === 0) {
        toggleEmptyState(true);
        updateStatsBar(0, state.allQuotes.length);
        return;
    }

    toggleEmptyState(false);

    // Build all cards in a fragment (single reflow)
    const fragment = document.createDocumentFragment();

    quotes.forEach((quote, index) => {
        const card = renderCard(quote, index, state.openModal);
        fragment.appendChild(card);
    });

    galleryEl.appendChild(fragment);
    updateStatsBar(quotes.length, state.allQuotes.length);
}

/**
 * Apply search + filter combination.
 * @param {string} searchTerm
 * @param {string} language   - 'all' or specific language
 * @param {string} category   - 'all' or specific type
 */
export function applyFilters(searchTerm, language, category) {
    const term = searchTerm.toLowerCase().trim();

    state.filteredQuotes = state.allQuotes.filter(quote => {
        // Language filter
        if (language !== 'all' && quote.language !== language) return false;

        // Category filter
        if (category !== 'all' && quote.type !== category) return false;

        // Search term
        if (term) {
            const inText = quote.text?.toLowerCase().includes(term);
            const inTags = quote.meta?.tags?.some(t => t.toLowerCase().includes(term));
            const inAuthor = quote.meta?.author?.toLowerCase().includes(term);
            const inType = quote.type?.toLowerCase().includes(term);
            const inLang = quote.language?.toLowerCase().includes(term);

            if (!inText && !inTags && !inAuthor && !inType && !inLang) return false;
        }

        return true;
    });

    renderGallery(state.filteredQuotes);
    return state.filteredQuotes;
}

/**
 * Get current filtered quotes (for modal navigation).
 * @returns {Array}
 */
export function getFilteredQuotes() {
    return state.filteredQuotes;
}

/**
 * Get all quotes.
 * @returns {Array}
 */
export function getAllQuotes() {
    return state.allQuotes;
}