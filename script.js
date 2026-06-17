// ===== CONFIGURAÇÃO DA API =====
const API_BASE = 'api.php';

// ===== VARIÁVEIS GLOBAIS =====
let todosLivros = [];
let modalCallback = null;

// ===== NAVEGAÇÃO =====
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        this.classList.add('active');
        const secao = this.dataset.section;
        document.getElementById(`section-${secao}`).classList.add('active');

        if (secao === 'categorias') carregarCategorias();
        if (secao === 'livros') { carregarCategoriasSelect(); limparFormLivro(); }
        if (secao === 'acervo') carregarLivros();
    });
});

// ===== UTILITÁRIOS =====
function mostrarFeedback(elementoId, mensagem, tipo) {
    const el = document.getElementById(elementoId);
    el.className = `feedback ${tipo}`;
    el.textContent = mensagem;
    setTimeout(() => {
        el.className = 'feedback';
        el.textContent = '';
    }, 4000);
}

function setErro(campoId, erroId, mensagem) {
    const campo = document.getElementById(campoId);
    const erro  = document.getElementById(erroId);
    campo.classList.add('invalid');
    erro.textContent = mensagem;
}

function limparErros(campos) {
    campos.forEach(({ campoId, erroId }) => {
        const campo = document.getElementById(campoId);
        const erro  = document.getElementById(erroId);
        if (campo) campo.classList.remove('invalid');
        if (erro)  erro.textContent = '';
    });
}

async function requisicao(url, metodo = 'GET', dados = null) {
    const opcoes = {
        method: metodo,
        headers: { 'Content-Type': 'application/json' }
    };
    if (dados) opcoes.body = JSON.stringify(dados);
    const resposta = await fetch(url, opcoes);
    return resposta.json();
}

// ===== MODAL DE CONFIRMAÇÃO =====
function abrirModal(titulo, mensagem, callback) {
    document.getElementById('modal-titulo').textContent    = titulo;
    document.getElementById('modal-mensagem').textContent  = mensagem;
    document.getElementById('modal-overlay').style.display = 'flex';
    modalCallback = callback;
}

document.getElementById('modal-confirmar').addEventListener('click', () => {
    document.getElementById('modal-overlay').style.display = 'none';
    if (modalCallback) modalCallback();
    modalCallback = null;
});

document.getElementById('modal-cancelar').addEventListener('click', () => {
    document.getElementById('modal-overlay').style.display = 'none';
    modalCallback = null;
});

document.getElementById('modal-overlay').addEventListener('click', function (e) {
    if (e.target === this) {
        this.style.display = 'none';
        modalCallback = null;
    }
});

// =========================================================
//  CATEGORIAS
// =========================================================

async function carregarCategorias() {
    const tbody = document.getElementById('tbody-categorias');
    tbody.innerHTML = '<tr><td colspan="4" class="loading">Carregando...</td></tr>';
    try {
        const res = await requisicao(`${API_BASE}?recurso=categorias&acao=listar`);
        if (!res.sucesso) throw new Error(res.mensagem);

        if (res.dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty">Nenhuma categoria cadastrada.</td></tr>';
            return;
        }

        tbody.innerHTML = res.dados.map(cat => `
            <tr>
                <td>${cat.id}</td>
                <td><strong>${cat.nome_categoria}</strong></td>
                <td>${cat.descricao || '<span style="color:#94a3b8">—</span>'}</td>
                <td>
                    <button class="btn btn-edit" onclick="editarCategoria(${cat.id}, '${escapeAttr(cat.nome_categoria)}', '${escapeAttr(cat.descricao || '')}')">✏️ Editar</button>
                    <button class="btn btn-del" onclick="confirmarExcluirCategoria(${cat.id}, '${escapeAttr(cat.nome_categoria)}')">🗑️ Excluir</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty">Erro ao carregar: ${err.message}</td></tr>`;
    }
}

function escapeAttr(str) {
    return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// Formulário de Categoria
document.getElementById('form-categoria').addEventListener('submit', async function (e) {
    e.preventDefault();

    const camposErro = [
        { campoId: 'nome-categoria', erroId: 'err-nome-categoria' }
    ];
    limparErros(camposErro);

    const id   = document.getElementById('categoria-id').value;
    const nome = document.getElementById('nome-categoria').value.trim();
    const desc = document.getElementById('descricao-categoria').value.trim();

    let valido = true;
    if (!nome) {
        setErro('nome-categoria', 'err-nome-categoria', 'O nome da categoria é obrigatório.');
        valido = false;
    } else if (nome.length < 2) {
        setErro('nome-categoria', 'err-nome-categoria', 'O nome deve ter ao menos 2 caracteres.');
        valido = false;
    }

    if (!valido) return;

    try {
        let res;
        if (id) {
            res = await requisicao(`${API_BASE}?recurso=categorias&acao=atualizar`, 'PUT', {
                id: parseInt(id), nome_categoria: nome, descricao: desc
            });
        } else {
            res = await requisicao(`${API_BASE}?recurso=categorias&acao=inserir`, 'POST', {
                nome_categoria: nome, descricao: desc
            });
        }

        if (res.sucesso) {
            mostrarFeedback('feedback-categoria', res.mensagem, 'success');
            limparFormCategoria();
            carregarCategorias();
        } else {
            mostrarFeedback('feedback-categoria', res.mensagem, 'error');
        }
    } catch (err) {
        mostrarFeedback('feedback-categoria', 'Erro de comunicação com o servidor.', 'error');
    }
});

function editarCategoria(id, nome, desc) {
    document.getElementById('categoria-id').value       = id;
    document.getElementById('nome-categoria').value     = nome;
    document.getElementById('descricao-categoria').value = desc;
    document.getElementById('btn-salvar-categoria').textContent  = '💾 Atualizar Categoria';
    document.getElementById('btn-cancelar-categoria').style.display = 'inline-flex';
    document.querySelector('[data-section="categorias"]').click();
    document.getElementById('nome-categoria').focus();
}

function limparFormCategoria() {
    document.getElementById('categoria-id').value        = '';
    document.getElementById('nome-categoria').value      = '';
    document.getElementById('descricao-categoria').value  = '';
    document.getElementById('btn-salvar-categoria').textContent   = 'Salvar Categoria';
    document.getElementById('btn-cancelar-categoria').style.display = 'none';
    limparErros([{ campoId: 'nome-categoria', erroId: 'err-nome-categoria' }]);
}

document.getElementById('btn-cancelar-categoria').addEventListener('click', limparFormCategoria);

function confirmarExcluirCategoria(id, nome) {
    abrirModal(
        '🗑️ Excluir Categoria',
        `Deseja excluir a categoria "${nome}"? Isso só é possível se não houver livros vinculados.`,
        async () => {
            try {
                const res = await requisicao(`${API_BASE}?recurso=categorias&acao=excluir&id=${id}`, 'DELETE');
                if (res.sucesso) {
                    mostrarFeedback('feedback-categoria', res.mensagem, 'success');
                    carregarCategorias();
                } else {
                    mostrarFeedback('feedback-categoria', res.mensagem, 'error');
                }
            } catch (err) {
                mostrarFeedback('feedback-categoria', 'Erro ao excluir.', 'error');
            }
        }
    );
}

// =========================================================
//  LIVROS
// =========================================================

async function carregarCategoriasSelect() {
    const select = document.getElementById('categoria-livro');
    try {
        const res = await requisicao(`${API_BASE}?recurso=categorias&acao=listar`);
        const idAtual = select.value;
        select.innerHTML = '<option value="">-- Selecione uma categoria --</option>';
        if (res.sucesso) {
            res.dados.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.id;
                opt.textContent = cat.nome_categoria;
                if (String(cat.id) === String(idAtual)) opt.selected = true;
                select.appendChild(opt);
            });
        }
    } catch (_) {}
}

async function carregarLivros() {
    const tbody = document.getElementById('tbody-livros');
    tbody.innerHTML = '<tr><td colspan="6" class="loading">Carregando...</td></tr>';
    try {
        const res = await requisicao(`${API_BASE}?recurso=livros&acao=listar`);
        if (!res.sucesso) throw new Error(res.mensagem);
        todosLivros = res.dados;
        renderizarTabela(todosLivros);
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty">Erro ao carregar: ${err.message}</td></tr>`;
    }
}

function renderizarTabela(livros) {
    const tbody = document.getElementById('tbody-livros');
    if (livros.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty">Nenhum livro encontrado.</td></tr>';
        return;
    }
    tbody.innerHTML = livros.map(liv => `
        <tr>
            <td>${liv.id}</td>
            <td><strong>${liv.titulo}</strong></td>
            <td>${liv.autor}</td>
            <td>${liv.ano_publicacao}</td>
            <td><span class="badge">${liv.nome_categoria}</span></td>
            <td>
                <button class="btn btn-edit" onclick="editarLivro(${liv.id}, '${escapeAttr(liv.titulo)}', '${escapeAttr(liv.autor)}', ${liv.ano_publicacao}, ${liv.categoria_id})">✏️ Editar</button>
                <button class="btn btn-del" onclick="confirmarExcluirLivro(${liv.id}, '${escapeAttr(liv.titulo)}')">🗑️ Excluir</button>
            </td>
        </tr>
    `).join('');
}

// Busca em tempo real
document.getElementById('busca-livro').addEventListener('input', function () {
    const termo = this.value.toLowerCase();
    const filtrados = todosLivros.filter(l =>
        l.titulo.toLowerCase().includes(termo) ||
        l.autor.toLowerCase().includes(termo)
    );
    renderizarTabela(filtrados);
});

// Formulário de Livro
document.getElementById('form-livro').addEventListener('submit', async function (e) {
    e.preventDefault();

    const camposErro = [
        { campoId: 'titulo-livro',     erroId: 'err-titulo-livro' },
        { campoId: 'autor-livro',      erroId: 'err-autor-livro' },
        { campoId: 'ano-livro',        erroId: 'err-ano-livro' },
        { campoId: 'categoria-livro',  erroId: 'err-categoria-livro' },
    ];
    limparErros(camposErro);

    const id          = document.getElementById('livro-id').value;
    const titulo      = document.getElementById('titulo-livro').value.trim();
    const autor       = document.getElementById('autor-livro').value.trim();
    const ano         = parseInt(document.getElementById('ano-livro').value);
    const categoriaId = document.getElementById('categoria-livro').value;

    let valido = true;

    if (!titulo) {
        setErro('titulo-livro', 'err-titulo-livro', 'O título é obrigatório.');
        valido = false;
    }
    if (!autor) {
        setErro('autor-livro', 'err-autor-livro', 'O autor é obrigatório.');
        valido = false;
    }
    if (!ano || ano < 1000 || ano > 2099) {
        setErro('ano-livro', 'err-ano-livro', 'Informe um ano entre 1000 e 2099.');
        valido = false;
    }
    if (!categoriaId) {
        setErro('categoria-livro', 'err-categoria-livro', 'Selecione uma categoria.');
        valido = false;
    }

    if (!valido) return;

    try {
        let res;
        const dados = { titulo, autor, ano_publicacao: ano, categoria_id: parseInt(categoriaId) };

        if (id) {
            res = await requisicao(`${API_BASE}?recurso=livros&acao=atualizar`, 'PUT', { id: parseInt(id), ...dados });
        } else {
            res = await requisicao(`${API_BASE}?recurso=livros&acao=inserir`, 'POST', dados);
        }

        if (res.sucesso) {
            mostrarFeedback('feedback-livro', res.mensagem, 'success');
            limparFormLivro();
        } else {
            mostrarFeedback('feedback-livro', res.mensagem, 'error');
        }
    } catch (err) {
        mostrarFeedback('feedback-livro', 'Erro de comunicação com o servidor.', 'error');
    }
});

function editarLivro(id, titulo, autor, ano, categoriaId) {
    document.getElementById('livro-id').value      = id;
    document.getElementById('titulo-livro').value  = titulo;
    document.getElementById('autor-livro').value   = autor;
    document.getElementById('ano-livro').value     = ano;

    // Navegar para aba livros e selecionar categoria
    document.querySelector('[data-section="livros"]').click();

    // Aguardar o select ser populado
    setTimeout(() => {
        const sel = document.getElementById('categoria-livro');
        for (let opt of sel.options) {
            if (parseInt(opt.value) === categoriaId) {
                opt.selected = true;
                break;
            }
        }
    }, 300);

    document.getElementById('btn-salvar-livro').textContent  = '💾 Atualizar Livro';
    document.getElementById('btn-cancelar-livro').style.display = 'inline-flex';
}

function limparFormLivro() {
    document.getElementById('livro-id').value      = '';
    document.getElementById('titulo-livro').value  = '';
    document.getElementById('autor-livro').value   = '';
    document.getElementById('ano-livro').value     = '';
    document.getElementById('categoria-livro').value = '';
    document.getElementById('btn-salvar-livro').textContent  = 'Salvar Livro';
    document.getElementById('btn-cancelar-livro').style.display = 'none';
    limparErros([
        { campoId: 'titulo-livro',    erroId: 'err-titulo-livro' },
        { campoId: 'autor-livro',     erroId: 'err-autor-livro' },
        { campoId: 'ano-livro',       erroId: 'err-ano-livro' },
        { campoId: 'categoria-livro', erroId: 'err-categoria-livro' },
    ]);
}

document.getElementById('btn-cancelar-livro').addEventListener('click', limparFormLivro);

function confirmarExcluirLivro(id, titulo) {
    abrirModal(
        '🗑️ Excluir Livro',
        `Deseja realmente excluir o livro "${titulo}"?`,
        async () => {
            try {
                const res = await requisicao(`${API_BASE}?recurso=livros&acao=excluir&id=${id}`, 'DELETE');
                if (res.sucesso) {
                    mostrarFeedback('feedback-acervo', res.mensagem, 'success');
                    carregarLivros();
                } else {
                    mostrarFeedback('feedback-acervo', res.mensagem, 'error');
                }
            } catch (err) {
                mostrarFeedback('feedback-acervo', 'Erro ao excluir.', 'error');
            }
        }
    );
}

// ===== INICIALIZAÇÃO =====
carregarCategorias();
