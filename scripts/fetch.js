// scripts/fetch.js - 支持强制指定日期

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// ============ 配置 ============
const PICTURE_DIR = path.join(__dirname, '../picture');
const DATA_DIR = path.join(__dirname, '../data');
const PAGES_DIR = path.join(DATA_DIR, 'pages');
const DATA_FILE = path.join(DATA_DIR, 'wallpapers.json');
const URLS_FILE = path.join(__dirname, '../urls.txt');
const COPYRIGHTS_FILE = path.join(__dirname, '../copyrights.txt');

const PAGE_SIZE = 42;

// ★★★ 强制日期（可选）：如果设置了，就用这个日期，否则用今天 ★★★
// 格式：'2026-07-31'
const FORCE_DATE = process.env.FORCE_DATE || null;

// 确保目录存在
[PICTURE_DIR, DATA_DIR, PAGES_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

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
    let now;
    if (FORCE_DATE) {
        // 使用强制日期
        const parts = FORCE_DATE.split('-').map(Number);
        now = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
        now = new Date();
    }
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

// ============ API 请求 ============

async function fetchBingWallpaper(offset) {
    const idx = -offset;
    const url = `https://cn.bing.com/HPImageArchive.aspx?format=js&n=1&idx=${idx}&mkt=zh-CN`;
    const expectedDate = getTargetDate(offset);
    
    try {
        console.log(`🌐 请求: ${url}`);
        const response = await axios.get(url, { timeout: 15000 });
        const image = response.data.images[0];
        if (!image) {
            console.log(`⚠️ 没有图片数据 (offset=${offset})`);
            return { valid: false, data: null, date: expectedDate };
        }

        const apiDate = parseApiDate(image.startdate);
        let imageUrl = `https://cn.bing.com${image.url}`;
        imageUrl = imageUrl.replace(/_\d+x\d+\.jpg/, '_UHD.jpg').split('&')[0];
        
        if (!imageUrl.includes('th?id=OHR.')) {
            console.log(`⚠️ 非标准图片链接: ${imageUrl}`);
            return { valid: false, data: null, date: expectedDate };
        }

        console.log(`📅 期望日期: ${expectedDate}, API 日期: ${apiDate}`);

        return {
            valid: true,
            data: {
                url: imageUrl,
                copyright: image.copyright || '',
                startdate: image.startdate
            },
            date: expectedDate,
            apiDate: apiDate
        };

    } catch (error) {
        console.error(`❌ 请求失败:`, error.message);
        return { valid: false, data: null, date: expectedDate };
    }
}

// ============ 下载图片 ============

async function downloadImage(url, filepath) {
    try {
        console.log(`📥 下载: ${path.basename(filepath)}`);
        const response = await axios({
            url: url,
            method: 'GET',
            responseType: 'arraybuffer',
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        fs.writeFileSync(filepath, Buffer.from(response.data));
        console.log(`✅ 保存成功: ${path.basename(filepath)}`);
        return true;
    } catch (error) {
        console.error(`❌ 下载失败:`, error.message);
        return false;
    }
}

// ============ 加载历史数据 ============

function loadHistoricalData() {
    const urls = readLines(URLS_FILE);
    const copyrights = readLines(COPYRIGHTS_FILE);
    
    if (urls.length === 0) return [];

    const pairedData = [];
    const maxLen = Math.max(urls.length, copyrights.length);
    
    for (let i = 0; i < maxLen; i++) {
        const url = urls[i] || '';
        const copyright = copyrights[i] || '';
        if (url) {
            pairedData.push({ url, copyright });
        }
    }

    const today = new Date();
    return pairedData.map((item, index) => {
        const d = new Date(today);
        d.setDate(d.getDate() - index);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${day}`;
        
        return {
            date: dateStr,
            copyright: item.copyright || '',
            jpg: item.url,
            webp: item.url
        };
    });
}

// ============ 生成分页 ============

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
        
        fs.writeFileSync(
            path.join(PAGES_DIR, `page-${i + 1}.json`),
            JSON.stringify(pageData, null, 2)
        );
    }
    
    console.log(`📄 生成 ${totalPages} 个分页文件 (每页 ${PAGE_SIZE} 条)`);
}

// ============ 主流程 ============

async function main() {
    console.log('🚀 开始处理壁纸...');
    if (FORCE_DATE) {
        console.log(`📌 强制使用日期: ${FORCE_DATE}`);
    }
    console.log(`📅 今天是: ${getTargetDate(0)}`);
    console.log(`⏰ 当前时间: ${new Date().toLocaleString('zh-CN')}`);
    console.log('');

    const offsets = [0, 1];
    const newResults = [];

    for (const offset of offsets) {
        console.log(`\n--- 抓取 offset=${offset} (idx=${-offset}) ---`);
        const { valid, data, date } = await fetchBingWallpaper(offset);
        
        if (!valid || !data) {
            console.log(`❌ offset=${offset} 无效，跳过`);
            continue;
        }

        console.log(`📋 获取到: ${date}`);
        console.log(`📷 ${data.url}`);

        // 下载图片
        const jpgPath = path.join(PICTURE_DIR, `${date}.jpg`);
        const downloaded = await downloadImage(data.url, jpgPath);
        
        if (downloaded) {
            const entry = {
                date: date,
                copyright: data.copyright || '',
                jpg: data.url,
                webp: data.url
            };
            newResults.push(entry);
            prependToFile(URLS_FILE, data.url);
            prependToFile(COPYRIGHTS_FILE, data.copyright);
            console.log(`✅ ${date} 处理成功`);
        }
        await new Promise(r => setTimeout(r, 500));
    }

    console.log(`\n📊 本次新增: ${newResults.length} 张`);

    // 加载历史数据
    const historicalData = loadHistoricalData();
    console.log(`📂 历史数据: ${historicalData.length} 条`);

    // 合并数据
    const dataMap = new Map();
    historicalData.forEach(item => {
        if (item.date) dataMap.set(item.date, item);
    });
    newResults.forEach(item => {
        if (item.date) dataMap.set(item.date, item);
    });

    const finalData = Array.from(dataMap.values())
        .sort((a, b) => b.date.localeCompare(a.date));

    console.log(`📊 合并后共 ${finalData.length} 条记录`);

    // 保存 wallpapers.json
    fs.writeFileSync(DATA_FILE, JSON.stringify(finalData, null, 2));
    console.log(`📝 wallpapers.json 已保存 (${finalData.length} 条)`);

    // 生成分页
    generatePagination(finalData);

    // 统计
    const jpgCount = fs.existsSync(PICTURE_DIR) ? fs.readdirSync(PICTURE_DIR).filter(f => f.endsWith('.jpg')).length : 0;
    
    console.log('\n📁 统计:');
    console.log(`   📷 本地 JPG: ${jpgCount} 张`);
    console.log(`   📋 wallpapers.json: ${finalData.length} 条`);
    console.log(`   📄 urls.txt: ${readLines(URLS_FILE).length} 条`);
    console.log('✅ 全部完成!');
}

// ============ 执行 ============
main().catch(error => {
    console.error('💥 程序异常:', error);
    process.exit(1);
});
