// js/render.js
var grid = document.getElementById('grid');

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

    document.getElementById('prevBtn').disabled = currentPage <= 1;
    document.getElementById('nextBtn').disabled = currentPage >= totalPages;
    document.getElementById('pageInfo').textContent = '第 ' + currentPage + ' / ' + totalPages + ' 页';
    document.getElementById('gotoInput').max = totalPages;
    document.getElementById('gotoInput').placeholder = '1-' + totalPages;
    grid.scrollTop = 0;
}

function showEmpty() {
    grid.innerHTML = '<div class="empty"><div class="icon"><i class="fas fa-image"></i></div><div>暂无壁纸数据</div></div>';
    document.getElementById('prevBtn').disabled = true;
    document.getElementById('nextBtn').disabled = true;
    document.getElementById('pageInfo').textContent = '第 0 / 0 页';
    document.getElementById('totalInfo').innerHTML = '<i class="fas fa-images"></i> 共 0 张';
    document.getElementById('totalNavCount').textContent = '0';
}