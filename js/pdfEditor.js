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
    const pageHeight = page.getHeight();

    // --- DETECÇÃO DINÂMICA DO BLOCO ---
    let startIndex = -1;
    for (let i = 0; i < textItems.length; i++) {
        const text = textItems[i].str.trim().toLowerCase();
        if (text.includes('total')) {
            // Confirmar proximidade de "Economia" nos próximos itens
            const nextFive = textItems.slice(i, i + 5);
            if (nextFive.some(t => t.str.toLowerCase().includes('economia'))) {
                startIndex = i;
                break;
            }
        }
    }

    // --- CONFIGURAÇÕES DE PADDING ---
    const PADDING_LEFT = 28;
    const PADDING_RIGHT = 80;
    const PADDING_TOP = 14;
    const PADDING_BOTTOM = 10;
    const rectColor = rgb(0x33 / 255, 0xaa / 255, 0x48 / 255);
    const textColor = rgb(1, 1, 1);
    const textSize = 11;

    // Carregar fonte
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const labelText = 'Total da sua Economia';
    const valueText = `R$ ${valorCorretoStr}`;

    // Calcular posição da barra
    let bar_x, bar_y, bar_width, bar_height;

    if (startIndex !== -1) {
        // Capturar o bloco alvo (label + valor)
        const blockItems = textItems.slice(startIndex, startIndex + 8);

        // Extrair todas as coordenadas do bloco
        const xs = blockItems.map(t => t.transform[4]);
        const ys = blockItems.map(t => t.transform[5]);

        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const textHeight = maxY - minY;

        // 1. Cálculo Dinâmico baseado na Bounding Box real com correção de offset visual
        bar_x = minX - PADDING_LEFT;
        // Compensação de baseline (0.35 da altura do texto para centralizar visualmente)
        bar_y = minY - PADDING_BOTTOM + (textHeight * 0.35);

        bar_width = (maxX - minX) + PADDING_LEFT + PADDING_RIGHT;
        bar_height = textHeight + PADDING_TOP + PADDING_BOTTOM;

        // DEBUG (opcional): console.log(`Block detected: X[${minX}-${maxX}] Y[${minY}-${maxY}]`);
    } else {
        // FALLBACK: coordenadas fixas (usando sistema de pontos)
        const mmToPoints = (mm) => mm * 2.83465;
        bar_x = mmToPoints(58.674) - PADDING_LEFT;
        bar_y = mmToPoints(231.902) - PADDING_BOTTOM;
        bar_width = mmToPoints(139) + PADDING_LEFT + PADDING_RIGHT;
        bar_height = 32;

        console.warn("Bloco não identificado. Usando fallback.");
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
        x: bar_x + bar_width - valueWidthReal - 20, // Alinhamento à direita com margem segura
        y: textY,
        font: helveticaBold,
        size: textSize,
        color: textColor,
    });

    return await pdfDoc.save();
}
