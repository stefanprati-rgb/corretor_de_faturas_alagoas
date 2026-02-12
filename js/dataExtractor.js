/**
 * Módulo responsável pela extração de dados da fatura
 * Usa busca por proximidade em vez de regex complexas
 */

/**
 * Converte uma string monetária para número float
 * @param {string} valorStr - String no formato "R$ 1.234,56" ou "1.234,56"
 * @returns {number|null}
 */
function parseMoney(valorStr) {
    if (!valorStr) return null;

    // Remove tudo exceto dígitos, pontos e vírgulas
    const cleanStr = valorStr
        .replace(/[^\d.,]/g, '')
        .replace(/\./g, '')  // Remove pontos de milhar
        .replace(',', '.');   // Troca vírgula por ponto

    const num = parseFloat(cleanStr);
    return isNaN(num) ? null : num;
}

/**
 * Busca um valor monetário próximo a um label específico
 * @param {Array} textItems - Array de items de texto do pdf.js
 * @param {string|Array<string>} labelKeywords - Palavra(s) chave para buscar
 * @param {number} maxDistance - Distância máxima para procurar (número de items)
 * @returns {number|null}
 */
function findValueNearLabel(textItems, labelKeywords, maxDistance = 10) {
    const keywords = Array.isArray(labelKeywords) ? labelKeywords : [labelKeywords];

    // Procurar pelo label
    let labelIndex = -1;
    for (let i = 0; i < textItems.length; i++) {
        const text = textItems[i].str.toLowerCase();

        // Verificar se contém alguma das keywords
        if (keywords.some(keyword => text.includes(keyword.toLowerCase()))) {
            labelIndex = i;
            break;
        }
    }

    if (labelIndex === -1) return null;

    // Procurar valor monetário próximo ao label
    for (let i = labelIndex; i < Math.min(labelIndex + maxDistance, textItems.length); i++) {
        const text = textItems[i].str.trim();

        // Detectar padrão de valor monetário
        if (text.match(/R\$|^\d+[.,]\d{2}$/)) {
            return parseMoney(text);
        }
    }

    return null;
}

/**
 * Extrai os dados necessários da fatura usando busca por proximidade
 * @param {Array} textItems - Items de texto extraídos do PDF
 * @param {string} fullText - Texto completo concatenado (para fallback)
 * @returns {{subtotal_distribuidora: number, subtotal_contribuicao: number, valorOriginal: number}|null}
 */
export function extractInvoiceData(textItems, fullText) {
    // Tentar extração por proximidade primeiro (mais robusta)
    const distribuidora = findValueNearLabel(textItems, ['consumindo', 'distribuidora'], 15);
    const contribuicao = findValueNearLabel(textItems, ['contribuição', 'mensal'], 15);
    const economia = findValueNearLabel(textItems, ['total', 'economia'], 15);

    // Se encontrou todos os valores, retornar
    if (distribuidora !== null && contribuicao !== null && economia !== null) {
        return {
            subtotal_distribuidora: distribuidora,
            subtotal_contribuicao: contribuicao,
            valorOriginal: economia
        };
    }

    // Fallback: usar regex no texto completo (método original)
    return extractInvoiceDataFallback(fullText);
}

/**
 * Método fallback usando regex (original)
 * @param {string} texto - Texto completo da página
 * @returns {{subtotal_distribuidora: number, subtotal_contribuicao: number, valorOriginal: number}|null}
 */
function extractInvoiceDataFallback(texto) {
    const getFloat = (valorStr) => {
        if (!valorStr) return null;
        const cleanNumberStr = valorStr.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
        const num = parseFloat(cleanNumberStr);
        return isNaN(num) ? null : num;
    };

    const secaoDistribuidora = texto.match(/Consumindo\s+da\s+Distribuidora([\s\S]*?)Contribuição\s+Mensal/i);
    const secaoContribuicao = texto.match(/Contribuição\s+Mensal([\s\S]*?)Total\s+da\s+sua\s+Economia/i);
    const matchEconomia = texto.match(/Total\s+da\s+sua\s+Economia\s+R\$\s*([\d.,]+)/i);

    if (!secaoDistribuidora || !secaoContribuicao || !matchEconomia) {
        return null;
    }

    const valoresDistribuidora = [...secaoDistribuidora[1].matchAll(/R\$\s*([\d.,]+)/g)];
    const valoresContribuicao = [...secaoContribuicao[1].matchAll(/R\$\s*([\d.,]+)/g)];

    const ultimoDistribuidora = valoresDistribuidora[valoresDistribuidora.length - 1];
    const ultimoContribuicao = valoresContribuicao[valoresContribuicao.length - 1];

    if (!ultimoDistribuidora || !ultimoContribuicao) {
        return null;
    }

    const dados = {
        subtotal_distribuidora: getFloat(ultimoDistribuidora[1]),
        subtotal_contribuicao: getFloat(ultimoContribuicao[1]),
        valorOriginal: getFloat(matchEconomia[1])
    };

    const allDataValid = Object.values(dados).every(v => v !== null && v > 0);
    return allDataValid ? dados : null;
}
