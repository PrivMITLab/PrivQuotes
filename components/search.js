/**
 * PrivQuotes – Search & Filter
 * PrivMITLab · Open Source · Privacy First
 */

'use strict';

import { debounce } from '../utils/helpers.js';
import { applyFilters } from './gallery.js';

const fs = { search: '', language: 'all', category: 'all' };

export function initSearch() {
    const si = document.getElementById('searchInput');
    const sc = document.getElementById('searchClear');
    const lf = document.getElementById('languageFilter');
    const cf = document.getElementById('categoryFilter');
    const rb = document.getElementById('resetFilters');

    if (!si) return;

    const doSearch = debounce(val => {
        fs.search = val;
        applyFilters(fs.search, fs.language, fs.category);
    }, 280);

    si.addEventListener('input', e => {
        doSearch(e.target.value);
        if (sc) sc.hidden = !e.target.value;
    });

    sc?.addEventListener('click', () => {
        si.value = ''; sc.hidden = true; fs.search = '';
        applyFilters(fs.search, fs.language, fs.category);
        si.focus();
    });

    lf?.addEventListener('change', e => {
        fs.language = e.target.value;
        applyFilters(fs.search, fs.language, fs.category);
    });

    cf?.addEventListener('change', e => {
        fs.category = e.target.value;
        applyFilters(fs.search, fs.language, fs.category);
    });

    rb?.addEventListener('click', resetAllFilters);
}

export function resetAllFilters() {
    fs.search = ''; fs.language = 'all'; fs.category = 'all';
    const si = document.getElementById('searchInput');
    const sc = document.getElementById('searchClear');
    const lf = document.getElementById('languageFilter');
    const cf = document.getElementById('categoryFilter');
    if (si) si.value = ''; if (sc) sc.hidden = true;
    if (lf) lf.value = 'all'; if (cf) cf.value = 'all';
    applyFilters('', 'all', 'all');
}