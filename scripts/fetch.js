// scripts/fetch.js - 完整版（修复日期问题，使用 API 真实日期）

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const sharp = require('sharp');

// ============ 配置 ============
const PICTURE_DIR = path.join(__dirname, '../picture');
const WEBP_DIR = path.join(__dirname, '../webp');
const DATA_DIR = path.join(__dirname, '../data');
const PAGES_DIR = path.join(DATA_DIR, 'pages');
const DATA_FILE = path.join(DATA_DIR, 'wallpapers.json');
const URLS_FILE = path.join(__dirname, '../urls.txt');
const COPYRIGHTS_FILE = path.join(__dirname, '../copyrights.txt');

const KEEP_DAYS = 60;
const PAGE_SIZE = 42;

// 确保目录存在
[PICTURE_DIR, WEBP_DIR, DATA_DIR, PAGES_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ============ ★★★ 缩略图生成函数 ★★★ ============
function getThumbnailUrl(url) {
    if (!url) return '';
    if (url.indexOf('th?id=') !== -1) {
        var baseUrl = url.split('&')[0];
        var thumbUrl = baseUrl.replace('_UHD.jpg', '_1920x1080.jpg');
        return thumbUrl + '&w=800&h=450';
    }
    return url;
}

// ============ 文件操作 ============

function readLines(filePath) {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#'));
}

function prependToFile(filePath, newLine) {
    const existing = readLines(filePath);
    if (existing.some(line => line === newLine)) return false;
    const allLines = [newLine, ...existing];
    fs.writeFileSync(filePath, allLines.join('\n') + '\n');
    return true;
}

// ============ 日期工具 ============

function getTargetDate(offset) {
    const now = new Date();
    now.setDate(now.getDate() + offset);
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function parseApiDate(startdate) {
    if (!startdate) return null;
    return `${startdate.slice(0,4)}-${startdate.slice(4,6)}-${startdate.slice(6,8)}`;
}

function getDateDiff(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.abs((d1 - d2) / (1000 * 60 * 60 * 24));
}

function daysDiff(dateStr) {
    const today = new Date();
    const target = new Date(dateStr);
    return Math.floor((today - target) / (1000 * 60 * 60 * 24));
}

// ============ 链接格式化 ============

function formatToUHD(url) {
    if (!url) return url;
    if (url.includes('_UHD.jpg')) return url;
    let formatted = url.replace(/_\d+x\d+\.jpg/, '_UHD.jpg');
    formatted = formatted.split('&')[0];
    return formatted;
}

// ============ ★★★ API 请求（返回真实日期）★★★ ============

async function fetchBingWallpaper(offset) {
    const idx = -offset;
    const url = `https://cn.bing.com/HPImageArchive.aspx?format=js&n=1&idx=${idx}&mkt=zh-CN`;
    const expectedDate = getTargetDate(offset);
    
    try {
        const response = await axios.get(url, { timeout: 10000 });
        const image = response.data.images[0];
        if (!image) return { valid: false, data: null, date: expectedDate };

        const apiDate = parseApiDate(image.startdate);
        let imageUrl = `https://cn.bing.com${image.url}`;
        imageUrl = formatToUHD(imageUrl);
        
        if (!imageUrl.includes('th?id=OHR.')) {
            return { valid: false, data: null, date: expectedDate };
        }

        if (apiDate) {
            const diff = getDateDiff(expectedDate, apiDate);
            if (diff > 1) {
                return { valid: false, data: null, date: expectedDate };
            }
        }

        return {
            valid: true,
            data: {
                url: imageUrl,
                copyright: image.copyright || ''
            },
            date: apiDate || expectedDate,  // ★★★ 优先使用 API 真实日期 ★★★
            apiDate: apiDate
        };

    } catch (error) {
        return { valid: false, data: null, date: expectedDate };
    }
}

// ============ 下载并保存壁纸到本地 ============

async function downloadWallpaper(wallpaper, dateStr) {
    const jpgPath = path.join(PICTURE_DIR, `${dateStr}.jpg`);
    const webpPath = path.join(WEBP_DIR, `${dateStr}.webp`);

    if (fs.existsSync(jpgPath) && fs.existsSync(webpPath)) {
        return true;
    }

    try {
        const response = await axios({
            url: wallpaper.url,
            method: 'GET',
            responseType: 'arraybuffer',
            timeout: 15000
        });
        const buffer = Buffer.from(response.data);

        await Promise.all([
            sharp(buffer).jpeg({ quality: 88, progressive: true }).toFile(jpgPath),
            sharp(buffer).webp({ quality: 82 }).toFile(webpPath)
        ]);

        return true;

    } catch (error) {
        console.error(`❌ 下载失败 ${dateStr}:`, error.message);
        return false;
    }
}

// ============ ★★★ 从 wallpapers.json 读取历史数据 ★★★ ============

function loadHistoricalData() {
    if (!fs.existsSync(DATA_FILE)) {
        console.log('📭 wallpapers.json 不存在，返回空数据');
        return [];
    }

    try {
        const content = fs.readFileSync(DATA_FILE, 'utf-8');
        const data = JSON.parse(content);
        console.log(`📂 从 wallpapers.json 读取 ${data.length} 条历史数据`);
        return data;
    } catch (e) {
        console.error('⚠️ 读取 wallpapers.json 失败:', e.message);
        return [];
    }
}

// ============ 清理过期图片 ============

function cleanOldImages() {
    if (!fs.existsSync(PICTURE_DIR)) return;
    const jpgFiles = fs.readdirSync(PICTURE_DIR).filter(f => f.endsWith('.jpg'));
    const webpFiles = fs.readdirSync(WEBP_DIR).filter(f => f.endsWith('.webp'));
    let deleted = 0;

    [...jpgFiles, ...webpFiles].forEach(file => {
        const dateStr = file.replace('.jpg', '').replace('.webp', '');
        const diff = daysDiff(dateStr);
        if (diff > KEEP_DAYS) {
            const filePath = path.join(
                file.endsWith('.jpg') ? PICTURE_DIR : WEBP_DIR,
                file
            );
            try {
                fs.unlinkSync(filePath);
                deleted++;
            } catch (e) {}
        }
    });

    if (deleted > 0) {
        console.log(`🗑️ 已删除 ${deleted} 张过期本地图片（超过 ${KEEP_DAYS} 天）`);
    }
}

// ============ 生成分页 JSON ============

function generatePagination(data) {
    const files = fs.readdirSync(PAGES_DIR);
    files.forEach(file => {
        if (file.endsWith('.json')) {
            fs.unlinkSync(path.join(PAGES_DIR, file));
        }
    });

    const totalPages = Math.ceil(data.length / PAGE_SIZE);
    
    for (let i = 0; i < totalPages; i++) {
        const start = i * PAGE_SIZE;
        const end = Math.min(start + PAGE_SIZE, data.length);
        const pageData = {
            items: data.slice(start, end),
            page: i + 1,
            pageSize: PAGE_SIZE,
            total: data.length,
            totalPages: totalPages,
            hasMore: i + 1 < totalPages
        };
        
        const fileName = `page-${i + 1}.json`;
        fs.writeFileSync(
            path.join(PAGES_DIR, fileName),
            JSON.stringify(pageData, null, 2)
        );
    }
    
    console.log(`📄 生成 ${totalPages} 个分页文件 (每页 ${PAGE_SIZE} 条)`);
}

// ============ ★★★ 主流程（使用 API 真实日期）★★★ ============

async function main() {
    console.log('🚀 开始处理壁纸...');
    console.log(`📅 今天是: ${getTargetDate(0)}`);
    console.log('');

    // ★★★ 抓取最近 6 天，确保覆盖所有可能的情况 ★★★
    const offsets = [0, 1, 2, 3, 4, 5];
    const newResults = [];

    for (const offset of offsets) {
        const result = await fetchBingWallpaper(offset);
        if (!result.valid || !result.data) continue;

        const { data, date } = result;  // ★★★ date 现在是 API 真实日期 ★★★
        const realDate = date;

        // 检查该日期是否已存在
        if (fs.existsSync(path.join(PICTURE_DIR, `${realDate}.jpg`))) {
            console.log(`⏭️ ${realDate} 已存在，跳过`);
            continue;
        }

        console.log(`📋 offset=${offset} → 真实日期: ${realDate}`);

        const downloaded = await downloadWallpaper(data, realDate);
        if (downloaded) {
            const cdnEntry = {
                date: realDate,
                copyright: data.copyright || '',
                jpg: data.url,
                webp: data.url,
                thumb: getThumbnailUrl(data.url)
            };
            newResults.push(cdnEntry);
            console.log(`✅ ${realDate}`);
            prependToFile(URLS_FILE, data.url);
            prependToFile(COPYRIGHTS_FILE, data.copyright);
        }
        await new Promise(r => setTimeout(r, 300));
    }

    // ★★★ 从 wallpapers.json 读取历史数据 ★★★
    const historicalData = loadHistoricalData();
    console.log(`📂 历史数据: ${historicalData.length} 条`);

    // ★★★ 合并数据，新数据覆盖旧数据（按日期去重）★★★
    const dataMap = new Map();
    historicalData.forEach(item => {
        if (item.date) dataMap.set(item.date, item);
    });
    newResults.forEach(item => {
        if (item.date) dataMap.set(item.date, item);
    });

    // ★★★ 从 urls.txt 恢复可能丢失的数据 ★★★
    // 如果 wallpapers.json 为空，但 urls.txt 有数据，从 urls.txt 重建
    if (dataMap.size === 0) {
        const urls = readLines(URLS_FILE);
        const copyrights = readLines(COPYRIGHTS_FILE);
        if (urls.length > 0) {
            console.log('📂 从 urls.txt 重建数据...');
            const today = new Date();
            urls.forEach((url, index) => {
                const d = new Date(today);
                d.setDate(d.getDate() - index);
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const dateStr = `${y}-${m}-${day}`;
                const copyright = copyrights[index] || '';
                // 检查是否已在 dataMap 中
                if (!dataMap.has(dateStr)) {
                    dataMap.set(dateStr, {
                        date: dateStr,
                        copyright: copyright,
                        jpg: url,
                        webp: url,
                        thumb: getThumbnailUrl(url)
                    });
                }
            });
            console.log(`📂 从 urls.txt 重建 ${dataMap.size} 条数据`);
        }
    }

    const finalData = Array.from(dataMap.values())
        .sort((a, b) => b.date.localeCompare(a.date));

    console.log(`📊 合并后共 ${finalData.length} 条记录`);

    fs.writeFileSync(DATA_FILE, JSON.stringify(finalData, null, 2));
    console.log(`📝 wallpapers.json 已保存`);

    cleanOldImages();
    generatePagination(finalData);

    const jpgCount = fs.existsSync(PICTURE_DIR) ? fs.readdirSync(PICTURE_DIR).filter(f => f.endsWith('.jpg')).length : 0;
    const webpCount = fs.existsSync(WEBP_DIR) ? fs.readdirSync(WEBP_DIR).filter(f => f.endsWith('.webp')).length : 0;
    console.log(`📁 本地图片: ${jpgCount} 张 jpg, ${webpCount} 张 webp`);
    console.log(`📁 wallpapers.json 全部使用 CDN 链接，共 ${finalData.length} 张`);
    console.log('✅ 完成!');
}

// ============ 执行 ============
main().catch(error => {
    console.error('💥 程序异常:', error);
    process.exit(1);
});
