import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function injeta() {
  const filePath = path.resolve(__dirname, '..', 'data', 'produtos.json');
  const fileData = await fs.readFile(filePath, 'utf-8');
  const produtos = JSON.parse(fileData);

  // Inserir os produtos da imagem no começo da lista
  produtos.unshift(
    {
      codigo: "PRD09736",
      descricao: "TUBO ESGOTO 6M DN 200MM - PLASTILIT",
      quantidade_estoque: 12,
      valor_unitario: 89.90,
      caracteristicas: [
        { cNomeCaract: "ENDEREÇO", cConteudo: "014090104" },
        { cNomeCaract: "MARCA", cConteudo: "PLASTILIT" }
      ]
    },
    {
      codigo: "PRD00129",
      descricao: "MANN WK1060/4 1UN-PRD00129",
      quantidade_estoque: 5,
      valor_unitario: 45.00,
      caracteristicas: [
        { cNomeCaract: "MARCA", cConteudo: "MANN" },
        { cNomeCaract: "VEICULO", cConteudo: "OFM-7C46" }
      ]
    },
    {
      codigo: "PRD11301",
      descricao: "RETENTOR 40X62X10 - SAV",
      quantidade_estoque: 20,
      valor_unitario: 15.50,
      caracteristicas: [
        { cNomeCaract: "MARCA", cConteudo: "SABÓ" }
      ]
    }
  );

  await fs.writeFile(filePath, JSON.stringify(produtos, null, 2), 'utf-8');
  console.log("Produtos de teste injetados com sucesso!");
}

injeta();
