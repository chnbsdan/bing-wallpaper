// js/preview.js - 完整修复版
console.log('✅ preview.js 加载中...');

// 依赖检查
if (typeof getImageUrl === 'undefined') {
    console.error('❌ getImageUrl 未定义，请确保 config.js 已加载');
}

var overlay = document.getElementById('overlay');
var imageContainer = document.getElementById('imageContainer');
var previewImg = document.getElementById('previewImg');
var previewTitle = document.getElementById('previewTitle');
var previewDate = document.getElementById('previewDate');
var detailLink = document.getElementById('detailLink');

// 分辨率面板
var resolutionPanel = document.getElementById('resolutionPanel');
var resolutionOverlay = document.getElementById('resolutionOverlay');
var currentDownloadUrl = '';

console.log('resolutionPanel:', resolutionPanel);
console.log('resolutionOverlay:', resolutionOverlay);

var scale = 1, minScale = 0.3, maxScale = 5,
    translateX = 0, translateY = 0,
    isDragging = false, startX = 0, startY = 0,
    lastTranslateX = 0, lastTranslateY = 0;

function openPreview(index) {
    if (!allData || allData.length === 0) return;
    if (index < 0) index = 0;
    if (index >= allData.length) index = allData.length - 1;
    currentPreviewIndex = index;
    currentPreviewItem = allData[currentPreviewIndex];
    resetZoom();
    showPreview(currentPreviewIndex);
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function showPreview(index) {
    if (allData.length === 0) return;
    if (index < 0) index = allData.length - 1;
    if (index >= allData.length) index = 0;
    currentPreviewIndex = index;
    currentPreviewItem = allData[currentPreviewIndex];
    var imgSrc = getImageUrl(currentPreviewItem.jpg || currentPreviewItem.webp || '');
    previewImg.src = imgSrc;
    previewTitle.textContent = currentPreviewItem.copyright || '';
    previewDate.textContent = currentPreviewItem.date || '';
    detailLink.href = imgSrc;
    resetZoom();
}

function closePreview() {
    overlay.classList.remove('active');
    document.body.style.overflow = 'auto';
    closeDetailPanel();
    if (resolutionPanel) resolutionPanel.classList.remove('active');
    if (resolutionOverlay) resolutionOverlay.classList.remove('active');
}

function updateTransform() {
    previewImg.style.transform = 'translate(' + translateX + 'px, ' + translateY + 'px) scale(' + scale + ')';
}

function resetZoom() {
    scale = 1;
    translateX = 0;
    translateY = 0;
    updateTransform();
}

function bindPreviewEvents() {
    imageContainer.addEventListener('mousedown', function(e) {
        if (scale <= 1) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        lastTranslateX = translateX;
        lastTranslateY = translateY;
        imageContainer.style.cursor = 'grabbing';
    });
    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        translateX = lastTranslateX + e.clientX - startX;
        translateY = lastTranslateY + e.clientY - startY;
        updateTransform();
    });
    document.addEventListener('mouseup', function() {
        isDragging = false;
        imageContainer.style.cursor = 'grab';
    });
    imageContainer.addEventListener('wheel', function(e) {
        e.preventDefault();
        var delta = e.deltaY > 0 ? -0.15 : 0.15;
        scale = Math.min(Math.max(scale + delta, minScale), maxScale);
        if (scale <= 1) { translateX = 0; translateY = 0; }
        updateTransform();
    }, { passive: false });
}

// ===== 详情面板 =====
function openDetailPanel() {
    if (!currentPreviewItem) return;
    document.getElementById('detailDate').textContent = currentPreviewItem.date || '-';
    document.getElementById('detailTitle').textContent = currentPreviewItem.copyright || currentPreviewItem.title || '-';
    document.getElementById('detailCopyright').textContent = currentPreviewItem.copyright || '-';
    document.getElementById('detailLocale').textContent = currentPreviewItem.locale || 'zh-CN';
    document.getElementById('detailResolution').textContent = '1920 x 1080';
    document.getElementById('detailPanel').classList.add('open');
    document.getElementById('detailOverlay').classList.add('active');
}

function closeDetailPanel() {
    document.getElementById('detailPanel').classList.remove('open');
    document.getElementById('detailOverlay').classList.remove('active');
}

// ===== ★★★ 分辨率下载（调试版） ★★★ =====
var downloadBtn = document.getElementById('downloadBtn');
console.log('downloadBtn:', downloadBtn);

if (downloadBtn) {
    downloadBtn.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('✅ 下载按钮被点击');
        
        if (!currentPreviewItem) {
            console.warn('⚠️ currentPreviewItem 为空，请先打开一张图片');
            return;
        }
        
        var url = getImageUrl(currentPreviewItem.jpg || currentPreviewItem.webp || '');
        console.log('📷 图片URL:', url);
        
        if (!url) {
            console.warn('⚠️ 没有图片链接');
            return;
        }
        
        currentDownloadUrl = url;
        console.log('📦 设置 currentDownloadUrl:', currentDownloadUrl);
        
        if (resolutionPanel) {
            resolutionPanel.classList.add('active');
            console.log('✅ 分辨率面板已打开');
        } else {
            console.error('❌ resolutionPanel 不存在');
        }
        
        if (resolutionOverlay) {
            resolutionOverlay.classList.add('active');
        }
    });
} else {
    console.error('❌ downloadBtn 不存在，请检查 HTML 中是否有 id="downloadBtn" 的元素');
}

// ===== 关闭分辨率面板 =====
var resolutionClose = document.getElementById('resolutionClose');
if (resolutionClose) {
    resolutionClose.addEventListener('click', function() {
        resolutionPanel.classList.remove('active');
        resolutionOverlay.classList.remove('active');
    });
}

if (resolutionOverlay) {
    resolutionOverlay.addEventListener('click', function() {
        resolutionPanel.classList.remove('active');
        resolutionOverlay.classList.remove('active');
    });
}

// ===== 分辨率按钮点击下载 =====
document.querySelectorAll('.resolution-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        var width = this.getAttribute('data-width');
        var height = this.getAttribute('data-height');
        console.log('📥 下载分辨率:', width + 'x' + height);
        downloadWithResolution(currentDownloadUrl, width, height);
        resolutionPanel.classList.remove('active');
        resolutionOverlay.classList.remove('active');
    });
});

function downloadWithResolution(url, width, height) {
    if (!url) {
        console.warn('⚠️ URL 为空');
        return;
    }
    var downloadUrl = url;
    if (url.indexOf('th?id=') !== -1) {
        var baseUrl = url.split('&')[0];
        downloadUrl = baseUrl + '&w=' + width + '&h=' + height;
    }
    console.log('🔗 下载链接:', downloadUrl);
    var a = document.createElement('a');
    a.href = downloadUrl;
    a.download = 'wallpaper_' + width + 'x' + height + '.jpg';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// ===== 事件绑定 =====
document.getElementById('closeBtn').addEventListener('click', closePreview);
document.getElementById('prevPreviewBtn').addEventListener('click', function(e) {
    e.stopPropagation();
    showPreview(currentPreviewIndex - 1);
});
document.getElementById('nextPreviewBtn').addEventListener('click', function(e) {
    e.stopPropagation();
    showPreview(currentPreviewIndex + 1);
});
document.getElementById('detailBtn').addEventListener('click', openDetailPanel);
document.getElementById('detailPanelClose').addEventListener('click', closeDetailPanel);
document.getElementById('detailOverlay').addEventListener('click', closeDetailPanel);

overlay.addEventListener('click', function(e) {
    if (e.target === overlay) closePreview();
});

document.addEventListener('keydown', function(e) {
    if (!overlay.classList.contains('active')) return;
    if (e.key === 'Escape') closePreview();
    if (e.key === 'ArrowLeft') showPreview(currentPreviewIndex - 1);
    if (e.key === 'ArrowRight') showPreview(currentPreviewIndex + 1);
    if (e.key === 'Escape' && document.getElementById('detailPanel').classList.contains('open')) {
        closeDetailPanel();
    }
});

bindPreviewEvents();

console.log('✅ preview.js 加载完成');
