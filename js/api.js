// js/api.js
var allData = [];
var filteredData = [];
var currentPage = 1;
var totalPages = 1;
var currentPreviewIndex = 0;
var currentPreviewItem = null;

async function loadData() {
    showProgress();
    try {
        var url = BASE_PATH + '/data/wallpapers.json';
        var res = await fetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        allData = await res.json();
        if (!Array.isArray(allData) || allData.length === 0) {
            showEmpty();
            hideProgress();
            return;
        }
        allData.sort(function(a, b) { return b.date.localeCompare(a.date); });
        filteredData = [];
        document.getElementById('totalNavCount').textContent = allData.length;
        document.getElementById('totalInfo').innerHTML = '<i class="fas fa-images"></i> 共 ' + allData.length + ' 张';
        currentPage = 1;
        renderPage(1);
        hideProgress();
    } catch (err) {
        console.error('加载失败:', err);
        showEmpty();
        hideProgress();
    }
}