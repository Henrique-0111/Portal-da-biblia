
# Projeto Página de Contato com Supabase

Este projeto cria uma página de contato com HTML, CSS e JavaScript. Quando o usuário envia o formulário, os dados são salvos em uma tabela do Supabase.

## Arquivos do projeto

- `contato.html` → estrutura da página
- `contato.css` → aparência da página
- `contato.js` → integração com o Supabase
- `README.md` → passo a passo do exercício

## Passo 1: criar a tabela no Supabase

Crie uma tabela chamada:

`contatos`

Campos sugeridos:

- `id` → int8 / identity
- `nome` → text
- `email` → text
- `assunto` → text
- `mensagem` → text
- `created_at` → timestamptz com valor padrão `now()`

## Passo 2: configurar a política de INSERT

Na tabela `contatos`, ative o RLS e crie uma política que permita apenas inserção pública.

A condição pode ser:

```sql
true
```

Importante: não é necessário liberar `SELECT` para visitantes. O objetivo é permitir que qualquer pessoa envie uma mensagem sem permitir que veja as mensagens dos outros usuários.

## Passo 3: configurar a conexão no JavaScript

Abra o arquivo `contato.js` e substitua:

```javascript
const SUPABASE_URL = "SUA_URL";
const SUPABASE_KEY = "SUA_PUBLISHABLE_KEY";
```

Pelos dados do projeto do Supabase.

## Passo 4: testar a página

Abra `contato.html` no navegador.

Preencha:

- Nome
- E-mail
- Assunto
- Mensagem

Clique em `Enviar mensagem`.

Depois, volte ao Supabase e verifique se o registro apareceu na tabela `contatos`.

## O que observar no HTML

Revise com a turma:

- `form`
- `label`
- `input`
- `textarea`
- `button`
- `required`
- `type="email"`
- `id`

## O que observar no JavaScript

### Buscar o formulário

```javascript
const form = document.getElementById("formContato");
```

### Escutar o envio do formulário

```javascript
form.addEventListener("submit", async function(event) {
```

### Impedir o comportamento padrão do formulário

```javascript
event.preventDefault();
```

### Capturar o que foi digitado

```javascript
const nome = document.getElementById("nome").value;
```

### Inserir no Supabase

```javascript
.from("contatos")
.insert([...])
```

### Limpar o formulário depois do envio

```javascript
form.reset();
```

## Desafios extras

1. Adicionar campo de telefone.
2. Criar um `select` para o assunto.
3. Não permitir mensagem com menos de 20 caracteres.
4. Deixar a mensagem de sucesso verde e a de erro vermelha.
5. Desabilitar o botão enquanto a mensagem estiver sendo enviada.
6. Criar uma página administrativa para listar as mensagens recebidas.

## Objetivo da atividade

Entender o fluxo:

HTML → JavaScript → Supabase → Banco de Dados

E perceber como uma página de contato simples já representa uma aplicação integrada a um banco de dados.
