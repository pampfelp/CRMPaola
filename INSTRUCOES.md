# CRM Oliveira — Como ligar a planilha e publicar o sistema

Este pacote tem estes arquivos:
- `Code.gs` → backend (Google Apps Script), roda dentro da planilha **CRM Paola**
- `index.html` → o sistema (CRM Oliveira) que a Paola vai usar no navegador
- `manifest.webmanifest`, `sw.js`, `favicon.ico`, `favicon-16.png`, `favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` → deixam o CRM instalável como aplicativo (ícone + "Instalar app"). **Precisam ficar na mesma pasta que o `index.html`**, sempre que for hospedar ou enviar o sistema — não são opcionais.

## Passo 1 — Abrir a planilha
Abra **CRM Paola** no seu Google Drive (foi criada na raiz do seu Drive).

## Passo 2 — Colar o backend
1. Na planilha, vá em **Extensões → Apps Script**.
2. Apague o conteúdo do arquivo `Code.gs` que abrir e cole todo o conteúdo do arquivo `Code.gs` deste pacote (substituindo qualquer versão anterior que você já tenha colado).
3. Salve (Ctrl+S).

> **Já tinha rodado uma versão anterior deste CRM?** Sem problema — o `setup()` é seguro para rodar de novo. Ele **migra** a aba `Etapas` existente (adiciona ID e Tipo sem apagar suas etapas), adiciona as colunas `ValorTotal`/`ValorEntrada` em `Produtos` caso ainda não existam, e só **cria** as abas novas (`Produtos`, `FormasPagamento`, `LogFunil`) que ainda não existem. Nenhum cliente, negociação, interação ou produto já cadastrado é apagado. Você **não precisa criar uma nova implantação** — se já publicou o Aplicativo da Web antes, a URL/exec continua a mesma e passa a usar o código novo automaticamente.

## Passo 3 — Criar/atualizar a estrutura de abas
1. No topo do editor, selecione a função `setup` na lista de funções.
2. Clique em **Executar (▶)**.
3. Na primeira vez, o Google vai pedir autorização — aceite (é a sua própria conta acessando a sua própria planilha).
4. Vai aparecer um alerta com a **Chave de API**. Se a planilha já tinha uma chave de uma execução anterior, ela é **reaproveitada** (não muda) — então seu `index.html` já conectado continua funcionando sem precisar reconectar.

Isso cria/atualiza automaticamente as abas:
- `Clientes`, `Negociacoes`, `Interacoes` (sem mudanças de estrutura)
- `Etapas` — agora com colunas `ID` e `Tipo` (Padrao/Ganho/Perdido), usadas pelo CRUD de etapas
- `Produtos` — catálogo de bens desejados (novo)
- `FormasPagamento` — Consórcio, À Vista, Parcelado no Cartão, Parcelado no Boleto, Financiamento (novo)
- `LogFunil` — histórico de etapa anterior/atual de cada negociação (novo)
- `Config`

## Passo 4 — Publicar como Aplicativo da Web
1. No editor do Apps Script, clique em **Implantar → Nova implantação**.
2. Em "Selecionar tipo", escolha **Aplicativo da Web**.
3. Configure:
   - Executar como: **Eu** (seu e-mail)
   - Quem pode acessar: **Qualquer pessoa**
4. Clique em **Implantar** e autorize novamente se solicitado.
5. Copie a **URL do Aplicativo da Web** (termina em `/exec`).

## Passo 5 — Conectar o index.html
1. Abra o arquivo `index.html` (duas vezes clique, ou arraste para o navegador).
2. Na tela de conexão, cole:
   - **URL do Aplicativo da Web** → a URL do Passo 4
   - **Chave de API** → a chave do Passo 3
3. Clique em **Conectar**. O sistema vai carregar o Funil e os Clientes.

A conexão fica salva no navegador (não precisa repetir todo dia). Se precisar trocar de planilha ou chave, use "reconfigurar conexão" no rodapé do menu lateral.

## Onde hospedar o index.html para a Paola usar
Sem hospedagem, o `index.html` funciona localmente (abrindo o arquivo direto no navegador) — mas **o botão de instalar o app só funciona com o site hospedado em HTTPS** (abrir direto do computador com duplo clique não é suportado pelos navegadores para isso). Para a Paola acessar de qualquer lugar e poder instalar como aplicativo, hospede a pasta inteira (todos os arquivos, não só o `index.html`) em qualquer serviço de arquivos estáticos com HTTPS: Netlify, GitHub Pages, Google Sites (com upload dos arquivos), Vercel, etc.

## Ícone e instalação como aplicativo (PWA)
- O ícone enviado (logo roxo "O" com "OLIVEIRA") já está aplicado como favicon da aba do navegador e como ícone do aplicativo instalado.
- Ao abrir o CRM hospedado em HTTPS (Chrome/Edge no Android ou desktop), aparece automaticamente uma barra no rodapé oferecendo **"Instalar"** — ao tocar, o navegador mostra a autorização nativa de instalação, e o app passa a abrir em janela própria, sem barra de endereço, como um aplicativo normal do celular.
- No **iPhone/iPad (Safari)**, o iOS não permite esse prompt automático — por isso a barra mostra a instrução: toque no ícone de Compartilhar e depois em "Adicionar à Tela de Início".
- Quem fechar a barra sem instalar não é incomodado de novo (fica salvo no navegador); para ver de novo, é só limpar os dados do site ou usar outro navegador/dispositivo.

## Sempre que atualizar o Code.gs
Depois de editar `Code.gs` no futuro, é preciso criar uma **nova implantação** (ou usar "Gerenciar implantações → editar → nova versão") para as mudanças valerem na URL publicada.

## Estrutura de dados criada na planilha
- **Clientes**: ID, Nome, CPF_CNPJ, Telefone, Email, Cidade, Estado, Origem, DataCadastro, Vendedor, Status, Observacoes
- **Negociacoes** (funil): ID, ClienteID, ClienteNome, Tipo (forma de pagamento), Produto, ValorCredito, ValorEntrada, Parcelas, Etapa, Vendedor, Probabilidade, DataCriacao, DataAtualizacao, PrevisaoFechamento, DataFechamento, MotivoPerda, Observacoes
- **Interacoes** (histórico de contato): ID, NegociacaoID, Data, Tipo, Descricao, Usuario
- **Etapas** (colunas do Kanban, editável na tela "Etapas do Funil"): ID, Ordem, Nome, Cor, Tipo (Padrao/Ganho/Perdido)
- **Produtos** (editável na tela "Produtos"): ID, Nome, Categoria, Status, ValorTotal, ValorEntrada — esses dois valores vêm pré-preenchidos na negociação ao selecionar o produto, mas podem ser editados livremente ali
- **FormasPagamento** (editável na tela "Formas de Pagamento"): ID, Nome, Status
- **LogFunil**: ID, NegociacaoID, ClienteNome, EtapaAnterior, EtapaAtual, Data — alimenta o gráfico "Atividade do Funil"
- **Config**: ChaveAPI, Empresa, CRM, VendedorPadrao

## Regras importantes do funil
- O **vendedor responsável é sempre definido pelo cliente** (campo Vendedor do cadastro do cliente) — a negociação não tem um campo de vendedor próprio, ela herda automaticamente. O padrão é **Paola Caroline**.
- É possível **cadastrar um cliente novo direto na tela de Nova Negociação** (link "+ Cadastrar novo cliente" na busca de cliente), sem precisar ir até a tela de Clientes.
- Todas as ações (salvar, mover, excluir) atualizam a tela **imediatamente**; a gravação na planilha acontece em segundo plano. Só aparece um aviso se a gravação falhar — nesse caso os dados são recarregados da planilha automaticamente.
