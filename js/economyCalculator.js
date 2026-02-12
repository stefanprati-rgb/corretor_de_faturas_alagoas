/**
 * Módulo responsável pelo cálculo da economia correta
 */

/**
 * Calcula a economia correta segundo a regra de negócio
 * @param {{subtotal_distribuidora: number, subtotal_contribuicao: number}} dados
 * @returns {number} Valor da economia arredondado para 2 casas decimais
 */
export function calculateCorrectEconomy(dados) {
    // REGRA DE NEGÓCIO: economia = custo sem créditos - custo com créditos
    let economia = dados.subtotal_distribuidora - dados.subtotal_contribuicao;

    // Proteção: economia nunca pode ser negativa
    if (economia < 0) {
        economia = 0;
    }

    return parseFloat(economia.toFixed(2));
}
