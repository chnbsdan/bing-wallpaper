// js/config.js
function getBasePath() {
    var path = window.location.pathname;
    if (path.endsWith('.html')) {
        return path.substring(0, path.lastIndexOf('/'));
    }
    return path.replace(/\/$/, '');
}
var BASE_PATH = getBasePath();

function getImageUrl(url) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return BASE_PATH + url;
    return url;
}

function getThumbnailUrl(url) {
    if (!url) return '';
    if (url.indexOf('th?id=') !== -1) {
        var baseUrl = url.split('&')[0];
        if (baseUrl.indexOf('_UHD.jpg') !== -1) {
            baseUrl = baseUrl.replace('_UHD.jpg', '_1920x1080.jpg');
        }
        if (baseUrl.indexOf('_400x240.jpg') !== -1) {
            return baseUrl;
        }
        return baseUrl + '&w=800&h=450';
    }
    return url;
}

var PAGE_SIZE = window.innerWidth <= 500 ? 12 : 30;
