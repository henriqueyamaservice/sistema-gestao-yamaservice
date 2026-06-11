const fs = require('fs');

async function fetchProducts() {
  const url = 'https://app.omie.com.br/api/v1/geral/produtos/';
  
  const payload = {
    call: 'ListarProdutos',
    app_key: '1184790148542',
    app_secret: 'f1f51c68a22435a1eea2485475eb3eeb',
    param: [{
      pagina: 1,
      registros_por_pagina: 500,
      apenas_importado_api: 'N',
      filtrar_apenas_omiepdv: 'N'
    }]
  };

  try {
    console.log("Buscando produtos na Omie...");
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    if (!data.produto_servico_cadastro) {
      console.log("Erro na resposta da Omie:", data);
      return;
    }

    const produtos = data.produto_servico_cadastro;
    console.log(`Recebidos ${produtos.length} produtos.`);
    
    // Filtrar produtos que possuem alguma rastreabilidade/validade
    // Em geral em Omie pode ter cRastrearLote ou algo similar
    let validadeProducts = produtos.filter(p => {
       // logando chaves que pareçam lote/validade para debug
       const str = JSON.stringify(p).toLowerCase();
       return str.includes("lote") || str.includes("validade") || str.includes("rastrear") || p.caracteristicas?.some(c => c.cNomeCaract?.toLowerCase().includes("validade"));
    });

    console.log(`Encontrados ${validadeProducts.length} produtos com menção a lote/validade.`);

    if (validadeProducts.length === 0) {
      console.log("Nenhum produto com lote/validade explícito encontrado. Pegando 50 normais para ver a estrutura...");
      validadeProducts = produtos.slice(0, 50);
    } else {
      validadeProducts = validadeProducts.slice(0, 50);
    }

    fs.writeFileSync('produtos_omie_teste.json', JSON.stringify(validadeProducts, null, 2));
    console.log("Salvo em produtos_omie_teste.json!");
  } catch (error) {
    console.error("Erro na request:", error);
  }
}

fetchProducts();
