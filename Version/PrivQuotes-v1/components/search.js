/**
 * PrivQuotes – Search & Filter Component
 * Handles search input + language + category filter events
 *
 * PrivMITLab · Open Source · Privacy First
 */

'use strict';

import { debounce } from '../utils/helpers.js';
import { applyFilters } from './gallery.js';

/**
 * Shared filter state.
 */
const filterState = {
    search: '',
    language: 'all',
    category: 'all',
};

/**
 * Initialise all search and filter controls.
 */
export function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    const languageFilter = document.getElementById('languageFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    const resetBtn = document.getElementById('resetFilters');

    if (!searchInput) return;

    // ── Debounced search handler
    const handleSearch = debounce((value) => {
        filterState.search = value;
        applyFilters(filterState.search, filterState.language, filterState.category);
    }, 280);

    // ── Search input
    searchInput.addEventListener('input', e => {
        const val = e.target.value;
        handleSearch(val);

        // Toggle clear button
        if (searchClear) {
            searchClear.hidden = val.length === 0;
        }
    });

    // ── Clear search
    searchClear?.addEventListener('click', () => {
        searchInput.value = '';
        searchClear.hidden = true;
        filterState.search = '';
        applyFilters(filterState.search, filterState.language, filterState.category);
        searchInput.focus();
    });

    // ── Language filter
    languageFilter?.addEventListener('change', e => {
        filterState.language = e.target.value;
        applyFilters(filterState.search, filterState.language, filterState.category);
    });

    // ── Category filter
    categoryFilter?.addEventListener('change', e => {
        filterState.category = e.target.value;
        applyFilters(filterState.search, filterState.language, filterState.category);
    });

    // ── Reset all filters
    resetBtn?.addEventListener('click', () => {
        resetAllFilters();
    });
}

/**
 * Reset filters to defaults.
 */
export function resetAllFilters() {
    filterState.search = '';
    filterState.language = 'all';
    filterState.category = 'all';

    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    const languageFilter = document.getElementById('languageFilter');
    const categoryFilter = document.getElementById('categoryFilter');

    if (searchInput) searchInput.value = '';
    if (searchClear) searchClear.hidden = true;
    if (languageFilter) languageFilter.value = 'all';
    if (categoryFilter) categoryFilter.value = 'all';

    applyFilters('', 'all', 'all');
}

/**
 * Get current filter state.
 * @returns {object}
 */
export function getFilterState() {
    return { ...filterState };
}