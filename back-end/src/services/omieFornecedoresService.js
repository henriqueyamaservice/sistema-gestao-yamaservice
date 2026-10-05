import https from 'https';

const OMIE_CLIENTES_URL = 'https://app.omie.com.br/api/v1/geral/clientes/';

async function chamarOmieClientes(method, params) {
  const appKey = process.env.OMIE_APP_KEY;
  const appSecret = process.env.OMIE_APP_SECRET;

  if (!appKey || !appSecret) {
    return { erro: true, mensagem: 'Credenciais da Omie não configuradas no backend' };
  }

  const payload = {
    call: method,
    app_key: appKey,
    app_secret: appSecret,
    param: [params]
  };

  return new Promise((resolve) => {
    const dataString = JSON.stringify(payload);
    
    const options = {
      hostname: 'app.omie.com.br',
      port: 443,
      path: '/api/v1/geral/clientes/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (res.statusCode < 200 || res.statusCode >= 300) {
            resolve({ erro: true, mensagem: `Erro Omie (${res.statusCode})`, detalhes: data });
          } else {
            resolve({ erro: false, dados: data });
          }
        } catch (e) {
          resolve({ erro: true, mensagem: 'Erro ao fazer parse da resposta da Omie', detalhes: e.message });
        }
      });
    });

    req.on('error', (e) => {
      console.error('HTTPS request error:', e);
      resolve({ erro: true, mensagem: 'Falha de comunicação com a Omie (Clientes)', detalhes: e.message });
    });

    req.write(dataString);
    req.end();
  });
}

/**
 * Cadastra ou atualiza um fornecedor (Cliente/Fornecedor) na Omie usando CNPJ/CPF como chave
 */
export async function upsertFornecedorOmie(dados) {
  const params = {
    cnpj_cpf: dados.cnpj_cpf,
    razao_social: dados.razao_social,
    nome_fantasia: dados.nome_fantasia || dados.razao_social
  };

  // Opcionais
  if (dados.email) params.email = dados.email;
  if (dados.cep) params.cep = dados.cep;
  if (dados.endereco) params.endereco = dados.endereco;
  if (dados.bairro) params.bairro = dados.bairro;
  if (dados.cidade) params.cidade = dados.cidade; // Aqui a Omie prefere cCidade (IBGE), mas pra upsert pode aceitar cidade texto ou precisamos ignorar. A doc diz `cidade` string40.
  if (dados.estado) params.estado = dados.estado;
  
  // Como é fornecedor, podemos definir tags padrão se quisermos, mas o padrão Omie já aceita.
  // params.tags = [{ tag: 'Fornecedor' }]; // Opcional, a Omie geralmente classifica automaticamente dependendo da nota.

  return chamarOmieClientes('UpsertClienteCpfCnpj', params);
}

export default {
  upsertFornecedorOmie
};
