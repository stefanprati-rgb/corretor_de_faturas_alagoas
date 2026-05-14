/**
 * Módulo responsável pela edição e geração de PDFs corrigidos
 */

/**
 * Cria um PDF corrigido com a tarja verde sobre o valor da economia
 * @param {ArrayBuffer} arrayBuffer - Bytes do PDF original
 * @param {string} valorCorretoStr - Valor correto formatado (ex: "185,56")
 * @param {Array} textItems - Items de texto com informações de posição
 * @returns {Promise<Uint8Array>} Bytes do novo PDF
 */
export async function createCorrectedPDF(arrayBuffer, valorCorretoStr, textItems) {
    const { PDFDocument, rgb, StandardFonts } = PDFLib;
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const page = pdfDoc.getPages()[1]; // Página 2

    const normalizeText = (value) => value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();

    const getItemX = (item) => item.transform[4];
    const getItemY = (item) => item.transform[5];
    const getItemRight = (item) => getItemX(item) + (item.width || 0);

    const groupItemsByLine = (items, yTolerance = 4) => {
        const sortedItems = [...items]
            .filter(item => item.str && item.str.trim())
            .sort((a, b) => getItemY(b) - getItemY(a) || getItemX(a) - getItemX(b));

        const lines = [];
        for (const item of sortedItems) {
            const itemY = getItemY(item);
            let line = lines.find(candidate => Math.abs(candidate.y - itemY) <= yTolerance);
            if (!line) {
                line = { y: itemY, items: [] };
                lines.push(line);
            }
            line.items.push(item);
            line.y = (line.y * (line.items.length - 1) + itemY) / line.items.length;
        }

        return lines.map(line => ({
            ...line,
            items: line.items.sort((a, b) => getItemX(a) - getItemX(b)),
        }));
    };

    // --- DETECÇÃO DINÂMICA DO BLOCO ---
    const targetLine = groupItemsByLine(textItems).find(line => {
        const lineText = normalizeText(line.items.map(item => item.str).join(' '));
        return lineText.includes('total cenario distribuidora')
            && lineText.includes('cenario alagoas energia');
    });

    // --- CONFIGURAÇÕES DE PADDING ---
    const PADDING_LEFT = 18;
    const PADDING_RIGHT = 18;
    const PADDING_TOP = 8;
    const PADDING_BOTTOM = 8;
    const rectColor = rgb(0x33 / 255, 0xaa / 255, 0x48 / 255);
    const textColor = rgb(1, 1, 1);
    const textSize = 9;

    // Carregar fonte
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const labelText = 'Total Cenário Distribuidora - Cenário Alagoas Energia';
    const valueText = `R$ ${valorCorretoStr}`;

    // Calcular posição da barra
    let bar_x, bar_y, bar_width, bar_height;

    if (targetLine) {
        // Extrair todas as coordenadas do bloco
        const blockItems = targetLine.items;
        const xs = blockItems.map(getItemX);
        const rights = blockItems.map(getItemRight);
        const ys = blockItems.map(getItemY);

        const minX = Math.min(...xs);
        const maxX = Math.max(...rights);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        // A coordenada Y do PDF.js é a baseline; usamos uma altura estável para cobrir a linha original.
        const textHeight = Math.max(maxY - minY, 11);

        // Cálculo dinâmico baseado na linha "Total Cenário..." real.
        bar_x = minX - PADDING_LEFT;
        bar_y = minY - PADDING_BOTTOM - 2;

        bar_width = (maxX - minX) + PADDING_LEFT + PADDING_RIGHT;
        bar_height = textHeight + PADDING_TOP + PADDING_BOTTOM;
    } else {
        // FALLBACK: coordenadas fixas (usando sistema de pontos)
        const mmToPoints = (mm) => mm * 2.83465;
        bar_x = mmToPoints(14.866) - PADDING_LEFT;
        bar_y = mmToPoints(48.129) - PADDING_BOTTOM;
        bar_width = mmToPoints(181) + PADDING_LEFT + PADDING_RIGHT;
        bar_height = 27;

        console.warn("Linha 'Total Cenário Distribuidora - Cenário Alagoas Energia' não identificada. Usando fallback.");
    }

    // --- DESENHAR TARJA VERDE ---
    page.drawRectangle({
        x: bar_x,
        y: bar_y,
        width: bar_width,
        height: bar_height,
        color: rectColor,
    });

    // --- DESENHAR TEXTO CORRIGIDO ---
    // Centralização baseada na nova bounding box
    const textY = bar_y + (bar_height / 2) - (textSize / 2);

    page.drawText(labelText, {
        x: bar_x + PADDING_LEFT,
        y: textY,
        font: helveticaBold,
        size: textSize,
        color: textColor,
    });

    const valueWidthReal = helveticaBold.widthOfTextAtSize(valueText, textSize);
    page.drawText(valueText, {
        x: bar_x + bar_width - valueWidthReal - PADDING_RIGHT,
        y: textY,
        font: helveticaBold,
        size: textSize,
        color: textColor,
    });

    return await pdfDoc.save();
}
