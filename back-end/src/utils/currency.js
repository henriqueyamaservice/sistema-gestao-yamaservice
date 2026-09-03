export function parseMonetaryValue(value) {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;

  if (typeof value === 'string') {
    // Remove tudo que não for dígito, vírgula, ponto ou sinal de menos
    let clean = value.replace(/[^\d.,-]/g, '');
    
    // Se a string contiver ponto e vírgula, assumimos que é padrão brasileiro (1.000,50)
    // Se tiver só ponto, pode ser padrão americano ou brasileiro sem decimal (1000.50 ou 1.000)
    // Vamos tratar o último separador
    const lastCommaIndex = clean.lastIndexOf(',');
    const lastDotIndex = clean.lastIndexOf('.');

    if (lastCommaIndex > -1 && lastDotIndex > -1) {
      if (lastCommaIndex > lastDotIndex) {
        // Padrão BR: 1.000,50 -> remove os pontos e troca a vírgula por ponto
        clean = clean.replace(/\./g, '').replace(',', '.');
      } else {
        // Padrão US: 1,000.50 -> remove as vírgulas
        clean = clean.replace(/,/g, '');
      }
    } else if (lastCommaIndex > -1) {
      // Tem apenas vírgula (ex: 50,00 ou 1000,00)
      clean = clean.replace(',', '.');
    }
    // Se tiver só ponto, o JS parseFloat já resolve se for americano. 
    // Se for 1.000 (sem decimal), ele resolve como 1, mas como é monetário, é provável que não venha só com separador de milhar se for input de dinheiro, ou se vier, paciência, o input de texto costuma colocar decimal.

    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}
