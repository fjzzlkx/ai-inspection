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
        isProcessingBatch: false
    };

    // Predefined Cracks Coordinates (for sample images)
    // Coords are represented as relative coordinates (0 to 1000) for resolution independence
    const sampleCracksData = {
        '1': [ // Pier Crack - 1 long vertical crack with a minor branch
            {
                id: 1,
                points: [
                    {x: 440, y: 0}, {x: 442, y: 100}, {x: 460, y: 200}, {x: 472, y: 300}, 
                    {x: 480, y: 400}, {x: 520, y: 500}, {x: 512, y: 600}, {x: 535, y: 700}, 
                    {x: 522, y: 800}, {x: 495, y: 900}, {x: 485, y: 1000}
                ],
                widthPx: 6.2, // pixel width of crack
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
        '2': [ // Deck Crack - Web/Spiderweb crack
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
        '3': [ // Girder Crack - Diagonal shear crack
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
    // Formula: GSD = (FlightHeight * SensorWidth) / (FocalLength * 300)
    function recalculateGSD() {
        const height = parseFloat(el.inputHeight.value) || 0;
        const focal = parseFloat(el.inputFocal.value) || 0;
        const sensor = parseFloat(el.inputSensor.value) || 0;

        if (height > 0 && focal > 0 && sensor > 0) {
            const calculated = (height * sensor) / (focal * 300);
            // Round to 4 decimal places
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

    // Tabs switching between modes
    el.btnModeSingle.addEventListener('click', () => {
        if (state.mode === 'single') return;
        state.mode = 'single';
        el.btnModeSingle.classList.add('active');
        el.btnModeBatch.classList.remove('active');
        
        el.dropZone.querySelector('.upload-text').innerText = '点击或拖拽图片到此处';
        el.dropZone.querySelector('.upload-hint').innerText = '支持 JPG / PNG / BMP / TIFF';
        el.fileInput.removeAttribute('multiple');
        
        // Reset selected files to empty or single
        state.selectedFiles = [];
        state.activeSampleId = null;
        updateFilesDisplay();
        
        // Switch main view back to welcome
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
        
        // Remove sample active states
        el.sampleCards.forEach(c => c.classList.remove('active'));
        
        state.selectedFiles = [];
        state.activeSampleId = null;
        updateFilesDisplay();
        
        // Switch main view
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
        // Clear active preset sample since user is uploading custom files
        el.sampleCards.forEach(c => c.classList.remove('active'));
        state.activeSampleId = null;

        if (state.mode === 'single') {
            state.selectedFiles = [files[0]];
            printLog(`导入单张图片: ${files[0].name} (${(files[0].size / 1024).toFixed(1)} KB)`, 'info');
        } else {
            // Append or overwrite? Overwrite for simplicity in this demo session
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
            
            // Generate a mock File-like object
            const sampleName = card.title;
            state.selectedFiles = [{
                name: `sample_crack_${sampleId}.png`,
                size: 2621440, // 2.5MB
                type: 'image/png',
                isMockSample: true,
                sampleId: sampleId,
                title: sampleName,
                src: card.querySelector('img').src
            }];
            
            // Switch mode to single automatically if they clicked sample
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

        // Bind remove actions
        el.fileListContainer.querySelectorAll('.btn-remove-file').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.getAttribute('data-index'));
                printLog(`移除了文件: ${state.selectedFiles[index].name}`, 'info');
                state.selectedFiles.splice(index, 1);
                
                // Clear presets active state if empty
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

    // Start Detection Execution
    el.btnStartDetect.addEventListener('click', () => {
        if (state.selectedFiles.length === 0) return;

        if (state.mode === 'single') {
            runSingleDetection(state.selectedFiles[0]);
        } else {
            runBatchDetection(state.selectedFiles);
        }
    });

    // ==========================================
    // SINGLE DETECTION WORKFLOW
    // ==========================================
    function runSingleDetection(file) {
        showView('loading');
        
        // Reset loading progress
        let progress = 0;
        el.loadingBar.style.width = '0%';
        el.loadingPercent.innerText = '0% Completed';
        
        const steps = [
            { threshold: 20, text: '正在装载 YOLOv8 深度学习网络模型...', log: 'Loading model weights: yolov8n_crack.pt...', delay: 500, type: 'info' },
            { threshold: 50, text: '正在载入图像，映射像素尺寸比例...', log: `Applying calibration GSD: ${state.gsd} mm/pixel. Initializing tensors...`, delay: 800, type: 'info' },
            { threshold: 85, text: 'YOLO 目标检测核心正在搜索桥梁裂缝特征...', log: 'YOLO layers inferencing... Feature extraction complete. Matching bounding boxes...', delay: 1000, type: 'info' },
            { threshold: 100, text: '正在测量几何形态，生成安全度评估报告...', log: 'Geometric measurements extracted. Writing logs, writing summary structural index...', delay: 600, type: 'success' }
        ];

        let stepIdx = 0;
        
        function processSteps() {
            if (stepIdx >= steps.length) {
                // Done! Assemble results and display
                setTimeout(() => {
                    assembleSingleResult(file);
                }, 300);
                return;
            }

            const step = steps[stepIdx];
            el.loadingText.innerText = step.text;
            printLog(step.log, step.type);

            // Increment progress slowly during delay
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

    function assembleSingleResult(file) {
        const sampleId = file.isMockSample ? file.sampleId : 'custom';
        const projectDetails = {
            name: el.inputProjName.value || '桥梁裂纹检测项目',
            bridge: el.inputBridgeName.value || '厦门大桥',
            location: el.inputLocation.value || '主梁跨中段',
            inspector: el.inputInspector.value || '林工',
            gsd: state.gsd
        };

        // Simulated Detected Cracks details
        let cracks = [];
        if (sampleId !== 'custom') {
            // Load preset coordinate systems
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
            // Generate procedural cracks based on custom uploaded image size
            // For simple visualization, we define 2 realistic cracks
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

        // Calculate summary statistics
        const count = cracks.length;
        const maxWidth = Math.max(...cracks.map(c => c.widthMm));
        const avgWidth = parseFloat((cracks.reduce((acc, c) => acc + c.avgWidthMm, 0) / count).toFixed(2));
        const maxLength = Math.max(...cracks.map(c => c.lengthMm));

        // Evaluate Risk Assessment (JTG standard simulation)
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

        printLog(`[检测完毕] 共识别裂缝: ${count}条, 最大宽度: ${maxWidth}mm, 最大长度: ${maxLength}mm, 结构安全级别: ${riskDesc}`, 'success');

        // Draw Canvas UI
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

    // Result Canvas Rendering
    function renderResultCanvas() {
        const det = state.currentDetection;
        if (!det) return;

        const img = new Image();
        img.src = det.fileSrc;
        img.onload = () => {
            const canvas = el.resultCanvas;
            const ctx = canvas.getContext('2d');

            // Maintain native image resolution
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            // Draw Base Image
            ctx.drawImage(img, 0, 0);

            // Draw annotations if visible and "compare original" is false
            if (state.showAnnotations) {
                det.cracks.forEach((crack) => {
                    const boxX = (crack.box.x / 1000) * canvas.width;
                    const boxY = (crack.box.y / 1000) * canvas.height;
                    const boxW = (crack.box.w / 1000) * canvas.width;
                    const boxH = (crack.box.h / 1000) * canvas.height;

                    // 1. Draw Bounding Box (YOLO style)
                    ctx.strokeStyle = '#ef4444'; // red box
                    ctx.lineWidth = Math.max(3, canvas.width / 350);
                    ctx.setLineDash([]);
                    ctx.strokeRect(boxX, boxY, boxW, boxH);

                    // 2. Draw Label Tag Header
                    ctx.fillStyle = '#ef4444';
                    const tagH = Math.max(22, canvas.height / 35);
                    const tagW = Math.max(160, canvas.width / 5);
                    ctx.fillRect(boxX, boxY - tagH, tagW, tagH);

                    // Text Label in Tag
                    ctx.fillStyle = '#ffffff';
                    ctx.font = `bold ${Math.max(12, canvas.height / 50)}px sans-serif`;
                    ctx.textBaseline = 'middle';
                    ctx.fillText(` [${crack.id}] W:${crack.widthMm.toFixed(2)}mm L:${crack.lengthMm.toFixed(0)}mm`, boxX + 6, boxY - tagH/2);

                    // 3. Draw Path Overlay
                    ctx.strokeStyle = '#22c55e'; // emerald green line for crack path
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

                    // Optional path boundary glow
                    ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
                    ctx.lineWidth = Math.max(8, canvas.width / 110);
                    ctx.stroke();
                });
            }
        };
    }

    // Toggle Labels & Annotation displays
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

    // Re-detect button
    el.btnReDetect.addEventListener('click', () => {
        showView('welcome');
    });

    // ==========================================
    // BATCH DETECTION WORKFLOW
    // ==========================================
    function runBatchDetection(files) {
        showView('batch');
        el.batchTableBody.innerHTML = '';
        el.btnExportBatchExcel.disabled = true;
        
        state.batchQueue = files.map((file, idx) => ({
            id: idx + 1,
            fileName: file.name,
            size: file.size,
            fileObject: file,
            status: 'pending', // 'pending' | 'running' | 'completed'
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
        printLog(`[批量任务启动] 开始顺序分析 ${files.length} 张桥梁图片...`, 'info');

        function processNextBatchFile() {
            if (fileIdx >= state.batchQueue.length) {
                // All batch processes completed!
                state.isProcessingBatch = false;
                el.btnExportBatchExcel.disabled = false;
                printLog(`[批量任务完成] 全部 ${state.batchQueue.length} 张图片检测完成，结果报表已生成！`, 'success');
                appendNewHistoryReport(true);
                return;
            }

            const item = state.batchQueue[fileIdx];
            item.status = 'running';
            updateBatchQueueDisplay();
            printLog(`[${fileIdx + 1}/${files.length}] 正在使用 YOLOv8 分析 ${item.fileName}...`, 'info');

            // Simulate detection time per file
            setTimeout(() => {
                // Generate simulated parameters
                const crackCount = Math.floor(Math.random() * 4) + 1; // 1 to 4 cracks
                let maxWidth = parseFloat(((Math.random() * 4 + 1.2) * state.gsd).toFixed(2)); // widths
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

                printLog(`[${fileIdx + 1}/${files.length}] 完成 ${item.fileName} 分析: 找到 ${crackCount}条裂纹, MaxW = ${maxWidth}mm`, 'success');
                
                // Update cumulative batch metrics card
                updateBatchSummaryCards();
                
                updateBatchQueueDisplay();
                fileIdx++;
                processNextBatchFile();
            }, 1200);
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

        // Add visual viewer binders to batch table rows
        el.batchTableBody.querySelectorAll('.btn-item-inspect').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-idx'));
                const batchItem = state.batchQueue[idx];
                
                // Mock visual load into Single View
                const fileRef = batchItem.fileObject;
                // Pre-generate detection detail for single mode viewer
                assembleSingleResult({
                    name: batchItem.fileName,
                    size: batchItem.size,
                    type: 'image/png',
                    isMockSample: false,
                    src: URL.createObjectURL(fileRef)
                });
                
                // Show toast logs
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
    // EXCEL / CSV REPORT EXPORT SYSTEM
    // ==========================================
    function downloadCSV(csvContent, filename) {
        // UTF-8 with BOM (\uFEFF) to make sure Chinese characters display correctly in MS Excel
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

    // Export Single Detection Report
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

    // Export Batch Merged Detection Report
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

    // History List Appending
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
        
        // Render updated history reports sidebar list
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

        // Rebind click events to download reports
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

    // Trigger downloading of the preset static reports on right sidebar
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

    // Trigger download for the 3 hardcoded starting reports
    el.historyReportsList.querySelectorAll('.btn-download-report').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const itemDiv = btn.closest('.report-item');
            const fn = itemDiv.getAttribute('data-filename');
            triggerMockHistoryDownload(fn);
        });
    });

    // Initialize application settings on boot
    initAccordions();
    initLogger();
    recalculateGSD(); // Set GSD initially
    el.btnStartDetect.disabled = true; // Disable until image is loaded
});
