# 📚 Sistema de Controle de Biblioteca Escolar — Grupo 1

Trabalho Prático Final — Desenvolvimento Web  
Arquitetura de três camadas: Apresentação, Negócio e Persistência.

---

## Tecnologias Utilizadas

| Camada | Tecnologia |
|--------|-----------|
| Apresentação (Interface) | HTML5 + CSS3 (Flexbox/Grid) |
| Interação (Cliente) | JavaScript (DOM & Fetch API) |
| Negócio (Servidor) | PHP 8.2 |
| Persistência (Dados) | SQLite via PDO |

---

## Estrutura de Arquivos

```
/
├── index.html   → Página principal do sistema
├── style.css    → Estilização responsiva
├── script.js    → Lógica JS e Fetch API
├── api.php      → Endpoint PHP (API REST + conexão SQLite)
└── banco.db     → Banco de dados SQLite (gerado automaticamente)
```

---

## Banco de Dados

Duas tabelas relacionadas por chave estrangeira:

```sql
CATEGORIA (id, nome_categoria, descricao)
LIVRO     (id, titulo, autor, ano_publicacao, categoria_id FK)
```

- Conexão: `new PDO('sqlite:banco.db')`
- Chaves estrangeiras ativadas: `PRAGMA foreign_keys = ON`

---

## Funcionalidades

### Aba Categorias
- Cadastrar nova categoria literária
- Listar todas as categorias em tabela
- Editar categoria (formulário pré-preenchido)
- Excluir categoria (bloqueado se houver livros vinculados)

### Aba Livros
- Cadastrar livro com campos: título, autor, ano de publicação e categoria
- Campo `<select>` de categorias alimentado dinamicamente pelo banco
- Editar livro existente

### Aba Acervo Completo
- Tabela dinâmica com **INNER JOIN** entre `livro` e `categoria`
- Exibe o nome da categoria junto a cada livro
- Busca em tempo real por título ou autor
- Editar e excluir livros com modal de confirmação

---

## API REST (api.php)

Todos os endpoints respondem em **JSON**.

### Categorias

| Método | URL | Ação |
|--------|-----|------|
| GET | `api.php?recurso=categorias&acao=listar` | Lista todas |
| POST | `api.php?recurso=categorias&acao=inserir` | Cadastra nova |
| PUT | `api.php?recurso=categorias&acao=atualizar` | Atualiza existente |
| DELETE | `api.php?recurso=categorias&acao=excluir&id=1` | Exclui por ID |

### Livros

| Método | URL | Ação |
|--------|-----|------|
| GET | `api.php?recurso=livros&acao=listar` | Lista com JOIN |
| POST | `api.php?recurso=livros&acao=inserir` | Cadastra novo |
| PUT | `api.php?recurso=livros&acao=atualizar` | Atualiza existente |
| DELETE | `api.php?recurso=livros&acao=excluir&id=1` | Exclui por ID |

---


## Requisitos Técnicos Atendidos

- [x] Design responsivo (CSS Flexbox/Grid)
- [x] Formulários com placeholders, labels e tipos corretos
- [x] Menu de navegação consistente em todas as telas
- [x] Validação de formulários no cliente (JavaScript)
- [x] Comunicação assíncrona com Fetch API (sem recarregamento)
- [x] Manipulação de DOM (tabelas, mensagens de erro/sucesso)
- [x] API REST em PHP com respostas JSON (`json_encode`)
- [x] Segurança básica com PDO prepared statements e sanitização
- [x] Conexão PDO com SQLite (`new PDO('sqlite:banco.db')`)
- [x] Duas tabelas relacionadas por FOREIGN KEY
- [x] CRUD completo (Create, Read, Update, Delete)
- [x] INNER JOIN na listagem do acervo
