// 发布
const form = document.getElementById('publishForm');
if(form){
    form.addEventListener('submit',(e)=>{
        e.preventDefault();
        let file = document.getElementById('fileInput').files[0];
        let reader = new FileReader();
        reader.onload = function(e){
            let item = {
                id:Date.now(),
                type:document.getElementById('type').value,
                title:document.getElementById('title').value,
                desc:document.getElementById('desc').value,
                contact:document.getElementById('contact').value,
                secret:document.getElementById('secret').value,
                img:e.target.result || "",
                time:new Date().toLocaleString()
            };
            let list = JSON.parse(localStorage.getItem('lostList'))||[];
            list.unshift(item);
            localStorage.setItem('lostList',JSON.stringify(list));
            alert('发布成功！');
            location.href='list.html';
        }
        if(file) reader.readAsDataURL(file);
        else{
            let item = {
                id:Date.now(),
                type:document.getElementById('type').value,
                title:document.getElementById('title').value,
                desc:document.getElementById('desc').value,
                contact:document.getElementById('contact').value,
                secret:document.getElementById('secret').value,
                img:"",
                time:new Date().toLocaleString()
            };
            let list = JSON.parse(localStorage.getItem('lostList'))||[];
            list.unshift(item);
            localStorage.setItem('lostList',JSON.stringify(list));
            alert('发布成功！');
            location.href='list.html';
        }
    })
}

// 渲染卡片
function showList(dom,list){
    if(!dom) return;
    if(list.length===0){
        dom.innerHTML='<div class="alert alert-info text-center">暂无信息</div>';
        return;
    }
    let html="";
    list.forEach(i=>{
        html+=`
        <div class="card hover-card mb-3 shadow-sm border-0">
            ${i.img?`<img src="${i.img}" class="card-img-top" style="height:200px;object-fit:cover;cursor:pointer" onclick="viewImage('${i.img}')">`:""}
            <div class="card-body">
                <h5 class="text-primary">${i.type=="lost"?"[寻物]":"[失物]"} ${i.title}</h5>
                <p class="text-muted">${i.desc}</p>
                <p class="small text-secondary">${i.time}</p>
                <a href="detail.html?id=${i.id}" class="btn btn-primary btn-sm">查看详情</a>
            </div>
        </div>`;
    });
    dom.innerHTML=html;
}

// 列表
function renderList(){
    let dom=document.getElementById('list');
    let list=JSON.parse(localStorage.getItem('lostList'))||[];
    showList(dom,list);
}

// 搜索
function searchList(){
    let key=document.getElementById('searchInput').value.toLowerCase().trim();
    let list=JSON.parse(localStorage.getItem('lostList'))||[];
    let f=list.filter(item=>
        item.title.toLowerCase().includes(key)||
        item.desc.toLowerCase().includes(key)
    );
    showList(document.getElementById('list'),f);
}

// 详情
function renderDetail(){
    let dom=document.getElementById('detail');
    if(!dom) return;
    let id=new URLSearchParams(location.search).get('id');
    let list=JSON.parse(localStorage.getItem('lostList'))||[];
    let item=list.find(i=>i.id==id);
    if(!item){
        dom.innerHTML='<div class="alert alert-danger">不存在</div>';
        return;
    }
    dom.innerHTML=`
    <div class="card shadow border-0">
        <div class="card-header bg-primary text-white">
            <h5 class="mb-0">${item.type=="lost"?"[寻物]":"[失物]"} ${item.title}</h5>
        </div>
        <div class="card-body p-4">
            ${item.img?`<img src="${item.img}" class="w-100 rounded mb-3" style="cursor:pointer" onclick="viewImage('${item.img}')">`:""}
            <p><strong>描述：</strong>${item.desc}</p>
            <p><strong>联系方式：</strong>${item.contact}</p>
            <p><strong>时间：</strong>${item.time}</p>
            <hr>
            <div class="mb-2">
                <input type="password" id="key" class="form-control" placeholder="输入删除密钥">
            </div>
            <button class="btn btn-danger w-100" onclick="del(${item.id})">删除信息</button>
        </div>
    </div>`;
}

// 删除
function del(id){
    let list=JSON.parse(localStorage.getItem('lostList'))||[];
    let item=list.find(i=>i.id==id);
    let input=document.getElementById('key').value.trim();
    if(input!==item.secret){
        alert('密钥错误');
        return;
    }
    if(!confirm('确定删除？'))return;
    let newList=list.filter(i=>i.id!=id);
    localStorage.setItem('lostList',JSON.stringify(newList));
    alert('删除成功');
    location.href='list.html';
}

// 我的发布
function myList(){
    let c=document.getElementById('myContact').value.trim();
    let list=JSON.parse(localStorage.getItem('lostList'))||[];
    let my=list.filter(i=>i.contact.trim()===c);
    showList(document.getElementById('myList'),my);
}

// 🔥 图片放大查看功能
function viewImage(url) {
    let modal = document.createElement('div');
    modal.style.cssText = `
        position:fixed; top:0; left:0; width:100%; height:100%;
        background:rgba(0,0,0,0.9); z-index:9999; display:flex;
        align-items:center; justify-content:center; cursor:zoom-out;
    `;
    modal.onclick = () => modal.remove();

    let img = document.createElement('img');
    img.src = url;
    img.style.cssText = `max-width:95%; max-height:95%; object-fit:contain; border-radius:8px;`;

    modal.appendChild(img);
    document.body.appendChild(modal);
}

renderList();
renderDetail();