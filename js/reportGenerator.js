/**
 * Módulo responsável pela geração de relatórios CSV
 */

/**
 * Gera e faz download de um arquivo CSV com o relatório
 * @param {Array<{nomeArquivo: string, valorOriginal: number, valorCorrigido: number}>} reportData
 */
export function downloadCSV(reportData) {
    if (reportData.length === 0) {
        alert("Nenhum dado para exportar.");
        return;
    }

    const csvHeader = "Nome do Arquivo,Valor Original,Valor Corrigido\n";
    const csvRows = reportData.map(row => {
        const original = String(row.valorOriginal).replace('.', ',');
        const corrigido = String(row.valorCorrigido).replace('.', ',');
        return `"${row.nomeArquivo}","R$ ${original}","R$ ${corrigido}"`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', 'relatorio_correcoes.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
