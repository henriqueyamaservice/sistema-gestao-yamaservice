const fs = require('fs');

async function fetch40Barcodes() {
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
    console.log(`Recebidos ${produtos.length} produtos da Omie.`);
    
    // Filtrar produtos que possuem ean
    let barcodeProducts = produtos.filter(p => p.ean && p.ean.trim() !== '');

    console.log(`Encontrados ${barcodeProducts.length} produtos com EAN.`);

    if (barcodeProducts.length > 40) {
      barcodeProducts = barcodeProducts.slice(0, 40);
    }

    // Load existing produtos.json
    let existingProdutos = [];
    if (fs.existsSync('./data/produtos.json')) {
      existingProdutos = JSON.parse(fs.readFileSync('./data/produtos.json'));
    }

    // Format new products and add mock data
    let addedCount = 0;
    barcodeProducts.forEach(p => {
      // Check if it already exists
      if (!existingProdutos.find(ep => ep.codigo === p.codigo)) {
        // Mock some stock and validity
        const hoje = new Date();
        const randDays = Math.floor(Math.random() * 365);
        hoje.setDate(hoje.getDate() + randDays);
        
        p.quantidade_estoque = Math.floor(Math.random() * 50) + 10;
        p.estoque_minimo = 5;
        p.produto_lote = 'S';
        
        // Mock a lot with this barcode
        p.lotes = [
          {
            numero: `LOTE-${p.codigo}-A`,
            validade: hoje.toISOString().split('T')[0],
            quantidade: p.quantidade_estoque,
            ean: p.ean
          }
        ];
        
        existingProdutos.push(p);
        addedCount++;
      }
    });

    fs.writeFileSync('./data/produtos.json', JSON.stringify(existingProdutos, null, 2));
    console.log(`Sucesso! ${addedCount} novos produtos com EAN adicionados ao produtos.json!`);
  } catch (error) {
    console.error("Erro na request:", error);
  }
}

fetch40Barcodes();
