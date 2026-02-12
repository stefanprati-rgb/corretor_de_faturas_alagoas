/**
 * Módulo responsável pela leitura de arquivos PDF
 */

/**
 * Lê um arquivo PDF e retorna seus dados e conteúdo
 * @param {File} file - Arquivo PDF a ser lido
 * @returns {Promise<{pdf: PDFDocument, buffer: ArrayBuffer, numPages: number}>}
 */
export async function readPDF(file) {
    const buffer = await file.arrayBuffer();
    
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    
    return {
        pdf,
        buffer,
        numPages: pdf.numPages
    };
}

/**
 * Extrai conteúdo de texto de uma página específica com informações de posicionamento
 * @param {PDFDocument} pdf - Documento PDF já carregado
 * @param {number} pageNumber - Número da página (1-indexed)
 * @returns {Promise<{textItems: Array, fullText: string, viewBox: Array}>}
 */
export async function extractPageText(pdf, pageNumber) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    
    return {
        textItems: textContent.items,
        fullText: textContent.items.map(item => item.str).join(' '),
        viewBox: page.view
    };
}
