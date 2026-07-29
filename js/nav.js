// js/nav.js
var navToggle = document.getElementById('navToggle');
var navbar = document.getElementById('navbar');
var navOpen = false;

function toggleNav(open) {
    navOpen = open !== undefined ? open : !navOpen;
    navbar.classList.toggle('open', navOpen);
    navToggle.innerHTML = navOpen ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
}

navToggle.addEventListener('click', function(e) {
    e.stopPropagation();
    toggleNav();
});

document.addEventListener('click', function(e) {
    if (navOpen && !navbar.contains(e.target) && e.target !== navToggle) {
        toggleNav(false);
    }
});