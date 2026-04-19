// ==================== 管理员配置 ====================
const ADMIN = { account: "admin", pwd: "123456" };

function adminLogin() {
    let user = prompt("管理账号：");
    let pwd = prompt("管理密码：");
    if (user === ADMIN.account && pwd === ADMIN.pwd) {
        localStorage.setItem("admin", "ok");
        alert("登录成功！正在进入后台...");
        location.href = "admin.html";
    } else {
        alert("账号密码错误");
    }
}

function isAdmin() {
    return localStorage.getItem("admin") === "ok";
}

function logoutAdmin() {
    localStorage.removeItem("admin");
    alert("已退出后台，即将返回首页");
    location.href = "index.html";
}

// 后台权限校验
if (location.pathname.includes("admin.html") && !isAdmin()) {
    alert("请先登录！");
    location.href = "index.html";
}

// ==================== 🧠 违禁词库 ====================
const badWords = [
    "操", "草", "艹", "妈的", "他妈", "傻逼", "sb", "煞笔", "废物", "滚", "去死",
    "色情", "黄", "赌博", "代考", "办证", "刷单", "贷款", "裸聊", "约炮", "嫖娼",
    "诈骗", "杀猪盘", "洗钱", "吸毒", "暴力", "自杀", "自残", "cnm", "tmd", "nmsl",
    "二维码", "微信", "qq", "群", "加", "推广", "营销", "广告", "网址", "www"
];

function checkText(content) {
    if (!content) return { pass: true };
    let lower = content.toLowerCase();
    for (let w of badWords) {
        if (lower.includes(w)) {
            return { pass: false, msg: "包含违规内容：" + w };
        }
    }
    return { pass: true };
}

// ==================== 🧠 图片审核 ====================
async function checkImage(file) {
    if (!file) return { pass: true };

    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        img.onload = function () {
            const w = 40, h = 40;
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(img, 0, 0, w, h);
            const id = ctx.getImageData(0, 0, w, h);
            const data = id.data;

            let skin = 0, dark = 0, red = 0;
            let total = w * h;
            let rSum = 0, gSum = 0, bSum = 0;
            let diffSum = 0;
            let lastR = 0, lastG = 0, lastB = 0;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i+1];
                const b = data[i+2];
                const a = data[i+3];
                if (a < 10) continue;

                const isSkin =
                    r > 90 && g > 40 && b > 20 &&
                    Math.max(r,g,b) - Math.min(r,g,b) > 15 &&
                    Math.abs(r-g) > 15 && r > g && r > b;
                if (isSkin) skin++;

                if ((r+g+b)/3 < 30) dark++;
                if (r > 160 && g < 100 && b < 100) red++;

                rSum += r; gSum += g; bSum += b;
                if (i > 0) {
                    diffSum += Math.abs(r - lastR) + Math.abs(g - lastG) + Math.abs(b - lastB);
                }
                lastR = r; lastG = g; lastB = b;
            }

            const skinRate = skin / total;
            const darkRate = dark / total;
            const redRate = red / total;
            const avgDiff = diffSum / total;
            const maxColor = Math.max(rSum/total, gSum/total, bSum/total);
            const minColor = Math.min(rSum/total, gSum/total, bSum/total);

            if (skinRate > 0.35) return resolve({ pass: false, msg: "图片涉嫌色情/裸露" });
            if (darkRate > 0.4 || redRate > 0.15) return resolve({ pass: false, msg: "图片涉嫌暴力/血腥" });
            if (maxColor - minColor < 15) return resolve({ pass: false, msg: "禁止纯色/无意义图片" });
            if (avgDiff < 8) return resolve({ pass: false, msg: "禁止二维码/广告/模糊图片" });

            resolve({ pass: true });
        };
        img.onerror = () => resolve({ pass: true });
        img.src = URL.createObjectURL(file);
    });
}

// ==================== 🧠 AI 功能 ====================
function aiDetectImage() {
    const file = document.getElementById('fileInput').files[0];
    if (!file) { alert("请先选择图片"); return; }
    alert("AI 正在识别物品...");
    setTimeout(() => {
        let name = "物品";
        const fname = file.name.toLowerCase();
        if (fname.includes("钥匙")) name = "钥匙";
        if (fname.includes("书")) name = "书籍";
        if (fname.includes("手机")) name = "手机";
        if (fname.includes("钱包") || fname.includes("钱")) name = "钱包";
        if (fname.includes("卡")) name = "校园卡";
        document.getElementById('title').value = name;
        alert("AI 识别完成：" + name);
    }, 700);
}

function aiGenerateDesc() {
    const title = document.getElementById('title').value.trim();
    if (!title) { alert("请输入物品名称"); return; }
    const list = [
        "本人不慎遗失" + title + "，如有捡到请联系，万分感谢！",
        "在校园内丢失" + title + "，望拾获者与我联系，必有重谢！",
        "捡到" + title + "一个，请失主尽快联系取回。",
        "寻找丢失的" + title + "，非常着急，感谢大家帮忙！"
    ];
    document.getElementById('desc').value = list[Math.floor(Math.random()*list.length)];
}

function aiRecommend() {
    const list = JSON.parse(localStorage.getItem('lostList')) || [];
    if (list.length < 1) return "";
    const top3 = [...list].sort(() => 0.5-Math.random()).slice(0, 3);
    let html = `<div class="card mt-3 border-info"><div class="card-body"><h6>🧠 AI 推荐相似物品</h6><div class="small">`;
    top3.forEach(i => { html += `<div>• ${i.title}</div>`; });
    return html + "</div></div></div>";
}

// ==================== ⚖️ 申诉系统 ====================
function submitAppeal(content, reason) {
    let appeals = JSON.parse(localStorage.getItem('appeals')) || [];
    appeals.push({
        id: Date.now(),
        content: content,
        reason: reason,
        time: new Date().toLocaleString()
    });
    localStorage.setItem('appeals', JSON.stringify(appeals));
    alert("✅ 申诉提交成功！管理员会尽快处理");
}

function showAppeals() {
    const list = JSON.parse(localStorage.getItem('appeals')) || [];
    const dom = document.getElementById('appealList');
    if (!dom) return;
    if (list.length === 0) {
        dom.innerHTML = '<div class="alert alert-info">暂无申诉</div>';
        return;
    }
    let html = "";
    list.forEach(i => {
        html += `
        <div class="card mb-2">
            <div class="card-body p-3">
                <p class="mb-1"><strong>申诉内容：</strong>${i.content}</p>
                <p class="mb-1"><strong>申诉理由：</strong>${i.reason}</p>
                <p class="small text-muted">${i.time}</p>
                <button class="btn btn-sm btn-danger" onclick="delAppeal(${i.id})">已处理</button>
            </div>
        </div>`;
    });
    dom.innerHTML = html;
}

function delAppeal(aid) {
    let list = JSON.parse(localStorage.getItem('appeals')) || [];
    list = list.filter(x => x.id !== aid);
    localStorage.setItem('appeals', JSON.stringify(list));
    showAppeals();
}

// ==================== 发布（失败 → 显示申诉按钮）====================
const form = document.getElementById('publishForm');
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('title').value;
        const desc = document.getElementById('desc').value;
        const file = document.getElementById('fileInput').files[0];
        const fullContent = "标题：" + title + " | 内容：" + desc;

        // 清除旧提示
        let old = document.getElementById('tipBox');
        if (old) old.remove();

        // 文本审核
        const textCheck = checkText(fullContent);
        if (!textCheck.pass) {
            const box = document.createElement('div');
            box.id = "tipBox";
            box.className = "alert alert-danger text-center mt-3 p-3";
            box.innerHTML = `
                ❌ 发布失败：${textCheck.msg}<br>
                <button class="btn btn-warning btn-sm mt-2" onclick="showAppealForm('${fullContent}')">我要申诉</button>
            `;
            form.appendChild(box);
            return;
        }

        // 图片审核
        const imgCheck = await checkImage(file);
        if (!imgCheck.pass) {
            const box = document.createElement('div');
            box.id = "tipBox";
            box.className = "alert alert-danger text-center mt-3 p-3";
            box.innerHTML = `
                ❌ 发布失败：${imgCheck.msg}<br>
                <button class="btn btn-warning btn-sm mt-2" onclick="showAppealForm('${fullContent}')">我要申诉</button>
            `;
            form.appendChild(box);
            return;
        }

        // 发布
        const reader = new FileReader();
        reader.onload = function () {
            const item = {
                id: Date.now(),
                type: document.getElementById('type').value,
                title: title, desc: desc,
                contact: document.getElementById('contact').value,
                secret: document.getElementById('secret').value,
                img: reader.result || "",
                time: new Date().toLocaleString(),
                status: "正常"
            };
            let list = JSON.parse(localStorage.getItem('lostList')) || [];
            list.unshift(item);
            localStorage.setItem('lostList', JSON.stringify(list));
            alert("发布成功！");
            location.href = "list.html";
        };
        if (file) reader.readAsDataURL(file);
        else {
            const item = {
                id: Date.now(), type: document.getElementById('type').value, title, desc,
                contact: document.getElementById('contact').value, secret: document.getElementById('secret').value,
                img: "", time: new Date().toLocaleString(), status: "正常"
            };
            let list = JSON.parse(localStorage.getItem('lostList')) || [];
            list.unshift(item);
            localStorage.setItem('lostList', JSON.stringify(list));
            alert("发布成功！");
            location.href = "list.html";
        }
    });
}

// 弹出申诉输入框
function showAppealForm(content) {
    let reason = prompt("请输入申诉理由（如：误判、内容正常）");
    if (!reason) return;
    submitAppeal(content, reason);
}

// ==================== 列表渲染 ====================
function showList(dom, list, adminMode = false) {
    if (!dom) return;
    if (list.length === 0) { dom.innerHTML = '<div class="alert alert-info">暂无信息</div>'; return; }
    let html = "";
    list.forEach(i => {
        html += `
        <div class="card mb-3 shadow-sm">
            ${i.img ? `<img src="${i.img}" style="height:180px;object-fit:cover" class="card-img-top">` : ""}
            <div class="card-body">
                <h6><a href="detail.html?id=${i.id}">${i.type=="lost"?"[寻物]":"[捡到]"} ${i.title}</a></h6>
                <p class="small text-muted">${i.desc}</p>
                <p class="small">状态：<span class="text-${i.status=='已找回'?'success':'danger'}">${i.status}</span></p>
                ${adminMode ? `
                <button class="btn btn-sm btn-warning" onclick="changeStatus(${i.id})">状态</button>
                <button class="btn btn-sm btn-danger ms-1" onclick="forceDel(${i.id})">删除</button>
                ` : ""}
            </div>
        </div>`;
    });
    dom.innerHTML = html;
}

function renderList() {
    const dom = document.getElementById('list');
    const list = JSON.parse(localStorage.getItem('lostList')) || [];
    showList(dom, list);
}

// 强制渲染后台数据
function renderAdminList() {
    const dom = document.getElementById('adminList');
    const list = JSON.parse(localStorage.getItem('lostList')) || [];
    
    // 强制渲染物品列表
    if (dom) {
        showList(dom, list, true);
    }

    // 更新统计数据
    const total = list.length;
    const done = list.filter(x => x.status == "已找回").length;

    const totalEl = document.getElementById('totalCount');
    const doneEl = document.getElementById('doneCount');
    const ingEl = document.getElementById('ingCount');

    if (totalEl) totalEl.innerText = total;
    if (doneEl) doneEl.innerText = done;
    if (ingEl) ingEl.innerText = total - done;

    // 渲染申诉列表
    showAppeals();
}

function changeStatus(id) {
    let list = JSON.parse(localStorage.getItem('lostList')) || [];
    const item = list.find(x => x.id === id);
    if (item) item.status = item.status === "正常" ? "已找回" : "正常";
    localStorage.setItem('lostList', JSON.stringify(list));
    renderAdminList(); renderList();
}

function forceDel(id) {
    if (!confirm("确定删除？")) return;
    let list = JSON.parse(localStorage.getItem('lostList')) || [];
    list = list.filter(x => x.id !== id);
    localStorage.setItem('lostList', JSON.stringify(list));
    renderAdminList(); renderList();
}

function searchList() {
    const key = document.getElementById('searchInput').value.toLowerCase();
    const list = JSON.parse(localStorage.getItem('lostList')) || [];
    const f = list.filter(x => x.title.toLowerCase().includes(key) || x.desc.toLowerCase().includes(key));
    showList(document.getElementById('list'), f);
}

function myList() {
    const c = document.getElementById('myContact').value.trim();
    const list = JSON.parse(localStorage.getItem('lostList')) || [];
    const my = list.filter(x => x.contact.trim() === c);
    showList(document.getElementById('myList'), my);
}

// ==================== 详情 ====================
function renderDetail() {
    const dom = document.getElementById('detail');
    const id = new URLSearchParams(location.search).get('id');
    const list = JSON.parse(localStorage.getItem('lostList')) || [];
    const item = list.find(x => x.id == id);
    if (!item) { dom.innerHTML = '<div class="alert alert-danger">不存在</div>'; return; }
    dom.innerHTML = `
    <div class="card">
        <div class="card-body">
            ${item.img ? `<img src="${item.img}" class="w-100 rounded mb-3">` : ""}
            <p><strong>物品：</strong>${item.title}</p>
            <p><strong>描述：</strong>${item.desc}</p>
            <p><strong>联系：</strong>${item.contact}</p>
            <p><strong>状态：</strong>${item.status}</p>
            <input type="password" id="key" class="form-control my-2" placeholder="删除密钥">
            <button class="btn btn-danger w-100" onclick="del(${item.id})">删除</button>
            ${aiRecommend()}
        </div>
    </div>`;
}

function del(id) {
    const list = JSON.parse(localStorage.getItem('lostList')) || [];
    const item = list.find(x => x.id == id);
    if (document.getElementById('key').value !== item.secret) { alert("密钥错误"); return; }
    if (!confirm("确定删除？")) return;
    const newList = list.filter(x => x.id != id);
    localStorage.setItem('lostList', JSON.stringify(newList));
    alert("删除成功");
    location.href = "list.html";
}

// 页面加载时强制渲染
window.onload = function() {
    renderList();
    renderDetail();
    renderAdminList();
}
