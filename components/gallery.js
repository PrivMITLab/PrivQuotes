/**
 * PrivQuotes – Gallery Component
 * PrivMITLab · Open Source · Privacy First
 */

'use strict';

import { renderCard, toggleLoading, toggleEmptyState, updateStatsBar } from './renderer.js';

const state = {
    allQuotes: [],
    filteredQuotes: [],
    onCardClick: null,
};

export function initGallery(quotes, onCardClick) {
    state.allQuotes = quotes;
    state.filteredQuotes = [...quotes];
    state.onCardClick = onCardClick;
    toggleLoading(false);
    renderGallery(state.filteredQuotes);
}

export function renderGallery(quotes) {
    const gallery = document.getElementById('gallery');
    if (!gallery) return;

    gallery.innerHTML = '';

    if (!quotes || quotes.length === 0) {
        toggleEmptyState(true);
        updateStatsBar(0, state.allQuotes.length);
        return;
    }

    toggleEmptyState(false);

    const frag = document.createDocumentFragment();
    quotes.forEach((q, i) => frag.appendChild(renderCard(q, i, state.onCardClick)));
    gallery.appendChild(frag);

    updateStatsBar(quotes.length, state.allQuotes.length);
}

export function applyFilters(search, language, category) {
    const term = search.toLowerCase().trim();

    state.filteredQuotes = state.allQuotes.filter(q => {
        if (language !== 'all' && q.language !== language) return false;
        if (category !== 'all' && q.type !== category) return false;
        if (term) {
            const inText = q.text?.toLowerCase().includes(term);
            const inTags = q.meta?.tags?.some(t => t.toLowerCase().includes(term));
            const inAuthor = q.meta?.author?.toLowerCase().includes(term);
            const inType = q.type?.toLowerCase().includes(term);
            const inLang = q.language?.toLowerCase().includes(term);
            if (!inText && !inTags && !inAuthor && !inType && !inLang) return false;
        }
        return true;
    });

    renderGallery(state.filteredQuotes);
    return state.filteredQuotes;
}

export function getFilteredQuotes() { return state.filteredQuotes; }
export function getAllQuotes() { return state.allQuotes; }