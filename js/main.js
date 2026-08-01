// ============================================================
// 1. 路径适配
// ============================================================
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

// ============================================================
// 2. 主题切换
// ============================================================
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

// ============================================================
// 3. 进度条
// ============================================================
var progressBar = document.getElementById('progress-bar');

function showProgress() {
    progressBar.style.width = '30%';
    setTimeout(function() { progressBar.style.width = '60%'; }, 150);
}

function hideProgress() {
    progressBar.style.width = '100%';
    setTimeout(function() { progressBar.style.width = '0%'; }, 350);
}

// ============================================================
// 4. 导航栏
// ============================================================
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

// ============================================================
// 5. 评论系统 - Twikoo CDN 方式
// ============================================================
var commentOverlay = document.getElementById('commentOverlay');
var closeCommentBtn = document.getElementById('closeCommentBtn');
var commentNavBtn = document.getElementById('commentNavBtn');

function openComment() {
    commentOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    toggleNav(false);
    
    // ★★★ 首次打开时初始化 Twikoo ★★★
    if (!document.getElementById('tcomment').hasChildNodes()) {
        initTwikoo();
    }
}

function closeComment() {
    commentOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

// ★★★ 初始化 Twikoo ★★★
function initTwikoo() {
    if (typeof twikoo === 'undefined') {
        console.warn('Twikoo 未加载，等待重试...');
        setTimeout(initTwikoo, 500);
        return;
    }
    
    twikoo.init({
        envId: 'https://twikoo.hangdn.net',  // ★ 你的 Twikoo 后端地址
        el: '#tcomment',                      // 容器元素
        // region: 'ap-guangzhou',            // Vercel 部署不需要
        lang: 'zh-CN',
        // 管理后台: https://twikoo.hangdn.net/admin
    });
}

// 评论按钮事件
commentNavBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    openComment();
});

closeCommentBtn.addEventListener('click', closeComment);
commentOverlay.addEventListener('click', function(e) {
    if (e.target === commentOverlay) closeComment();
});
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && commentOverlay.classList.contains('active')) {
        closeComment();
    }
});

// ============================================================
// 6. 数据加载
// ============================================================
var allData = [];
var filteredData = [];
var currentPage = 1;
var PAGE_SIZE = 30;
var totalPages = 1;
var currentPreviewIndex = 0;
var currentPreviewItem = null;

var grid = document.getElementById('grid');
var previewOverlay = document.getElementById('previewOverlay');
var previewImg = document.getElementById('previewImg');
var previewCopyright = document.getElementById('previewCopyright');
var previewDate = document.getElementById('previewDate');
var previewDesc = document.getElementById('previewDesc');
var totalNavCount = document.getElementById('totalNavCount');
var searchInput = document.getElementById('searchInput');
var searchBtn = document.getElementById('searchBtn');
var homeBtn = document.getElementById('homeBtn');
var prevBtn = document.getElementById('prevBtn');
var nextBtn = document.getElementById('nextBtn');
var pageInfo = document.getElementById('pageInfo');
var totalInfo = document.getElementById('totalInfo');
var gotoInput = document.getElementById('gotoInput');
var gotoBtn = document.getElementById('gotoBtn');
var closePreviewBtn = document.getElementById('closePreviewBtn');
var donateBtn = document.getElementById('donateBtn');
var donateModal = document.getElementById('donateModal');
var closeDonate = document.getElementById('closeDonate');
var downloadBtn = document.getElementById('downloadBtn');
var downloadMenu = document.getElementById('downloadMenu');

// 缩放状态
var scale = 1,
    minScale = 0.3,
    maxScale = 5,
    translateX = 0,
    translateY = 0,
    isDragging = false,
    startX = 0,
    startY = 0,
    lastTranslateX = 0,
    lastTranslateY = 0;

// 工具栏显示状态
var toolbarVisible = true;

// ============================================================
// 6.1 加载数据
// ============================================================
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
        totalNavCount.textContent = allData.length;
        totalInfo.innerHTML = '<i class="fas fa-images"></i> 共 ' + allData.length + ' 张';
        currentPage = 1;
        renderPage(1);
        hideProgress();
    } catch (err) {
        console.error('加载失败:', err);
        showEmpty();
        hideProgress();
    }
}

// ============================================================
// 6.2 渲染页面
// ============================================================
function renderPage(page) {
    var data = filteredData.length > 0 ? filteredData : allData;
    totalPages = Math.ceil(data.length / PAGE_SIZE);
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    if (totalPages === 0) { showEmpty(); return; }
    currentPage = page;
    var start = (page - 1) * PAGE_SIZE;
    var end = Math.min(start + PAGE_SIZE, data.length);
    var items = data.slice(start, end);
    grid.innerHTML = '';
    if (items.length === 0) { showEmpty(); return; }

    items.forEach(function(item) {
        var card = document.createElement('div');
        card.className = 'card';

        // ★★★ 1. 优先使用缩略图 thumb ★★★
        var thumbSrc = getImageUrl(item.thumb || item.webp || item.jpg || '');
        // ★★★ 2. 高清原图（作为备选，当缩略图加载失败时使用）★★★
        var fullImgSrc = getImageUrl(item.webp || item.jpg || '');
        var fallback = getImageUrl(item.jpg || '');
        var placeholderSrc = getThumbnailUrl(thumbSrc);

        card.innerHTML =
            '<div class="placeholder-bg" style="background-image: url(' + placeholderSrc + ');"></div>' +
            '<img src="' + thumbSrc + '" alt="' + (item.copyright || item.date) + '" loading="lazy" />' +
            '<div class="info">' +
            '<div class="date">' + item.date + '</div>' +
            '<div class="title">' + (item.copyright || '无标题') + '</div>' +
            '<div class="copyright">' + (item.copyright || '') + '</div>' +
            '</div>';

        var img = card.querySelector('img');
        var placeholderBg = card.querySelector('.placeholder-bg');

        img.addEventListener('load', function() {
            img.classList.add('loaded');
            placeholderBg.classList.add('hidden');
        });
        if (img.complete) {
            img.classList.add('loaded');
            placeholderBg.classList.add('hidden');
        }
        // ★★★ 缩略图加载失败时，回退到高清原图 ★★★
        img.addEventListener('error', function() {
            if (fullImgSrc && fullImgSrc !== thumbSrc) {
                this.src = fullImgSrc;
            } else if (fallback && fallback !== thumbSrc) {
                this.src = fallback;
            } else {
                this.classList.add('loaded');
                placeholderBg.classList.add('hidden');
            }
        });

        card.addEventListener('click', function() {
            var targetIndex = -1;
            for (var i = 0; i < allData.length; i++) {
                if (allData[i].date === item.date) {
                    targetIndex = i;
                    break;
                }
            }
            if (targetIndex === -1) return;
            openPreview(targetIndex);
        });

        grid.appendChild(card);
    });

    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
    pageInfo.textContent = '第 ' + currentPage + ' / ' + totalPages + ' 页';
    gotoInput.max = totalPages;
    gotoInput.placeholder = '1-' + totalPages;
    grid.scrollTop = 0;
}

// ============================================================
// 6.3 分页事件
// ============================================================
prevBtn.addEventListener('click', function() { if (currentPage > 1) renderPage(currentPage - 1); });
nextBtn.addEventListener('click', function() { if (currentPage < totalPages) renderPage(currentPage + 1); });
gotoBtn.addEventListener('click', function() {
    var val = parseInt(gotoInput.value);
    if (!isNaN(val) && val >= 1 && val <= totalPages) renderPage(val);
    gotoInput.value = '';
});
gotoInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') gotoBtn.click(); });

// ============================================================
// 6.4 搜索
// ============================================================
function doSearch() {
    var keyword = searchInput.value.trim().toLowerCase();
    if (!keyword) { filteredData = [];
        renderPage(1); return; }
    filteredData = allData.filter(function(item) {
        var copyright = (item.copyright || '').toLowerCase();
        var date = item.date || '';
        var dateClean = date.replace(/-/g, '');
        return copyright.indexOf(keyword) !== -1 || date.indexOf(keyword) !== -1 || dateClean.indexOf(keyword) !== -1;
    });
    if (filteredData.length === 0) {
        grid.innerHTML =
            '<div class="empty"><div class="icon"><i class="fas fa-search"></i></div><div>没有匹配"' + keyword +
            '"的壁纸</div></div>';
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        pageInfo.textContent = '第 0 / 0 页';
        return;
    }
    renderPage(1);
}
searchBtn.addEventListener('click', doSearch);
searchInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') doSearch(); });
homeBtn.addEventListener('click', function() {
    searchInput.value = '';
    filteredData = [];
    renderPage(1);
    toggleNav(false);
});

// ============================================================
// 6.5 空状态
// ============================================================
function showEmpty() {
    grid.innerHTML =
        '<div class="empty"><div class="icon"><i class="fas fa-image"></i></div><div>暂无壁纸数据</div></div>';
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    pageInfo.textContent = '第 0 / 0 页';
    totalInfo.innerHTML = '<i class="fas fa-images"></i> 共 0 张';
    totalNavCount.textContent = '0';
}

// ============================================================
// 7. 大图预览
// ============================================================

function openPreview(index) {
    if (!allData || allData.length === 0) return;
    if (index < 0) index = 0;
    if (index >= allData.length) index = allData.length - 1;
    currentPreviewIndex = index;
    currentPreviewItem = allData[currentPreviewIndex];
    resetZoom();
    showPreview(currentPreviewIndex);
    previewOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    var imgSrc = getImageUrl(currentPreviewItem.jpg || currentPreviewItem.webp || '');
    previewOverlay.style.setProperty('--bg-url', 'url(' + imgSrc + ')');

    navToggle.classList.add('hidden');
    showToolbar();

    previewImg.onclick = function(e) {
        e.stopPropagation();
        toggleToolbar();
    };

    // ★★★ 手机左右滑动切换 ★★★
    var startX = 0;
    var startY = 0;

    previewImg.ontouchstart = function(e) {
        var touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
    };

    previewImg.ontouchend = function(e) {
        if (startX === 0) return;
        var touch = e.changedTouches[0];
        var deltaX = touch.clientX - startX;
        var deltaY = touch.clientY - startY;
        
        // 水平滑动距离大于30px，且大于垂直滑动
        if (Math.abs(deltaX) > 30 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
            if (deltaX > 0) {
                showPreview(currentPreviewIndex - 1); // 右滑上一张
            } else {
                showPreview(currentPreviewIndex + 1); // 左滑下一张
            }
            showToolbar();
        }
        startX = 0;
        startY = 0;
    };
}

function showPreview(index) {
    if (allData.length === 0) return;
    if (index < 0) index = allData.length - 1;
    if (index >= allData.length) index = 0;
    currentPreviewIndex = index;
    currentPreviewItem = allData[currentPreviewIndex];

    var imgSrc = getImageUrl(currentPreviewItem.jpg || currentPreviewItem.webp || '');
    previewImg.src = imgSrc;
    previewCopyright.textContent = currentPreviewItem.copyright || '';
    previewDate.textContent = currentPreviewItem.date || '';
    previewDesc.textContent = currentPreviewItem.description || '';
    previewOverlay.style.setProperty('--bg-url', 'url(' + imgSrc + ')');
    resetZoom();
}

function closePreview() {
    previewOverlay.classList.remove('active');
    document.body.style.overflow = 'auto';
    navToggle.classList.remove('hidden');
    showToolbar();
}

function toggleToolbar() {
    toolbarVisible = !toolbarVisible;
    var arrows = document.querySelectorAll('.arrow');
    for (var i = 0; i < arrows.length; i++) {
        arrows[i].style.transition = 'opacity 0.3s ease';
        arrows[i].style.opacity = toolbarVisible ? '1' : '0';
        arrows[i].style.pointerEvents = toolbarVisible ? '' : 'none';
    }
    var toolbars = document.querySelectorAll('.toolbar');
    for (var i = 0; i < toolbars.length; i++) {
        toolbars[i].style.transition = 'opacity 0.3s ease';
        toolbars[i].style.opacity = toolbarVisible ? '1' : '0';
        toolbars[i].style.pointerEvents = toolbarVisible ? '' : 'none';
    }
    var infoPanels = document.querySelectorAll('.info-panel');
    for (var i = 0; i < infoPanels.length; i++) {
        infoPanels[i].style.transition = 'opacity 0.3s ease';
        infoPanels[i].style.opacity = toolbarVisible ? '1' : '0';
        infoPanels[i].style.pointerEvents = toolbarVisible ? '' : 'none';
    }
}

function showToolbar() {
    toolbarVisible = true;
    var allElements = document.querySelectorAll('.arrow, .toolbar, .info-panel');
    for (var i = 0; i < allElements.length; i++) {
        allElements[i].style.transition = 'opacity 0.3s ease';
        allElements[i].style.opacity = '1';
        allElements[i].style.pointerEvents = '';
    }
}

var prevPreviewBtn = document.getElementById('prevPreviewBtn');
var nextPreviewBtn = document.getElementById('nextPreviewBtn');

prevPreviewBtn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    showPreview(currentPreviewIndex - 1);
    showToolbar();
});

nextPreviewBtn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    showPreview(currentPreviewIndex + 1);
    showToolbar();
});

document.addEventListener('keydown', function(e) {
    if (!previewOverlay.classList.contains('active')) return;
    if (e.key === 'Escape') closePreview();
    if (e.key === 'ArrowLeft') {
        e.preventDefault();
        showPreview(currentPreviewIndex - 1);
        showToolbar();
    }
    if (e.key === 'ArrowRight') {
        e.preventDefault();
        showPreview(currentPreviewIndex + 1);
        showToolbar();
    }
});

previewOverlay.addEventListener('click', function(e) {
    if (e.target === previewOverlay) closePreview();
});

closePreviewBtn.addEventListener('click', closePreview);

// ============================================================
// 7.1 下载下拉菜单 - 强制下载 + 手机竖屏裁剪
// ============================================================
downloadBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    downloadMenu.classList.toggle('show');
});

downloadMenu.querySelectorAll('a').forEach(function(item) {
    item.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var res = this.getAttribute('data-res');
        downloadImage(currentPreviewIndex, res);
        downloadMenu.classList.remove('show');
    });
});

document.addEventListener('click', function() {
    downloadMenu.classList.remove('show');
});

function downloadImage(index, resolution) {
    if (!allData || allData.length === 0) return;
    var item = allData[index];
    if (!item) return;
    
    var url = getImageUrl(item.jpg || item.webp || '');
    var resolutions = {
        '4k': { w: 3840, h: 2160 },
        'fhd': { w: 1920, h: 1080 },
        'hd': { w: 1366, h: 768 },
        'mobile': { w: 1080, h: 1920 }
    };
    var res = resolutions[resolution] || resolutions['fhd'];
    var downloadUrl = url;
    
    // ★★★ 手机模式：请求竖屏尺寸，自动裁剪 ★★★
    if (resolution === 'mobile') {
        if (url.indexOf('th?id=') !== -1) {
            var baseUrl = url.split('&')[0];
            downloadUrl = baseUrl + '&w=1080&h=1920&crop=1';
        }
    } else {
        if (url.indexOf('th?id=') !== -1) {
            var baseUrl = url.split('&')[0];
            downloadUrl = baseUrl + '&w=' + res.w + '&h=' + res.h;
        }
    }
    
    var fileName = 'wallpaper_' + (item.date || '') + '_' + resolution + '.jpg';
    
    console.log('📥 开始下载: ' + fileName);
    console.log('📷 下载链接: ' + downloadUrl);
    
    // ★★★ 使用 fetch + Blob 强制下载 ★★★
    fetch(downloadUrl, {
        mode: 'cors',
        headers: {
            'Origin': window.location.origin
        }
    })
    .then(function(response) {
        if (!response.ok) throw new Error('网络请求失败');
        return response.blob();
    })
    .then(function(blob) {
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(function() {
            URL.revokeObjectURL(link.href);
        }, 1000);
        
        console.log('✅ 下载成功: ' + fileName);
    })
    .catch(function(err) {
        console.warn('⚠️ Fetch 下载失败，使用备用方法:', err.message);
        
        var link = document.createElement('a');
        link.href = downloadUrl + (downloadUrl.indexOf('?') === -1 ? '?' : '&') + '_t=' + Date.now();
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log('📥 使用备用方法下载: ' + fileName);
    });
}

// ============================================================
// 8. 缩放
// ============================================================
var imageContainer = previewImg;

function updateTransform() {
    previewImg.style.transform = 'translate(' + translateX + 'px, ' + translateY + 'px) scale(' + scale + ')';
}

function resetZoom() {
    scale = 1;
    translateX = 0;
    translateY = 0;
    updateTransform();
}

function startDrag(e) {
    if (scale <= 1) return;
    isDragging = true;
    var pos = e.type === 'mousedown' ? e : e.touches[0];
    startX = pos.clientX;
    startY = pos.clientY;
    lastTranslateX = translateX;
    lastTranslateY = translateY;
    imageContainer.style.cursor = 'grabbing';
}

function moveDrag(e) {
    if (!isDragging) return;
    e.preventDefault();
    var pos = e.type === 'mousemove' ? e : e.touches[0];
    translateX = lastTranslateX + pos.clientX - startX;
    translateY = lastTranslateY + pos.clientY - startY;
    updateTransform();
}

function endDrag() {
    isDragging = false;
    imageContainer.style.cursor = 'grab';
}

function wheelZoom(e) {
    e.preventDefault();
    var delta = e.deltaY > 0 ? -0.15 : 0.15;
    scale = Math.min(Math.max(scale + delta, minScale), maxScale);
    if (scale <= 1) { translateX = 0;
        translateY = 0; }
    updateTransform();
}

previewImg.addEventListener('mousedown', startDrag);
document.addEventListener('mousemove', moveDrag);
document.addEventListener('mouseup', endDrag);
previewImg.addEventListener('touchstart', startDrag, { passive: true });
document.addEventListener('touchmove', moveDrag, { passive: false });
document.addEventListener('touchend', endDrag, { passive: true });
previewImg.addEventListener('wheel', wheelZoom, { passive: false });

// ============================================================
// 9. 启动
// ============================================================
loadData();
console.log('✅ 大图预览已加载');
console.log('💡 留言按钮在导航栏（汉堡菜单）内');
console.log('💡 评论系统: Twikoo');

// 暴露 openComment 给 API 页面调用
window.openComment = openComment;

// 检测 URL 参数，自动打开留言弹窗
(function checkUrlAction() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'comment') {
        setTimeout(function() {
            if (typeof openComment === 'function') {
                openComment();
            }
            // 清除 URL 参数
            if (window.history && window.history.replaceState) {
                var cleanUrl = window.location.pathname + window.location.hash;
                window.history.replaceState({}, document.title, cleanUrl);
            }
        }, 500);
    }
})();
