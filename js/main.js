// js/main.js
var progressBar = document.getElementById('progress-bar');

function showProgress() {
    progressBar.style.width = '30%';
    setTimeout(function() { progressBar.style.width = '60%'; }, 150);
}
function hideProgress() {
    progressBar.style.width = '100%';
    setTimeout(function() { progressBar.style.width = '0%'; }, 350);
}

// 分页事件
document.getElementById('prevBtn').addEventListener('click', function() {
    if (currentPage > 1) renderPage(currentPage - 1);
});
document.getElementById('nextBtn').addEventListener('click', function() {
    if (currentPage < totalPages) renderPage(currentPage + 1);
});
document.getElementById('gotoBtn').addEventListener('click', function() {
    var val = parseInt(document.getElementById('gotoInput').value);
    if (!isNaN(val) && val >= 1 && val <= totalPages) renderPage(val);
    document.getElementById('gotoInput').value = '';
});
document.getElementById('gotoInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('gotoBtn').click();
});

// 搜索
function doSearch() {
    var keyword = document.getElementById('searchInput').value.trim().toLowerCase();
    if (!keyword) { filteredData = []; renderPage(1); return; }
    filteredData = allData.filter(function(item) {
        var copyright = (item.copyright || '').toLowerCase();
        var date = item.date || '';
        var dateClean = date.replace(/-/g, '');
        return copyright.indexOf(keyword) !== -1 || date.indexOf(keyword) !== -1 || dateClean.indexOf(keyword) !== -1;
    });
    if (filteredData.length === 0) {
        grid.innerHTML = '<div class="empty"><div class="icon"><i class="fas fa-search"></i></div><div>没有匹配"' + keyword + '"的壁纸</div></div>';
        document.getElementById('prevBtn').disabled = true;
        document.getElementById('nextBtn').disabled = true;
        document.getElementById('pageInfo').textContent = '第 0 / 0 页';
        return;
    }
    renderPage(1);
}
document.getElementById('searchBtn').addEventListener('click', doSearch);
document.getElementById('searchInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') doSearch();
});

// 首页
document.getElementById('homeBtn').addEventListener('click', function() {
    document.getElementById('searchInput').value = '';
    filteredData = [];
    renderPage(1);
    toggleNav(false);
});

// 启动
loadData();