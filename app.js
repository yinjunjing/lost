// ==================== Supabase 云端配置（已填好） ====================
const SUPABASE_URL = "https://gfbujegridjhczsmgix.supabase.co";
const SUPABASE_KEY = "sb_publishable_tB0Nwu1M_9OMqXtg8x3aSAfgE6zXsA5yN3kD";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==================== 管理员账号密码 ====================
const ADMIN = { account: "admin", pwd: "123456" };

// 管理员登录
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

// 验证管理员权限
function isAdmin() {
    return localStorage.getItem("admin") === "ok";
}

// 管理员退出
function logoutAdmin() {
    localStorage.removeItem("admin");
    alert("已退出登录");
    location.href = "index.html";
}

// ==================== 违禁词过滤（保留原有功能） ====================
const badWords = [
    "操","草","艹","妈的","他妈","傻逼","sb","煞笔","废物","滚","去死",
    "色情","黄","赌博","代考","办证","刷单","贷款","裸聊","约炮","嫖娼",
    "诈骗","杀猪盘","洗钱","吸毒","暴力","自杀","自残","cnm","tmd","nmsl",
    "二维码","微信","qq","群","加","推广","营销","广告","网址","www"
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

// ==================== 发布物品（核心：存到云端） ====================
const form = document.getElementById('publishForm');
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        // 获取表单数据
        const type = document.getElementById('type').value;
        const title = document.getElementById('title').value;
        const desc = document.getElementById('desc').value;
        const contact = document.getElementById('contact').value;
        const secret = document.getElementById('secret').value;
        const file = document.getElementById('fileInput').files[0];
        const fullContent = "标题：" + title + " | 内容：" + desc;

        // 清除旧提示
        let oldTip = document.getElementById('tipBox');
        if (oldTip) oldTip.remove();

        // 违禁词校验
        const textCheck = checkText(fullContent);
        if (!textCheck.pass) {
            const tipBox = document.createElement('div');
            tipBox.id = "tipBox";
            tipBox.className = "alert alert-danger text-center mt-3 p-3";
            tipBox.innerHTML = `❌ 发布失败：${textCheck.msg}<br><button class="btn btn-warning btn-sm mt-2" onclick="showAppealForm('${fullContent}')">我要申诉</button>`;
            form.appendChild(tipBox);
            return;
        }

        // 处理图片（转base64）
        let imgUrl = "";
        if (file) {
            imgUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
        }

        // 核心：把数据插入到 Supabase 云端表
        const { error } = await supabase.from('items').insert([{
            type,          // 寻物/招领
            title,         // 物品名称
            description: desc, // 详细描述
            contact,       // 联系方式
            secret,        // 删除密钥
            img_url: imgUrl, // 图片链接
            status: "正常"  // 物品状态
        }]);

        // 发布结果提示
        if (error) {
            alert("发布失败：" + error.message);
        } else {
            alert("✅ 发布成功！数据已同步到云端");
            location.href = "list.html";
        }
    });
}

// ==================== 申诉功能（存到云端） ====================
function showAppealForm(content) {
    let reason = prompt("请输入申诉理由：");
    if (!reason) return;
    // 申诉数据存到云端 appeals 表
    supabase.from('appeals').insert([{
        content,  // 申诉内容
        reason    // 申诉理由
    }]).then(() => {
        alert("申诉已提交，管理员会处理");
    });
}

// ==================== 列表页渲染（从云端读取） ====================
async function renderList() {
    const listDom = document.getElementById('list');
    if (!listDom) return;

    // 从云端读取所有物品，按发布时间倒序
    const { data: items, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        listDom.innerHTML = `<div class="alert alert-danger">加载失败：${error.message}</div>`;
        return;
    }

    if (items.length === 0) {
        listDom.innerHTML = '<div class="alert alert-info">暂无发布的物品</div>';
        return;
    }

    // 渲染列表
    let html = "";
    items.forEach(item => {
        html += `
        <div class="card mb-3 shadow-sm">
            ${item.img_url ? `<img src="${item.img_url}" class="card-img-top" style="height:180px;object-fit:cover">` : ""}
            <div class="card-body">
                <h6><a href="detail.html?id=${item.id}" class="text-dark">${item.type=="lost"?"[寻物]":"[招领]"} ${item.title}</a></h6>
                <p class="text-muted small">${item.description}</p>
                <p class="small">状态：<span class="${item.status=='已找回'?'text-success':'text-danger'}">${item.status}</span></p>
            </div>
        </div>`;
    });
    listDom.innerHTML = html;
}

// ==================== 管理后台渲染（核心：读云端数据） ====================
async function renderAdminList() {
    // 校验管理员权限
    if (!isAdmin()) {
        alert("请先登录管理员账号");
        location.href = "index.html";
        return;
    }

    // 1. 读取云端物品数据
    const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false });

    // 2. 读取云端申诉数据
    const { data: appeals, error: appealsError } = await supabase
        .from('appeals')
        .select('*')
        .order('created_at', { ascending: false });

    // 渲染物品列表
    const adminListDom = document.getElementById('adminList');
    if (itemsError) {
        adminListDom.innerHTML = `<div class="alert alert-danger">加载失败：${itemsError.message}</div>`;
    } else if (items.length === 0) {
        adminListDom.innerHTML = '<div class="alert alert-info">暂无物品数据</div>';
    } else {
        let html = "";
        items.forEach(item => {
            html += `
            <div class="card mb-3">
                ${item.img_url ? `<img src="${item.img_url}" style="height:160px;object-fit:cover">` : ""}
                <div class="card-body p-3">
                    <h6>${item.type=="lost"?"[寻物]":"[招领]"} ${item.title}</h6>
                    <p class="small">${item.description}</p>
                    <p class="small">状态：${item.status}</p>
                    <button class="btn btn-sm btn-warning" onclick="updateStatus(${item.id})">修改状态</button>
                    <button class="btn btn-sm btn-danger ms-1" onclick="deleteItem(${item.id})">删除物品</button>
                </div>
            </div>`;
        });
        adminListDom.innerHTML = html;
    }

    // 渲染申诉列表
    const appealListDom = document.getElementById('appealList');
    if (appealsError) {
        appealListDom.innerHTML = `<div class="alert alert-danger">加载失败：${appealsError.message}</div>`;
    } else if (appeals.length === 0) {
        appealListDom.innerHTML = '<div class="alert alert-info">暂无申诉数据</div>';
    } else {
        let html = "";
        appeals.forEach(appeal => {
            html += `
            <div class="card mb-2">
                <div class="card-body p-2">
                    <p>内容：${appeal.content}</p>
                    <p>理由：${appeal.reason}</p>
                    <button class="btn btn-sm btn-danger" onclick="deleteAppeal(${appeal.id})">标记已处理</button>
                </div>
            </div>`;
        });
        appealListDom.innerHTML = html;
    }

    // 更新后台统计数据
    const total = items.length;
    const done = items.filter(item => item.status === "已找回").length;
    const ing = total - done;

    if (document.getElementById('totalCount')) document.getElementById('totalCount').innerText = total;
    if (document.getElementById('doneCount')) document.getElementById('doneCount').innerText = done;
    if (document.getElementById('ingCount')) document.getElementById('ingCount').innerText = ing;
}

// ==================== 后台操作：修改物品状态 ====================
async function updateStatus(id) {
    let newStatus = prompt("请输入新状态（正常/已找回）：");
    if (!newStatus || (newStatus !== "正常" && newStatus !== "已找回")) {
        alert("状态只能是「正常」或「已找回」");
        return;
    }

    const { error } = await supabase
        .from('items')
        .update({ status: newStatus })
        .eq('id', id);

    if (error) {
        alert("修改失败：" + error.message);
    } else {
        alert("状态修改成功！");
        renderAdminList(); // 刷新后台列表
    }
}

// ==================== 后台操作：删除物品 ====================
async function deleteItem(id) {
    if (!confirm("确定删除该物品吗？删除后无法恢复！")) return;

    const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id);

    if (error) {
        alert("删除失败：" + error.message);
    } else {
        alert("物品已删除！");
        renderAdminList(); // 刷新后台列表
    }
}

// ==================== 后台操作：删除申诉 ====================
async function deleteAppeal(id) {
    if (!confirm("确定标记该申诉为已处理吗？")) return;

    const { error } = await supabase
        .from('appeals')
        .delete()
        .eq('id', id);

    if (error) {
        alert("操作失败：" + error.message);
    } else {
        alert("申诉已标记为已处理！");
        renderAdminList(); // 刷新后台列表
    }
}

// ==================== 详情页渲染（从云端读取） ====================
async function renderDetail() {
    const detailDom = document.getElementById('detail');
    if (!detailDom) return;

    // 获取 URL 里的物品 ID
    const id = new URLSearchParams(location.search).get('id');
    if (!id) {
        detailDom.innerHTML = '<div class="alert alert-danger">无效的物品ID</div>';
        return;
    }

    // 从云端读取单个物品详情
    const { data: item, error } = await supabase
        .from('items')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        detailDom.innerHTML = `<div class="alert alert-danger">加载失败：${error.message}</div>`;
        return;
    }

    // 渲染详情
    detailDom.innerHTML = `
    <div class="card">
        <div class="card-body p-3">
            ${item.img_url ? `<img src="${item.img_url}" class="w-100 rounded mb-3">` : ""}
            <p><strong>物品类型：</strong>${item.type=="lost"?"寻物":"招领"}</p>
            <p><strong>物品名称：</strong>${item.title}</p>
            <p><strong>详细描述：</strong>${item.description}</p>
            <p><strong>联系方式：</strong>${item.contact}</p>
            <p><strong>物品状态：</strong>${item.status}</p>
            <input id="deleteKey" class="form-control my-2" placeholder="输入删除密钥">
            <button class="btn btn-danger w-100" onclick="deleteDetailItem(${item.id})">删除该物品</button>
        </div>
    </div>`;
}

// ==================== 详情页：删除物品（验证密钥） ====================
async function deleteDetailItem(id) {
    const inputKey = document.getElementById('deleteKey').value.trim();
    if (!inputKey) {
        alert("请输入删除密钥");
        return;
    }

    // 先读取该物品的密钥，验证是否匹配
    const { data: item, error } = await supabase
        .from('items')
        .select('secret')
        .eq('id', id)
        .single();

    if (error) {
        alert("验证失败：" + error.message);
        return;
    }

    if (inputKey !== item.secret) {
        alert("删除密钥错误！");
        return;
    }

    // 密钥正确，执行删除
    const { error: deleteError } = await supabase
        .from('items')
        .delete()
        .eq('id', id);

    if (deleteError) {
        alert("删除失败：" + deleteError.message);
    } else {
        alert("物品已成功删除！");
        location.href = "list.html";
    }
}

// ==================== 个人中心：查询我的发布（按密钥） ====================
async function loadMyItems() {
    const secretKey = document.getElementById('mySecret').value.trim();
    if (!secretKey) {
        alert("请输入你设置的删除密钥");
        return;
    }

    // 从云端读取匹配密钥的物品
    const { data: items, error } = await supabase
        .from('items')
        .select('*')
        .eq('secret', secretKey)
        .order('created_at', { ascending: false });

    const myListDom = document.getElementById('myItemsList');
    if (error) {
        myListDom.innerHTML = `<div class="alert alert-danger">查询失败：${error.message}</div>`;
        return;
    }

    if (items.length === 0) {
        myListDom.innerHTML = '<div class="alert alert-info">暂无你发布的物品</div>';
        return;
    }

    // 渲染我的发布列表
    let html = "";
    items.forEach(item => {
        html += `
        <div class="card mb-3 shadow-sm">
            ${item.img_url ? `<img src="${item.img_url}" class="card-img-top" style="height:160px;object-fit:cover">` : ""}
            <div class="card-body p-3">
                <h6>${item.type=="lost"?"[寻物]":"[招领]"} ${item.title}</h6>
                <p class="small text-muted">${item.description}</p>
                <p class="small">状态：${item.status}</p>
                <button class="btn btn-sm btn-danger w-100" onclick="deleteMyItem(${item.id})">删除</button>
            </div>
        </div>`;
    });
    myListDom.innerHTML = html;
}

// ==================== 个人中心：删除我的物品 ====================
async function deleteMyItem(id) {
    if (!confirm("确定删除该物品吗？")) return;

    const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id);

    if (error) {
        alert("删除失败：" + error.message);
    } else {
        alert("删除成功！");
        loadMyItems(); // 刷新个人中心列表
    }
}

// ==================== 页面加载时自动渲染 ====================
window.addEventListener('load', () => {
    // 列表页
    if (location.pathname.includes('list.html')) {
        renderList();
    }
    // 详情页
    if (location.pathname.includes('detail.html')) {
        renderDetail();
    }
    // 管理后台
    if (location.pathname.includes('admin.html')) {
        renderAdminList();
    }
});
