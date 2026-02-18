const ADMIN_USER = "luis";
const firebaseConfig = {
    apiKey: "AIzaSyASdswQJmfCG_7MVwbwudHFpx-4zwv6jtg",
    authDomain: "aura-4d3aa.firebaseapp.com",
    projectId: "aura-4d3aa",
    storageBucket: "aura-4d3aa.firebasestorage.app",
    messagingSenderId: "253146544636",
    appId: "1:253146544636:web:9d677c28faddf1d7315a79"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const Aura = {
    user: localStorage.getItem('aura_user'),
    userCache: {}, 
    following: [], 
    lastPosts: [],

    init() { 
        if(this.user) { this.startApp(); } 
        else { document.getElementById('scrAuth').classList.add('active'); }
    },

    async execLogin() {
        const u = document.getElementById('uInp').value.trim().toLowerCase();
        const p = document.getElementById('pInp').value.trim();
        if(!u || !p) return;
        const ref = db.collection('users').doc(u);
        const doc = await ref.get();
        if(doc.exists && doc.data().p !== p) return alert("Senha incorreta");
        await ref.set({u, p}, {merge:true});
        localStorage.setItem('aura_user', u);
        this.user = u;
        location.reload();
    },

    startApp() {
        document.getElementById('scrAuth').classList.remove('active');
        if(document.getElementById('menu')) document.getElementById('menu').style.display = 'flex';
        this.listenUsers();
        this.listenFollows();
        this.listenFeed();
        this.go('scrFeed');
    },

    go(scr, target) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const el = document.getElementById(scr);
        if(el) el.classList.add('active');
        if(scr === 'scrProf') this.loadProfile(target || this.user);
    },

    // --- REALTIME ---
    listenUsers() {
        db.collection("users").onSnapshot(snap => {
            snap.forEach(doc => this.userCache[doc.id] = doc.data());
            // Atualiza feed e perfil se estiver aberto
            this.renderPosts(this.lastPosts, 'wall');
        });
    },

    listenFollows() {
        db.collection("follows").doc(this.user).onSnapshot(doc => {
            if(doc.exists) this.following = doc.data().following || [];
        });
    },

    listenFeed() {
        db.collection("posts").orderBy("time", "desc").onSnapshot(snap => {
            this.lastPosts = snap.docs.map(doc => ({id: doc.id, ...doc.data()}));
            this.renderPosts(this.lastPosts, 'wall');
        });
    },

    // --- RENDERIZAÇÃO INTELIGENTE ---
    renderPosts(list, target) {
        const wall = document.getElementById(target);
        if(!wall) return;
        const agora = Date.now();
        
        wall.innerHTML = list.map(p => {
            const uData = this.userCache[p.u] || {};
            const ehPrime = uData.isPrime === true && (!uData.primeExpira || agora < uData.primeExpira);
            const souDono = p.u === this.user;

            return `
            <div class="post" style="position:relative; ${ehPrime ? 'border: 2px solid #ffd700 !important; box-shadow: 0 0 10px rgba(255,215,0,0.3);' : ''}">
                
                ${souDono ? `<div onclick="Aura.deletePost('${p.id}')" style="position:absolute; top:10px; right:10px; cursor:pointer; font-size:18px;">🗑️</div>` : ''}

                <div style="padding:12px; display:flex; align-items:center; gap:10px">
                    <img src="${uData.pfp || 'https://api.dicebear.com/7.x/avataaars/svg?seed='+p.u}" 
                         style="width:35px; height:35px; border-radius:50%; border: ${ehPrime ? '2px solid #ffd700' : '1px solid #334155'}">
                    <b onclick="Aura.go('scrProf', '${p.u}')" style="cursor:pointer">
                        @${p.u} ${p.u === ADMIN_USER ? '✔️' : ''} ${ehPrime ? '🌟' : ''}
                    </b>
                </div>
                ${p.img ? `<img src="${p.img}" class="post-img">` : ''}
                <div style="padding:15px">
                    <p>${p.txt}</p>
                    <div style="margin-top:10px; display:flex; gap:15px; color:#94a3b8">
                        <span onclick="Aura.likePost('${p.id}')" style="cursor:pointer">❤️ ${p.likes?.length || 0}</span>
                        <span onclick="Aura.openComments('${p.id}')" style="cursor:pointer">💬 ${p.comments?.length || 0}</span>
                    </div>
                </div>
            </div>`;
        }).join('');
    },

    // --- PERFIL COMPLETO (COM POSTS) ---
    async loadProfile(u) {
        // 1. Dados do usuário
        const userData = this.userCache[u] || {};
        const agora = Date.now();
        const ehPrime = userData.isPrime === true && (!userData.primeExpira || agora < userData.primeExpira);
        
        document.getElementById('profName').innerHTML = `@${u} ${ehPrime ? '🌟' : ''}`;
        document.getElementById('profImg').src = userData.pfp || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u}`;
        
        // 2. Seguidores
        const fDoc = await db.collection("follows").doc(u).get();
        const fData = fDoc.exists ? fDoc.data() : { followers: [], following: [] };
        
        document.getElementById('cFol').innerText = fData.followers?.length || 0;
        document.getElementById('cFlw').innerText = fData.following?.length || 0;

        document.getElementById('cFol').parentElement.onclick = () => this.openList(fData.followers, "Seguidores");
        document.getElementById('cFlw').parentElement.onclick = () => this.openList(fData.following, "Seguindo");

        // 3. Botões de Ação
        let btns = u === this.user ? 
            `<button class="btn-blue" onclick="Aura.logout()" style="background:#ff4444; border:none; color:white; padding:8px 20px; border-radius:8px;">Sair</button>` : 
            `<button class="btn-blue" onclick="Aura.toggleFollow('${u}')" style="padding:8px 20px; border-radius:8px; border:none; background:#38bdf8; color:white;">${this.following.includes(u) ? 'Seguindo' : 'Seguir'}</button>`;
        
        if(this.user === ADMIN_USER && u !== ADMIN_USER) {
            btns += `<button onclick="Aura.dar30DiasPrime('${u}')" style="background:gold; color:black; border:none; padding:8px 15px; border-radius:8px; margin-left:5px; font-weight:bold;">Dar Prime</button>`;
        }
        document.getElementById('profAction').innerHTML = btns;

        // 4. CARREGAR POSTS DO USUÁRIO (Novo!)
        // Filtra os posts que já baixamos ou busca novos se precisar
        const postsDoPerfil = this.lastPosts.filter(p => p.u === u);
        // Se a lista estiver vazia, tenta buscar no banco especificamente
        if(postsDoPerfil.length === 0) {
            const snap = await db.collection("posts").where("u", "==", u).get();
            const fetchedPosts = snap.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => b.time - a.time);
            this.renderPosts(fetchedPosts, 'profWall');
        } else {
            this.renderPosts(postsDoPerfil, 'profWall');
        }
    },

    // --- COMENTÁRIOS (COM OPÇÃO DE APAGAR) ---
    async openComments(pid) {
        const p = this.lastPosts.find(x => x.id === pid);
        if(!p) return;
        const agora = Date.now();
        document.getElementById('modalTitle').innerText = "Comentários";
        
        const html = (p.comments || []).map(c => {
            const uData = this.userCache[c.u] || {};
            const ehPrime = uData.isPrime === true && (!uData.primeExpira || agora < uData.primeExpira);
            
            // Só pode apagar se: for dono do comentário OU dono do post
            const podeApagar = c.u === this.user || p.u === this.user;

            return `
            <div style="position:relative; padding:8px; margin-bottom:5px; border-radius:8px; border: ${ehPrime ? '1px solid gold' : '1px solid #334155'}; background: ${ehPrime ? 'rgba(255,215,0,0.05)' : 'transparent'}">
                <b style="${ehPrime ? 'color:#ffd700' : ''}">@${c.u} ${ehPrime ? '🌟' : ''}</b>: ${c.txt}
                
                ${podeApagar ? `<span onclick="Aura.deleteComment('${pid}', '${c.txt}', '${c.u}')" style="position:absolute; right:10px; top:8px; color:red; cursor:pointer;">✕</span>` : ''}
            </div>`;
        }).join('') || "Seja o primeiro a comentar!";
        
        document.getElementById('modalBody').innerHTML = html;
        document.getElementById('mainModal').style.display = 'block';

        document.getElementById('sendCommBtn').onclick = async () => {
            const txt = document.getElementById('newCommTxt').value;
            if(!txt) return;
            await db.collection("posts").doc(pid).update({
                comments: firebase.firestore.FieldValue.arrayUnion({ u: this.user, txt })
            });
            document.getElementById('newCommTxt').value = "";
            document.getElementById('mainModal').style.display = 'none';
        };
    },

    // --- FUNÇÕES DE DELETAR ---
    async deletePost(id) {
        if(confirm("Tem certeza que quer apagar esse post?")) {
            await db.collection("posts").doc(id).delete();
        }
    },

    async deleteComment(pid, txt, autor) {
        if(confirm("Apagar comentário?")) {
            await db.collection("posts").doc(pid).update({
                comments: firebase.firestore.FieldValue.arrayRemove({ u: autor, txt: txt })
            });
            document.getElementById('mainModal').style.display = 'none';
        }
    },

    // --- OUTRAS FUNÇÕES ---
    async likePost(id) {
        const ref = db.collection("posts").doc(id);
        const doc = await ref.get();
        let l = doc.data().likes || [];
        l.includes(this.user) ? l = l.filter(u => u !== this.user) : l.push(this.user);
        await ref.update({ likes: l });
    },

    async newPost() {
        const txt = document.getElementById('pTxt').value;
        const file = document.getElementById('pFile').files[0];
        if(!txt && !file) return;
        const send = async (img) => {
            await db.collection("posts").add({ u: this.user, txt, img: img || "", likes:[], comments:[], time: Date.now() });
            document.getElementById('pTxt').value = "";
        };
        if(file) {
            const r = new FileReader();
            r.onload = e => send(e.target.result);
            r.readAsDataURL(file);
        } else send(null);
    },

    async toggleFollow(alvo) {
        const refMiau = db.collection("follows").doc(this.user);
        const refAlvo = db.collection("follows").doc(alvo);
        
        if(this.following.includes(alvo)) {
            await refMiau.update({ following: firebase.firestore.FieldValue.arrayRemove(alvo) });
            await refAlvo.update({ followers: firebase.firestore.FieldValue.arrayRemove(this.user) });
        } else {
            await refMiau.set({ following: firebase.firestore.FieldValue.arrayUnion(alvo) }, { merge: true });
            await refAlvo.set({ followers: firebase.firestore.FieldValue.arrayUnion(this.user) }, { merge: true });
        }
    },

    openList(lista, titulo) {
        document.getElementById('modalTitle').innerText = titulo;
        document.getElementById('modalBody').innerHTML = lista?.length ? 
            lista.map(it => `<div onclick="Aura.go('scrProf','${it}'); document.getElementById('mainModal').style.display='none'" style="padding:10px; border-bottom:1px solid #334155; cursor:pointer">@${it}</div>`).join('') : 
            "Lista vazia.";
        document.getElementById('mainModal').style.display = 'block';
    },

    async dar30DiasPrime(alvo) {
        const dataExpiracao = Date.now() + (30 * 24 * 60 * 60 * 1000);
        await db.collection('users').doc(alvo).set({ isPrime: true, primeExpira: dataExpiracao }, { merge: true });
        alert("Prime ativado!");
        location.reload();
    },

    logout() { localStorage.clear(); location.reload(); }
};

window.onload = () => Aura.init();
