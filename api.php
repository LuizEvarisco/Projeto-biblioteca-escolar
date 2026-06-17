<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ===== CONEXÃO PDO COM SQLITE =====
function getConexao(): PDO {
    $db = new PDO('sqlite:' . __DIR__ . '/banco.db');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $db->exec("PRAGMA foreign_keys = ON;");
    return $db;
}

// ===== CRIAÇÃO DAS TABELAS =====
function criarTabelas(PDO $db): void {
    $db->exec("
        CREATE TABLE IF NOT EXISTS categoria (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome_categoria TEXT NOT NULL,
            descricao TEXT
        );
        CREATE TABLE IF NOT EXISTS livro (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            autor TEXT NOT NULL,
            ano_publicacao INTEGER NOT NULL,
            categoria_id INTEGER NOT NULL,
            FOREIGN KEY (categoria_id) REFERENCES categoria(id) ON DELETE RESTRICT
        );
    ");
}

// ===== SANITIZAÇÃO =====
function sanitizar(string $valor): string {
    return htmlspecialchars(strip_tags(trim($valor)), ENT_QUOTES, 'UTF-8');
}

// ===== RESPOSTA JSON =====
function responder(array $dados, int $codigo = 200): void {
    http_response_code($codigo);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $db = getConexao();
    criarTabelas($db);

    $recurso = $_GET['recurso'] ?? '';
    $acao    = $_GET['acao']    ?? '';
    $metodo  = $_SERVER['REQUEST_METHOD'];

    // Corpo da requisição (para POST/PUT)
    $body = [];
    if (in_array($metodo, ['POST', 'PUT'])) {
        $raw = file_get_contents('php://input');
        $body = json_decode($raw, true) ?? [];
    }

    // =========================================================
    //  CATEGORIAS
    // =========================================================
    if ($recurso === 'categorias') {

        // LISTAR
        if ($metodo === 'GET' && $acao === 'listar') {
            $stmt = $db->query("SELECT * FROM categoria ORDER BY nome_categoria ASC");
            responder(['sucesso' => true, 'dados' => $stmt->fetchAll()]);
        }

        // INSERIR
        if ($metodo === 'POST' && $acao === 'inserir') {
            $nome = sanitizar($body['nome_categoria'] ?? '');
            $desc = sanitizar($body['descricao']      ?? '');

            if (empty($nome)) {
                responder(['sucesso' => false, 'mensagem' => 'O nome da categoria é obrigatório.'], 400);
            }

            $stmt = $db->prepare("INSERT INTO categoria (nome_categoria, descricao) VALUES (:nome, :desc)");
            $stmt->execute([':nome' => $nome, ':desc' => $desc]);
            responder(['sucesso' => true, 'mensagem' => 'Categoria cadastrada com sucesso!', 'id' => $db->lastInsertId()]);
        }

        // ATUALIZAR
        if ($metodo === 'PUT' && $acao === 'atualizar') {
            $id   = intval($body['id'] ?? 0);
            $nome = sanitizar($body['nome_categoria'] ?? '');
            $desc = sanitizar($body['descricao']      ?? '');

            if ($id <= 0 || empty($nome)) {
                responder(['sucesso' => false, 'mensagem' => 'Dados inválidos para atualização.'], 400);
            }

            $stmt = $db->prepare("UPDATE categoria SET nome_categoria = :nome, descricao = :desc WHERE id = :id");
            $stmt->execute([':nome' => $nome, ':desc' => $desc, ':id' => $id]);
            responder(['sucesso' => true, 'mensagem' => 'Categoria atualizada com sucesso!']);
        }

        // EXCLUIR
        if ($metodo === 'DELETE' && $acao === 'excluir') {
            $id = intval($_GET['id'] ?? 0);

            if ($id <= 0) {
                responder(['sucesso' => false, 'mensagem' => 'ID inválido.'], 400);
            }

            // Verificar se há livros vinculados
            $check = $db->prepare("SELECT COUNT(*) as total FROM livro WHERE categoria_id = :id");
            $check->execute([':id' => $id]);
            $total = $check->fetch()['total'];

            if ($total > 0) {
                responder(['sucesso' => false, 'mensagem' => "Não é possível excluir: existem {$total} livro(s) nesta categoria."], 409);
            }

            $stmt = $db->prepare("DELETE FROM categoria WHERE id = :id");
            $stmt->execute([':id' => $id]);
            responder(['sucesso' => true, 'mensagem' => 'Categoria excluída com sucesso!']);
        }
    }

    // =========================================================
    //  LIVROS
    // =========================================================
    if ($recurso === 'livros') {

        // LISTAR COM JOIN
        if ($metodo === 'GET' && $acao === 'listar') {
            $stmt = $db->query("
                SELECT l.id, l.titulo, l.autor, l.ano_publicacao, l.categoria_id,
                       c.nome_categoria
                FROM livro l
                INNER JOIN categoria c ON c.id = l.categoria_id
                ORDER BY l.titulo ASC
            ");
            responder(['sucesso' => true, 'dados' => $stmt->fetchAll()]);
        }

        // INSERIR
        if ($metodo === 'POST' && $acao === 'inserir') {
            $titulo      = sanitizar($body['titulo']       ?? '');
            $autor       = sanitizar($body['autor']        ?? '');
            $ano         = intval($body['ano_publicacao']  ?? 0);
            $categoriaId = intval($body['categoria_id']    ?? 0);

            if (empty($titulo) || empty($autor) || $ano < 1000 || $ano > 2099 || $categoriaId <= 0) {
                responder(['sucesso' => false, 'mensagem' => 'Preencha todos os campos corretamente.'], 400);
            }

            $stmt = $db->prepare("
                INSERT INTO livro (titulo, autor, ano_publicacao, categoria_id)
                VALUES (:titulo, :autor, :ano, :cat)
            ");
            $stmt->execute([':titulo' => $titulo, ':autor' => $autor, ':ano' => $ano, ':cat' => $categoriaId]);
            responder(['sucesso' => true, 'mensagem' => 'Livro cadastrado com sucesso!', 'id' => $db->lastInsertId()]);
        }

        // ATUALIZAR
        if ($metodo === 'PUT' && $acao === 'atualizar') {
            $id          = intval($body['id']              ?? 0);
            $titulo      = sanitizar($body['titulo']       ?? '');
            $autor       = sanitizar($body['autor']        ?? '');
            $ano         = intval($body['ano_publicacao']  ?? 0);
            $categoriaId = intval($body['categoria_id']    ?? 0);

            if ($id <= 0 || empty($titulo) || empty($autor) || $ano < 1000 || $ano > 2099 || $categoriaId <= 0) {
                responder(['sucesso' => false, 'mensagem' => 'Dados inválidos para atualização.'], 400);
            }

            $stmt = $db->prepare("
                UPDATE livro SET titulo = :titulo, autor = :autor,
                ano_publicacao = :ano, categoria_id = :cat WHERE id = :id
            ");
            $stmt->execute([':titulo' => $titulo, ':autor' => $autor, ':ano' => $ano, ':cat' => $categoriaId, ':id' => $id]);
            responder(['sucesso' => true, 'mensagem' => 'Livro atualizado com sucesso!']);
        }

        // EXCLUIR
        if ($metodo === 'DELETE' && $acao === 'excluir') {
            $id = intval($_GET['id'] ?? 0);

            if ($id <= 0) {
                responder(['sucesso' => false, 'mensagem' => 'ID inválido.'], 400);
            }

            $stmt = $db->prepare("DELETE FROM livro WHERE id = :id");
            $stmt->execute([':id' => $id]);
            responder(['sucesso' => true, 'mensagem' => 'Livro excluído com sucesso!']);
        }
    }

    // Rota não encontrada
    responder(['sucesso' => false, 'mensagem' => 'Recurso ou ação não encontrados.'], 404);

} catch (PDOException $e) {
    responder(['sucesso' => false, 'mensagem' => 'Erro no banco de dados: ' . $e->getMessage()], 500);
} catch (Exception $e) {
    responder(['sucesso' => false, 'mensagem' => 'Erro interno: ' . $e->getMessage()], 500);
}
