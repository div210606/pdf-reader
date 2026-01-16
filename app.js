// Configure PDF.js worker - Use local files for offline support
if (typeof pdfjsLib !== 'undefined') {
    // Try to use local PDF.js files first (for Electron/offline)
    pdfjsLib.GlobalWorkerOptions.workerSrc = './assets/pdfjs/pdf.worker.min.js';
    
    // Fallback to CDN if local files don't load (for web version)
    fetch('./assets/pdfjs/pdf.worker.min.js')
        .then(response => {
            if (!response.ok) {
                console.log('Local PDF.js worker not found, falling back to CDN');
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }
        })
        .catch(() => {
            console.log('Using CDN for PDF.js worker');
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        });
}

// Application state
let currentPdf = null;
let currentBook = null; // For EPUB files
let currentPage = 1;
let totalPages = 0;
let scale = 1.0;
let rotation = 0;
let currentFile = null;
let fileList = [];
let currentFileType = null; // 'pdf', 'epub', 'txt', 'doc'

// Annotation state
let currentTool = 'text';
let isDrawing = false;
let startX = 0;
let startY = 0;
let annotations = {}; // Store annotations by page: {page: [annotations]}
let textAnnotations = {}; // Store text annotations by page
let notes = {}; // Store notes by page
let highlights = {}; // Store highlights by page
let selectedAnnotation = null;
let pendingTextPosition = null;
let pendingNotePosition = null;

// DOM elements
const fileInput = document.getElementById('fileInput');
const openFileBtn = document.getElementById('openFileBtn');
const welcomeOpenBtn = document.getElementById('welcomeOpenBtn');
const downloadBtn = document.getElementById('downloadBtn');
const toolbar = document.getElementById('toolbar');
const welcomeScreen = document.getElementById('welcomeScreen');
const viewerContainer = document.getElementById('viewerContainer');
const pdfCanvas = document.getElementById('pdfCanvas');
const textViewer = document.getElementById('textViewer');
const textContent = document.getElementById('textContent');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageNum = document.getElementById('pageNum');
const pageCount = document.getElementById('pageCount');
const zoomLevel = document.getElementById('zoomLevel');
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const fitWidthBtn = document.getElementById('fitWidth');
const fitPageBtn = document.getElementById('fitPage');
const rotateBtn = document.getElementById('rotateBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const sidebar = document.getElementById('sidebar');
const fileListElement = document.getElementById('fileList');
const closeSidebarBtn = document.getElementById('closeSidebar');

// Annotation DOM elements
const annotationToolbar = document.getElementById('annotationToolbar');
const annotationCanvas = document.getElementById('annotationCanvas');
const textAnnotationCanvas = document.getElementById('textAnnotationCanvas');
const textAnnotationsLayer = document.getElementById('textAnnotationsLayer');
const textTextAnnotationsLayer = document.getElementById('textTextAnnotationsLayer');
const notesLayer = document.getElementById('notesLayer');
const textNotesLayer = document.getElementById('textNotesLayer');
const selectTool = document.getElementById('selectTool');
const textTool = document.getElementById('textTool');
const highlightTool = document.getElementById('highlightTool');
const lineTool = document.getElementById('lineTool');
const circleTool = document.getElementById('circleTool');
const rectTool = document.getElementById('rectTool');
const noteTool = document.getElementById('noteTool');
const imageTool = document.getElementById('imageTool');
const colorPicker = document.getElementById('colorPicker');
const strokeWidth = document.getElementById('strokeWidth');
const clearAnnotations = document.getElementById('clearAnnotations');
const saveAnnotations = document.getElementById('saveAnnotations');
const textInputModal = document.getElementById('textInputModal');
const textInput = document.getElementById('textInput');
const confirmText = document.getElementById('confirmText');
const cancelText = document.getElementById('cancelText');
const noteInputModal = document.getElementById('noteInputModal');
const noteInput = document.getElementById('noteInput');
const confirmNote = document.getElementById('confirmNote');
const cancelNote = document.getElementById('cancelNote');
const imageInput = document.getElementById('imageInput');
const linkTool = document.getElementById('linkTool');
const ocrTool = document.getElementById('ocrTool');
const summarizeTool = document.getElementById('summarizeTool');
const portfolioBtn = document.getElementById('portfolioBtn');
const ocrImageInput = document.getElementById('ocrImageInput');
const linkInputModal = document.getElementById('linkInputModal');
const linkUrl = document.getElementById('linkUrl');
const linkText = document.getElementById('linkText');
const confirmLink = document.getElementById('confirmLink');
const cancelLink = document.getElementById('cancelLink');
const ocrResultModal = document.getElementById('ocrResultModal');
const ocrResultContent = document.getElementById('ocrResultContent');
const copyOcrResult = document.getElementById('copyOcrResult');
const closeOcrResult = document.getElementById('closeOcrResult');
const summarizeModal = document.getElementById('summarizeModal');
const summarizeResult = document.getElementById('summarizeResult');
const generateSummary = document.getElementById('generateSummary');
const closeSummarize = document.getElementById('closeSummarize');

// Link and portfolio state
let links = {}; // Store links by page
let pendingLinkPosition = null;
let portfolioFiles = [];

// Event listeners
openFileBtn.addEventListener('click', () => fileInput.click());
welcomeOpenBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);
prevPageBtn.addEventListener('click', () => changePage(-1));
nextPageBtn.addEventListener('click', () => changePage(1));
zoomInBtn.addEventListener('click', () => changeZoom(0.2));
zoomOutBtn.addEventListener('click', () => changeZoom(-0.2));
fitWidthBtn.addEventListener('click', fitToWidth);
fitPageBtn.addEventListener('click', fitToPage);
rotateBtn.addEventListener('click', rotatePage);
fullscreenBtn.addEventListener('click', toggleFullscreen);
downloadBtn.addEventListener('click', downloadCurrentFile);
closeSidebarBtn.addEventListener('click', () => sidebar.style.display = 'none');

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    
    switch(e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            changePage(-1);
            break;
        case 'ArrowRight':
            e.preventDefault();
            changePage(1);
            break;
        case '+':
        case '=':
            e.preventDefault();
            changeZoom(0.2);
            break;
        case '-':
            e.preventDefault();
            changeZoom(-0.2);
            break;
        case '0':
            e.preventDefault();
            fitToPage();
            break;
        case 'f':
        case 'F':
            e.preventDefault();
            toggleFullscreen();
            break;
    }
});

// Handle file selection
async function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    fileList = files;
    
    if (files.length > 1) {
        showSidebar();
    } else {
        sidebar.style.display = 'none';
    }

    await loadFile(files[0], 0);
}

// Load a file
async function loadFile(file, index) {
    currentFile = file;
    currentPage = 1;
    scale = 1.0;
    rotation = 0;
    
    showLoading();
    updateFileList(index);

    const fileExtension = file.name.split('.').pop().toLowerCase();

    try {
        if (fileExtension === 'pdf') {
            await loadPDF(file);
        } else if (fileExtension === 'txt') {
            await loadTextFile(file);
        } else if (fileExtension === 'epub') {
            await loadEPUB(file);
        } else if (fileExtension === 'doc' || fileExtension === 'docx') {
            await loadDOC(file);
        } else {
            alert('Unsupported file type. Please select a PDF, TXT, EPUB, DOC, or DOCX file.');
            hideLoading();
            return;
        }

        hideLoading();
        showViewer();
    } catch (error) {
        console.error('Error loading file:', error);
        alert('Error loading file: ' + error.message);
        hideLoading();
    }
}

// Load PDF file
async function loadPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    currentPdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    currentBook = null;
    currentFileType = 'pdf';
    totalPages = currentPdf.numPages;
    
    textViewer.style.display = 'none';
    pdfCanvas.style.display = 'block';
    
    await renderPage();
    updateUI();
}

// Load text file
async function loadTextFile(file) {
    const text = await file.text();
    currentPdf = null;
    currentBook = null;
    currentFileType = 'txt';
    totalPages = 1;
    
    pdfCanvas.style.display = 'none';
    textViewer.style.display = 'block';
    textContent.textContent = text;
    
    setupTextAnnotationCanvas();
    updateUI();
}

// Load EPUB file
async function loadEPUB(file) {
    currentPdf = null;
    currentFileType = 'epub';
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        
        // Create EPUB book
        currentBook = ePub(arrayBuffer);
        
        // Wait for book to be ready
        await currentBook.ready;
        
        // Get total number of sections (chapters)
        const spine = currentBook.spine;
        totalPages = spine.length || 1;
        
        // Render first page
        await renderEPUBPage();
        
        pdfCanvas.style.display = 'none';
        textViewer.style.display = 'block';
        
        setupTextAnnotationCanvas();
        updateUI();
    } catch (error) {
        console.error('Error loading EPUB:', error);
        textViewer.style.display = 'block';
        pdfCanvas.style.display = 'none';
        textContent.textContent = `Error loading EPUB file: ${file.name}\n\n${error.message}\n\nFile size: ${(file.size / 1024).toFixed(2)} KB`;
        totalPages = 1;
        updateUI();
    }
}

// Render EPUB page
async function renderEPUBPage() {
    if (!currentBook) return;
    
    try {
        // Get current section
        const section = currentBook.spine.get(currentPage - 1);
        if (!section) return;
        
        // Render section
        const sectionContent = await section.load(currentBook.load.bind(currentBook));
        
        // Create a container for EPUB content
        const epubContainer = document.getElementById('epubContainer') || createEPUBContainer();
        epubContainer.innerHTML = sectionContent;
        
        // Style the content
        styleEPUBContent(epubContainer);
        
        // Update text viewer
        textViewer.innerHTML = '';
        textViewer.appendChild(epubContainer);
        
        // Render links after content loads
        setTimeout(() => renderLinks(), 100);
        
    } catch (error) {
        console.error('Error rendering EPUB page:', error);
        textContent.textContent = `Error rendering EPUB page ${currentPage}: ${error.message}`;
    }
}

// Create EPUB container
function createEPUBContainer() {
    const container = document.createElement('div');
    container.id = 'epubContainer';
    container.className = 'epub-content';
    return container;
}

// Style EPUB content
function styleEPUBContent(container) {
    // Apply styles to EPUB content
    const style = document.createElement('style');
    style.textContent = `
        .epub-content {
            max-width: 900px;
            margin: 0 auto;
            padding: 2rem;
            background: white;
            border-radius: 0.5rem;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.8;
            color: #1e293b;
        }
        .epub-content img {
            max-width: 100%;
            height: auto;
            margin: 1rem 0;
        }
        .epub-content h1, .epub-content h2, .epub-content h3 {
            margin-top: 2rem;
            margin-bottom: 1rem;
            color: #1e293b;
        }
        .epub-content p {
            margin-bottom: 1rem;
        }
    `;
    if (!document.getElementById('epub-styles')) {
        style.id = 'epub-styles';
        document.head.appendChild(style);
    }
}

// Load DOC/DOCX file
async function loadDOC(file) {
    currentPdf = null;
    currentBook = null;
    currentFileType = 'doc';
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        
        // Use mammoth.js to convert DOCX to HTML
        const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
        
        // Create container for Word document
        const docContainer = document.createElement('div');
        docContainer.className = 'doc-content';
        docContainer.innerHTML = result.value;
        
        // Display warnings if any
        if (result.messages.length > 0) {
            console.warn('Word document conversion warnings:', result.messages);
        }
        
        pdfCanvas.style.display = 'none';
        textViewer.innerHTML = '';
        textViewer.appendChild(docContainer);
        textViewer.style.display = 'block';
        
        setupTextAnnotationCanvas();
        totalPages = 1;
        updateUI();
        
        // Render links after content loads
        setTimeout(() => renderLinks(), 100);
        
    } catch (error) {
        console.error('Error loading Word document:', error);
        textViewer.style.display = 'block';
        pdfCanvas.style.display = 'none';
        textContent.textContent = `Error loading Word document: ${file.name}\n\n${error.message}\n\nNote: Only DOCX format is fully supported. DOC files may not work.\n\nFile size: ${(file.size / 1024).toFixed(2)} KB`;
        totalPages = 1;
        updateUI();
    }
}

// Render PDF page
async function renderPage() {
    if (!currentPdf) return;

    const page = await currentPdf.getPage(currentPage);
    const viewport = page.getViewport({ scale: scale, rotation: rotation });
    
    pdfCanvas.height = viewport.height;
    pdfCanvas.width = viewport.width;
    annotationCanvas.height = viewport.height;
    annotationCanvas.width = viewport.width;
    
    // Update annotation layers size
    textAnnotationsLayer.style.width = viewport.width + 'px';
    textAnnotationsLayer.style.height = viewport.height + 'px';
    notesLayer.style.width = viewport.width + 'px';
    notesLayer.style.height = viewport.height + 'px';

    const renderContext = {
        canvasContext: pdfCanvas.getContext('2d'),
        viewport: viewport
    };

    await page.render(renderContext).promise;
    renderAnnotations();
    renderTextAnnotations();
    renderNotes();
    renderImages();
    renderLinks();
}

// Change page
function changePage(delta) {
    if (!currentPdf && !currentBook && currentFileType !== 'txt' && currentFileType !== 'doc') {
        if (textViewer.style.display === 'none') return;
    }
    
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        if (currentPdf) {
            renderPage();
            // Clear any open note popups
            document.querySelectorAll('.note-popup').forEach(popup => popup.remove());
        } else if (currentBook) {
            renderEPUBPage();
            // Clear any open note popups
            document.querySelectorAll('.note-popup').forEach(popup => popup.remove());
        }
        updateUI();
    }
}

// Change zoom
function changeZoom(delta) {
    if (!currentPdf) return;
    
    scale = Math.max(0.5, Math.min(3.0, scale + delta));
    renderPage();
    updateZoomLevel();
}

// Fit to width
async function fitToWidth() {
    if (!currentPdf) return;
    
    const page = await currentPdf.getPage(currentPage);
    const viewport = page.getViewport({ scale: 1.0 });
    const containerWidth = viewerContainer.clientWidth - 40;
    scale = containerWidth / viewport.width;
    
    await renderPage();
    updateZoomLevel();
}

// Fit to page
async function fitToPage() {
    if (!currentPdf) return;
    
    const page = await currentPdf.getPage(currentPage);
    const viewport = page.getViewport({ scale: 1.0 });
    const containerWidth = viewerContainer.clientWidth - 40;
    const containerHeight = viewerContainer.clientHeight - 40;
    
    const scaleX = containerWidth / viewport.width;
    const scaleY = containerHeight / viewport.height;
    scale = Math.min(scaleX, scaleY);
    
    await renderPage();
    updateZoomLevel();
}

// Rotate page
function rotatePage() {
    if (!currentPdf) return;
    
    rotation = (rotation + 90) % 360;
    renderPage();
}

// Toggle fullscreen
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
            setTimeout(fitToPage, 100);
        });
    } else {
        document.exitFullscreen();
    }
}

// Download current file
function downloadCurrentFile() {
    if (!currentFile) return;
    
    const url = URL.createObjectURL(currentFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Update UI
function updateUI() {
    pageNum.textContent = currentPage;
    pageCount.textContent = totalPages;
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
    downloadBtn.style.display = currentFile ? 'inline-flex' : 'none';
}

// Update zoom level display
function updateZoomLevel() {
    zoomLevel.textContent = Math.round(scale * 100) + '%';
}

// Show viewer
function showViewer() {
    welcomeScreen.style.display = 'none';
    viewerContainer.style.display = 'flex';
    toolbar.style.display = 'flex';
    // Show annotation toolbar for PDF, EPUB, and Word documents
    if (currentPdf || currentBook || currentFileType === 'doc') {
        annotationToolbar.style.display = 'flex';
        initializeAnnotations();
    }
}

// Show loading
function showLoading() {
    loadingOverlay.style.display = 'flex';
}

// Hide loading
function hideLoading() {
    loadingOverlay.style.display = 'none';
}

// Show sidebar
function showSidebar() {
    sidebar.style.display = 'block';
    updateFileList();
}

// Update file list
function updateFileList(activeIndex = null) {
    if (fileList.length <= 1) {
        sidebar.style.display = 'none';
        return;
    }

    fileListElement.innerHTML = '';
    fileList.forEach((file, index) => {
        const li = document.createElement('li');
        li.textContent = file.name;
        li.className = activeIndex === index ? 'active' : '';
        li.addEventListener('click', () => loadFile(file, index));
        fileListElement.appendChild(li);
    });
}

// Handle fullscreen change
document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement && currentPdf) {
        setTimeout(fitToPage, 100);
    }
});

// Handle window resize
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (currentPdf && document.fullscreenElement) {
            fitToPage();
        }
    }, 250);
});

// Initialize annotations
function initializeAnnotations() {
    if (!currentPdf) return;
    
    // Load saved annotations
    loadAnnotations();
    
    // Set up annotation canvas
    setupAnnotationCanvas();
    
    // Set up tool buttons
    setupToolButtons();
}

// Setup annotation canvas
function setupAnnotationCanvas() {
    // Setup for PDF canvas
    if (annotationCanvas) {
        annotationCanvas.addEventListener('mousedown', handleMouseDown);
        annotationCanvas.addEventListener('mousemove', handleMouseMove);
        annotationCanvas.addEventListener('mouseup', handleMouseUp);
        annotationCanvas.addEventListener('mouseleave', handleMouseUp);
    }
    
    // Setup for text viewer canvas (EPUB, Word, TXT)
    if (textAnnotationCanvas) {
        textAnnotationCanvas.addEventListener('mousedown', handleTextMouseDown);
        textAnnotationCanvas.addEventListener('mousemove', handleTextMouseMove);
        textAnnotationCanvas.addEventListener('mouseup', handleTextMouseUp);
        textAnnotationCanvas.addEventListener('mouseleave', handleTextMouseUp);
    }
}

// Setup tool buttons
function setupToolButtons() {
    selectTool.addEventListener('click', () => setTool('select'));
    textTool.addEventListener('click', () => setTool('text'));
    highlightTool.addEventListener('click', () => setTool('highlight'));
    lineTool.addEventListener('click', () => setTool('line'));
    circleTool.addEventListener('click', () => setTool('circle'));
    rectTool.addEventListener('click', () => setTool('rect'));
    noteTool.addEventListener('click', () => setTool('note'));
    imageTool.addEventListener('click', () => {
        setTool('image');
        imageInput.click();
    });
    linkTool.addEventListener('click', () => setTool('link'));
    ocrTool.addEventListener('click', () => {
        setTool('ocr');
        ocrImageInput.click();
    });
    summarizeTool.addEventListener('click', () => {
        summarizeModal.style.display = 'flex';
    });
    portfolioBtn.addEventListener('click', openPortfolio);
    clearAnnotations.addEventListener('click', clearAllAnnotations);
    saveAnnotations.addEventListener('click', saveAllAnnotations);
    confirmText.addEventListener('click', confirmTextAnnotation);
    cancelText.addEventListener('click', cancelTextAnnotation);
    confirmNote.addEventListener('click', confirmNoteAnnotation);
    cancelNote.addEventListener('click', cancelNoteAnnotation);
    imageInput.addEventListener('change', handleImageInsert);
    
    // Link modal handlers
    if (confirmLink) confirmLink.addEventListener('click', confirmLinkAnnotation);
    if (cancelLink) cancelLink.addEventListener('click', cancelLinkAnnotation);
    
    // OCR handlers
    if (ocrImageInput) ocrImageInput.addEventListener('change', handleOCRImage);
    if (copyOcrResult) copyOcrResult.addEventListener('click', copyOCRText);
    if (closeOcrResult) closeOcrResult.addEventListener('click', () => {
        if (ocrResultModal) ocrResultModal.style.display = 'none';
    });
    
    // Summarize handlers
    if (generateSummary) generateSummary.addEventListener('click', generateAISummary);
    if (closeSummarize) closeSummarize.addEventListener('click', () => {
        if (summarizeModal) summarizeModal.style.display = 'none';
    });
}

// Set current tool
function setTool(tool) {
    currentTool = tool;
    
    // Update button states
    document.querySelectorAll('.annotation-toolbar .toolbar-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const toolMap = {
        'select': selectTool,
        'text': textTool,
        'highlight': highlightTool,
        'line': lineTool,
        'circle': circleTool,
        'rect': rectTool,
        'note': noteTool,
        'image': imageTool,
        'link': linkTool,
        'ocr': ocrTool
    };
    
    if (toolMap[tool]) {
        toolMap[tool].classList.add('active');
    }
    
    // Update cursor
    if (tool === 'select') {
        if (annotationCanvas) {
            annotationCanvas.style.cursor = 'default';
            annotationCanvas.classList.remove('drawing');
        }
        if (textAnnotationCanvas) {
            textAnnotationCanvas.style.cursor = 'default';
            textAnnotationCanvas.classList.remove('drawing');
        }
    } else {
        if (annotationCanvas) {
            annotationCanvas.style.cursor = 'crosshair';
            annotationCanvas.classList.add('drawing');
        }
        if (textAnnotationCanvas) {
            textAnnotationCanvas.style.cursor = 'crosshair';
            textAnnotationCanvas.classList.add('drawing');
        }
    }
}

// Handle mouse down (for PDF)
function handleMouseDown(e) {
    if (!currentPdf || currentTool === 'select') return;
    
    const rect = annotationCanvas.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;
    isDrawing = true;
    
    if (currentTool === 'text') {
        pendingTextPosition = { x: startX, y: startY };
        textInputModal.style.display = 'flex';
        textInput.focus();
    } else if (currentTool === 'note') {
        pendingNotePosition = { x: startX, y: startY };
        noteInputModal.style.display = 'flex';
        noteInput.focus();
    } else if (currentTool === 'link') {
        pendingLinkPosition = { x: startX, y: startY };
        linkInputModal.style.display = 'flex';
        linkUrl.focus();
    }
}

// Handle mouse down (for text viewer - EPUB, Word, TXT)
function handleTextMouseDown(e) {
    if ((!currentBook && currentFileType !== 'doc' && currentFileType !== 'txt') || currentTool === 'select') return;
    
    const rect = textAnnotationCanvas.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;
    isDrawing = true;
    
    if (currentTool === 'text') {
        pendingTextPosition = { x: startX, y: startY };
        textInputModal.style.display = 'flex';
        textInput.focus();
    } else if (currentTool === 'note') {
        pendingNotePosition = { x: startX, y: startY };
        noteInputModal.style.display = 'flex';
        noteInput.focus();
    } else if (currentTool === 'link') {
        pendingLinkPosition = { x: startX, y: startY };
        linkInputModal.style.display = 'flex';
        linkUrl.focus();
    }
}

// Handle mouse move (for PDF)
function handleMouseMove(e) {
    if (!isDrawing || !currentPdf) return;
    
    const rect = annotationCanvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    if (currentTool === 'highlight') {
        drawHighlight(startX, startY, currentX, currentY, annotationCanvas);
    } else if (['line', 'circle', 'rect'].includes(currentTool)) {
        renderAnnotations();
        drawShape(startX, startY, currentX, currentY, annotationCanvas);
    }
}

// Handle mouse move (for text viewer)
function handleTextMouseMove(e) {
    if (!isDrawing || (!currentBook && currentFileType !== 'doc' && currentFileType !== 'txt')) return;
    
    const rect = textAnnotationCanvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    if (currentTool === 'highlight') {
        drawHighlight(startX, startY, currentX, currentY, textAnnotationCanvas);
    } else if (['line', 'circle', 'rect'].includes(currentTool)) {
        renderTextCanvasAnnotations();
        drawShape(startX, startY, currentX, currentY, textAnnotationCanvas);
    }
}

// Handle mouse up (for PDF)
function handleMouseUp(e) {
    if (!isDrawing) return;
    
    const rect = annotationCanvas.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;
    
    if (currentTool === 'highlight') {
        saveHighlight(startX, startY, endX, endY);
    } else if (['line', 'circle', 'rect'].includes(currentTool)) {
        saveShape(startX, startY, endX, endY);
    }
    
    isDrawing = false;
}

// Handle mouse up (for text viewer)
function handleTextMouseUp(e) {
    if (!isDrawing) return;
    
    const rect = textAnnotationCanvas.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;
    
    if (currentTool === 'highlight') {
        saveTextHighlight(startX, startY, endX, endY);
    } else if (['line', 'circle', 'rect'].includes(currentTool)) {
        saveTextShape(startX, startY, endX, endY);
    }
    
    isDrawing = false;
}

// Draw shape
function drawShape(x1, y1, x2, y2, canvas = annotationCanvas) {
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = colorPicker.value;
    ctx.lineWidth = parseInt(strokeWidth.value);
    ctx.beginPath();
    
    if (currentTool === 'line') {
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
    } else if (currentTool === 'circle') {
        const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        ctx.arc(x1, y1, radius, 0, 2 * Math.PI);
    } else if (currentTool === 'rect') {
        ctx.rect(x1, y1, x2 - x1, y2 - y1);
    }
    
    ctx.stroke();
}

// Save shape
function saveShape(x1, y1, x2, y2) {
    if (!annotations[currentPage]) {
        annotations[currentPage] = [];
    }
    
    const shape = {
        type: currentTool,
        x1, y1, x2, y2,
        color: colorPicker.value,
        width: parseInt(strokeWidth.value)
    };
    
    annotations[currentPage].push(shape);
    renderAnnotations();
}

// Draw highlight
function drawHighlight(x1, y1, x2, y2, canvas = annotationCanvas) {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = colorPicker.value + '80'; // Add transparency
    ctx.fillRect(
        Math.min(x1, x2),
        Math.min(y1, y2),
        Math.abs(x2 - x1),
        Math.abs(y2 - y1)
    );
}

// Save highlight
function saveHighlight(x1, y1, x2, y2) {
    if (!highlights[currentPage]) {
        highlights[currentPage] = [];
    }
    
    highlights[currentPage].push({
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1),
        color: colorPicker.value
    });
    
    renderAnnotations();
}

// Save text highlight (for EPUB, Word, TXT)
function saveTextHighlight(x1, y1, x2, y2) {
    if (!highlights[currentPage]) {
        highlights[currentPage] = [];
    }
    
    highlights[currentPage].push({
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1),
        color: colorPicker.value
    });
    
    renderTextCanvasAnnotations();
}

// Save text shape (for EPUB, Word, TXT)
function saveTextShape(x1, y1, x2, y2) {
    if (!annotations[currentPage]) {
        annotations[currentPage] = [];
    }
    
    const shape = {
        type: currentTool,
        x1, y1, x2, y2,
        color: colorPicker.value,
        width: parseInt(strokeWidth.value)
    };
    
    annotations[currentPage].push(shape);
    renderTextCanvasAnnotations();
}

// Setup text annotation canvas
function setupTextAnnotationCanvas() {
    if (!textAnnotationCanvas) return;
    
    const textViewerEl = document.getElementById('textViewer');
    if (!textViewerEl) return;
    
    const rect = textViewerEl.getBoundingClientRect();
    textAnnotationCanvas.width = rect.width;
    textAnnotationCanvas.height = rect.height;
    textAnnotationCanvas.style.width = rect.width + 'px';
    textAnnotationCanvas.style.height = rect.height + 'px';
}

// Render text canvas annotations (for EPUB, Word, TXT)
function renderTextCanvasAnnotations() {
    if (!textAnnotationCanvas) return;
    
    const ctx = textAnnotationCanvas.getContext('2d');
    ctx.clearRect(0, 0, textAnnotationCanvas.width, textAnnotationCanvas.height);
    
    // Render shapes
    if (annotations[currentPage]) {
        annotations[currentPage].forEach(shape => {
            ctx.strokeStyle = shape.color;
            ctx.lineWidth = shape.width;
            ctx.beginPath();
            
            if (shape.type === 'line') {
                ctx.moveTo(shape.x1, shape.y1);
                ctx.lineTo(shape.x2, shape.y2);
            } else if (shape.type === 'circle') {
                const radius = Math.sqrt(Math.pow(shape.x2 - shape.x1, 2) + Math.pow(shape.y2 - shape.y1, 2));
                ctx.arc(shape.x1, shape.y1, radius, 0, 2 * Math.PI);
            } else if (shape.type === 'rect') {
                ctx.rect(shape.x1, shape.y1, shape.x2 - shape.x1, shape.y2 - shape.y1);
            }
            
            ctx.stroke();
        });
    }
    
    // Render highlights
    if (highlights[currentPage]) {
        highlights[currentPage].forEach(highlight => {
            ctx.fillStyle = highlight.color + '80';
            ctx.fillRect(highlight.x, highlight.y, highlight.width, highlight.height);
        });
    }
}

// Render annotations
function renderAnnotations() {
    const ctx = annotationCanvas.getContext('2d');
    ctx.clearRect(0, 0, annotationCanvas.width, annotationCanvas.height);
    
    // Render shapes
    if (annotations[currentPage]) {
        annotations[currentPage].forEach(shape => {
            ctx.strokeStyle = shape.color;
            ctx.lineWidth = shape.width;
            ctx.beginPath();
            
            if (shape.type === 'line') {
                ctx.moveTo(shape.x1, shape.y1);
                ctx.lineTo(shape.x2, shape.y2);
            } else if (shape.type === 'circle') {
                const radius = Math.sqrt(Math.pow(shape.x2 - shape.x1, 2) + Math.pow(shape.y2 - shape.y1, 2));
                ctx.arc(shape.x1, shape.y1, radius, 0, 2 * Math.PI);
            } else if (shape.type === 'rect') {
                ctx.rect(shape.x1, shape.y1, shape.x2 - shape.x1, shape.y2 - shape.y1);
            }
            
            ctx.stroke();
        });
    }
    
    // Render highlights
    if (highlights[currentPage]) {
        highlights[currentPage].forEach(highlight => {
            ctx.fillStyle = highlight.color + '80';
            ctx.fillRect(highlight.x, highlight.y, highlight.width, highlight.height);
        });
    }
}

// Confirm text annotation
function confirmTextAnnotation() {
    const text = textInput.value.trim();
    if (text && pendingTextPosition) {
        addTextAnnotation(pendingTextPosition.x, pendingTextPosition.y, text);
        textInput.value = '';
        pendingTextPosition = null;
    }
    textInputModal.style.display = 'none';
}

// Cancel text annotation
function cancelTextAnnotation() {
    textInput.value = '';
    pendingTextPosition = null;
    textInputModal.style.display = 'none';
}

// Add text annotation
function addTextAnnotation(x, y, text) {
    if (!textAnnotations[currentPage]) {
        textAnnotations[currentPage] = [];
    }
    
    const textAnnot = {
        id: Date.now(),
        x, y, text,
        color: colorPicker.value
    };
    
    textAnnotations[currentPage].push(textAnnot);
    
    if (currentPdf) {
        renderTextAnnotations();
    } else {
        renderTextTextAnnotations();
    }
}

// Render text annotations (for PDF)
function renderTextAnnotations() {
    if (!textAnnotationsLayer) return;
    textAnnotationsLayer.innerHTML = '';
    
    if (textAnnotations[currentPage] && pdfCanvas.width > 0) {
        textAnnotations[currentPage].forEach(annot => {
            const textDiv = document.createElement('div');
            textDiv.className = 'text-annotation';
            textDiv.style.left = annot.x + 'px';
            textDiv.style.top = annot.y + 'px';
            textDiv.style.color = annot.color;
            textDiv.textContent = annot.text;
            textDiv.dataset.id = annot.id;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '×';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteTextAnnotation(annot.id);
            };
            
            textDiv.appendChild(deleteBtn);
            textDiv.addEventListener('dblclick', () => editTextAnnotation(annot.id));
            textAnnotationsLayer.appendChild(textDiv);
        });
    }
}

// Render text annotations (for EPUB, Word, TXT)
function renderTextTextAnnotations() {
    if (!textTextAnnotationsLayer) return;
    textTextAnnotationsLayer.innerHTML = '';
    
    if (textAnnotations[currentPage]) {
        textAnnotations[currentPage].forEach(annot => {
            const textDiv = document.createElement('div');
            textDiv.className = 'text-annotation';
            textDiv.style.left = annot.x + 'px';
            textDiv.style.top = annot.y + 'px';
            textDiv.style.color = annot.color;
            textDiv.textContent = annot.text;
            textDiv.dataset.id = annot.id;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '×';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteTextAnnotation(annot.id);
            };
            
            textDiv.appendChild(deleteBtn);
            textDiv.addEventListener('dblclick', () => editTextAnnotation(annot.id));
            textTextAnnotationsLayer.appendChild(textDiv);
        });
    }
}

// Delete text annotation
function deleteTextAnnotation(id) {
    if (textAnnotations[currentPage]) {
        textAnnotations[currentPage] = textAnnotations[currentPage].filter(a => a.id !== id);
        if (currentPdf) {
            renderTextAnnotations();
        } else {
            renderTextTextAnnotations();
        }
    }
}

// Edit text annotation
function editTextAnnotation(id) {
    const annot = textAnnotations[currentPage].find(a => a.id === id);
    if (annot) {
        textInput.value = annot.text;
        textInputModal.style.display = 'flex';
        confirmText.onclick = () => {
            annot.text = textInput.value.trim();
            textInput.value = '';
            textInputModal.style.display = 'none';
            if (currentPdf) {
                renderTextAnnotations();
            } else {
                renderTextTextAnnotations();
            }
            confirmText.onclick = confirmTextAnnotation;
        };
    }
}

// Confirm note annotation
function confirmNoteAnnotation() {
    const noteText = noteInput.value.trim();
    if (noteText && pendingNotePosition) {
        addNote(pendingNotePosition.x, pendingNotePosition.y, noteText);
        noteInput.value = '';
        pendingNotePosition = null;
    }
    noteInputModal.style.display = 'none';
}

// Cancel note annotation
function cancelNoteAnnotation() {
    noteInput.value = '';
    pendingNotePosition = null;
    noteInputModal.style.display = 'none';
}

// Add note
function addNote(x, y, text) {
    if (!notes[currentPage]) {
        notes[currentPage] = [];
    }
    
    const note = {
        id: Date.now(),
        x, y, text
    };
    
    notes[currentPage].push(note);
    renderNotes();
}

// Render notes
function renderNotes() {
    const layer = currentPdf ? notesLayer : textNotesLayer;
    if (!layer) return;
    layer.innerHTML = '';
    
    if (notes[currentPage]) {
        const hasCanvas = currentPdf ? pdfCanvas.width > 0 : true;
        if (hasCanvas) {
            notes[currentPage].forEach(note => {
                const pin = document.createElement('div');
                pin.className = 'note-pin';
                pin.style.left = note.x + 'px';
                pin.style.top = note.y + 'px';
                pin.dataset.id = note.id;
                
                let popup = null;
                pin.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (popup && popup.parentElement) {
                        popup.remove();
                        popup = null;
                    } else {
                        popup = createNotePopup(note);
                        layer.appendChild(popup);
                    }
                });
                
                layer.appendChild(pin);
            });
        }
    }
}

// Create note popup
function createNotePopup(note) {
    const popup = document.createElement('div');
    popup.className = 'note-popup';
    popup.style.left = note.x + 'px';
    popup.style.top = (note.y + 30) + 'px';
    
    const content = document.createElement('div');
    content.className = 'note-content';
    content.textContent = note.text;
    popup.appendChild(content);
    
    const actions = document.createElement('div');
    actions.className = 'note-actions';
    
    const editBtn = document.createElement('button');
    editBtn.className = 'note-btn edit-note';
    editBtn.textContent = 'Edit';
    editBtn.onclick = () => {
        noteInput.value = note.text;
        noteInputModal.style.display = 'flex';
        confirmNote.onclick = () => {
            note.text = noteInput.value.trim();
            noteInput.value = '';
            noteInputModal.style.display = 'none';
            renderNotes();
            confirmNote.onclick = confirmNoteAnnotation;
        };
        popup.remove();
    };
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'note-btn delete-note';
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = () => {
        deleteNote(note.id);
        popup.remove();
    };
    
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    popup.appendChild(actions);
    
    return popup;
}

// Delete note
function deleteNote(id) {
    if (notes[currentPage]) {
        notes[currentPage] = notes[currentPage].filter(n => n.id !== id);
        renderNotes();
    }
}

// Handle image insert
function handleImageInsert(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const rect = pdfCanvas.getBoundingClientRect();
            const x = rect.width / 2 - img.width / 2;
            const y = rect.height / 2 - img.height / 2;
            addImageAnnotation(x, y, event.target.result, img.width, img.height);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    imageInput.value = '';
}

// Add image annotation
function addImageAnnotation(x, y, src, width, height) {
    if (!annotations[currentPage]) {
        annotations[currentPage] = [];
    }
    
    const imgAnnot = {
        type: 'image',
        id: Date.now(),
        x, y, src, width, height
    };
    
    annotations[currentPage].push(imgAnnot);
    renderAnnotations();
    renderImages();
}

// Render images
function renderImages() {
    // Remove existing images first
    document.querySelectorAll('.canvas-wrapper img.annotation-image').forEach(img => img.remove());
    
    if (annotations[currentPage]) {
        const images = annotations[currentPage].filter(a => a.type === 'image');
        const canvasWrapper = document.querySelector('.canvas-wrapper');
        if (!canvasWrapper) return;
        
        images.forEach(imgAnnot => {
            const img = document.createElement('img');
            img.className = 'annotation-image';
            img.src = imgAnnot.src;
            img.style.position = 'absolute';
            img.style.left = imgAnnot.x + 'px';
            img.style.top = imgAnnot.y + 'px';
            img.style.width = imgAnnot.width + 'px';
            img.style.height = imgAnnot.height + 'px';
            img.style.zIndex = '25';
            img.style.cursor = 'move';
            img.style.border = '2px dashed #2563eb';
            img.style.maxWidth = '300px';
            img.style.maxHeight = '300px';
            img.dataset.id = imgAnnot.id;
            
            // Add delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '×';
            deleteBtn.style.position = 'absolute';
            deleteBtn.style.top = '-8px';
            deleteBtn.style.right = '-8px';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteImageAnnotation(imgAnnot.id);
            };
            img.appendChild(deleteBtn);
            
            // Make draggable
            makeDraggable(img, imgAnnot);
            
            canvasWrapper.appendChild(img);
        });
    }
}

// Delete image annotation
function deleteImageAnnotation(id) {
    if (annotations[currentPage]) {
        annotations[currentPage] = annotations[currentPage].filter(a => !(a.type === 'image' && a.id === id));
        renderImages();
    }
}

// Make element draggable
function makeDraggable(element, annotation) {
    let isDragging = false;
    let startX, startY, initialX, initialY;
    
    element.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = element.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        element.style.left = (initialX + dx) + 'px';
        element.style.top = (initialY + dy) + 'px';
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            const rect = element.getBoundingClientRect();
            const canvasRect = pdfCanvas.getBoundingClientRect();
            annotation.x = rect.left - canvasRect.left;
            annotation.y = rect.top - canvasRect.top;
            isDragging = false;
        }
    });
}

// Clear all annotations
function clearAllAnnotations() {
    if (confirm('Are you sure you want to clear all annotations on this page?')) {
        annotations[currentPage] = [];
        textAnnotations[currentPage] = [];
        notes[currentPage] = [];
        highlights[currentPage] = [];
        links[currentPage] = [];
        renderAnnotations();
        renderTextAnnotations();
        renderNotes();
        renderLinks();
        document.querySelectorAll('.canvas-wrapper img.annotation-image').forEach(img => img.remove());
    }
}

// Save all annotations
function saveAllAnnotations() {
    const data = {
        annotations,
        textAnnotations,
        notes,
        highlights,
        links,
        fileName: currentFile ? currentFile.name : 'document',
        savedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (currentFile ? currentFile.name.replace(/\.[^/.]+$/, '') : 'document') + '_annotations.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Also save to localStorage
    try {
        localStorage.setItem('pdfReader_annotations', JSON.stringify(data));
        alert('Annotations saved!');
    } catch (e) {
        console.warn('Could not save to localStorage:', e);
    }
}

// Load annotations
function loadAnnotations() {
    try {
        const saved = localStorage.getItem('pdfReader_annotations');
        if (saved) {
            const data = JSON.parse(saved);
            if (data.fileName === currentFile.name) {
                annotations = data.annotations || {};
                textAnnotations = data.textAnnotations || {};
                notes = data.notes || {};
                highlights = data.highlights || {};
                links = data.links || {};
                renderLinks();
            }
        }
    } catch (e) {
        console.warn('Could not load annotations:', e);
    }
}

// Update keyboard shortcuts for tools
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    if (e.key === 's' || e.key === 'S') setTool('select');
    if (e.key === 't' || e.key === 'T') setTool('text');
    if (e.key === 'h' || e.key === 'H') setTool('highlight');
    if (e.key === 'l' || e.key === 'L') setTool('line');
    if (e.key === 'c' || e.key === 'C') setTool('circle');
    if (e.key === 'r' || e.key === 'R') setTool('rect');
    if (e.key === 'n' || e.key === 'N') setTool('note');
    if (e.key === 'i' || e.key === 'I') {
        setTool('image');
        imageInput.click();
    }
    if (e.key === 'k' || e.key === 'K') setTool('link');
    if (e.key === 'o' || e.key === 'O') {
        setTool('ocr');
        ocrImageInput.click();
    }
    if (e.key === 'm' || e.key === 'M') {
        summarizeModal.style.display = 'flex';
    }
});

// ==================== OCR Functionality ====================

// Handle OCR image
async function handleOCRImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!ocrResultModal || !ocrResultContent) {
        alert('OCR modal not initialized. Please refresh the page.');
        return;
    }
    
    showLoading();
    ocrResultContent.textContent = 'Processing image with OCR...';
    ocrResultModal.style.display = 'flex';
    
    try {
        // Check if Tesseract is available
        if (typeof Tesseract === 'undefined') {
            throw new Error('Tesseract.js library not loaded. Please check your internet connection.');
        }
        
        const { data: { text } } = await Tesseract.recognize(file, 'eng', {
            logger: m => {
                if (m.status === 'recognizing text' && ocrResultContent) {
                    ocrResultContent.textContent = `Processing... ${Math.round(m.progress * 100)}%`;
                }
            }
        });
        
        if (ocrResultContent) {
            ocrResultContent.textContent = text || 'No text found in image.';
        }
        hideLoading();
    } catch (error) {
        console.error('OCR Error:', error);
        if (ocrResultContent) {
            ocrResultContent.textContent = `Error: ${error.message}\n\nMake sure Tesseract.js is loaded. Check browser console for details.`;
        }
        hideLoading();
    }
    
    if (ocrImageInput) ocrImageInput.value = '';
}

// Copy OCR text
function copyOCRText() {
    const text = ocrResultContent.textContent;
    navigator.clipboard.writeText(text).then(() => {
        const btn = copyOcrResult;
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }).catch(err => {
        alert('Failed to copy text: ' + err.message);
    });
}

// ==================== Link Functionality ====================

// Confirm link annotation
function confirmLinkAnnotation() {
    if (!linkUrl || !linkInputModal) {
        alert('Link modal not initialized. Please refresh the page.');
        return;
    }
    
    const url = linkUrl.value.trim();
    const text = linkText ? linkText.value.trim() : '';
    
    if (!url) {
        alert('Please enter a URL');
        return;
    }
    
    // Ensure URL has protocol
    let fullUrl = url;
    if (!url.match(/^https?:\/\//)) {
        fullUrl = 'https://' + url;
    }
    
    if (pendingLinkPosition) {
        addLink(pendingLinkPosition.x, pendingLinkPosition.y, fullUrl, text || fullUrl);
        pendingLinkPosition = null;
    }
    
    linkUrl.value = '';
    if (linkText) linkText.value = '';
    linkInputModal.style.display = 'none';
}

// Cancel link annotation
function cancelLinkAnnotation() {
    if (linkUrl) linkUrl.value = '';
    if (linkText) linkText.value = '';
    pendingLinkPosition = null;
    if (linkInputModal) linkInputModal.style.display = 'none';
}

// Add link
function addLink(x, y, url, text) {
    if (!links[currentPage]) {
        links[currentPage] = [];
    }
    
    const link = {
        id: Date.now(),
        x, y, url, text
    };
    
    links[currentPage].push(link);
    renderLinks();
}

// Render links
function renderLinks() {
    // Remove existing links
    document.querySelectorAll('.link-annotation').forEach(link => link.remove());
    
    if (!links[currentPage] || links[currentPage].length === 0) return;
    
    links[currentPage].forEach(link => {
        const linkDiv = document.createElement('a');
        linkDiv.className = 'link-annotation';
        linkDiv.href = link.url;
        linkDiv.target = '_blank';
        linkDiv.rel = 'noopener noreferrer';
        linkDiv.style.position = 'absolute';
        linkDiv.style.left = link.x + 'px';
        linkDiv.style.top = link.y + 'px';
        linkDiv.style.color = '#2563eb';
        linkDiv.style.textDecoration = 'underline';
        linkDiv.style.cursor = 'pointer';
        linkDiv.style.zIndex = '30';
        linkDiv.style.padding = '0.25rem 0.5rem';
        linkDiv.style.background = 'rgba(255, 255, 255, 0.9)';
        linkDiv.style.border = '1px solid #2563eb';
        linkDiv.style.borderRadius = '0.25rem';
        linkDiv.style.fontSize = '0.875rem';
        linkDiv.textContent = link.text;
        linkDiv.dataset.id = link.id;
        linkDiv.title = link.url;
        
        // Add delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '×';
        deleteBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            deleteLink(link.id);
        };
        linkDiv.appendChild(deleteBtn);
        
        // Find the right container
        let container = null;
        if (currentPdf) {
            container = document.querySelector('.canvas-wrapper');
        } else {
            container = document.querySelector('.text-viewer-wrapper') || 
                       document.querySelector('.text-viewer') ||
                       document.querySelector('.epub-content') ||
                       document.querySelector('.doc-content');
        }
        
        if (container) {
            container.style.position = 'relative';
            container.appendChild(linkDiv);
        }
    });
}

// Delete link
function deleteLink(id) {
    if (links[currentPage]) {
        links[currentPage] = links[currentPage].filter(l => l.id !== id);
        renderLinks();
    }
}

// ==================== AI Summarization ====================

// Generate AI Summary
async function generateAISummary() {
    const scope = document.querySelector('input[name="summarizeScope"]:checked').value;
    summarizeResult.textContent = 'Generating summary...';
    
    try {
        let textToSummarize = '';
        
        if (scope === 'page') {
            if (currentPdf) {
                textToSummarize = await extractPDFPageText();
            } else if (currentBook) {
                textToSummarize = await extractEPUBPageText();
            } else if (currentFileType === 'doc') {
                textToSummarize = extractWordPageText();
            } else if (currentFileType === 'txt') {
                textToSummarize = textContent.textContent;
            }
        } else if (scope === 'all') {
            if (currentPdf) {
                textToSummarize = await extractAllPDFText();
            } else if (currentBook) {
                textToSummarize = await extractAllEPUBText();
            } else {
                textToSummarize = textContent.textContent;
            }
        } else if (scope === 'selection') {
            const selection = window.getSelection().toString();
            if (selection) {
                textToSummarize = selection;
            } else {
                alert('Please select some text first');
                return;
            }
        }
        
        if (!textToSummarize || textToSummarize.trim().length === 0) {
            summarizeResult.textContent = 'No text found to summarize.';
            return;
        }
        
        // Use OpenAI API or fallback to local summarization
        const summary = await callAISummarizeAPI(textToSummarize);
        summarizeResult.textContent = summary;
        
    } catch (error) {
        console.error('Summarization error:', error);
        summarizeResult.textContent = `Error: ${error.message}\n\nNote: AI summarization requires an API key. See README for setup instructions.`;
    }
}

// Call AI Summarize API (with fallback)
async function callAISummarizeAPI(text) {
    // Check if API key is set
    const apiKey = localStorage.getItem('openai_api_key');
    
    if (!apiKey) {
        // Fallback to simple local summarization
        return generateLocalSummary(text);
    }
    
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that summarizes text concisely.'
                    },
                    {
                        role: 'user',
                        content: `Please provide a concise summary of the following text:\n\n${text.substring(0, 4000)}`
                    }
                ],
                max_tokens: 500,
                temperature: 0.7
            })
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('API Error:', error);
        // Fallback to local summarization
        return generateLocalSummary(text);
    }
}

// Generate local summary (fallback)
function generateLocalSummary(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const wordCount = text.split(/\s+/).length;
    
    // Simple extractive summarization - take first few sentences
    const summaryLength = Math.min(3, Math.ceil(sentences.length * 0.3));
    const summary = sentences.slice(0, summaryLength).join('. ') + '.';
    
    return `Summary (${wordCount} words):\n\n${summary}\n\n[Note: This is a basic local summary. For better results, configure OpenAI API key in settings.]`;
}

// Extract PDF page text
async function extractPDFPageText() {
    if (!currentPdf) return '';
    
    try {
        const page = await currentPdf.getPage(currentPage);
        const textContent = await page.getTextContent();
        return textContent.items.map(item => item.str).join(' ');
    } catch (error) {
        console.error('Error extracting PDF text:', error);
        return '';
    }
}

// Extract all PDF text
async function extractAllPDFText() {
    if (!currentPdf) return '';
    
    let allText = '';
    for (let i = 1; i <= totalPages; i++) {
        try {
            const page = await currentPdf.getPage(i);
            const textContent = await page.getTextContent();
            allText += textContent.items.map(item => item.str).join(' ') + '\n\n';
        } catch (error) {
            console.error(`Error extracting page ${i}:`, error);
        }
    }
    return allText;
}

// Extract EPUB page text
async function extractEPUBPageText() {
    if (!currentBook) return '';
    
    try {
        const section = currentBook.spine.get(currentPage - 1);
        if (!section) return '';
        
        const sectionContent = await section.load(currentBook.load.bind(currentBook));
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = sectionContent;
        return tempDiv.textContent || tempDiv.innerText || '';
    } catch (error) {
        console.error('Error extracting EPUB text:', error);
        return '';
    }
}

// Extract all EPUB text
async function extractAllEPUBText() {
    if (!currentBook) return '';
    
    let allText = '';
    for (let i = 0; i < totalPages; i++) {
        try {
            const section = currentBook.spine.get(i);
            if (section) {
                const sectionContent = await section.load(currentBook.load.bind(currentBook));
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = sectionContent;
                allText += (tempDiv.textContent || tempDiv.innerText || '') + '\n\n';
            }
        } catch (error) {
            console.error(`Error extracting section ${i}:`, error);
        }
    }
    return allText;
}

// Extract Word page text
function extractWordPageText() {
    const docContainer = document.querySelector('.doc-content');
    if (docContainer) {
        return docContainer.textContent || docContainer.innerText || '';
    }
    return '';
}

// ==================== PDF Portfolio Support ====================

// Open PDF Portfolio
function openPortfolio() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.multiple = true;
    input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        portfolioFiles = files;
        showPortfolioViewer();
    };
    input.click();
}

// Show Portfolio Viewer
function showPortfolioViewer() {
    // Use existing sidebar or create portfolio sidebar
    let portfolioSidebar = document.getElementById('portfolioSidebar');
    
    if (!portfolioSidebar) {
        portfolioSidebar = document.createElement('aside');
        portfolioSidebar.id = 'portfolioSidebar';
        portfolioSidebar.className = 'sidebar';
        portfolioSidebar.style.display = 'block';
        portfolioSidebar.style.zIndex = '300';
        portfolioSidebar.innerHTML = `
            <div class="sidebar-header">
                <h3>Portfolio Files (${portfolioFiles.length})</h3>
                <button class="close-sidebar" id="closePortfolio">×</button>
            </div>
            <ul class="file-list" id="portfolioFileList"></ul>
        `;
        document.body.appendChild(portfolioSidebar);
        
        const closeBtn = document.getElementById('closePortfolio');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                portfolioSidebar.style.display = 'none';
            });
        }
    }
    
    const portfolioFileList = document.getElementById('portfolioFileList');
    if (!portfolioFileList) return;
    
    portfolioFileList.innerHTML = '';
    
    portfolioFiles.forEach((file, index) => {
        const li = document.createElement('li');
        li.textContent = file.name;
        li.className = index === 0 ? 'active' : '';
        li.addEventListener('click', async () => {
            await loadFile(file, index);
            // Update active state
            portfolioFileList.querySelectorAll('li').forEach(item => {
                item.classList.remove('active');
            });
            li.classList.add('active');
        });
        portfolioFileList.appendChild(li);
    });
    
    portfolioSidebar.style.display = 'block';
}


// Initialize
updateUI();
