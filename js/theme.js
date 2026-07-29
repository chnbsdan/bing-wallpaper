// js/theme.js
var themeToggle = document.getElementById('themeToggle');
var currentTheme = localStorage.getItem('theme') || 'dark';

function setTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    themeToggle.innerHTML = theme === 'dark' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
}

themeToggle.addEventListener('click', function() {
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
});
setTheme(currentTheme);