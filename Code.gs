/**
 * CRM Oliveira — backend (Google Apps Script)
 * Planilha: CRM Paola
 * GMarques Soluções Financeiras — Consórcio e Financiamento
 *
 * COMO USAR:
 * 1. Abra a planilha "CRM Paola" no Google Sheets.
 * 2. Menu Extensões > Apps Script.
 * 3. Apague o conteúdo do arquivo Code.gs padrão e cole TODO este arquivo.
 * 4. Na barra de funções (topo), escolha a função "setup" e clique em Executar (▶).
 *    Autorize o acesso quando solicitado. Isso cria/atualiza as abas e a chave de API.
 *    Se você já tinha rodado uma versão anterior, pode rodar de novo sem medo:
 *    o setup() migra os dados existentes em vez de apagá-los.
 * 5. Menu Implantar > Nova implantação > tipo "Aplicativo da Web".
 *    - Executar como: Eu (seu e-mail)
 *    - Quem pode acessar: Qualquer pessoa
 *    Clique em Implantar e copie a URL "/exec" gerada.
 * 6. Cole essa URL e a Chave de API (mostrada no final do setup) no index.html
 *    do CRM Oliveira, na tela de conexão.
 */

var VENDEDOR_PADRAO = 'Paola Caroline';

var ABAS = {
  CLIENTES: 'Clientes',
  NEGOCIACOES: 'Negociacoes',
  INTERACOES: 'Interacoes',
  ETAPAS: 'Etapas',
  PRODUTOS: 'Produtos',
  FORMAS: 'FormasPagamento',
  LOG: 'LogFunil',
  CONFIG: 'Config'
};

var CAMPOS_CLIENTES = ['ID','Nome','CPF_CNPJ','Telefone','Email','Cidade','Estado','Origem','DataCadastro','Vendedor','Status','Observacoes'];
var CAMPOS_NEGOCIACOES = ['ID','ClienteID','ClienteNome','Tipo','Produto','ValorCredito','ValorEntrada','Parcelas','Etapa','Vendedor','Probabilidade','DataCriacao','DataAtualizacao','PrevisaoFechamento','DataFechamento','MotivoPerda','Observacoes'];
var CAMPOS_INTERACOES = ['ID','NegociacaoID','Data','Tipo','Descricao','Usuario'];
var CAMPOS_ETAPAS = ['ID','Ordem','Nome','Cor','Tipo'];
var CAMPOS_PRODUTOS = ['ID','Nome','Categoria','Status','ValorTotal','ValorEntrada'];
var CAMPOS_FORMAS = ['ID','Nome','Status'];
var CAMPOS_LOG = ['ID','NegociacaoID','ClienteNome','EtapaAnterior','EtapaAtual','Data'];
var CAMPOS_CONFIG = ['Chave','Valor'];

var ETAPAS_PADRAO = [
  [1,'Novo Lead','#8B5CF6','Padrao'],
  [2,'Contato Realizado','#A78BFA','Padrao'],
  [3,'Qualificação','#C084FC','Padrao'],
  [4,'Proposta Enviada','#D8B4FE','Padrao'],
  [5,'Análise de Crédito','#E9A8F2','Padrao'],
  [6,'Documentação','#F0ABFC','Padrao'],
  [7,'Fechado - Ganho','#16A34A','Ganho'],
  [8,'Fechado - Perdido','#DC2626','Perdido']
];

var FORMAS_PADRAO = ['Consórcio','À Vista','Parcelado no Cartão','Parcelado no Boleto','Financiamento'];

/* ══════════════════ SETUP ══════════════════ */

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  criarAba_(ss, ABAS.CLIENTES, CAMPOS_CLIENTES);
  criarAba_(ss, ABAS.NEGOCIACOES, CAMPOS_NEGOCIACOES);
  criarAba_(ss, ABAS.INTERACOES, CAMPOS_INTERACOES);

  migrarEtapas_(ss);
  var etapas = criarAba_(ss, ABAS.ETAPAS, CAMPOS_ETAPAS);
  if (etapas.getLastRow() < 2) {
    var linhasEtapas = ETAPAS_PADRAO.map(function(row){ return [Utilities.getUuid(), row[0], row[1], row[2], row[3]]; });
    etapas.getRange(2, 1, linhasEtapas.length, CAMPOS_ETAPAS.length).setValues(linhasEtapas);
  }

  var produtos = criarAba_(ss, ABAS.PRODUTOS, CAMPOS_PRODUTOS);
  var formas = criarAba_(ss, ABAS.FORMAS, CAMPOS_FORMAS);
  if (formas.getLastRow() < 2) {
    var linhasFormas = FORMAS_PADRAO.map(function(nome){ return [Utilities.getUuid(), nome, 'Ativo']; });
    formas.getRange(2, 1, linhasFormas.length, CAMPOS_FORMAS.length).setValues(linhasFormas);
  }

  criarAba_(ss, ABAS.LOG, CAMPOS_LOG);
  var config = criarAba_(ss, ABAS.CONFIG, CAMPOS_CONFIG);

  var chaveAtual = lerConfig_(config, 'ChaveAPI');
  if (!chaveAtual) {
    var novaChave = Utilities.getUuid();
    escreverConfig_(config, 'ChaveAPI', novaChave);
    chaveAtual = novaChave;
  }
  if (!lerConfig_(config, 'Empresa')) escreverConfig_(config, 'Empresa', 'GMarques Soluções Financeiras');
  if (!lerConfig_(config, 'CRM')) escreverConfig_(config, 'CRM', 'CRM Oliveira');
  escreverConfig_(config, 'VendedorPadrao', VENDEDOR_PADRAO);

  ['Sheet1','Página1','Planilha1'].forEach(function(nome){
    var s = ss.getSheetByName(nome);
    if (s && ss.getSheets().length > 1) ss.deleteSheet(s);
  });

  SpreadsheetApp.getUi().alert(
    'Estrutura criada/atualizada com sucesso!\n\n' +
    'Chave de API (guarde esta chave):\n' + chaveAtual + '\n\n' +
    'Se você já tinha uma implantação de Aplicativo da Web publicada, não precisa criar outra — as mudanças de código já valem nela. ' +
    'Se ainda não publicou, use o menu Implantar > Nova implantação.'
  );
}

function criarAba_(ss, nome, headers) {
  var sheet = ss.getSheetByName(nome);
  if (!sheet) sheet = ss.insertSheet(nome);
  var linha1 = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  var precisaHeader = headers.some(function(h, i){ return linha1[i] !== h; });
  if (precisaHeader) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#2E1A47').setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
  }
  return sheet;
}

/**
 * Migra a aba Etapas de versões antigas (sem coluna ID e/ou Tipo) para o formato atual,
 * preservando Ordem/Nome/Cor já cadastrados e as negociações existentes que apontam para eles.
 */
function migrarEtapas_(ss) {
  var sheet = ss.getSheetByName(ABAS.ETAPAS);
  if (!sheet) return;

  var largura = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, largura).getValues()[0];

  if (headers[0] !== 'ID') {
    sheet.insertColumnBefore(1);
    sheet.getRange(1, 1).setValue('ID');
    var lastRow = sheet.getLastRow();
    for (var r = 2; r <= lastRow; r++) {
      var nome = sheet.getRange(r, 3).getValue();
      if (nome) sheet.getRange(r, 1).setValue(Utilities.getUuid());
    }
  }

  largura = Math.max(sheet.getLastColumn(), 1);
  headers = sheet.getRange(1, 1, 1, largura).getValues()[0];
  if (headers.indexOf('Tipo') === -1) {
    var colTipo = largura + 1;
    sheet.getRange(1, colTipo).setValue('Tipo');
    var lastRow2 = sheet.getLastRow();
    for (var r2 = 2; r2 <= lastRow2; r2++) {
      var nomeEtapa = String(sheet.getRange(r2, 3).getValue());
      var tipo = 'Padrao';
      if (nomeEtapa.indexOf('Ganho') !== -1) tipo = 'Ganho';
      if (nomeEtapa.indexOf('Perdido') !== -1) tipo = 'Perdido';
      sheet.getRange(r2, colTipo).setValue(tipo);
    }
  }
}

function lerConfig_(configSheet, chave) {
  var dados = configSheet.getDataRange().getValues();
  for (var i = 1; i < dados.length; i++) {
    if (dados[i][0] === chave) return dados[i][1];
  }
  return null;
}

function escreverConfig_(configSheet, chave, valor) {
  var dados = configSheet.getDataRange().getValues();
  for (var i = 1; i < dados.length; i++) {
    if (dados[i][0] === chave) {
      configSheet.getRange(i + 1, 2).setValue(valor);
      return;
    }
  }
  configSheet.appendRow([chave, valor]);
}

function getApiKey_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return lerConfig_(ss.getSheetByName(ABAS.CONFIG), 'ChaveAPI');
}

/* ══════════════════ ENTRADA HTTP ══════════════════ */

function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) {}
  return responderJson_(rotear_(body));
}

function doGet(e) {
  var body = e.parameter || {};
  if (body.dados) { try { body = JSON.parse(body.dados); } catch (err) {} }
  return responderJson_(rotear_(body));
}

function responderJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function rotear_(body) {
  var action = body.action;

  if (action === 'ping') {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var config = ss.getSheetByName(ABAS.CONFIG);
    return { ok: true, empresa: lerConfig_(config, 'Empresa'), crm: lerConfig_(config, 'CRM') };
  }

  if (body.chave !== getApiKey_()) {
    return { ok: false, erro: 'Chave de API inválida.' };
  }

  try {
    switch (action) {
      case 'listarClientes': return { ok: true, dados: listarClientes_() };
      case 'salvarCliente': return { ok: true, dados: salvarCliente_(body.cliente) };
      case 'excluirCliente': return { ok: true, dados: excluirLinhaPorId_(ABAS.CLIENTES, body.id) };

      case 'listarNegociacoes': return { ok: true, dados: listarNegociacoes_() };
      case 'salvarNegociacao': return { ok: true, dados: salvarNegociacao_(body.negociacao) };
      case 'moverEtapa': return { ok: true, dados: moverEtapa_(body.id, body.etapa) };
      case 'excluirNegociacao': return { ok: true, dados: excluirLinhaPorId_(ABAS.NEGOCIACOES, body.id) };

      case 'listarEtapas': return { ok: true, dados: listarEtapas_() };
      case 'salvarEtapa': return { ok: true, dados: salvarEtapa_(body.etapa) };
      case 'excluirEtapa': return { ok: true, dados: excluirEtapa_(body.id) };

      case 'listarProdutos': return { ok: true, dados: listarItensSimples_(ABAS.PRODUTOS, CAMPOS_PRODUTOS) };
      case 'salvarProduto': return { ok: true, dados: salvarItemSimples_(ABAS.PRODUTOS, CAMPOS_PRODUTOS, body.produto) };
      case 'excluirProduto': return { ok: true, dados: excluirLinhaPorId_(ABAS.PRODUTOS, body.id) };

      case 'listarFormasPagamento': return { ok: true, dados: listarItensSimples_(ABAS.FORMAS, CAMPOS_FORMAS) };
      case 'salvarFormaPagamento': return { ok: true, dados: salvarItemSimples_(ABAS.FORMAS, CAMPOS_FORMAS, body.forma) };
      case 'excluirFormaPagamento': return { ok: true, dados: excluirLinhaPorId_(ABAS.FORMAS, body.id) };

      case 'listarInteracoes': return { ok: true, dados: listarInteracoes_(body.negociacaoId) };
      case 'salvarInteracao': return { ok: true, dados: salvarInteracao_(body.interacao) };

      case 'listarLogFunil': return { ok: true, dados: listarLogFunil_() };

      default: return { ok: false, erro: 'Ação desconhecida: ' + action };
    }
  } catch (err) {
    return { ok: false, erro: String(err) };
  }
}

/* ══════════════════ UTIL PLANILHA ══════════════════ */

function aba_(nome) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nome);
}

function linhasComoObjetos_(sheet, campos) {
  var dados = sheet.getDataRange().getValues();
  var resultado = [];
  for (var i = 1; i < dados.length; i++) {
    if (!dados[i][0]) continue;
    var obj = {};
    for (var c = 0; c < campos.length; c++) obj[campos[c]] = dados[i][c];
    resultado.push(obj);
  }
  return resultado;
}

function acharLinhaPorId_(sheet, id) {
  var dados = sheet.getDataRange().getValues();
  for (var i = 1; i < dados.length; i++) {
    if (String(dados[i][0]) === String(id)) return i + 1;
  }
  return -1;
}

function excluirLinhaPorId_(nomeAba, id) {
  var sheet = aba_(nomeAba);
  var linha = acharLinhaPorId_(sheet, id);
  if (linha > 0) sheet.deleteRow(linha);
  return { id: id };
}

function agora_() {
  return new Date().toISOString();
}

/* ══════════════════ CRUD GENÉRICO (Produtos / Formas de Pagamento) ══════════════════ */

function listarItensSimples_(nomeAba, campos) {
  return linhasComoObjetos_(aba_(nomeAba), campos);
}

function salvarItemSimples_(nomeAba, campos, obj) {
  var sheet = aba_(nomeAba);
  if (!obj.ID) obj.ID = Utilities.getUuid();
  var linha = acharLinhaPorId_(sheet, obj.ID);
  var novo = linha < 1;
  if (!obj.Status) obj.Status = 'Ativo';
  var valores = campos.map(function(c){ return obj[c] !== undefined ? obj[c] : ''; });
  if (!novo) sheet.getRange(linha, 1, 1, campos.length).setValues([valores]);
  else sheet.appendRow(valores);
  return obj;
}

/* ══════════════════ CLIENTES ══════════════════ */

function listarClientes_() {
  return linhasComoObjetos_(aba_(ABAS.CLIENTES), CAMPOS_CLIENTES);
}

function salvarCliente_(c) {
  var sheet = aba_(ABAS.CLIENTES);
  if (!c.ID) c.ID = Utilities.getUuid();
  var linha = acharLinhaPorId_(sheet, c.ID);
  var novo = linha < 1;

  if (novo && !c.DataCadastro) c.DataCadastro = agora_();
  if (!c.Status) c.Status = 'Ativo';
  if (!c.Vendedor) c.Vendedor = VENDEDOR_PADRAO;

  var valores = CAMPOS_CLIENTES.map(function(campo){ return c[campo] !== undefined ? c[campo] : ''; });
  if (!novo) sheet.getRange(linha, 1, 1, CAMPOS_CLIENTES.length).setValues([valores]);
  else sheet.appendRow(valores);
  return c;
}

/* ══════════════════ NEGOCIAÇÕES (FUNIL) ══════════════════ */

function listarNegociacoes_() {
  return linhasComoObjetos_(aba_(ABAS.NEGOCIACOES), CAMPOS_NEGOCIACOES);
}

function nomeClientePorId_(clienteId) {
  var linha = acharLinhaPorId_(aba_(ABAS.CLIENTES), clienteId);
  if (linha < 1) return '';
  var col = CAMPOS_CLIENTES.indexOf('Nome') + 1;
  return aba_(ABAS.CLIENTES).getRange(linha, col).getValue();
}

function vendedorClientePorId_(clienteId) {
  var linha = acharLinhaPorId_(aba_(ABAS.CLIENTES), clienteId);
  if (linha < 1) return '';
  var col = CAMPOS_CLIENTES.indexOf('Vendedor') + 1;
  return aba_(ABAS.CLIENTES).getRange(linha, col).getValue();
}

function tipoDaEtapa_(nomeEtapa) {
  var etapas = listarEtapas_();
  for (var i = 0; i < etapas.length; i++) {
    if (etapas[i].Nome === nomeEtapa) return etapas[i].Tipo || 'Padrao';
  }
  return 'Padrao';
}

function salvarNegociacao_(n) {
  var sheet = aba_(ABAS.NEGOCIACOES);
  if (!n.ID) n.ID = Utilities.getUuid();
  var linha = acharLinhaPorId_(sheet, n.ID);
  var novo = linha < 1;

  var etapaAnterior = '';
  if (!novo) {
    var colEtapa = CAMPOS_NEGOCIACOES.indexOf('Etapa') + 1;
    etapaAnterior = sheet.getRange(linha, colEtapa).getValue();
  }

  if (novo && !n.DataCriacao) n.DataCriacao = agora_();
  if (!n.Etapa) n.Etapa = etapaAnterior || 'Novo Lead';
  n.DataAtualizacao = agora_();
  n.ClienteNome = nomeClientePorId_(n.ClienteID) || n.ClienteNome || '';
  n.Vendedor = vendedorClientePorId_(n.ClienteID) || VENDEDOR_PADRAO;

  var tipoNovaEtapa = tipoDaEtapa_(n.Etapa);
  if ((tipoNovaEtapa === 'Ganho' || tipoNovaEtapa === 'Perdido') && !n.DataFechamento) {
    n.DataFechamento = agora_();
  }

  var valores = CAMPOS_NEGOCIACOES.map(function(campo){ return n[campo] !== undefined ? n[campo] : ''; });
  if (!novo) sheet.getRange(linha, 1, 1, CAMPOS_NEGOCIACOES.length).setValues([valores]);
  else sheet.appendRow(valores);

  if (novo || etapaAnterior !== n.Etapa) {
    registrarLog_(n.ID, n.ClienteNome, novo ? '' : etapaAnterior, n.Etapa);
  }
  return n;
}

function moverEtapa_(id, etapa) {
  var sheet = aba_(ABAS.NEGOCIACOES);
  var linha = acharLinhaPorId_(sheet, id);
  if (linha < 1) return { erro: 'Negociação não encontrada' };

  var colEtapa = CAMPOS_NEGOCIACOES.indexOf('Etapa') + 1;
  var colAtualizacao = CAMPOS_NEGOCIACOES.indexOf('DataAtualizacao') + 1;
  var colFechamento = CAMPOS_NEGOCIACOES.indexOf('DataFechamento') + 1;
  var colClienteNome = CAMPOS_NEGOCIACOES.indexOf('ClienteNome') + 1;

  var etapaAnterior = sheet.getRange(linha, colEtapa).getValue();
  var clienteNome = sheet.getRange(linha, colClienteNome).getValue();

  sheet.getRange(linha, colEtapa).setValue(etapa);
  sheet.getRange(linha, colAtualizacao).setValue(agora_());

  var tipoNovaEtapa = tipoDaEtapa_(etapa);
  if (tipoNovaEtapa === 'Ganho' || tipoNovaEtapa === 'Perdido') {
    sheet.getRange(linha, colFechamento).setValue(agora_());
  }

  if (etapaAnterior !== etapa) {
    registrarLog_(id, clienteNome, etapaAnterior, etapa);
  }
  return { id: id, etapa: etapa };
}

/* ══════════════════ ETAPAS (CRUD) ══════════════════ */

function listarEtapas_() {
  var dados = aba_(ABAS.ETAPAS).getDataRange().getValues();
  var resultado = [];
  for (var i = 1; i < dados.length; i++) {
    if (!dados[i][2]) continue;
    resultado.push({ ID: dados[i][0], Ordem: dados[i][1], Nome: dados[i][2], Cor: dados[i][3], Tipo: dados[i][4] || 'Padrao' });
  }
  resultado.sort(function(a,b){ return (Number(a.Ordem)||0) - (Number(b.Ordem)||0); });
  return resultado;
}

function salvarEtapa_(et) {
  var sheet = aba_(ABAS.ETAPAS);
  if (!et.ID) et.ID = Utilities.getUuid();
  var linha = acharLinhaPorId_(sheet, et.ID);
  var novo = linha < 1;

  var nomeAntigo = null;
  if (!novo) {
    var colNome = CAMPOS_ETAPAS.indexOf('Nome') + 1;
    nomeAntigo = sheet.getRange(linha, colNome).getValue();
  }

  if (!et.Tipo) et.Tipo = 'Padrao';
  if (!et.Cor) et.Cor = '#8B5CF6';
  if (et.Ordem === undefined || et.Ordem === '') et.Ordem = sheet.getLastRow();

  var valores = CAMPOS_ETAPAS.map(function(c){ return et[c] !== undefined ? et[c] : ''; });
  if (!novo) sheet.getRange(linha, 1, 1, CAMPOS_ETAPAS.length).setValues([valores]);
  else sheet.appendRow(valores);

  if (nomeAntigo && nomeAntigo !== et.Nome) {
    renomearEtapaEmNegociacoes_(nomeAntigo, et.Nome);
  }
  return et;
}

function renomearEtapaEmNegociacoes_(nomeAntigo, nomeNovo) {
  var sheet = aba_(ABAS.NEGOCIACOES);
  var colEtapa = CAMPOS_NEGOCIACOES.indexOf('Etapa') + 1;
  var dados = sheet.getDataRange().getValues();
  for (var i = 1; i < dados.length; i++) {
    if (dados[i][colEtapa - 1] === nomeAntigo) {
      sheet.getRange(i + 1, colEtapa).setValue(nomeNovo);
    }
  }
}

function excluirEtapa_(id) {
  var sheet = aba_(ABAS.ETAPAS);
  var linha = acharLinhaPorId_(sheet, id);
  if (linha < 1) throw new Error('Etapa não encontrada.');

  var colNome = CAMPOS_ETAPAS.indexOf('Nome') + 1;
  var nome = sheet.getRange(linha, colNome).getValue();

  var negociacoes = aba_(ABAS.NEGOCIACOES).getDataRange().getValues();
  var colEtapaNeg = CAMPOS_NEGOCIACOES.indexOf('Etapa');
  var emUso = negociacoes.slice(1).some(function(row){ return row[colEtapaNeg] === nome; });
  if (emUso) throw new Error('Existem negociações nesta etapa. Mova-as antes de excluir.');

  sheet.deleteRow(linha);
  return { id: id };
}

/* ══════════════════ INTERAÇÕES (HISTÓRICO) ══════════════════ */

function listarInteracoes_(negociacaoId) {
  var todas = linhasComoObjetos_(aba_(ABAS.INTERACOES), CAMPOS_INTERACOES);
  if (!negociacaoId) return todas;
  return todas.filter(function(i){ return String(i.NegociacaoID) === String(negociacaoId); });
}

function salvarInteracao_(i) {
  var sheet = aba_(ABAS.INTERACOES);
  if (!i.ID) i.ID = Utilities.getUuid();
  if (!i.Data) i.Data = agora_();
  var valores = CAMPOS_INTERACOES.map(function(campo){ return i[campo] !== undefined ? i[campo] : ''; });
  sheet.appendRow(valores);
  return i;
}

/* ══════════════════ LOG DO FUNIL ══════════════════ */

function registrarLog_(negociacaoId, clienteNome, etapaAnterior, etapaAtual) {
  var sheet = aba_(ABAS.LOG);
  sheet.appendRow([Utilities.getUuid(), negociacaoId, clienteNome, etapaAnterior || '', etapaAtual || '', agora_()]);
}

function listarLogFunil_() {
  return linhasComoObjetos_(aba_(ABAS.LOG), CAMPOS_LOG);
}
