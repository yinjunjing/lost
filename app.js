// ==================== 你的 Supabase 云端配置（已填好） ====================
const SUPABASE_URL = "https://gfbujegridjhczsmgix.supabase.co";
const SUPABASE_KEY = "sb_publishable_tB0Nwu1M_9OMqXtg8x3aSAfgE6zXsA5yN3kD";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==================== 管理员账号密码 ====================
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

// ==================== 违禁词过滤 ====================
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

// ==================== 发布物品 ====================
const form = document.getElementById('publishForm');
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = document.getElementById('type').value;
        const title = document.getElementById('title').value;
        const desc = document.getElementById('desc').value;
        const contact = document.getElementById('contact').value;
        const secret = document.getElementById('secret').value;
        const file = document.getElementById('fileInput').files[0];
        const full = "标题："+title+" 内容："+desc;

        let old = document.getElementById('tipBox');
        if (old) old.remove();

        const ck = checkText(full);
        if (!ck.pass) {
            const d = document.createElement('div');
            d.id = "tipBox";
            d.className = "alert alert-danger text-center p-3 mt-3";
            d.innerHTML = `❌ 发布失败：${ck.msg}<br><button class="btn btn-sm btn-warning mt-2" onclick="showAppealForm('${full}')">申诉</button>`;
            form.appendChild(d);
            return;
        }

        let img = "";
        if (file) {
            img = await new Promise(r=>{let f=new FileReader();f.onload=e=>r(e.target.result);f.readAsDataURL(file)});
        }

        const { error } = await supabase.from('items').insert([{
            type,title,description:desc,contact,secret,img_url:img,status:"正常"
        }]);

        if (error) alert("失败："+error.message);
        else { alert("✅ 发布成功！"); location.href = "list.html"; }
    });
}

function showAppealForm(c) {
    let r = prompt("申诉理由：");
    if (!r) return;
    supabase.from('appeals').insert([{content:c,reason:r}]).then(()=>alert("申诉已提交"));
}

// ==================== 列表页 ====================
async function renderList() {
    const d = document.getElementById('list');
    if (!d) return;
    const { data, error } = await supabase.from('items').select('*').order('created_at',{ascending:false});
    if (error) { d.innerHTML = "加载失败："+error.message; return; }
    if (data.length===0) { d.innerHTML = '<div class="alert alert-info">暂无信息</div>'; return; }
    let h = "";
    data.forEach(i=>{
        h+=`
        <div class="card mb-3 shadow-sm">
            ${i.img_url?`<img src="${i.img_url}" class="card-img-top" style="height:180px;object-fit:cover">`:""}
            <div class="card-body">
                <h6><a href="detail.html?id=${i.id}" class="text-dark">${i.type=="lost"?"[寻物]":"[招领]"} ${i.title}</a></h6>
                <p class="text-muted small">${i.description}</p>
                <p class="small">状态：<span class="${i.status=='已找回'?'text-success':'text-danger'}">${i.status}</span></p>
            </div>
        </div>`;
    });
    d.innerHTML = h;
}

// ==================== 管理后台 ====================
async function renderAdminList() {
    const a = document.getElementById('adminList');
    const b = document.getElementById('appealList');
    if (!a||!b) return;

    const { data:items } = await supabase.from('items').select('*').order('created_at',{ascending:false});
    let h = "";
    items.forEach(i=>{
        h+=`
        <div class="card mb-3">
            ${i.img_url?`<img src="${i.img_url}" style="height:160px;object-fit:cover">`:""}
            <div class="card-body p-3">
                <h6>${i.type=="lost"?"[寻物]":"[招领]"} ${i.title}</h6>
                <p class="small">${i.description}</p>
                <p class="small">状态：${i.status}</p>
                <button class="btn btn-sm btn-warning" onclick="upd(${i.id})">改状态</button>
                <button class="btn btn-sm btn-danger ms-1" onclick="del(${i.id})">删除</button>
            </div>
        </div>`;
    });
    a.innerHTML = h||'<div class="alert alert-info">无物品</div>';

    const { data:appeals } = await supabase.from('appeals').select('*').order('created_at',{ascending:false});
    let ah = "";
    appeals.forEach(i=>{
        ah+=`
        <div class="card mb-2">
            <div class="card-body p-2">
                <p>内容：${i.content}</p>
                <p>理由：${i.reason}</p>
                <button class="btn btn-sm btn-danger" onclick="dela(${i.id})">已处理</button>
            </div>
        </div>`;
    });
    b.innerHTML = ah||'<div class="alert alert-info">无申诉</div>';

    const t = items.length;
    const ok = items.filter(x=>x.status=="已找回").length;
    document.getElementById('total').innerText = t;
    document.getElementById('ok').innerText = ok;
    document.getElementById('ing').innerText = t-ok;
}

async function upd(id){let s=prompt("状态：正常/已找回");if(!s)return;await supabase.from('items').update({status:s}).eq('id',id);renderAdminList()}
async function del(id){if(!confirm("确定？"))return;await supabase.from('items').delete().eq('id',id);renderAdminList()}
async function dela(id){await supabase.from('appeals').delete().eq('id',id);renderAdminList()}

// ==================== 详情页 ====================
async function renderDetail(){
    const d=document.getElementById('detail');
    if(!d)return;
    const id=new URLSearchParams(location.search).get('id');
    const {data,error}=await supabase.from('items').select('*').eq('id',id).single();
    if(error){d.innerHTML="错误："+error.message;return;}
    d.innerHTML=`
    <div class="card">
        <div class="card-body p-3">
            ${data.img_url?`<img src="${data.img_url}" class="w-100 rounded mb-3">`:""}
            <p><strong>物品：</strong>${data.title}</p>
            <p><strong>描述：</strong>${data.description}</p>
            <p><strong>联系：</strong>${data.contact}</p>
            <p><strong>状态：</strong>${data.status}</p>
            <input id="k" class="form-control my-2" placeholder="删除密钥">
            <button class="btn btn-danger w-100" onclick="d(${data.id})">删除</button>
        </div>
    </div>`;
}

async function d(id){
    const {data}=await supabase.from('items').select('secret').eq('id',id).single();
    if(document.getElementById('k').value!==data.secret){alert("密钥错误");return;}
    await supabase.from('items').delete().eq('id',id);
    alert("删除成功");location.href="list.html";
}

// 自动加载
window.addEventListener('load',()=>{
    if(location.pathname.includes('list'))renderList();
    if(location.pathname.includes('detail'))renderDetail();
    if(location.pathname.includes('admin')){
        if(!isAdmin()){alert("请登录");location.href="index.html";}
        else renderAdminList();
    }
});
