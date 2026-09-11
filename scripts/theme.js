function applySavedTheme() {
    const settings = JSON.parse(localStorage.getItem('vms-settings') || '{}');
    document.body.dataset.theme = settings.theme || 'ocean';
}

applySavedTheme();
