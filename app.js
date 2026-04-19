// ==================== Supabase 云端连接配置 ====================
const SUPABASE_URL = "https://gfbujegridjhczsmgix.supabase.co";
const SUPABASE_KEY = "sb_publishable_tB0Nwu1M_9OMqXtg8x3aSA_fgE6z...";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==================== 管理员配置 ====================
const ADMIN = { account: "admin", pwd: "123456" };

function adminLogin() {
    let user = prompt("管理账号：");
    let pwd = prompt("管理密码：");
    if (user === ADMIN.account && pwd === ADMIN.pwd) {
        localStorage.setItem("admin", "ok");
        alert("登录成功！");
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
    alert("已退出");
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

// ==================== 发布功能（对接 Supabase）====================
const form = document.getElementById('publishForm');
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = document.getElementById('type').value;
        const title = document.getElementById('title').value;
        const desc = document.getElementById('desc').value;
        const contact = document.getElementById('contact').value;
        const secret = document.getElementById('secret').value;
        const file = document.getElementById('fileInput').files[0);
        const fullContent = "标题：" + title + " | 内容：" + desc;

        let oldTip = document.getElementById('tipBox');
        if (oldTip) old.remove();

        // 1. 文本审核
        const textCheck = checkText(fullContent);
        if (!textCheck.pass) {
            const box = document.createElement('div');
            box.id = "tipBox";
            box.className = "alert alert-danger text-center mt-3 p-3";
            box.innerHTML = `❌ 发布失败：${textCheck.msg}<br><button class="btn btn-warning btn-sm mt-2" onclick="showAppealForm('${fullContent}')">我要申诉</button>`;
            form.appendChild(box);
            return;
        }

        // 2. 图片处理（base64 直接存到数据库）
        let imgUrl = "";
        if (file) {
            imgUrl = await new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
        }

        // 3. 写入 Supabase 云端数据库
        const { error } = await supabase.from('items').insert([{
            type: type,
            title: title,
            description: desc,
            contact: contact,
            secret: secret,
            img_url: imgUrl,
            status: "正常"
        }]);

        if (error) {
            alert("发布失败：" + error.message);
        } else {
            alert("✅ 发布成功！数据已存到云端！");
            location.href = "list.html";
        }
    });
}

// 申诉功能
function showAppealForm(content) {
    let reason = prompt("请输入申诉理由：");
    if (!reason) return;
    supabase.from('appeals').insert([{ content: content, reason: reason }])
        .then(() => alert("申诉已提交，管理员会处理"));
}

// ==================== 前台列表渲染 ====================
async function renderList() {
    const dom = document.getElementById('list');
    if (!dom) return;
    const { data, error } = await supabase.from('items').select('*').order('created_at', { ascending: false });
    if (error) { dom.innerHTML = "加载失败：" + error.message; return; }
    if (data.length === 0) { dom.innerHTML = '<div class="alert alert-info">暂无信息</div>'; return; }

    let html = "";
    data.forEach(i => {
        html += `
        <div class="card mb-3 shadow-sm">
            ${i.img_url ? `<img src="${i.img_url}" style="height:180px;object-fit:cover" class="card-img-top">` : ""}
            <div class="card-body">
                <h6><a href="detail.html?id=${i.id}">${i.type == "lost" ? "[寻物]" : "[招领]"} ${i.title}</a></h6>
                <p class="small text-muted">${i.description}</p>
                <p class="small">状态：<span class="text-${i.status == "已找回" ? "success" : "danger"}">${i.status}</span></p>
            </div>
        </div>`;
    });
    dom.innerHTML = html;
}

// ==================== 后台渲染（关键！对接 Supabase）====================
async function renderAdminList() {
    const dom = document.getElementById('adminList');
    const appealDom = document.getElementById('appealList');
    if (!dom || !appealDom) return;

    // 1. 加载物品列表
    const { data: items, error: itemErr } = await supabase.from('items').select('*').order('created_at', { ascending: false });
    if (itemErr) { dom.innerHTML = "加载失败：" + itemErr.message; return; }

    let html = "";
    items.forEach(i => {
        html += `
        <div class="card mb-3 shadow-sm">
            ${i.img_url ? `<img src="${i.img_url}" style="height:180px;object-fit:cover" class="card-img-top">` : ""}
            <div class="card-body">
                <h6>${i.type == "lost" ? "[寻物]" : "[招领]"} ${i.title}</h6>
                <p class="small text-muted">${i.description}</p>
                <p class="small">状态：${i.status}</p>
                <button class="btn btn-sm btn-warning" onclick="changeStatus(${i.id})">修改状态</button>
                <button class="btn btn-sm btn-danger ms-1" onclick="deleteItem(${i.id})">删除</button>
            </div>
        </div>`;
    });
    dom.innerHTML = html || '<div class="alert alert-info">暂无物品</div>';

    // 2. 加载申诉
    const { data: appeals, error: appealErr } = await supabase.from('appeals').select('*').order('created_at', { ascending: false });
    if (appealErr) { appealDom.innerHTML = "申诉加载失败：" + appealErr.message; return; }
    let appealHtml = "";
    appeals.forEach(i => {
        appealHtml += `
        <div class="card mb-2">
            <div class="card-body p-3">
                <p><strong>申诉内容：</strong>${i.content}</p>
                <p><strong>理由：</strong>${i.reason}</p>
                <button class="btn btn-sm btn-danger" onclick="deleteAppeal(${i.id})">已处理</button>
            </div>
        </div>`;
    });
    appealDom.innerHTML = appealHtml || '<div class="alert alert-info">暂无申诉</div>';

    // 3. 更新统计
    const total = items.length;
    const done = items.filter(x => x.status === "已找回").length;
    document.getElementById('totalCount').innerText = total;
    document.getElementById('doneCount').innerText = done;
    document.getElementById('ingCount').innerText = total - done;
}

// 后台操作
async function changeStatus(id) {
    const newStatus = prompt("输入新状态（正常/已找回）：");
    if (!newStatus) return;
    await supabase.from('items').update({ status: newStatus }).eq('id', id);
    renderAdminList();
}

async function deleteItem(id) {
    if (!confirm("确定删除？")) return;
    await supabase.from('items').delete().eq('id', id);
    renderAdminList();
}

async function deleteAppeal(id) {
    await supabase.from('appeals').delete().eq('id', id);
    renderAdminList();
}

// 详情页
async function renderDetail() {
    const dom = document.getElementById('detail');
    if (!dom) return;
    const id = new URLSearchParams(location.search).get('id');
    const { data, error } = await supabase.from('items').select('*').eq('id', id).single();
    if (error) { dom.innerHTML = "加载失败：" + error.message; return; }
    dom.innerHTML = `
    <div class="card">
        <div class="card-body">
            ${data.img_url ? `<img src="${data.img_url}" class="w-100 rounded mb-3">` : ""}
            <p><strong>物品：</strong>${data.title}</p>
            <p><strong>描述：</strong>${data.description}</p>
            <p><strong>联系：</strong>${data.contact}</p>
            <p><strong>状态：</strong>${data.status}</p>
            <input type="password" id="key" class="form-control my-2" placeholder="删除密钥">
            <button class="btn btn-danger w-100" onclick="del(${data.id})">删除</button>
        </div>
    </div>`;
}

async function del(id) {
    const { data } = await supabase.from('items').select('secret').eq('id', id).single();
    if (document.getElementById('key').value !== data.secret) { alert("密钥错误"); return; }
    await supabase.from('items').delete().eq('id', id);
    alert("删除成功");
    location.href = "list.html";
}

// 页面初始化
window.addEventListener('load', () => {
    if (location.pathname.includes('list.html')) renderList();
    if (location.pathname.includes('detail.html')) renderDetail();
    if (location.pathname.includes('admin.html')) {
        if (!isAdmin()) {
            alert("请先登录");
            location.href = "index.html";
        } else {
            renderAdminList();
        }
    }
});
