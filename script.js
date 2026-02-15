        // RENDERIZAÇÃO CORRIGIDA PARA FEED GLOBAL
        function render(filter, containerId) {
            // Puxa TODOS os posts salvos no celular
            const posts = JSON.parse(localStorage.getItem('aura_posts') || "[]");
            const div = document.getElementById(containerId);
            
            // Se 'filter' tiver um nome, mostra só os daquele usuário (Perfil)
            // Se 'filter' for null, mostra TUDO (Feed Global)
            const list = filter ? posts.filter(p => p.u === filter) : posts;
            
            if(filter) {
                document.getElementById('userName').innerText = "@" + filter;
            }

            if(list.length === 0) {
                div.innerHTML = "<p style='text-align:center; padding:20px;'>Nenhuma publicação ainda.</p>";
                return;
            }

            div.innerHTML = list.map(p => `
                <div class="post">
                    <div class="post-info">
                        <b style="color: var(--accent)">@${p.u}</b><br>
                        <span>${p.txt}</span>
                    </div>
                    ${p.img ? `<img src="${p.img}">` : ''}
                    <div class="post-actions">
                        <span onclick="like(${p.id})" style="cursor:pointer">
                            ${p.likes.includes(currentU) ? '❤️' : '🤍'} ${p.likes.length}
                        </span>
                    </div>
                </div>
            `).join('');
        }
