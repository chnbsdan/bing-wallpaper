// ==========================================================
// preview.js - 完整替换版本 (点击直接下载 4K 原图，去掉了烦人的分辨率弹窗)
// ==========================================================

(function() {
    'use strict';

    console.log('✅ preview.js 加载完成，已开启 4K 直接下载模式');

    // 1. 核心功能：获取当前页面上的高清图链接
    function getCurrentImageUrl() {
        let url = '';
        // 尝试从页面中获取图片地址 (根据必应每日一图的页面结构)
        const imgElement = document.querySelector('.img_cont img') || 
                           document.querySelector('.bgImg') || 
                           document.querySelector('#bgImage') ||
                           document.querySelector('img[class*="img"]');

        if (imgElement && imgElement.src) {
            url = imgElement.src;
        }
        
        // 如果找不到，尝试从背景图中提取
        if (!url) {
            const bgDiv = document.querySelector('.img_cont') || document.querySelector('.bgDiv');
            if (bgDiv) {
                const bgStyle = window.getComputedStyle(bgDiv).backgroundImage;
                if (bgStyle) {
                    // 提取 url(...) 里面的链接
                    const match = bgStyle.match(/url\(["']?([^"']*)["']?\)/);
                    if (match && match[1]) {
                        url = match[1];
                    }
                }
            }
        }

        console.log('📁 获取到原始图片链接:', url);
        return url;
    }

    // 2. 核心功能：将图片链接转换成 4K (UHD) 链接
    function convertTo4K(url) {
        if (!url) return null;
        
        let finalUrl = url;
        // 必应图片 UHD 格式转换
        if (!finalUrl.includes('_UHD.jpg')) {
            // 替换类似 _1920x1080.jpg 为 _UHD.jpg
            finalUrl = finalUrl.replace(/_\d+x\d+\.jpg/i, '_UHD.jpg');
            // 如果替换失败，强制在 .jpg 前插入 _UHD
            if (!finalUrl.includes('_UHD.jpg')) {
                finalUrl = finalUrl.replace('.jpg', '_UHD.jpg');
            }
        }
        console.log('📁 已转换为 4K 下载链接:', finalUrl);
        return finalUrl;
    }

    // 3. 触发浏览器下载
    function triggerDownload(url, filename) {
        if (!url) {
            console.error('❌ 下载失败：没有有效的链接');
            return;
        }

        // 生成文件名 (默认取 URL 末尾，或使用自定义名称)
        let fileName = filename || url.split('/').pop() || 'bing_4k_wallpaper.jpg';
        // 如果文件名没有后缀，加上 .jpg
        if (!fileName.includes('.')) {
            fileName += '.jpg';
        }

        // 方式 A: 使用 a 标签模拟点击 (最常见的触发下载方式)
        try {
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            console.log('✅ 4K 图片下载已成功触发！');
        } catch (e) {
            // 方式 B: 如果 A 因跨域 CORS 失败，改为新标签页打开 (用户右键另存)
            console.warn('⚠️ 自动下载被浏览器安全策略拦截，已为您在新标签页打开 4K 图片。');
            console.warn('👉 请在新页面右键点击图片，选择“图片另存为”即可保存 4K 原图。');
            window.open(url, '_blank');
        }
    }

    // 4. 监听并替换下载按钮的点击事件
    function setupDownloadButton() {
        // 根据你的截图，按钮的 ID 或 Class
        let downloadBtn = document.getElementById('downloadBtn') || document.querySelector('.btn-download');

        if (!downloadBtn) {
            // 如果页面还没加载完，轮询等待
            setTimeout(setupDownloadButton, 500);
            return;
        }

        console.log('✅ 找到下载按钮，正在替换为 4K 直接下载功能...');

        // 移除所有旧的监听器，使用 cloneNode 替换 (防止旧代码残留)
        downloadBtn.replaceWith(downloadBtn.cloneNode(true));
        const newBtn = document.getElementById('downloadBtn') || document.querySelector('.btn-download');

        if (newBtn) {
            // 绑定全新的点击事件
            newBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('🖱️ 下载按钮被点击');
                
                // 获取链接 -> 转 4K -> 下载
                const originalUrl = getCurrentImageUrl();
                const final4kUrl = convertTo4K(originalUrl);
                triggerDownload(final4kUrl);
            });
            console.log('✅ 下载按钮替换成功！点击将直接下载 4K 图片。');
        }
    }

    // 5. 页面加载完成后执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupDownloadButton);
    } else {
        setupDownloadButton();
    }

})();
