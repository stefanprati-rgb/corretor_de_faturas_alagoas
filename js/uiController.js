/**
 * Módulo responsável pelo controle da interface do usuário
 */

// Referências aos elementos da UI
let elements = {};

/**
 * Inicializa o controlador da UI
 */
export function initializeUI() {
    elements = {
        fileInput: document.getElementById('file-upload'),
        processBtn: document.getElementById('process-btn'),
        downloadCsvBtn: document.getElementById('download-csv-btn'),
        fileInfo: document.getElementById('file-info'),
        logsContainer: document.getElementById('logs-container'),
        logsEl: document.getElementById('logs'),
        resultsContainer: document.getElementById('results-container'),
        resultsEl: document.getElementById('results'),
        loader: document.getElementById('loader'),
        btnText: document.getElementById('btn-text'),
        dropArea: document.getElementById('drop-area')
    };

    setupEventListeners();
}

/**
 * Configura event listeners para interações do usuário
 */
function setupEventListeners() {
    // File input change
    elements.fileInput.addEventListener('change', () => {
        if (elements.fileInput.files.length > 0) {
            elements.fileInfo.textContent = `${elements.fileInput.files.length} arquivo(s) selecionado(s).`;
        } else {
            elements.fileInfo.textContent = 'ou arraste e solte os arquivos aqui';
        }
    });

    // Drag and drop
    elements.dropArea.addEventListener('dragover', (event) => {
        event.preventDefault();
        elements.dropArea.classList.add('border-[#32a949]', 'bg-[#b6eec2]');
    });

    elements.dropArea.addEventListener('dragleave', () => {
        elements.dropArea.classList.remove('border-[#32a949]', 'bg-[#b6eec2]');
    });

    elements.dropArea.addEventListener('drop', (event) => {
        event.preventDefault();
        elements.dropArea.classList.remove('border-[#32a949]', 'bg-[#b6eec2]');
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            elements.fileInput.files = files;
            const changeEvent = new Event('change', { bubbles: true });
            elements.fileInput.dispatchEvent(changeEvent);
        }
    });
}

/**
 * Adiciona uma mensagem ao log
 * @param {string} message
 */
export function log(message) {
    elements.logsEl.textContent += message + '\n';
    elements.logsEl.scrollTop = elements.logsEl.scrollHeight;
}

/**
 * Reseta a UI para um novo processamento
 */
export function resetUI() {
    elements.logsContainer.classList.remove('hidden');
    elements.resultsContainer.classList.remove('hidden');
    elements.downloadCsvBtn.classList.add('hidden');
    elements.logsEl.textContent = '';
    elements.resultsEl.innerHTML = '';
}

/**
 * Define o estado de loading
 * @param {boolean} isLoading
 */
export function setLoading(isLoading) {
    elements.processBtn.disabled = isLoading;
    if (isLoading) {
        elements.loader.classList.remove('hidden');
        elements.btnText.textContent = 'Processando...';
    } else {
        elements.loader.classList.add('hidden');
        elements.btnText.textContent = 'Corrigir Faturas';
    }
}

/**
 * Adiciona um link de download para um PDF corrigido
 * @param {string} filename - Nome do arquivo
 * @param {Blob} blob - Blob do PDF
 */
export function addDownloadLink(filename, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.className = "block bg-[#b6eec2] text-[#32a949] p-3 rounded-lg hover:bg-[#70d086] transition-colors";
    link.innerHTML = `<span class="font-semibold">Download:</span> ${filename}`;
    elements.resultsEl.appendChild(link);
}

/**
 * Mostra o botão de download do CSV
 */
export function showCsvButton() {
    elements.downloadCsvBtn.classList.remove('hidden');
}

/**
 * Obtém os arquivos selecionados
 * @returns {FileList}
 */
export function getSelectedFiles() {
    return elements.fileInput.files;
}

/**
 * Retorna a referência ao botão de processar
 * @returns {HTMLElement}
 */
export function getProcessButton() {
    return elements.processBtn;
}

/**
 * Retorna a referência ao botão de download CSV
 * @returns {HTMLElement}
 */
export function getDownloadCsvButton() {
    return elements.downloadCsvBtn;
}
