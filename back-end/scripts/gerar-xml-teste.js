import fs from 'fs';

const fornecedorCnpj = "12345678000190"; // CNPJ de teste
const fornecedorNome = "FORNECEDOR TESTE LTDA";
const valorTotal = "1500.00";

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe versao="4.00" Id="NFe35230112345678000190550010000001231000001234">
      <ide>
        <cUF>35</cUF>
        <natOp>VENDA DE MERCADORIA</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>123</nNF>
        <dhEmi>2026-10-02T10:00:00-03:00</dhEmi>
      </ide>
      <emit>
        <CNPJ>${fornecedorCnpj}</CNPJ>
        <xNome>${fornecedorNome}</xNome>
        <enderEmit>
          <xLgr>RUA TESTE</xLgr>
          <nro>123</nro>
          <xBairro>CENTRO</xBairro>
          <cMun>3550308</cMun>
          <xMun>SAO PAULO</xMun>
          <UF>SP</UF>
          <CEP>01000000</CEP>
        </enderEmit>
        <IE>123456789012</IE>
      </emit>
      <dest>
        <CNPJ>00000000000000</CNPJ>
        <xNome>MINHA EMPRESA</xNome>
        <enderDest>
          <UF>SP</UF>
        </enderDest>
        <IE>ISENTO</IE>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>PRD001</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>PRODUTO DE TESTE 1</xProd>
          <NCM>84212300</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>10.0000</qCom>
          <vUnCom>50.0000</vUnCom>
          <vProd>500.00</vProd>
          <cEANTrib>SEM GTIN</cEANTrib>
          <uTrib>UN</uTrib>
          <qTrib>10.0000</qTrib>
          <vUnTrib>50.0000</vUnTrib>
          <indTot>1</indTot>
        </prod>
      </det>
      <det nItem="2">
        <prod>
          <cProd>PRD002</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>PRODUTO DE TESTE 2</xProd>
          <NCM>84212300</NCM>
          <CFOP>5102</CFOP>
          <uCom>PC</uCom>
          <qCom>5.0000</qCom>
          <vUnCom>200.0000</vUnCom>
          <vProd>1000.00</vProd>
          <cEANTrib>SEM GTIN</cEANTrib>
          <uTrib>PC</uTrib>
          <qTrib>5.0000</qTrib>
          <vUnTrib>200.0000</vUnTrib>
          <indTot>1</indTot>
        </prod>
      </det>
      <total>
        <ICMSTot>
          <vBC>0.00</vBC>
          <vICMS>0.00</vICMS>
          <vICMSDeson>0.00</vICMSDeson>
          <vFCP>0.00</vFCP>
          <vBCST>0.00</vBCST>
          <vST>0.00</vST>
          <vFCPST>0.00</vFCPST>
          <vFCPSTRet>0.00</vFCPSTRet>
          <vProd>1500.00</vProd>
          <vFrete>0.00</vFrete>
          <vSeg>0.00</vSeg>
          <vDesc>0.00</vDesc>
          <vII>0.00</vII>
          <vIPI>0.00</vIPI>
          <vIPIDevol>0.00</vIPIDevol>
          <vPIS>0.00</vPIS>
          <vCOFINS>0.00</vCOFINS>
          <vOutro>0.00</vOutro>
          <vNF>${valorTotal}</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>1</tpAmb>
      <verAplic>SP_NFE_PL_009_V4</verAplic>
      <chNFe>35230112345678000190550010000001231000001234</chNFe>
      <dhRecbto>2026-10-02T10:01:00-03:00</dhRecbto>
      <nProt>135230000000001</nProt>
      <digVal>abc123def456ghi789=</digVal>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NF-e</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>`;

fs.writeFileSync('C:\\Users\\Henrique\\Desktop\\NFe_Teste_Omie.xml', xml);
console.log('XML gerado com sucesso na Área de Trabalho!');
