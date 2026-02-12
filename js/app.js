/**
 * Aplicação Principal - Corretor de Faturas Alagoas Energia
 * Orquestra todos os módulos para processar e corrigir faturas em PDF
 */

import { readPDF, extractPageText } from './pdfReader.js';
import { extractInvoiceData } from './dataExtractor.js';
import { calculateCorrectEconomy } from './economyCalculator.js';
import { createCorrectedPDF } from './pdfEditor.js';
import { downloadCSV } from './reportGenerator.js';
import {
    initializeUI,
    log,
    resetUI,
    setLoading,
    addDownloadLink,
    showCsvButton,
    getSelectedFiles,
    getProcessButton,
    getDownloadCsvButton
} from './uiController.js';

// Configuração do worker para pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

// Array para armazenar dados do relatório
let reportData = [];

/**
 * Função principal que processa todos os arquivos selecionados
 */
async function handleProcess() {
    const files = getSelectedFiles();

    if (files.length === 0) {
        alert('Por favor, selecione pelo menos um arquivo PDF.');
        return;
    }

    // Resetar UI e dados
    reportData = [];
    resetUI();
    setLoading(true);

    for (const file of files) {
        log(`----------------------------------------`);
        log(`Processando: ${file.name}`);

        try {
            // 1. Ler PDF
            const { pdf, buffer, numPages } = await readPDF(file);

            if (numPages < 2) {
                log(`ERRO: O PDF ${file.name} tem menos de 2 páginas.`);
                continue;
            }

            // 2. Extrair texto da página 2
            const { textItems, fullText } = await extractPageText(pdf, 2);

            // 3. Extrair dados da fatura
            const dados = extractInvoiceData(textItems, fullText);
            if (!dados) {
                log(`ERRO: Não foi possível extrair os dados de ${file.name}. Verifique o formato do PDF.`);
                continue;
            }

            // 4. Calcular economia correta
            const economiaCorreta = calculateCorrectEconomy(dados);
            const economiaStr = `${economiaCorreta.toFixed(2)}`.replace('.', ',');

            log(`   -> Economia Original: R$ ${String(dados.valorOriginal).replace('.', ',')}`);
            log(`   -> Economia Correta: R$ ${economiaStr}`);

            // 5. Armazenar no relatório
            reportData.push({
                nomeArquivo: file.name,
                valorOriginal: dados.valorOriginal,
                valorCorrigido: economiaCorreta
            });

            // 6. Criar PDF corrigido
            const correctedPdfBytes = await createCorrectedPDF(buffer, economiaStr, textItems);

            // 7. Criar link de download
            const blob = new Blob([correctedPdfBytes], { type: 'application/pdf' });
            addDownloadLink(`corrigido_${file.name}`, blob);

            log(`   -> PDF corrigido gerado com sucesso!`);

        } catch (error) {
            log(`ERRO CRÍTICO ao processar ${file.name}: ${error.message}`);
            console.error(error);
        }
    }

    log(`----------------------------------------`);
    log('Processo finalizado.');
    setLoading(false);

    if (reportData.length > 0) {
        showCsvButton();
    }
}

/**
 * Handler para o download do CSV
 */
function handleDownloadCSV() {
    downloadCSV(reportData);
}

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar UI
    initializeUI();

    // Configurar event listeners dos botões principais
    getProcessButton().addEventListener('click', handleProcess);
    getDownloadCsvButton().addEventListener('click', handleDownloadCSV);

    log('Aplicação pronta. Selecione os arquivos PDF.');
});
