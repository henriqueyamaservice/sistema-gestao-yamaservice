import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const OMIE_APP_KEY = process.env.OMIE_APP_KEY;
const OMIE_APP_SECRET = process.env.OMIE_APP_SECRET;

async function testPedido() {
  const payloadOmie = {
    call: "IncluirPedido",
    app_key: OMIE_APP_KEY,
    app_secret: OMIE_APP_SECRET,
    param: [{
      cabecalho: {
        codigo_cliente: 748316329, // Jonas Rodrigues Miranda
        quantidade_itens: 1,
        codigo_pedido_integracao: "TESTE-REQ-JONAS-4",
        etapa: "10",
        data_previsao: new Date().toLocaleDateString('pt-BR')
      },
      informacoes_adicionais: {
        codigo_categoria: "1.01.01",
        codigo_conta_corrente: 685531847, // Padrao
        consumidor_final: "S"
      },
      det: [
        {
          ide: { codigo_item_integracao: "1" },
          produto: {
            codigo_produto: 12033114029, // PRD10936
            quantidade: 1,
            valor_unitario: 1,
            tipo_desconto: "V",
            valor_desconto: 0
          }
        }
      ]
    }]
  };
  
  const response = await fetch('https://app.omie.com.br/api/v1/produtos/pedido/', {
    method: 'POST',
    headers: { 'Content-type': 'application/json' },
    body: JSON.stringify(payloadOmie)
  });
  
  console.dir(await response.json(), { depth: null });
}

testPedido();
