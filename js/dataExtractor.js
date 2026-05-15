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

    for (let i = 0; i < textItems.length; i++) {
        const text = textItems[i].str.toLowerCase();

        // Verificar se contém alguma das keywords
        const isLabelMatch = keywords.some(keyword => {
            if (keyword instanceof RegExp) {
                keyword.lastIndex = 0;
                return keyword.test(text);
            }
            return text.includes(keyword.toLowerCase());
        });

        if (!isLabelMatch) continue;

        // Procurar valor monetário próximo ao label
        for (let j = i; j < Math.min(i + maxDistance, textItems.length); j++) {
            const text = textItems[j].str.trim();

            // Detectar padrão de valor monetário
            if (text.match(/R\$\s*|^\d{1,3}(?:\.\d{3})*[.,]\d{2}$/)) {
                const value = parseMoney(text);
                if (value !== null) {
                    return value;
                }
            }
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
    // Tentar usar o método por regex primeiro, pois ele avalia o bloco completo e é mais específico
    const dadosRegex = extractInvoiceDataRegex(fullText);
    if (dadosRegex) {
        return dadosRegex;
    }

    console.warn("Regex falhou, tentando extração por proximidade (fallback)...");

    // Fallback: extração por proximidade (mais frágil a falsos positivos)
    const distribuidora = findValueNearLabel(textItems, ['consumindo', 'distribuidora'], 15);
    const contribuicao = findValueNearLabel(textItems, [/contribui[cç][aã]o/i, 'mensal'], 15);
    const economia = findValueNearLabel(textItems, ['total', 'economia'], 15);

    // Se encontrou todos os valores, retornar
    if (distribuidora !== null && contribuicao !== null && economia !== null) {
        return {
            subtotal_distribuidora: distribuidora,
            subtotal_contribuicao: contribuicao,
            valorOriginal: economia
        };
    }

    return null;
}

/**
 * Método principal usando regex (original)
 * @param {string} texto - Texto completo da página
 * @returns {{subtotal_distribuidora: number, subtotal_contribuicao: number, valorOriginal: number}|null}
 */
function extractInvoiceDataRegex(texto) {
    const getLastMoneyValue = (section) => {
        const valores = [...section.matchAll(/R\$\s*([\d.,]+)/g)];
        const ultimo = valores[valores.length - 1];
        return ultimo ? parseMoney(ultimo[1]) : null;
    };

    const getTotalAfterEquals = (section) => {
        const valores = [...section.matchAll(/=\s*R\$\s*([\d.,]+)/g)];
        const ultimo = valores[valores.length - 1];
        return ultimo ? parseMoney(ultimo[1]) : null;
    };

    // Layout atual da Alagoas Energia:
    // "Cenário Distribuidora ... = R$ X", "Cenário Alagoas Energia ... = R$ Y"
    // e "Total Cenário Distribuidora - Cenário Alagoas Energia R$ Z".
    const regexCenarioDistribuidora = /Cen[aá]rio\s+Distribuidora([\s\S]*?)Cen[aá]rio\s+Alagoas\s+Energia/i;
    const regexCenarioAlagoas = /Cen[aá]rio\s+Alagoas\s+Energia([\s\S]*?)Total\s+Cen[aá]rio\s+Distribuidora\s*-\s*Cen[aá]rio\s+Alagoas\s+Energia/i;
    const regexEconomiaAtual = /Total\s+Cen[aá]rio\s+Distribuidora\s*-\s*Cen[aá]rio\s+Alagoas\s+Energia\s*R\$\s*([\d.,]+)/i;

    const secaoCenarioDistribuidora = texto.match(regexCenarioDistribuidora);
    const secaoCenarioAlagoas = texto.match(regexCenarioAlagoas);
    const matchEconomiaAtual = texto.match(regexEconomiaAtual);

    if (secaoCenarioDistribuidora && secaoCenarioAlagoas && matchEconomiaAtual) {
        const dados = {
            subtotal_distribuidora: getTotalAfterEquals(secaoCenarioDistribuidora[1]),
            subtotal_contribuicao: getTotalAfterEquals(secaoCenarioAlagoas[1]),
            valorOriginal: parseMoney(matchEconomiaAtual[1])
        };

        const allDataValid = Object.values(dados).every(v => v !== null && v > 0);
        if (!allDataValid) {
            console.error("Dados extraídos do layout atual são inválidos/zero:", dados);
        }
        return allDataValid ? dados : null;
    }

    const regexDistribuidora = /Consumindo\s+da\s+Distribuidora([\s\S]*?)Contribui[cç][aã]o\s+Mensal/i;
    const regexContribuicao = /Contribui[cç][aã]o\s+Mensal([\s\S]*?)Total\s+(?:da\s+sua\s+)?Economia/i;
    const regexEconomia = /Total\s+(?:da\s+sua\s+)?Economia[\s\S]*?R\$\s*([\d.,]+)/i;

    const secaoDistribuidora = texto.match(regexDistribuidora);
    const secaoContribuicao = texto.match(regexContribuicao);
    const matchEconomia = texto.match(regexEconomia);

    if (!secaoDistribuidora || !secaoContribuicao || !matchEconomia) {
        console.error("Falha na regex. Texto do PDF:", texto);
        console.log("Secao Distribuidora encontrada?", !!secaoDistribuidora);
        console.log("Secao Contribuicao encontrada?", !!secaoContribuicao);
        console.log("Match Economia encontrado?", !!matchEconomia);
        return null;
    }

    const subtotalDistribuidora = getLastMoneyValue(secaoDistribuidora[1]);
    const subtotalContribuicao = getLastMoneyValue(secaoContribuicao[1]);

    if (subtotalDistribuidora === null || subtotalContribuicao === null) {
        console.error("Valores R$ não encontrados nas seções.");
        return null;
    }

    const dados = {
        subtotal_distribuidora: subtotalDistribuidora,
        subtotal_contribuicao: subtotalContribuicao,
        valorOriginal: parseMoney(matchEconomia[1])
    };

    const allDataValid = Object.values(dados).every(v => v !== null && v > 0);
    if (!allDataValid) {
        console.error("Dados extraídos são inválidos/zero:", dados);
    }
    return allDataValid ? dados : null;
}
