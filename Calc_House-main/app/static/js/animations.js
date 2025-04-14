/**
 * animations.js - Скрипт анимации математической доски и расчетов
 */

// Глобальные переменные для анимаций
let createFormulaElement;
let createConnection;
let startArchitecturalBoardAnimation;
let stageTwo, stageThree, stageFour, stageFive, stageSix, stageSeven;

// Инициализация анимации математической доски
document.addEventListener('DOMContentLoaded', function () {
    // Создаем структуру для математической доски, если она еще не создана
    initMathBoard();

    // Получаем элементы анимации
    const formulasArea = document.getElementById('formulas-area');
    const progressTracker = document.getElementById('progress-tracker');

    // Отладочный вывод
    logDebug("Инициализация анимационной доски");

    // Функция для создания элемента формулы с эффектом меловой надписи
    createFormulaElement = function (content, position = {}, style = {}, animation = {}) {
        const element = document.createElement('div');

        // Базовые стили формулы
        const baseStyle = {
            position: 'absolute',
            color: 'rgba(220, 255, 240, 0.9)',
            fontFamily: '"CMU Serif", Georgia, serif',
            fontSize: '16px',
            textShadow: '0 0 3px rgba(120, 255, 200, 0.4)',
            opacity: '0',
            transform: 'scale(0.95)',
            transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
            padding: '8px 12px',
            borderRadius: '4px',
            zIndex: '20',
            ...position
        };

        // Применяем стили
        Object.assign(element.style, baseStyle, style);
        element.innerHTML = content;
        formulasArea.appendChild(element);

        // Добавляем случайную задержку для более естественного эффекта появления
        const delay = animation.delay || 0;

        setTimeout(() => {
            element.style.opacity = '1';
            element.style.transform = 'scale(1)';

            // Применяем анимацию пульсации при необходимости
            if (animation.pulse) {
                element.classList.add('formula-pulse');
            }
        }, delay);

        return element;
    };

    // Функция для создания линии связи между формулами
    createConnection = function (startElement, endElement, delay = 0, options = {}) {
        setTimeout(() => {
            // Создаем SVG элемент для линии
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.style.position = 'absolute';
            svg.style.top = '0';
            svg.style.left = '0';
            svg.style.width = '100%';
            svg.style.height = '100%';
            svg.style.pointerEvents = 'none';
            svg.style.zIndex = '15';

            // Получаем координаты элементов
            const startRect = startElement.getBoundingClientRect();
            const endRect = endElement.getBoundingClientRect();
            const formulasRect = formulasArea.getBoundingClientRect();

            // Вычисляем относительные координаты
            const x1 = startRect.left + startRect.width / 2 - formulasRect.left;
            const y1 = startRect.top + startRect.height / 2 - formulasRect.top;
            const x2 = endRect.left + endRect.width / 2 - formulasRect.left;
            const y2 = endRect.top + endRect.height / 2 - formulasRect.top;

            // Создаем линию с небольшим смещением для эффекта кривой
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const dx = (x2 - x1) * 0.5;
            const pathData = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

            line.setAttribute('d', pathData);
            line.setAttribute('stroke', options.color || 'rgba(140, 230, 210, 0.6)');
            line.setAttribute('stroke-width', options.width || '1');
            line.setAttribute('fill', 'none');
            line.setAttribute('stroke-dasharray', options.dasharray || '1, 2');

            // Анимация рисования
            const length = line.getTotalLength();
            line.style.strokeDasharray = length;
            line.style.strokeDashoffset = length;
            line.style.animation = `drawLine 1.5s ease-out forwards`;

            svg.appendChild(line);
            formulasArea.appendChild(svg);

            return svg;
        }, delay);
    };

    // Функция инициализации математической доски
    function initMathBoard() {
        const mathBoardContainer = document.getElementById('mathBoardContainer');

        if (!mathBoardContainer) {
            console.error("Контейнер математической доски не найден");
            return;
        }

        // Создаем разметку математической доски
        mathBoardContainer.innerHTML = `
            <!-- Градиентные края доски -->
            <div class="board-edge-gradient"></div>
            
            <!-- Легкое свечение по периметру -->
            <div class="board-glow-edge"></div>
            
            <!-- Фоновая сетка для математического вида -->
            <div class="math-grid"></div>
            
            <!-- Контур дома на фоне - едва заметный -->
            <div class="house-background-outline">
                <svg width="100%" height="100%" viewBox="0 0 800 350" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
                    <!-- Большой еле видный контур дома -->
                    <g stroke="rgba(140, 255, 220, 0.7)" fill="none" stroke-width="1.5">
                        <!-- Фундамент -->
                        <rect x="150" y="290" width="500" height="40" />

                        <!-- Стены -->
                        <rect x="180" y="110" width="440" height="180" />

                        <!-- Крыша -->
                        <path d="M 150 110 L 400 20 L 650 110" />

                        <!-- Детали -->
                        <rect x="280" y="170" width="80" height="120" /> <!-- Дверь -->
                        <rect x="440" y="170" width="100" height="70" /> <!-- Окно -->
                        <line x1="180" y1="110" x2="620" y2="110" /> <!-- Линия между крышей и стенами -->
                        <line x1="400" y1="20" x2="400" y2="110" /> <!-- Центральная линия крыши -->

                        <!-- Размерные линии и обозначения -->
                        <line x1="100" y1="290" x2="100" y2="110" stroke-dasharray="5,5" />
                        <line x1="700" y1="290" x2="700" y2="110" stroke-dasharray="5,5" />
                        <line x1="100" y1="200" x2="150" y2="200" stroke-dasharray="3,3" />
                        <line x1="650" y1="200" x2="700" y2="200" stroke-dasharray="3,3" />
                    </g>
                </svg>
            </div>

            <!-- Область формул и расчетов -->
            <div class="formulas-area" id="formulas-area"></div>

            <!-- Статус выполнения - незаметная полоса загрузки снизу -->
            <div id="progress-tracker"></div>
        `;

        // Проверяем, загружен ли шрифт для формул
        if (!document.getElementById('math-font-loader')) {
            const fontLink = document.createElement('link');
            fontLink.id = 'math-font-loader';
            fontLink.rel = 'stylesheet';
            fontLink.href = 'https://cdn.jsdelivr.net/npm/@fontsource/cmu-serif@5.0.5/index.css';
            document.head.appendChild(fontLink);
            logDebug("Загружен шрифт для формул");
        }
    }

    // Главная последовательность анимации
    startArchitecturalBoardAnimation = function () {
        // Проверка готовности элементов
        if (!document.getElementById('formulas-area') || !document.getElementById('progress-tracker')) {
            console.error("Анимация не может быть запущена - элементы не найдены");
            logDebug("Ошибка: элементы анимации не готовы");

            // Повторная попытка через 100 мс
            setTimeout(startArchitecturalBoardAnimation, 100);
            return;
        }

        // Получаем элементы снова для надежности
        const progressTracker = document.getElementById('progress-tracker');
        const formulasArea = document.getElementById('formulas-area');

        // Добавляем метку запущенной анимации
        formulasArea.setAttribute('data-animation-started', 'true');

        // Обновляем индикатор прогресса
        if (progressTracker) {
            progressTracker.style.width = '3%';
        }

        // Небольшая задержка перед началом анимации
        setTimeout(() => stageTwo(), 500);
    };

    // Этап 2: Фундаментальные формулы (3-15%)
    stageTwo = function () {
        progressTracker.style.width = '15%';
        logDebug("Этап 2: Фундаментальные формулы");

        // Основные формулы объема и площади
        const volumeFormula = createFormulaElement(
            '<span style="font-size: 19px;">V<sub>1</sub> = a × b × h</span> <span style="font-size: 14px; opacity: 0.8;">(объем фундамента)</span>',
            { left: '5%', top: '10%' },
            {},
            { delay: 120 }
        );

        const areaFormula = createFormulaElement(
            '<span style="font-size: 19px;">S<sub>1</sub> = L × W</span> <span style="font-size: 14px; opacity: 0.8;">(площадь основания)</span>',
            { left: '40%', top: '15%' },
            {},
            { delay: 350 }
        );

        const perimeterFormula = createFormulaElement(
            '<span style="font-size: 19px;">P = 2(L + W)</span> <span style="font-size: 14px; opacity: 0.8;">(периметр основания)</span>',
            { left: '70%', top: '12%' },
            {},
            { delay: 600 }
        );

        // Простые схемы
        const foundationSchema = createFormulaElement(
            '<svg width="80" height="40" viewBox="0 0 80 40" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="30" width="60" height="10" fill="none" stroke="rgba(180, 255, 220, 0.7)" stroke-width="1" stroke-dasharray="2,1"/><text x="40" y="25" fill="rgba(180, 255, 220, 0.7)" font-size="8" text-anchor="middle">фундамент</text></svg>',
            { left: '10%', top: '25%' },
            {},
            { delay: 800 }
        );

        // Создаем связи между формулами
        setTimeout(() => {
            createConnection(volumeFormula, foundationSchema, 0, { dasharray: '3, 2' });
            createConnection(areaFormula, foundationSchema, 200);
            createConnection(perimeterFormula, areaFormula, 350);

            // Переход к следующему этапу
            setTimeout(() => stageThree(), 600);
        }, 1200);
    };

    // Этап 3: Расширенные расчеты материалов (15-35%)
    stageThree = function () {
        progressTracker.style.width = '35%';
        logDebug("Этап 3: Расширенные расчеты материалов");

        // Формулы смещаются для освобождения места
        document.querySelectorAll('#formulas-area > div').forEach(el => {
            if (el.style.top.includes('%')) {
                const currentTop = parseFloat(el.style.top);
                el.style.top = `${currentTop * 0.7}%`;
                el.style.transform = 'scale(0.85)';
            }
        });

        // Более сложные формулы расчета материалов
        const concreteFormula = createFormulaElement(
            '<span style="font-size: 18px;">∑ V<sub>бетона</sub> = 0,4м × 0,5м × L<sub>периметра</sub></span>',
            { left: '10%', top: '38%' },
            { background: 'rgba(60, 100, 120, 0.2)' },
            { delay: 120, pulse: true }
        );

        const brickFormula = createFormulaElement(
            '<span style="font-size: 18px;">N<sub>кирпича</sub> = S<sub>стен</sub> / S<sub>1кирпича</sub> × k<sub>запаса</sub></span>',
            { left: '50%', top: '40%' },
            { background: 'rgba(120, 60, 60, 0.2)' },
            { delay: 450, pulse: true }
        );

        const mixtureFormula = createFormulaElement(
            '<span style="font-size: 18px;">V<sub>раствора</sub> = V<sub>кладки</sub> × (1 - η<sub>кирпича</sub>)</span>',
            { left: '25%', top: '52%' },
            { background: 'rgba(100, 90, 60, 0.2)' },
            { delay: 800, pulse: true }
        );

        // Добавляем подчеркивания и примечания
        const brickNote = createFormulaElement(
            '<span style="font-size: 14px; font-style: italic;">где k<sub>запаса</sub> = 1.1 (10% запас)</span>',
            { left: '60%', top: '48%' },
            { borderBottom: '1px solid rgba(180, 255, 220, 0.3)' },
            { delay: 1100 }
        );

        // Создаем связи через некоторое время
        setTimeout(() => {
            createConnection(concreteFormula, brickFormula, 0, { color: 'rgba(180, 220, 255, 0.5)', width: '1.5' });
            createConnection(brickFormula, mixtureFormula, 250, { color: 'rgba(220, 180, 180, 0.5)', width: '1.5' });
            createConnection(brickFormula, brickNote, 500, { dasharray: '1, 1' });

            // Переход к следующему этапу
            setTimeout(() => stageFour(), 600);
        }, 1800);
    };

    // Этап 4: Объемная визуализация (35-55%)
    stageFour = function () {
        progressTracker.style.width = '55%';
        logDebug("Этап 4: Объемная визуализация");

        // 3D проекция дома меловыми линиями в центре
        const house3dProjection = createFormulaElement(
            `<svg width="180" height="140" viewBox="0 0 180 140" xmlns="http://www.w3.org/2000/svg">
                <style>
                    .house-line { stroke: rgba(190, 255, 230, 0.8); stroke-width: 1; fill: none; }
                    .house-fill { fill: rgba(100, 180, 160, 0.1); stroke: none; }
                    @keyframes rotateSlow { 
                        0% { transform: rotateY(10deg); }
                        50% { transform: rotateY(-5deg); }
                        100% { transform: rotateY(10deg); }
                    }
                    .house-group { animation: rotateSlow 8s infinite ease-in-out; transform-origin: center center; }
                </style>
                <g class="house-group">
                    <polygon class="house-fill" points="90,20 140,50 140,100 40,100 40,50" />
                    <polygon class="house-line" points="90,20 140,50 140,100 40,100 40,50 90,20" />
                    <line class="house-line" x1="40" y1="50" x2="90" y2="80" />
                    <line class="house-line" x1="90" y1="80" x2="140" y2="50" />
                    <line class="house-line" x1="90" y1="80" x2="90" y2="130" />
                    <rect class="house-line" x="60" y="70" width="20" height="30" />
                    <rect class="house-line" x="100" y="70" width="20" height="20" />
                </g>
            </svg>`,
            { left: '35%', top: '38%', width: '180px', height: '140px' },
            { background: 'transparent' },
            { delay: 50 }
        );

        // Формулы нагрузок вокруг проекции
        const stressFormula = createFormulaElement(
            '<span style="font-size: 18px;">σ = F/A</span> <span style="font-size: 14px; opacity: 0.8;">(напряжение)</span>',
            { left: '15%', top: '60%' },
            { background: 'rgba(60, 100, 120, 0.15)' },
            { delay: 180 }
        );

        const momentFormula = createFormulaElement(
            '<span style="font-size: 18px;">M = F × d</span> <span style="font-size: 14px; opacity: 0.8;">(момент силы)</span>',
            { left: '68%', top: '55%' },
            { background: 'rgba(60, 100, 120, 0.15)' },
            { delay: 300 }
        );

        const pressureFormula = createFormulaElement(
            '<span style="font-size: 18px;">q = ρgh</span> <span style="font-size: 14px; opacity: 0.8;">(давление грунта)</span>',
            { left: '50%', top: '70%' },
            { background: 'rgba(60, 100, 120, 0.15)' },
            { delay: 400 }
        );

        // Создаем связи с 3D проекцией
        setTimeout(() => {
            createConnection(house3dProjection, stressFormula, 0, { color: 'rgba(140, 220, 255, 0.6)', width: '1', dasharray: '2, 2' });
            createConnection(house3dProjection, momentFormula, 80, { color: 'rgba(140, 220, 255, 0.6)', width: '1', dasharray: '2, 2' });
            createConnection(house3dProjection, pressureFormula, 160, { color: 'rgba(140, 220, 255, 0.6)', width: '1', dasharray: '2, 2' });

            // Переход к финальному этапу
            setTimeout(() => stageSix(), 400);
        }, 700);
    };

    // Этап 6: Финальные обобщения (75-95%)
    stageSix = function () {
        progressTracker.style.width = '95%';
        logDebug("Этап 6: Финальные обобщения");

        // Единицы измерения и коэффициенты
        const unitsNote = createFormulaElement(
            '<span style="font-size: 14px;">Единицы измерения: м, м<sup>2</sup>, м<sup>3</sup>, Н, Па, Вт/(м·К)</span>',
            { left: '10%', bottom: '10%' },
            { borderTop: '1px solid rgba(180, 255, 220, 0.3)' },
            { delay: 150 }
        );

        const coefficientsNote = createFormulaElement(
            '<span style="font-size: 14px;">Коэффициенты запаса: 1.1 - 1.5 в зависимости от материала</span>',
            { right: '10%', bottom: '10%' },
            { borderTop: '1px solid rgba(180, 255, 220, 0.3)' },
            { delay: 300 }
        );

        // Быстрый переход к финальному этапу
        setTimeout(() => stageSeven(), 350);
    };

    // Этап 7: Интеллектуальное преобразование (95-100%)
    stageSeven = function () {
        progressTracker.style.width = '100%';
        logDebug("Начало финального этапа 7");

        // Полностью очищаем все формулы перед показом финальной надписи
        // Удаляем все элементы из области формул кроме прогресс-трекера
        document.querySelectorAll('#formulas-area > div').forEach(el => {
            if (!el.id || el.id !== 'progress-tracker') {
                el.remove();
            }
        });

        // Удаляем все SVG линии
        document.querySelectorAll('#formulas-area > svg').forEach(svg => {
            svg.remove();
        });

        // Финальное свечение
        const finalGlow = document.createElement('div');
        finalGlow.style.position = 'absolute';
        finalGlow.style.inset = '0';
        finalGlow.style.background = 'radial-gradient(circle at center, rgba(140, 255, 220, 0.3) 0%, rgba(26, 38, 53, 0) 70%)';
        finalGlow.style.opacity = '0';
        finalGlow.style.transition = 'opacity 0.3s ease-in-out';
        finalGlow.style.zIndex = '30';

        formulasArea.appendChild(finalGlow);

        setTimeout(() => {
            finalGlow.style.opacity = '1';
            logDebug("Финальное свечение отображено");

            // Показываем финальный текст после появления свечения
            setTimeout(() => {
                // Финальный текст
                const finalText = document.createElement('div');
                finalText.style.position = 'absolute';
                finalText.style.left = '50%';
                finalText.style.top = '50%';
                finalText.style.transform = 'translate(-50%, -50%) scale(0.9)';
                finalText.style.color = 'rgba(220, 255, 240, 0.9)';
                finalText.style.fontFamily = '"Segoe UI", Arial, sans-serif';
                finalText.style.fontSize = '22px';
                finalText.style.fontWeight = '600';
                finalText.style.textAlign = 'center';
                finalText.style.textShadow = '0 0 10px rgba(140, 255, 220, 0.6)';
                finalText.style.opacity = '0';
                finalText.style.transition = 'all 0.25s ease-in-out';
                finalText.style.zIndex = '40';
                finalText.innerHTML = 'Расчет завершен';

                formulasArea.appendChild(finalText);
                logDebug("Финальный текст добавлен");

                // Сразу показываем текст без задержки
                finalText.style.opacity = '1';
                finalText.style.transform = 'translate(-50%, -50%) scale(1)';

                // Показываем результаты через 500мс
                setTimeout(() => {
                    logDebug("Вызываем показ результатов после анимации");
                    window.showDemoResults();
                }, 500);
            }, 180);
        }, 50);
    };

    // Добавляем стили для анимаций
    const style = document.createElement('style');
    style.textContent = `
        @keyframes drawLine {
            to {
                stroke-dashoffset: 0;
            }
        }
        
        @keyframes formula-pulsate {
            0%, 100% { opacity: 1; background-color: rgba(100, 180, 160, 0.15); }
            50% { opacity: 0.8; background-color: rgba(100, 180, 160, 0.2); }
        }
        
        .formula-pulse {
            animation: formula-pulsate 2s ease-in-out infinite;
        }
        
        @font-face {
            font-family: 'CMU Serif';
            src: url('https://cdn.jsdelivr.net/npm/@fontsource/cmu-serif@5.0.5/files/cmu-serif-latin-400-normal.woff2') format('woff2');
            font-weight: normal;
            font-style: normal;
        }
        
        #formulas-area {
            visibility: visible !important;
            display: block !important;
        }
        
        .math-board-container {
            visibility: visible !important;
            display: block !important;
        }
    `;
    document.head.appendChild(style);
});