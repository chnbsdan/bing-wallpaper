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
// 5. 评论系统
// ============================================================
var COMMENT_API = 'https://waline.hangdn.com';
var comments = [];
var commentPage = 1;
var commentPageSize = 10;
var commentTotal = 0;
var commentSort = 'time';
var commentOrder = 'asc';

var commentOverlay = document.getElementById('commentOverlay');
var commentList = document.getElementById('commentList');
var commentCount = document.getElementById('commentCount');
var commentNavBtn = document.getElementById('commentNavBtn');
var closeCommentBtn = document.getElementById('closeCommentBtn');
var commentText = document.getElementById('commentText');
var commentNick = document.getElementById('commentNick');
var commentEmail = document.getElementById('commentEmail');
var commentSite = document.getElementById('commentSite');
var commentSubmitBtn = document.getElementById('commentSubmitBtn');
var loadMoreBtn = document.getElementById('loadMoreBtn');
var sortByTime = document.getElementById('sortByTime');
var sortByHeat = document.getElementById('sortByHeat');

function openComment() {
    commentOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (comments.length === 0) {
        loadComments(1);
    }
    toggleNav(false);
}

function closeComment() {
    commentOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

async function loadComments(page) {
    try {
        var url = COMMENT_API + '/api/comment?page=' + page + '&pageSize=' + commentPageSize;
        if (commentSort === 'time') {
            url += '&sort=time&order=' + commentOrder;
        } else {
            url += '&sort=like&order=desc';
        }
        var res = await fetch(url);
        if (!res.ok) throw new Error('加载失败');
        var data = await res.json();
        comments = data.data || [];
        commentTotal = data.total || 0;
        commentCount.textContent = commentTotal;
        renderComments(comments);
        loadMoreBtn.style.display = (page * commentPageSize < commentTotal) ? 'block' : 'none';
        commentPage = page;
    } catch (err) {
        console.error('加载评论失败:', err);
        commentList.innerHTML = '<div class="comment-empty"><i class="fas fa-exclamation-circle"></i><p>加载评论失败，请稍后重试</p></div>';
    }
}

function renderComments(items) {
    if (!items || items.length === 0) {
        commentList.innerHTML = '<div class="comment-empty"><i class="fas fa-comment"></i><p>暂无留言，快来发表第一条吧 ✨</p></div>';
        return;
    }
    var html = '';
    items.forEach(function(item) {
        var avatar = item.avatar || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + (item.nick || 'user');
        var nick = item.nick || '匿名';
        var time = item.createdAt ? formatTime(item.createdAt) : '';
        var content = item.content || '';
        var like = item.like || 0;
        var ua = item.ua || '';
        var browser = getBrowser(ua);
        var isLiked = item.isLiked || false;

        html += '<div class="comment-item" data-id="' + (item.objectId || '') + '">';
        html += '<div class="comment-meta">';
        html += '<div class="comment-avatar"><img src="' + avatar + '" /></div>';
        html += '<span class="comment-author">' + escapeHtml(nick) + '</span>';
        html += '<span class="comment-time">' + time + '</span>';
        if (browser) html += '<span class="comment-browser">' + browser + '</span>';
        html += '</div>';
        html += '<div class="comment-content">' + escapeHtml(content) + '</div>';
        html += '<div class="comment-actions">';
        html += '<button class="like-btn' + (isLiked ? ' liked' : '') + '" onclick="toggleLike(\'' + (item.objectId || '') + '\', this)"><i class="fas fa-heart"></i> <span class="like-count">' + like + '</span></button>';
        html += '<button onclick="replyComment(\'' + (item.objectId || '') + '\', \'' + escapeHtml(nick) + '\')"><i class="fas fa-reply"></i> 回复</button>';
        html += '</div>';
        html += '</div>';
    });
    commentList.innerHTML = html;
}

function setSort(type) {
    if (commentSort === type) {
        commentOrder = commentOrder === 'asc' ? 'desc' : 'asc';
    } else {
        commentSort = type;
        commentOrder = type === 'time' ? 'asc' : 'desc';
    }
    sortByTime.className = 'sort-btn' + (commentSort === 'time' ? ' active' : '');
    sortByHeat.className = 'sort-btn' + (commentSort === 'heat' ? ' active' : '');
    loadComments(1);
}

sortByTime.addEventListener('click', function() { setSort('time'); });
sortByHeat.addEventListener('click', function() { setSort('heat'); });

loadMoreBtn.addEventListener('click', function() {
    loadComments(commentPage + 1);
});

commentSubmitBtn.addEventListener('click', async function() {
    var content = commentText.value.trim();
    if (!content) {
        alert('请输入评论内容');
        return;
    }
    var nick = commentNick.value.trim() || '匿名';
    var mail = commentEmail.value.trim() || '';
    var site = commentSite.value.trim() || '';

    commentSubmitBtn.disabled = true;
    commentSubmitBtn.textContent = '提交中...';

    try {
        var data = {
            content: content,
            nick: nick,
            mail: mail,
            url: site,
            ua: navigator.userAgent
        };
        var res = await fetch(COMMENT_API + '/api/comment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('提交失败');
        commentText.value = '';
        commentNick.value = '';
        commentEmail.value = '';
        commentSite.value = '';
        loadComments(1);
        alert('✅ 留言提交成功，审核后显示');
    } catch (err) {
        console.error('提交失败:', err);
        alert('❌ 提交失败，请稍后重试');
    }
    commentSubmitBtn.disabled = false;
    commentSubmitBtn.textContent = '提交';
});

commentText.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        commentSubmitBtn.click();
    }
});

window.toggleLike = async function(id, btn) {
    if (!id) return;
    try {
        var res = await fetch(COMMENT_API + '/api/like/' + id, {
            method: 'POST'
        });
        if (!res.ok) throw new Error('点赞失败');
        var data = await res.json();
        var countSpan = btn.querySelector('.like-count');
        var current = parseInt(countSpan.textContent) || 0;
        countSpan.textContent = data.like || current + 1;
        btn.classList.toggle('liked');
    } catch (err) {
        console.error('点赞失败:', err);
    }
};

window.replyComment = function(id, nick) {
    commentText.value = '@' + nick + ' ';
    commentText.focus();
};

function formatTime(iso) {
    var d = new Date(iso);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    var h = String(d.getHours()).padStart(2, '0');
    var min = String(d.getMinutes()).padStart(2, '0');
    return y + '-' + m + '-' + day + ' ' + h + ':' + min;
}

function getBrowser(ua) {
    if (!ua) return '';
    if (ua.indexOf('Chrome') > -1) return 'Chrome';
    if (ua.indexOf('Firefox') > -1) return 'Firefox';
    if (ua.indexOf('Safari') > -1) return 'Safari';
    if (ua.indexOf('Edge') > -1) return 'Edge';
    return '';
}

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

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

        var imgSrc = getImageUrl(item.webp || item.jpg || '');
        var fallback = getImageUrl(item.jpg || '');
        var placeholderSrc = getThumbnailUrl(imgSrc);

        card.innerHTML =
            '<div class="placeholder-bg" style="background-image: url(' + placeholderSrc + ');"></div>' +
            '<img src="' + imgSrc + '" alt="' + (item.copyright || item.date) + '" loading="lazy" />' +
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
        img.addEventListener('error', function() {
            if (fallback && fallback !== imgSrc) {
                img.src = fallback;
            } else {
                img.classList.add('loaded');
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
// 7.1 下载下拉菜单 - 强制下载
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
    
    if (url.indexOf('th?id=') !== -1) {
        var baseUrl = url.split('&')[0];
        downloadUrl = baseUrl + '&w=' + res.w + '&h=' + res.h;
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
        
        // ★★★ 备用方法 ★★★
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
console.log('💡 评论接口: ' + COMMENT_API);
