document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    lucide.createIcons();

    // Application State
    const state = {
        mode: 'single', // 'single' | 'batch'
        selectedFiles: [], // Array of File objects or mock sample objects
        activeSampleId: null, // ID of active sample image if loaded
        gsd: 0.3,
        logs: [],
        historyReports: [
            { id: 'h1', filename: 'report_90b7f67c_20260327_215050.xlsx', date: '2026-03-27 21:50:51', size: '11.0 KB', type: 'single', cracks: 3, maxW: 1.85, avgW: 0.65, length: 420 },
            { id: 'h2', filename: 'batch_report_be21c4a4_20260327_170450.xlsx', date: '2026-03-27 17:04:50', size: '12.2 KB', type: 'batch', images: 4, cracks: 12, maxW: 2.10 },
            { id: 'h3', filename: 'batch_report_d680f065_20260327_155846.xlsx', date: '2026-03-27 15:58:47', size: '12.2 KB', type: 'batch', images: 3, cracks: 8, maxW: 1.45 }
        ],
        // Single mode results
        currentDetection: null,
        showAnnotations: true,
        // Batch mode results
        batchQueue: [],
        isProcessingBatch: false,
        
        // Gemini Configuration
        geminiApiKey: localStorage.getItem('gemini_api_key') || '',
        geminiModel: localStorage.getItem('gemini_model') || 'gemini-2.5-flash',
        geminiCustomModel: localStorage.getItem('gemini_custom_model') || ''
    };

    // Predefined Cracks Coordinates (for sample images fallback)
    const sampleCracksData = {
        '1': [
            {
                id: 1,
                points: [
                    {x: 440, y: 0}, {x: 442, y: 100}, {x: 460, y: 200}, {x: 472, y: 300}, 
                    {x: 480, y: 400}, {x: 520, y: 500}, {x: 512, y: 600}, {x: 535, y: 700}, 
                    {x: 522, y: 800}, {x: 495, y: 900}, {x: 485, y: 1000}
                ],
                widthPx: 6.2,
                box: {x: 400, y: 20, w: 180, h: 960}
            },
            {
                id: 2,
                points: [
                    {x: 480, y: 400}, {x: 520, y: 430}, {x: 560, y: 480}, {x: 572, y: 540}
                ],
                widthPx: 2.1,
                box: {x: 475, y: 395, w: 110, h: 160}
            }
        ],
        '2': [
            {
                id: 1,
                points: [
                    {x: 0, y: 350}, {x: 100, y: 380}, {x: 200, y: 410}, {x: 300, y: 440}, 
                    {x: 450, y: 520}, {x: 550, y: 550}, {x: 700, y: 650}, {x: 850, y: 720}, {x: 1000, y: 840}
                ],
                widthPx: 5.0,
                box: {x: 10, y: 330, w: 980, h: 530}
            },
            {
                id: 2,
                points: [
                    {x: 450, y: 520}, {x: 480, y: 420}, {x: 530, y: 320}, {x: 532, y: 200}, {x: 520, y: 80}
                ],
                widthPx: 3.5,
                box: {x: 430, y: 60, w: 120, h: 480}
            },
            {
                id: 3,
                points: [
                    {x: 450, y: 520}, {x: 468, y: 620}, {x: 505, y: 750}, {x: 560, y: 820}, {x: 590, y: 960}
                ],
                widthPx: 2.8,
                box: {x: 440, y: 500, w: 160, h: 480}
            }
        ],
        '3': [
            {
                id: 1,
                points: [
                    {x: 755, y: 232}, {x: 712, y: 285}, {x: 650, y: 330}, {x: 588, y: 410}, 
                    {x: 540, y: 462}, {x: 472, y: 530}, {x: 430, y: 590}, {x: 368, y: 642}, 
                    {x: 312, y: 705}, {x: 278, y: 742}
                ],
                widthPx: 7.5,
                box: {x: 250, y: 210, w: 530, h: 560}
            }
        ]
    };

    // DOM Elements Cache
    const el = {
        // Mode Tabs
        btnModeSingle: document.getElementById('btn-mode-single'),
        btnModeBatch: document.getElementById('btn-mode-batch'),
        
        // Upload Inputs & Areas
        dropZone: document.getElementById('drop-zone'),
        fileInput: document.getElementById('file-input'),
        fileListContainer: document.getElementById('file-list-container'),
        
        // Gemini API Configuration
        accHeaderGemini: document.getElementById('acc-header-gemini'),
        accContentGemini: document.getElementById('acc-content-gemini'),
        inputApiKey: document.getElementById('input-api-key'),
        selectModel: document.getElementById('select-model'),
        groupCustomModel: document.getElementById('group-custom-model'),
        inputCustomModel: document.getElementById('input-custom-model'),
        geminiStatusText: document.getElementById('gemini-status-text'),
        
        // Header Dynamic Status
        headerStatusPill: document.getElementById('header-status-pill'),
        headerStatusDot: document.getElementById('header-status-dot'),
        headerStatusText: document.getElementById('header-status-text'),

        // Calibration Accordion & Inputs
        accHeaderCalib: document.getElementById('acc-header-calib'),
        accContentCalib: document.getElementById('acc-content-calib'),
        inputGsd: document.getElementById('input-gsd'),
        inputHeight: document.getElementById('input-height'),
        inputFocal: document.getElementById('input-focal'),
        inputSensor: document.getElementById('input-sensor'),
        
        // Project Info Accordion & Inputs
        accHeaderProj: document.getElementById('acc-header-proj'),
        accContentProj: document.getElementById('acc-content-proj'),
        inputProjName: document.getElementById('input-proj-name'),
        inputBridgeName: document.getElementById('input-bridge-name'),
        inputLocation: document.getElementById('input-location'),
        inputInspector: document.getElementById('input-inspector'),
        
        // Trigger Button
        btnStartDetect: document.getElementById('btn-start-detect'),
        
        // Main Panels
        viewWelcome: document.getElementById('view-welcome'),
        viewLoading: document.getElementById('view-loading'),
        viewResult: document.getElementById('view-result'),
        viewBatch: document.getElementById('view-batch'),
        
        // Quick Try Cards
        sampleCards: document.querySelectorAll('.sample-image-card'),
        
        // Loading Indicators
        loadingText: document.getElementById('loading-text'),
        loadingBar: document.getElementById('loading-bar'),
        loadingPercent: document.getElementById('loading-percent'),
        
        // Result Screen Displays
        resultCanvas: document.getElementById('result-canvas'),
        btnToggleCrack: document.getElementById('btn-toggle-crack'),
        btnToggleOriginal: document.getElementById('btn-toggle-original'),
        
        metricCount: document.getElementById('metric-count'),
        metricMaxWidth: document.getElementById('metric-max-width'),
        metricAvgWidth: document.getElementById('metric-avg-width'),
        metricMaxLength: document.getElementById('metric-max-length'),
        metricRisk: document.getElementById('metric-risk'),
        
        metricGsd: document.getElementById('metric-gsd'),
        metricBridge: document.getElementById('metric-bridge'),
        metricLocation: document.getElementById('metric-location'),
        
        btnExportExcel: document.getElementById('btn-export-excel'),
        btnReDetect: document.getElementById('btn-re-detect'),
        
        // Batch Screen Displays
        batchTotal: document.getElementById('batch-total'),
        batchCracks: document.getElementById('batch-cracks'),
        batchWarning: document.getElementById('batch-warning'),
        batchMaxWidth: document.getElementById('batch-max-width'),
        batchTableBody: document.querySelector('#batch-table tbody'),
        btnExportBatchExcel: document.getElementById('btn-export-batch-excel'),
        
        // Sidebars Log & History
        historyReportsList: document.getElementById('history-reports-list'),
        logConsole: document.getElementById('log-console'),
        btnClearLogs: document.getElementById('btn-clear-logs')
    };

    // Initialize Accordion Behaviors
    function initAccordions() {
        const setups = [
            { header: el.accHeaderGemini, content: el.accContentGemini },
            { header: el.accHeaderCalib, content: el.accContentCalib },
            { header: el.accHeaderProj, content: el.accContentProj }
        ];

        setups.forEach(({ header, content }) => {
            header.addEventListener('click', () => {
                const isOpen = content.classList.contains('open');
                if (isOpen) {
                    content.classList.remove('open');
                    header.classList.remove('active');
                } else {
                    content.classList.add('open');
                    header.classList.add('active');
                }
            });
        });
    }

    // Logger Utility
    function printLog(message, type = 'info') {
        const time = new Date().toTimeString().split(' ')[0];
        const entry = document.createElement('div');
        entry.className = `log-entry log-${type}`;
        entry.innerHTML = `<span class="log-time">${time}</span> ${message}`;
        el.logConsole.appendChild(entry);
        el.logConsole.scrollTop = el.logConsole.scrollHeight;
        state.logs.push({ time, message, type });
    }

    // Initialize Log Screen
    function initLogger() {
        printLog('系统已启动，准备就绪', 'success');
        printLog('使用 Yolo 自动识别处理方法', 'info');
    }

    el.btnClearLogs.addEventListener('click', () => {
        el.logConsole.innerHTML = '';
        state.logs = [];
        printLog('日志已清空', 'warn');
    });

    // Calibrate GSD (Ground Sample Distance)
    function recalculateGSD() {
        const height = parseFloat(el.inputHeight.value) || 0;
        const focal = parseFloat(el.inputFocal.value) || 0;
        const sensor = parseFloat(el.inputSensor.value) || 0;

        if (height > 0 && focal > 0 && sensor > 0) {
            const calculated = (height * sensor) / (focal * 300);
            state.gsd = parseFloat(calculated.toFixed(4));
            el.inputGsd.value = state.gsd;
            printLog(`传感器参数已变更，重新校准 GSD: ${state.gsd} mm/pixel`, 'info');
        }
    }

    [el.inputHeight, el.inputFocal, el.inputSensor].forEach(input => {
        input.addEventListener('input', recalculateGSD);
    });

    el.inputGsd.addEventListener('input', () => {
        state.gsd = parseFloat(el.inputGsd.value) || 0.1;
        printLog(`手动输入校准 GSD: ${state.gsd} mm/pixel`, 'info');
    });

    // Gemini API Configurations & LocalStorage Bindings
    function loadGeminiSettings() {
        el.inputApiKey.value = state.geminiApiKey;
        el.selectModel.value = state.geminiModel;
        el.inputCustomModel.value = state.geminiCustomModel;
        
        if (state.geminiModel === 'custom') {
            el.groupCustomModel.style.display = 'block';
        } else {
            el.groupCustomModel.style.display = 'none';
        }
        updateGeminiStatus();
    }

    function updateGeminiStatus() {
        const key = state.geminiApiKey.trim();
        const activeModel = getActiveModelName();

        if (key) {
            // Gemini mode active
            el.headerStatusText.innerText = `Gemini AI 检测器已就绪`;
            el.headerStatusDot.style.backgroundColor = 'var(--accent-cyan)';
            el.headerStatusDot.style.boxShadow = '0 0 8px var(--accent-cyan)';
            
            // Set dynamic pseudo-element pulse color
            el.headerStatusDot.style.setProperty('--accent-emerald', '#06b6d4');
            
            el.geminiStatusText.innerText = `当前模式：真实 AI 检测 (${activeModel})`;
            el.geminiStatusText.style.color = 'var(--primary-color)';
        } else {
            // YOLO simulation mode
            el.headerStatusText.innerText = `YOLO 检测器就绪 (模拟)`;
            el.headerStatusDot.style.backgroundColor = 'var(--accent-emerald)';
            el.headerStatusDot.style.boxShadow = '0 0 8px var(--accent-emerald)';
            
            // Restore pulse color
            el.headerStatusDot.style.setProperty('--accent-emerald', '#10b981');
            
            el.geminiStatusText.innerText = `当前模式：本地 YOLO 模拟检测`;
            el.geminiStatusText.style.color = 'var(--text-muted)';
        }
    }

    function getActiveModelName() {
        if (state.geminiModel === 'custom') {
            return state.geminiCustomModel.trim() || 'gemini-3.5-flash';
        }
        return state.geminiModel;
    }

    el.inputApiKey.addEventListener('input', () => {
        state.geminiApiKey = el.inputApiKey.value;
        localStorage.setItem('gemini_api_key', state.geminiApiKey);
        updateGeminiStatus();
    });

    el.selectModel.addEventListener('change', () => {
        state.geminiModel = el.selectModel.value;
        localStorage.setItem('gemini_model', state.geminiModel);
        if (state.geminiModel === 'custom') {
            el.groupCustomModel.style.display = 'block';
        } else {
            el.groupCustomModel.style.display = 'none';
        }
        updateGeminiStatus();
    });

    el.inputCustomModel.addEventListener('input', () => {
        state.geminiCustomModel = el.inputCustomModel.value;
        localStorage.setItem('gemini_custom_model', state.geminiCustomModel);
        updateGeminiStatus();
    });

    // Mode Switcher Tabs
    el.btnModeSingle.addEventListener('click', () => {
        if (state.mode === 'single') return;
        state.mode = 'single';
        el.btnModeSingle.classList.add('active');
        el.btnModeBatch.classList.remove('active');
        
        el.dropZone.querySelector('.upload-text').innerText = '点击或拖拽图片到此处';
        el.dropZone.querySelector('.upload-hint').innerText = '支持 JPG / PNG / BMP / TIFF';
        el.fileInput.removeAttribute('multiple');
        
        state.selectedFiles = [];
        state.activeSampleId = null;
        updateFilesDisplay();
        
        showView('welcome');
        printLog('切换到检测模式：单张图片检测', 'info');
    });

    el.btnModeBatch.addEventListener('click', () => {
        if (state.mode === 'batch') return;
        state.mode = 'batch';
        el.btnModeBatch.classList.add('active');
        el.btnModeSingle.classList.remove('active');
        
        el.dropZone.querySelector('.upload-text').innerText = '点击或拖拽多张图片到此处';
        el.dropZone.querySelector('.upload-hint').innerText = '支持批量上传多文件';
        el.fileInput.setAttribute('multiple', 'true');
        
        el.sampleCards.forEach(c => c.classList.remove('active'));
        
        state.selectedFiles = [];
        state.activeSampleId = null;
        updateFilesDisplay();
        
        showView('welcome');
        printLog('切换到检测模式：批量图片检测', 'info');
    });

    // Upload & Drag handlers
    el.dropZone.addEventListener('click', () => el.fileInput.click());
    
    el.dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        el.dropZone.style.borderColor = '#1a56db';
        el.dropZone.style.backgroundColor = '#dbeafe';
    });

    el.dropZone.addEventListener('dragleave', () => {
        el.dropZone.style.borderColor = '#3b82f6';
        el.dropZone.style.backgroundColor = '#eff6ff';
    });

    el.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        el.dropZone.style.borderColor = '#3b82f6';
        el.dropZone.style.backgroundColor = '#eff6ff';
        
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (files.length > 0) {
            handleUploadedFiles(files);
        }
    });

    el.fileInput.addEventListener('change', () => {
        const files = Array.from(el.fileInput.files);
        if (files.length > 0) {
            handleUploadedFiles(files);
        }
    });

    function handleUploadedFiles(files) {
        el.sampleCards.forEach(c => c.classList.remove('active'));
        state.activeSampleId = null;

        if (state.mode === 'single') {
            state.selectedFiles = [files[0]];
            printLog(`导入单张图片: ${files[0].name} (${(files[0].size / 1024).toFixed(1)} KB)`, 'info');
        } else {
            state.selectedFiles = files;
            printLog(`导入批量图片共 ${files.length} 张`, 'info');
        }
        updateFilesDisplay();
    }

    // Quick Try Preset Sample Cards Clicked
    el.sampleCards.forEach(card => {
        card.addEventListener('click', () => {
            el.sampleCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            
            const sampleId = card.getAttribute('data-sample');
            state.activeSampleId = sampleId;
            
            const sampleName = card.title;
            state.selectedFiles = [{
                name: `sample_crack_${sampleId}.png`,
                size: 2621440, 
                type: 'image/png',
                isMockSample: true,
                sampleId: sampleId,
                title: sampleName,
                src: card.querySelector('img').src
            }];
            
            if (state.mode !== 'single') {
                state.mode = 'single';
                el.btnModeSingle.classList.add('active');
                el.btnModeBatch.classList.remove('active');
                el.dropZone.querySelector('.upload-text').innerText = '点击或拖拽图片到此处';
                el.fileInput.removeAttribute('multiple');
                printLog('点击示例图片，自动切换为单张图片检测模式', 'info');
            }

            updateFilesDisplay();
            printLog(`已载入内置示例图片: ${sampleName}`, 'success');
        });
    });

    function updateFilesDisplay() {
        el.fileListContainer.innerHTML = '';
        if (state.selectedFiles.length === 0) {
            el.fileListContainer.style.display = 'none';
            el.btnStartDetect.disabled = true;
            return;
        }

        el.fileListContainer.style.display = 'flex';
        el.btnStartDetect.disabled = false;

        state.selectedFiles.forEach((file, index) => {
            const card = document.createElement('div');
            card.className = 'file-preview-card';
            
            const sizeStr = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
            card.innerHTML = `
                <div class="file-preview-info">
                    <i data-lucide="image" style="width: 14px; height: 14px; color: var(--primary-color);"></i>
                    <span class="file-preview-name" title="${file.name}">${file.name}</span>
                    <span style="color: var(--text-muted); font-size: 10px;">(${sizeStr})</span>
                </div>
                <button class="btn-remove-file" data-index="${index}">&times;</button>
            `;
            el.fileListContainer.appendChild(card);
        });

        el.fileListContainer.querySelectorAll('.btn-remove-file').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.getAttribute('data-index'));
                printLog(`移除了文件: ${state.selectedFiles[index].name}`, 'info');
                state.selectedFiles.splice(index, 1);
                
                if (state.selectedFiles.length === 0) {
                    el.sampleCards.forEach(c => c.classList.remove('active'));
                    state.activeSampleId = null;
                }
                
                updateFilesDisplay();
            });
        });

        lucide.createIcons();
    }

    // View Panel Switcher
    function showView(viewName) {
        el.viewWelcome.style.display = 'none';
        el.viewLoading.style.display = 'none';
        el.viewResult.style.display = 'none';
        el.viewBatch.style.display = 'none';

        if (viewName === 'welcome') el.viewWelcome.style.display = 'flex';
        else if (viewName === 'loading') el.viewLoading.style.display = 'flex';
        else if (viewName === 'result') el.viewResult.style.display = 'grid';
        else if (viewName === 'batch') el.viewBatch.style.display = 'flex';
    }

    // Base64 Helpers
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const base64String = reader.result.split(',')[1];
                resolve(base64String);
            };
            reader.onerror = error => reject(error);
        });
    }

    async function sampleUrlToBase64(url) {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onload = () => {
                    const base64String = reader.result.split(',')[1];
                    resolve(base64String);
                };
                reader.onerror = error => reject(error);
            });
        } catch (err) {
            throw new Error(`无法获取内置图片并转换: ${err.message}`);
        }
    }

    // Trigger Detection Execution
    el.btnStartDetect.addEventListener('click', () => {
        if (state.selectedFiles.length === 0) return;

        const hasKey = state.geminiApiKey.trim() !== '';

        if (state.mode === 'single') {
            if (hasKey) {
                runGeminiSingleDetection(state.selectedFiles[0]);
            } else {
                printLog('未检测到 Gemini API Key，系统自动切换为本地 YOLO 算法模拟检测。', 'warn');
                runYoloSingleDetection(state.selectedFiles[0]);
            }
        } else {
            if (hasKey) {
                runGeminiBatchDetection(state.selectedFiles);
            } else {
                printLog('未检测到 Gemini API Key，系统自动切换为本地 YOLO 算法模拟检测。', 'warn');
                runYoloBatchDetection(state.selectedFiles);
            }
        }
    });

    // ==========================================
    // REAL GEMINI DETECTION (SINGLE IMAGE)
    // ==========================================
    async function runGeminiSingleDetection(file) {
        showView('loading');
        el.loadingBar.style.width = '10%';
        el.loadingPercent.innerText = '10% Completed';
        
        const activeModel = getActiveModelName();
        el.loadingText.innerText = `正在读取图像，序列化为数据张量...`;
        printLog(`[Gemini 检测启动] 选择模型: ${activeModel}, 开始处理: ${file.name}...`, 'info');

        try {
            // 1. Convert to Base64
            let base64Data = '';
            if (file.isMockSample) {
                base64Data = await sampleUrlToBase64(file.src);
            } else {
                base64Data = await fileToBase64(file);
            }

            el.loadingBar.style.width = '35%';
            el.loadingPercent.innerText = '35% Completed';
            el.loadingText.innerText = `正在发送多模态数据至 Google Gemini 平台...`;
            printLog(`已将图像成功转换为 Base64。正在发起 API 请求到 ${activeModel}...`, 'info');

            // 2. Build request parameters
            const apiKey = state.geminiApiKey.trim();
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`;
            
            const promptText = `
Analyze this concrete surface image. Detect all structural cracks.
For each crack found, return:
1. A bounding box 'box_2d' containing [ymin, xmin, ymax, xmax], with values normalized to 0-1000 (integers).
2. A list of coordinates 'points' representing the path of the crack from start to end, normalized to 0-1000 (x, y coordinates). Provide at least 5-10 points per crack to follow its contour.
3. An estimated maximum width of the crack in pixels ('width_px').
4. An estimated length of the crack in pixels ('length_px').

Return ONLY a JSON array of objects. DO NOT wrap it in markdown code blocks or add text. Here is the schema:
[
  {
    "id": number,
    "box_2d": [ymin, xmin, ymax, xmax],
    "points": [[x1, y1], [x2, y2], ...],
    "width_px": number,
    "length_px": number
  }
]
`;

            const requestBody = {
                contents: [
                    {
                        parts: [
                            { text: promptText },
                            {
                                inlineData: {
                                    mimeType: file.type || 'image/png',
                                    data: base64Data
                                }
                            }
                        ]
                    }
                ],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            };

            const startTime = performance.now();
            
            // 3. Fetch API
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errMsg = errorData.error?.message || `HTTP ${response.status}`;
                throw new Error(errMsg);
            }

            const resJson = await response.json();
            const duration = ((performance.now() - startTime) / 1000).toFixed(2);
            
            el.loadingBar.style.width = '80%';
            el.loadingPercent.innerText = '80% Completed';
            el.loadingText.innerText = `解析 Gemini 结构化响应数据中...`;
            printLog(`API 请求成功，用时 ${duration}s。开始解析返回的 JSON 数据...`, 'info');

            // 4. Parse Structured output
            const responseText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!responseText) {
                throw new Error("模型未返回有效的内容部分。");
            }

            // Clean markdown blocks if present
            let cleanText = responseText.trim();
            if (cleanText.startsWith('```json')) {
                cleanText = cleanText.substring(7);
            } else if (cleanText.startsWith('```')) {
                cleanText = cleanText.substring(3);
            }
            if (cleanText.endsWith('```')) {
                cleanText = cleanText.substring(0, cleanText.length - 3);
            }
            cleanText = cleanText.trim();

            const detectedCracks = JSON.parse(cleanText);
            if (!Array.isArray(detectedCracks)) {
                throw new Error("返回结果非标准的 JSON 数组格式。");
            }

            el.loadingBar.style.width = '100%';
            el.loadingPercent.innerText = '100% Completed';
            
            // 5. Assemble results
            assembleGeminiResult(file, detectedCracks);

        } catch (error) {
            printLog(`Gemini API 检测失败: ${error.message}`, 'error');
            printLog('系统将自动尝试切换为本地 YOLO 算法模拟检测，以确保演示顺利运行...', 'warn');
            
            // Fallback to YOLO
            setTimeout(() => {
                runYoloSingleDetection(file);
            }, 1000);
        }
    }

    function assembleGeminiResult(file, rawCracks) {
        const projectDetails = {
            name: el.inputProjName.value || '桥梁裂纹检测项目',
            bridge: el.inputBridgeName.value || '厦门大桥',
            location: el.inputLocation.value || '主梁跨中段',
            inspector: el.inputInspector.value || '林工',
            gsd: state.gsd
        };

        // Map raw coordinates to our schema
        const cracks = rawCracks.map((cr, idx) => {
            const ymin = cr.box_2d[0];
            const xmin = cr.box_2d[1];
            const ymax = cr.box_2d[2];
            const xmax = cr.box_2d[3];
            
            const box = {
                x: xmin,
                y: ymin,
                w: xmax - xmin,
                h: ymax - ymin
            };

            const points = cr.points.map(pt => ({ x: pt[0], y: pt[1] }));
            
            // Calculate mm parameters from pixel counts using GSD
            const widthMm = parseFloat((cr.width_px * state.gsd).toFixed(2));
            const avgWidthMm = parseFloat((cr.width_px * 0.72 * state.gsd).toFixed(2));
            const lengthMm = parseFloat((cr.length_px * state.gsd).toFixed(1));

            return {
                id: cr.id || (idx + 1),
                points,
                box,
                widthMm,
                avgWidthMm,
                lengthMm
            };
        });

        // Calculations
        const count = cracks.length;
        if (count === 0) {
            // Render no cracks view
            state.currentDetection = {
                fileName: file.name,
                fileSrc: file.isMockSample ? file.src : URL.createObjectURL(file),
                cracks: [],
                stats: { count: 0, maxWidth: 0, avgWidth: 0, maxLength: 0, riskLevel: 'Low', riskDesc: '正常', riskClass: 'risk-low' },
                project: projectDetails
            };
            
            el.metricCount.innerText = `0 条`;
            el.metricMaxWidth.innerText = `0.00 mm`;
            el.metricAvgWidth.innerText = `0.00 mm`;
            el.metricMaxLength.innerText = `0.0 mm`;
            el.metricRisk.innerText = '正常';
            el.metricRisk.className = 'risk-badge risk-low';
            
            printLog(`[Gemini 检测完毕] 未发现明显裂纹特征，结构指标正常。`, 'success');
        } else {
            const maxWidth = Math.max(...cracks.map(c => c.widthMm));
            const avgWidth = parseFloat((cracks.reduce((acc, c) => acc + c.avgWidthMm, 0) / count).toFixed(2));
            const maxLength = Math.max(...cracks.map(c => c.lengthMm));

            let riskLevel = 'Low';
            let riskDesc = '低风险';
            let riskClass = 'risk-low';
            
            if (maxWidth >= 1.5) {
                riskLevel = 'High';
                riskDesc = '高风险 (即刻处理)';
                riskClass = 'risk-high';
            } else if (maxWidth >= 0.2) {
                riskLevel = 'Medium';
                riskDesc = '中风险 (常规养护)';
                riskClass = 'risk-medium';
            }

            state.currentDetection = {
                fileName: file.name,
                fileSrc: file.isMockSample ? file.src : URL.createObjectURL(file),
                cracks,
                stats: { count, maxWidth, avgWidth, maxLength, riskLevel, riskDesc, riskClass },
                project: projectDetails
            };

            // UI Metrics
            el.metricCount.innerText = `${count} 条`;
            el.metricMaxWidth.innerText = `${maxWidth.toFixed(2)} mm`;
            el.metricAvgWidth.innerText = `${avgWidth.toFixed(2)} mm`;
            el.metricMaxLength.innerText = `${maxLength.toFixed(1)} mm`;
            el.metricRisk.innerText = riskDesc;
            el.metricRisk.className = `risk-badge ${riskClass}`;

            el.metricGsd.innerText = `${state.gsd} mm/px`;
            el.metricBridge.innerText = projectDetails.bridge;
            el.metricLocation.innerText = projectDetails.location;

            printLog(`[Gemini 检测完毕] 共识别裂缝: ${count}条, 最大宽度: ${maxWidth.toFixed(2)}mm, 安全评级: ${riskDesc}`, 'success');
        }

        renderResultCanvas();
        showView('result');
    }

    // ==========================================
    // LOCAL YOLO SIMULATION (SINGLE IMAGE)
    // ==========================================
    function runYoloSingleDetection(file) {
        showView('loading');
        
        let progress = 0;
        el.loadingBar.style.width = '0%';
        el.loadingPercent.innerText = '0% Completed';
        
        const steps = [
            { threshold: 20, text: '正在装载 YOLOv8 深度学习网络模型...', log: 'Loading model weights: yolov8n_crack.pt...', delay: 400, type: 'info' },
            { threshold: 50, text: '正在载入图像，映射像素尺寸比例...', log: `Applying GSD: ${state.gsd} mm/pixel. Preparing tensor buffers...`, delay: 500, type: 'info' },
            { threshold: 85, text: 'YOLO 目标检测核心正在分析图像病害区域...', log: 'YOLO layer inference running... Extracted crack paths. Fitting boxes...', delay: 600, type: 'info' },
            { threshold: 100, text: '正在测量几何形态，生成安全度评估报告...', log: 'Completed pixel size calculations. Compiling structure indices...', delay: 400, type: 'success' }
        ];

        let stepIdx = 0;
        
        function processSteps() {
            if (stepIdx >= steps.length) {
                setTimeout(() => {
                    assembleYoloSingleResult(file);
                }, 200);
                return;
            }

            const step = steps[stepIdx];
            el.loadingText.innerText = step.text;
            printLog(step.log, step.type);

            let startVal = progress;
            let endVal = step.threshold;
            let currentDelay = step.delay;
            let startTime = performance.now();

            function animateProgress(now) {
                let elapsed = now - startTime;
                let pct = Math.min(elapsed / currentDelay, 1);
                progress = Math.round(startVal + (endVal - startVal) * pct);
                el.loadingBar.style.width = `${progress}%`;
                el.loadingPercent.innerText = `${progress}% Completed`;

                if (pct < 1) {
                    requestAnimationFrame(animateProgress);
                } else {
                    stepIdx++;
                    processSteps();
                }
            }
            requestAnimationFrame(animateProgress);
        }

        processSteps();
    }

    function assembleYoloSingleResult(file) {
        // Fallback mockup loader
        const sampleId = file.isMockSample ? file.sampleId : 'custom';
        const projectDetails = {
            name: el.inputProjName.value || '桥梁裂纹检测项目',
            bridge: el.inputBridgeName.value || '厦门大桥',
            location: el.inputLocation.value || '主梁跨中段',
            inspector: el.inputInspector.value || '林工',
            gsd: state.gsd
        };

        let cracks = [];
        if (sampleId !== 'custom') {
            const presetData = sampleCracksData[sampleId];
            cracks = presetData.map(cr => {
                const lengthPx = calculatePolylineLength(cr.points);
                const lengthMm = parseFloat((lengthPx * state.gsd).toFixed(1));
                const maxWidthMm = parseFloat((cr.widthPx * state.gsd).toFixed(2));
                const avgWidthMm = parseFloat((cr.widthPx * 0.72 * state.gsd).toFixed(2));
                return {
                    id: cr.id,
                    points: cr.points,
                    box: cr.box,
                    widthMm: maxWidthMm,
                    avgWidthMm: avgWidthMm,
                    lengthMm: lengthMm
                };
            });
        } else {
            // Procedural cracks
            cracks = [
                {
                    id: 1,
                    points: [
                        {x: 300, y: 150}, {x: 320, y: 250}, {x: 380, y: 400}, 
                        {x: 430, y: 550}, {x: 480, y: 700}, {x: 520, y: 850}
                    ],
                    box: {x: 280, y: 130, w: 260, h: 740},
                    widthMm: parseFloat((4.5 * state.gsd).toFixed(2)),
                    avgWidthMm: parseFloat((3.1 * state.gsd).toFixed(2)),
                    lengthMm: parseFloat((720 * state.gsd).toFixed(1))
                },
                {
                    id: 2,
                    points: [
                        {x: 430, y: 550}, {x: 510, y: 600}, {x: 580, y: 620}, {x: 650, y: 650}
                    ],
                    box: {x: 415, y: 535, w: 250, h: 135},
                    widthMm: parseFloat((2.2 * state.gsd).toFixed(2)),
                    avgWidthMm: parseFloat((1.5 * state.gsd).toFixed(2)),
                    lengthMm: parseFloat((250 * state.gsd).toFixed(1))
                }
            ];
        }

        const count = cracks.length;
        const maxWidth = Math.max(...cracks.map(c => c.widthMm));
        const avgWidth = parseFloat((cracks.reduce((acc, c) => acc + c.avgWidthMm, 0) / count).toFixed(2));
        const maxLength = Math.max(...cracks.map(c => c.lengthMm));

        let riskLevel = 'Low';
        let riskDesc = '低风险';
        let riskClass = 'risk-low';
        
        if (maxWidth >= 1.5) {
            riskLevel = 'High';
            riskDesc = '高风险 (即刻处理)';
            riskClass = 'risk-high';
        } else if (maxWidth >= 0.2) {
            riskLevel = 'Medium';
            riskDesc = '中风险 (常规养护)';
            riskClass = 'risk-medium';
        }

        state.currentDetection = {
            fileName: file.name,
            fileSrc: file.isMockSample ? file.src : URL.createObjectURL(file),
            cracks,
            stats: { count, maxWidth, avgWidth, maxLength, riskLevel, riskDesc, riskClass },
            project: projectDetails
        };

        // Render Dashboard Stats
        el.metricCount.innerText = `${count} 条`;
        el.metricMaxWidth.innerText = `${maxWidth.toFixed(2)} mm`;
        el.metricAvgWidth.innerText = `${avgWidth.toFixed(2)} mm`;
        el.metricMaxLength.innerText = `${maxLength.toFixed(1)} mm`;
        el.metricRisk.innerText = riskDesc;
        el.metricRisk.className = `risk-badge ${riskClass}`;

        el.metricGsd.innerText = `${state.gsd} mm/px`;
        el.metricBridge.innerText = projectDetails.bridge;
        el.metricLocation.innerText = projectDetails.location;

        printLog(`[YOLO模拟完毕] 共识别裂缝: ${count}条, 最大宽度: ${maxWidth.toFixed(2)}mm, 结构安全评级: ${riskDesc}`, 'success');

        renderResultCanvas();
        showView('result');
    }

    function calculatePolylineLength(points) {
        let length = 0;
        for (let i = 1; i < points.length; i++) {
            const dx = points[i].x - points[i-1].x;
            const dy = points[i].y - points[i-1].y;
            length += Math.sqrt(dx*dx + dy*dy);
        }
        return length;
    }

    // Draw Visual Canvas Annotations
    function renderResultCanvas() {
        const det = state.currentDetection;
        if (!det) return;

        const img = new Image();
        img.src = det.fileSrc;
        img.onload = () => {
            const canvas = el.resultCanvas;
            const ctx = canvas.getContext('2d');

            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);

            if (state.showAnnotations) {
                det.cracks.forEach((crack) => {
                    const boxX = (crack.box.x / 1000) * canvas.width;
                    const boxY = (crack.box.y / 1000) * canvas.height;
                    const boxW = (crack.box.w / 1000) * canvas.width;
                    const boxH = (crack.box.h / 1000) * canvas.height;

                    // 1. Bounding Box
                    ctx.strokeStyle = '#ef4444';
                    ctx.lineWidth = Math.max(3, canvas.width / 350);
                    ctx.strokeRect(boxX, boxY, boxW, boxH);

                    // 2. Tag Header
                    ctx.fillStyle = '#ef4444';
                    const tagH = Math.max(22, canvas.height / 35);
                    const tagW = Math.max(160, canvas.width / 5);
                    ctx.fillRect(boxX, boxY - tagH, tagW, tagH);

                    // Text
                    ctx.fillStyle = '#ffffff';
                    ctx.font = `bold ${Math.max(12, canvas.height / 50)}px sans-serif`;
                    ctx.textBaseline = 'middle';
                    ctx.fillText(` [${crack.id}] W:${crack.widthMm.toFixed(2)}mm L:${crack.lengthMm.toFixed(0)}mm`, boxX + 6, boxY - tagH/2);

                    // 3. Crack path polyline overlay
                    ctx.strokeStyle = '#22c55e';
                    ctx.lineWidth = Math.max(4, canvas.width / 220);
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    
                    ctx.beginPath();
                    crack.points.forEach((pt, i) => {
                        const pxX = (pt.x / 1000) * canvas.width;
                        const pxY = (pt.y / 1000) * canvas.height;
                        if (i === 0) ctx.moveTo(pxX, pxY);
                        else ctx.lineTo(pxX, pxY);
                    });
                    ctx.stroke();

                    // Glow line
                    ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
                    ctx.lineWidth = Math.max(8, canvas.width / 110);
                    ctx.stroke();
                });
            }
        };
    }

    // Toggle annotation layers
    el.btnToggleCrack.addEventListener('click', () => {
        state.showAnnotations = !state.showAnnotations;
        if (state.showAnnotations) {
            el.btnToggleCrack.classList.add('active');
            el.btnToggleCrack.innerHTML = '<i data-lucide="toggle-right" style="width: 12px; height: 12px;"></i> 显示裂缝标注';
            printLog('打开裂缝标签标注图层', 'info');
        } else {
            el.btnToggleCrack.classList.remove('active');
            el.btnToggleCrack.innerHTML = '<i data-lucide="toggle-left" style="width: 12px; height: 12px;"></i> 隐藏裂缝标注';
            printLog('关闭裂缝标注图层', 'warn');
        }
        lucide.createIcons();
        renderResultCanvas();
    });

    el.btnToggleOriginal.addEventListener('click', () => {
        const isOriginal = el.btnToggleOriginal.classList.contains('active');
        if (isOriginal) {
            el.btnToggleOriginal.classList.remove('active');
            state.showAnnotations = true;
            el.btnToggleCrack.disabled = false;
            printLog('切回 AI 标注检测图层', 'info');
        } else {
            el.btnToggleOriginal.classList.add('active');
            state.showAnnotations = false;
            el.btnToggleCrack.disabled = true;
            printLog('切换查看原始图像对比', 'warn');
        }
        renderResultCanvas();
    });

    el.btnReDetect.addEventListener('click', () => {
        showView('welcome');
    });

    // ==========================================
    // BATCH DETECTION (REAL GEMINI)
    // ==========================================
    async function runGeminiBatchDetection(files) {
        showView('batch');
        el.batchTableBody.innerHTML = '';
        el.btnExportBatchExcel.disabled = true;
        
        state.batchQueue = files.map((file, idx) => ({
            id: idx + 1,
            fileName: file.name,
            size: file.size,
            fileObject: file,
            status: 'pending',
            cracksCount: 0,
            maxWidth: 0.0,
            avgWidth: 0.0,
            length: 0.0,
            risk: 'Low',
            riskDesc: '正常'
        }));

        state.isProcessingBatch = true;
        updateBatchQueueDisplay();
        
        const activeModel = getActiveModelName();
        printLog(`[Gemini 批量检测启动] 开始分析共 ${files.length} 张图片...`, 'info');

        for (let fileIdx = 0; fileIdx < state.batchQueue.length; fileIdx++) {
            const item = state.batchQueue[fileIdx];
            item.status = 'running';
            updateBatchQueueDisplay();
            printLog(`[${fileIdx + 1}/${files.length}] 正在使用 Gemini API 分析 ${item.fileName}...`, 'info');

            try {
                // 1. Base64
                const base64Data = await fileToBase64(item.fileObject);

                // 2. Query Gemini
                const apiKey = state.geminiApiKey.trim();
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${apiKey}`;
                
                const promptText = `
Analyze this concrete surface image. Detect all structural cracks.
Return ONLY a JSON array of objects, each detailing detected crack coordinates and pixel sizing:
[
  {
    "id": number,
    "box_2d": [ymin, xmin, ymax, xmax],
    "points": [[x1, y1], [x2, y2], ...],
    "width_px": number,
    "length_px": number
  }
]
`;

                const requestBody = {
                    contents: [
                        {
                            parts: [
                                { text: promptText },
                                {
                                    inlineData: {
                                        mimeType: item.fileObject.type || 'image/png',
                                        data: base64Data
                                    }
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        responseMimeType: "application/json"
                    }
                };

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const resJson = await response.json();
                const responseText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!responseText) throw new Error("API response empty.");

                let cleanText = responseText.trim();
                if (cleanText.startsWith('```json')) cleanText = cleanText.substring(7);
                else if (cleanText.startsWith('```')) cleanText = cleanText.substring(3);
                if (cleanText.endsWith('```')) cleanText = cleanText.substring(0, cleanText.length - 3);
                cleanText = cleanText.trim();

                const detected = JSON.parse(cleanText);

                // 3. Map
                item.status = 'completed';
                item.cracksCount = detected.length;
                if (detected.length > 0) {
                    item.maxWidth = Math.max(...detected.map(d => parseFloat((d.width_px * state.gsd).toFixed(2))));
                    item.avgWidth = parseFloat((detected.reduce((acc, d) => acc + (d.width_px * 0.72 * state.gsd), 0) / detected.length).toFixed(2));
                    item.length = Math.max(...detected.map(d => parseFloat((d.length_px * state.gsd).toFixed(1))));
                } else {
                    item.maxWidth = 0;
                    item.avgWidth = 0;
                    item.length = 0;
                }

                if (item.maxWidth >= 1.5) {
                    item.risk = 'High';
                    item.riskDesc = '高风险';
                } else if (item.maxWidth >= 0.2) {
                    item.risk = 'Medium';
                    item.riskDesc = '中风险';
                } else {
                    item.risk = 'Low';
                    item.riskDesc = '正常';
                }

                printLog(`[${fileIdx + 1}/${files.length}] Gemini 完成 ${item.fileName}: 发现 ${item.cracksCount}条裂纹, MaxW = ${item.maxWidth.toFixed(2)}mm`, 'success');

            } catch (err) {
                // Fallback to simulated item on API failure
                printLog(`[${fileIdx + 1}/${files.length}] Gemini 接口失败 (${err.message})。降级为模拟分析...`, 'warn');
                
                const crackCount = Math.floor(Math.random() * 4) + 1;
                let maxWidth = parseFloat(((Math.random() * 4 + 1.2) * state.gsd).toFixed(2));
                let totalLength = parseFloat(((Math.random() * 800 + 350) * state.gsd).toFixed(1));
                let avgWidth = parseFloat((maxWidth * 0.68).toFixed(2));

                item.status = 'completed';
                item.cracksCount = crackCount;
                item.maxWidth = maxWidth;
                item.avgWidth = avgWidth;
                item.length = totalLength;
                
                if (maxWidth >= 1.5) {
                    item.risk = 'High';
                    item.riskDesc = '高风险';
                } else if (maxWidth >= 0.2) {
                    item.risk = 'Medium';
                    item.riskDesc = '中风险';
                } else {
                    item.risk = 'Low';
                    item.riskDesc = '正常';
                }
            }

            updateBatchSummaryCards();
            updateBatchQueueDisplay();
        }

        state.isProcessingBatch = false;
        el.btnExportBatchExcel.disabled = false;
        printLog(`[Gemini 批量任务完成] 所有图片分析完毕。`, 'success');
        appendNewHistoryReport(true);
    }

    // ==========================================
    // LOCAL YOLO SIMULATION (BATCH IMAGES)
    // ==========================================
    function runYoloBatchDetection(files) {
        showView('batch');
        el.batchTableBody.innerHTML = '';
        el.btnExportBatchExcel.disabled = true;
        
        state.batchQueue = files.map((file, idx) => ({
            id: idx + 1,
            fileName: file.name,
            size: file.size,
            fileObject: file,
            status: 'pending',
            cracksCount: 0,
            maxWidth: 0.0,
            avgWidth: 0.0,
            length: 0.0,
            risk: 'Low',
            riskDesc: '正常'
        }));

        state.isProcessingBatch = true;
        updateBatchQueueDisplay();
        
        let fileIdx = 0;
        printLog(`[YOLO 批量任务启动] 顺序处理 ${files.length} 张图片...`, 'info');

        function processNextBatchFile() {
            if (fileIdx >= state.batchQueue.length) {
                state.isProcessingBatch = false;
                el.btnExportBatchExcel.disabled = false;
                printLog(`[YOLO 批量任务完成] ${state.batchQueue.length} 张图片全部检测完毕。`, 'success');
                appendNewHistoryReport(true);
                return;
            }

            const item = state.batchQueue[fileIdx];
            item.status = 'running';
            updateBatchQueueDisplay();
            printLog(`[${fileIdx + 1}/${files.length}] 正在使用 YOLO 模拟分析 ${item.fileName}...`, 'info');

            setTimeout(() => {
                const crackCount = Math.floor(Math.random() * 4) + 1;
                let maxWidth = parseFloat(((Math.random() * 4 + 1.2) * state.gsd).toFixed(2));
                let totalLength = parseFloat(((Math.random() * 800 + 350) * state.gsd).toFixed(1));
                let avgWidth = parseFloat((maxWidth * 0.68).toFixed(2));

                let risk = 'Low';
                let riskDesc = '正常';
                if (maxWidth >= 1.5) {
                    risk = 'High';
                    riskDesc = '高风险';
                } else if (maxWidth >= 0.2) {
                    risk = 'Medium';
                    riskDesc = '中风险';
                }

                item.status = 'completed';
                item.cracksCount = crackCount;
                item.maxWidth = maxWidth;
                item.avgWidth = avgWidth;
                item.length = totalLength;
                item.risk = risk;
                item.riskDesc = riskDesc;

                printLog(`[${fileIdx + 1}/${files.length}] 完成 ${item.fileName}: 识别裂纹数 = ${crackCount}, MaxW = ${maxWidth}mm`, 'success');
                
                updateBatchSummaryCards();
                updateBatchQueueDisplay();
                fileIdx++;
                processNextBatchFile();
            }, 1000);
        }

        processNextBatchFile();
    }

    function updateBatchQueueDisplay() {
        el.batchTableBody.innerHTML = '';
        state.batchQueue.forEach((item) => {
            const tr = document.createElement('tr');
            
            let statusBadge = '';
            if (item.status === 'pending') statusBadge = '<span class="batch-status-badge status-pending">排队中</span>';
            else if (item.status === 'running') statusBadge = '<span class="batch-status-badge status-running">检测中...</span>';
            else statusBadge = '<span class="batch-status-badge status-success">分析完毕</span>';

            let riskBadge = '';
            if (item.status === 'completed') {
                let riskClass = 'risk-low';
                if (item.risk === 'High') riskClass = 'risk-high';
                else if (item.risk === 'Medium') riskClass = 'risk-medium';
                riskBadge = `<span class="risk-badge ${riskClass}">${item.riskDesc}</span>`;
            } else {
                riskBadge = '<span style="color: var(--text-muted);">-</span>';
            }

            tr.innerHTML = `
                <td>${item.id}</td>
                <td style="font-weight: 500;">${item.fileName}</td>
                <td>${statusBadge}</td>
                <td>${item.status === 'completed' ? item.cracksCount : '-'}</td>
                <td style="font-weight:600; color: ${item.risk === 'High' ? 'var(--accent-rose)' : 'inherit'};">${item.status === 'completed' ? item.maxWidth.toFixed(2) : '-'}</td>
                <td>${item.status === 'completed' ? item.avgWidth.toFixed(2) : '-'}</td>
                <td>${item.status === 'completed' ? item.length.toFixed(1) : '-'}</td>
                <td>${riskBadge}</td>
                <td>
                    ${item.status === 'completed' ? 
                    `<button class="btn-download-report btn-item-inspect" data-idx="${item.id - 1}" style="padding: 2px 6px;">
                        <i data-lucide="eye" style="width: 10px; height: 10px;"></i> 查看
                    </button>` : '-'}
                </td>
            `;
            el.batchTableBody.appendChild(tr);
        });

        el.batchTableBody.querySelectorAll('.btn-item-inspect').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-idx'));
                const batchItem = state.batchQueue[idx];
                
                // Load into single viewer
                const fileRef = batchItem.fileObject;
                assembleYoloSingleResult({
                    name: batchItem.fileName,
                    size: batchItem.size,
                    type: 'image/png',
                    isMockSample: false,
                    src: URL.createObjectURL(fileRef)
                });
                
                printLog(`载入批量图像结果以供可视化查看: ${batchItem.fileName}`, 'info');
            });
        });

        lucide.createIcons();
    }

    function updateBatchSummaryCards() {
        const completed = state.batchQueue.filter(q => q.status === 'completed');
        if (completed.length === 0) return;

        const totalCracks = completed.reduce((acc, c) => acc + c.cracksCount, 0);
        const warningCount = completed.filter(c => c.risk === 'High').length;
        const maxW = Math.max(...completed.map(c => c.maxWidth));

        el.batchTotal.innerText = `${completed.length} / ${state.batchQueue.length} 张`;
        el.batchCracks.innerText = `${totalCracks} 条`;
        el.batchWarning.innerText = `${warningCount} 张`;
        el.batchMaxWidth.innerText = `${maxW.toFixed(2)} mm`;
    }

    // ==========================================
    // EXCEL / CSV REPORT DOWNLOADS
    // ==========================================
    function downloadCSV(csvContent, filename) {
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        printLog(`成功下载 Excel 报表: ${filename}`, 'success');
    }

    // Export Single Report
    el.btnExportExcel.addEventListener('click', () => {
        const det = state.currentDetection;
        if (!det) return;

        const proj = det.project;
        const stats = det.stats;
        
        let csv = `林工桥梁裂纹检测报告 - 单张图片分析\n`;
        csv += `报告生成时间,${new Date().toLocaleString()}\n`;
        csv += `项目名称,${proj.name}\n`;
        csv += `桥梁名称,${proj.bridge}\n`;
        csv += `检测位置,${proj.location}\n`;
        csv += `检测人员,${proj.inspector}\n`;
        csv += `图像名称,${det.fileName}\n`;
        csv += `校准参数 GSD (mm/pixel),${proj.gsd}\n`;
        csv += `\n`;
        csv += `病害统计指标\n`;
        csv += `裂缝识别总数,${stats.count} 条\n`;
        csv += `最大宽度 Max W (mm),${stats.maxWidth.toFixed(2)} mm\n`;
        csv += `平均宽度 Avg W (mm),${stats.avgWidth.toFixed(2)} mm\n`;
        csv += `最大长度 Max L (mm),${stats.maxLength.toFixed(1)} mm\n`;
        csv += `结构安全评估,${stats.riskDesc}\n`;
        csv += `\n`;
        csv += `裂纹明细数据表\n`;
        csv += `裂缝编号,最大宽度 (mm),平均宽度 (mm),全长度 (mm),风险级别\n`;

        det.cracks.forEach((crack) => {
            let lvl = '正常';
            if (crack.widthMm >= 1.5) lvl = '高风险 (重度裂缝)';
            else if (crack.widthMm >= 0.2) lvl = '中风险 (中度裂缝)';
            csv += `裂缝 #${crack.id},${crack.widthMm.toFixed(2)},${crack.avgWidthMm.toFixed(2)},${crack.lengthMm.toFixed(1)},${lvl}\n`;
        });

        const timeStamp = new Date().toISOString().replace(/[-T:]/g, '').split('.')[0];
        const filename = `report_${timeStamp.slice(2, 14)}.csv`;
        
        downloadCSV(csv, filename);
        appendNewHistoryReport(false, filename, stats.count, stats.maxWidth);
    });

    // Export Batch Merged Report
    el.btnExportBatchExcel.addEventListener('click', () => {
        if (state.batchQueue.length === 0) return;

        const completed = state.batchQueue.filter(q => q.status === 'completed');
        const proj = {
            name: el.inputProjName.value || '桥梁裂纹检测项目',
            bridge: el.inputBridgeName.value || '厦门大桥',
            location: el.inputLocation.value || '主梁跨中段',
            inspector: el.inputInspector.value || '林工',
            gsd: state.gsd
        };

        const totalCracks = completed.reduce((acc, c) => acc + c.cracksCount, 0);
        const maxW = Math.max(...completed.map(c => c.maxWidth));
        
        let csv = `林工桥梁裂纹检测报告 - 批量图片分析\n`;
        csv += `报告生成时间,${new Date().toLocaleString()}\n`;
        csv += `项目名称,${proj.name}\n`;
        csv += `桥梁名称,${proj.bridge}\n`;
        csv += `检测位置,${proj.location}\n`;
        csv += `检测人员,${proj.inspector}\n`;
        csv += `校准参数 GSD (mm/pixel),${proj.gsd}\n`;
        csv += `\n`;
        csv += `批量汇总指标\n`;
        csv += `图片总张数,${completed.length} 张\n`;
        csv += `识别裂缝总数,${totalCracks} 条\n`;
        csv += `最大裂缝宽度,${maxW.toFixed(2)} mm\n`;
        csv += `\n`;
        csv += `图片病害汇总清单\n`;
        csv += `序号,图像文件名,检测裂纹数量,最大宽度 (mm),平均宽度 (mm),全长度 (mm),结构风险等级\n`;

        completed.forEach((item) => {
            csv += `${item.id},${item.fileName},${item.cracksCount},${item.maxWidth.toFixed(2)},${item.avgWidth.toFixed(2)},${item.length.toFixed(1)},${item.riskDesc}\n`;
        });

        const timeStamp = new Date().toISOString().replace(/[-T:]/g, '').split('.')[0];
        const filename = `batch_report_${timeStamp.slice(2, 14)}.csv`;
        
        downloadCSV(csv, filename);
    });

    // History Downloads
    function appendNewHistoryReport(isBatch, customFilename = null, cracks = 3, maxW = 1.25) {
        const timeStamp = new Date().toISOString().replace(/[-T:]/g, '').split('.')[0];
        const dateStr = new Date().toLocaleString();
        
        let fn = '';
        if (customFilename) {
            fn = customFilename;
        } else {
            fn = isBatch ? `batch_report_${timeStamp.slice(2, 14)}.csv` : `report_${timeStamp.slice(2, 14)}.csv`;
        }

        const sizeStr = isBatch ? '13.1 KB' : '10.5 KB';
        
        const newReport = {
            id: 'h_' + Date.now(),
            filename: fn,
            date: dateStr,
            size: sizeStr,
            type: isBatch ? 'batch' : 'single',
            cracks,
            maxW,
            avgW: maxW * 0.7
        };

        state.historyReports.unshift(newReport);
        renderHistoryReportsList();
    }

    function renderHistoryReportsList() {
        el.historyReportsList.innerHTML = '';
        state.historyReports.forEach((rep) => {
            const div = document.createElement('div');
            div.className = 'report-item';
            div.setAttribute('data-filename', rep.filename);
            div.innerHTML = `
                <div class="report-name">${rep.filename}</div>
                <div class="report-meta">
                    <span>${rep.date} • ${rep.size}</span>
                    <button class="btn-download-report">
                        <i data-lucide="download" style="width: 10px; height: 10px;"></i>下载
                    </button>
                </div>
            `;
            el.historyReportsList.appendChild(div);
        });

        el.historyReportsList.querySelectorAll('.btn-download-report').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const itemDiv = btn.closest('.report-item');
                const fn = itemDiv.getAttribute('data-filename');
                triggerMockHistoryDownload(fn);
            });
        });

        lucide.createIcons();
    }

    function triggerMockHistoryDownload(filename) {
        const proj = {
            name: el.inputProjName.value || '桥梁裂纹检测项目',
            bridge: el.inputBridgeName.value || '厦门大桥',
            location: el.inputLocation.value || '主梁跨中段',
            inspector: el.inputInspector.value || '林工',
            gsd: state.gsd
        };

        let csv = '';
        if (filename.includes('batch')) {
            csv += `林工桥梁裂纹检测合并报告 - 历史数据\n`;
            csv += `报告名称,${filename}\n`;
            csv += `项目名称,${proj.name}\n`;
            csv += `桥梁名称,${proj.bridge}\n`;
            csv += `检测位置,${proj.location}\n`;
            csv += `校准参数 GSD,${proj.gsd} mm/px\n`;
            csv += `\n`;
            csv += `序号,图像文件名,检测裂纹数量,最大宽度 (mm),结构风险等级\n`;
            csv += `1,IMG_8432.JPG,3,1.85,高风险\n`;
            csv += `2,IMG_8433.JPG,2,0.45,中风险\n`;
            csv += `3,IMG_8434.JPG,0,0.00,正常\n`;
        } else {
            csv += `林工桥梁裂纹单体分析报告 - 历史数据\n`;
            csv += `报告名称,${filename}\n`;
            csv += `项目名称,${proj.name}\n`;
            csv += `桥梁名称,${proj.bridge}\n`;
            csv += `检测位置,${proj.location}\n`;
            csv += `校准参数 GSD,${proj.gsd} mm/px\n`;
            csv += `\n`;
            csv += `裂缝编号,最大宽度 (mm),平均宽度 (mm),全长度 (mm)\n`;
            csv += `裂缝 #1,1.85,1.20,420.0\n`;
            csv += `裂缝 #2,0.45,0.30,120.0\n`;
        }

        downloadCSV(csv, filename);
    }

    el.historyReportsList.querySelectorAll('.btn-download-report').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const itemDiv = btn.closest('.report-item');
            const fn = itemDiv.getAttribute('data-filename');
            triggerMockHistoryDownload(fn);
        });
    });

    // Boot Initialization
    initAccordions();
    initLogger();
    recalculateGSD();
    loadGeminiSettings(); // Load keys and selections
    el.btnStartDetect.disabled = true;
});
