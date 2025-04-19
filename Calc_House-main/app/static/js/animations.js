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
    // Настраиваем отладку
    logDebug = function (message) {
        console.log('[Animation Debug] ' + message);
    };

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
            <!-- Фоновая сетка для математического вида -->
            <div class="math-grid" style="position:absolute; inset:0; background-image: linear-gradient(rgba(140, 255, 220, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(140, 255, 220, 0.05) 1px, transparent 1px); background-size: 20px 20px;"></div>

            <!-- Контур дома на фоне - более заметный -->
            <div class="house-background-outline" style="position:absolute; inset:0; opacity:0.35;">
                <svg width="100%" height="100%" viewBox="0 0 800 280" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
                    <g stroke="rgba(140, 255, 220, 0.8)" fill="none" stroke-width="2">
                        <!-- Фундамент -->
                        <rect x="150" y="230" width="500" height="40" />

                        <!-- Стены -->
                        <rect x="180" y="90" width="440" height="140" />

                        <!-- Крыша -->
                        <path d="M 150 90 L 400 30 L 650 90" />
                        
                        <!-- Дополнительные детали -->
                        <!-- Окна -->
                        <rect x="240" y="120" width="80" height="60" stroke-dasharray="2,1" />
                        <rect x="480" y="120" width="80" height="60" stroke-dasharray="2,1" />
                        
                        <!-- Дверь -->
                        <rect x="350" y="170" width="100" height="60" />
                        
                        <!-- Дополнительные линии крыши -->
                        <line x1="400" y1="30" x2="400" y2="90" stroke-dasharray="4,2" />
                        
                        <!-- Размерные линии -->
                        <line x1="130" y1="90" x2="130" y2="230" stroke-dasharray="5,3" stroke-opacity="0.6" />
                        <line x1="670" y1="90" x2="670" y2="230" stroke-dasharray="5,3" stroke-opacity="0.6" />
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
        // Проверяем существование контейнера mathBoardContainer
        const mathBoardContainer = document.getElementById('mathBoardContainer');
        if (!mathBoardContainer) {
            console.error("Анимация не может быть запущена - контейнер доски не найден");
            logDebug("Ошибка: контейнер математической доски не найден");
            return; // Прекращаем выполнение, если нет контейнера
        }

        // Проверка, была ли уже проведена инициализация доски
        if (!document.getElementById('formulas-area')) {
            logDebug("Инициализация математической доски");
            initMathBoard(); // Пробуем инициализировать снова
        }

        // Проверка готовности элементов
        if (!document.getElementById('formulas-area') || !document.getElementById('progress-tracker')) {
            console.error("Анимация не может быть запущена - элементы не найдены");
            logDebug("Ошибка: элементы анимации не готовы");

            // Повторная попытка через 100 мс, максимум 10 раз
            if (!window.animationRetryCount) {
                window.animationRetryCount = 0;
            }

            if (window.animationRetryCount < 10) {
                window.animationRetryCount++;
                setTimeout(startArchitecturalBoardAnimation, 100);
            } else {
                logDebug("Превышено максимальное количество попыток анимации, показываем результаты напрямую");
                if (typeof window.showDemoResults === 'function') {
                    window.showDemoResults();
                }
                window.animationRetryCount = 0;
            }
            return;
        }

        // Сбрасываем счетчик попыток анимации
        window.animationRetryCount = 0;

        // Получаем элементы снова для надежности
        const progressTracker = document.getElementById('progress-tracker');
        const formulasArea = document.getElementById('formulas-area');

        // Очищаем предыдущую анимацию
        while (formulasArea.firstChild) {
            if (formulasArea.firstChild.id !== 'progress-tracker') {
                formulasArea.removeChild(formulasArea.firstChild);
            }
        }

        // Добавляем метку запущенной анимации
        formulasArea.setAttribute('data-animation-started', 'true');

        // Обновляем индикатор прогресса
        if (progressTracker) {
            progressTracker.style.width = '3%';
        }

        // Небольшая задержка перед началом анимации
        setTimeout(() => {
            if (typeof stageTwo === 'function') {
                stageTwo();
            } else {
                logDebug("Функция stageTwo не определена, пропускаем анимацию");
                // Активируем панель результатов напрямую
                if (typeof window.showDemoResults === 'function') {
                    window.showDemoResults();
                }
            }
        }, 500);
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

        // Создаем связи с 3D проекцией и сразу переходим к следующему этапу
        setTimeout(() => {
            try {
                // Пытаемся создать связи
                createConnection(house3dProjection, stressFormula, 0, { color: 'rgba(140, 220, 255, 0.6)', width: '1', dasharray: '2, 2' });
                createConnection(house3dProjection, momentFormula, 80, { color: 'rgba(140, 220, 255, 0.6)', width: '1', dasharray: '2, 2' });
                createConnection(house3dProjection, pressureFormula, 160, { color: 'rgba(140, 220, 255, 0.6)', width: '1', dasharray: '2, 2' });

                // Добавляем логи и увеличиваем задержку перед переходом к следующему этапу
                logDebug("Создание связей 3D проекции завершено");
            } catch (e) {
                logDebug("Ошибка при создании связей: " + e.message);
            }

            // В любом случае переходим к финальному этапу 6
            logDebug("Гарантированный переход к этапу 6 (финальные обобщения)");

            // Переходим к этапу 6 - финальные обобщения
            setTimeout(() => {
                try {
                    if (typeof stageSix === 'function') {
                        stageSix();
                    } else {
                        logDebug("Функция stageSix не найдена, переходим к завершению");
                        // Если stageSix недоступен, идем прямо к stageSeven
                        if (typeof stageSeven === 'function') {
                            stageSeven();
                        } else {
                            // Если и stageSeven недоступен, просто завершаем процесс
                            logDebug("Функция stageSeven также не найдена, завершаем анимацию");
                            window.animationCompleted = true;
                        }
                    }
                } catch (e) {
                    logDebug("Ошибка при переходе к следующему этапу: " + e.message);
                    window.animationCompleted = true;
                }
            }, 800);
        }, 700);
    };

    // Этап 6: Финальные обобщения (75-95%)
    stageSix = function () {
        progressTracker.style.width = '95%';
        logDebug("Этап 6: Финальные обобщения");

        try {
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

            // Добавляем логи и увеличиваем задержку перед переходом к финальному этапу
            logDebug("Этап 6: Формулы и коэффициенты добавлены");
        } catch (e) {
            logDebug("Ошибка в этапе 6: " + e.message);
        }

        // В любом случае переходим к финальному этапу
        setTimeout(() => {
            logDebug("Гарантированный переход к финальному этапу 7");

            try {
                if (typeof stageSeven === 'function') {
                    stageSeven();
                } else {
                    logDebug("Функция stageSeven не найдена, завершаем анимацию напрямую");
                    window.animationCompleted = true;
                }
            } catch (e) {
                logDebug("Ошибка при переходе к stageSeven: " + e.message);
                // В случае ошибки, устанавливаем флаг завершения анимации
                window.animationCompleted = true;

                // Очищаем таймаут анимации, если он был установлен
                if (window.animationTimeout) {
                    clearTimeout(window.animationTimeout);
                    logDebug("Таймаут анимации очищен (ошибка в svechenii)");
                }
            }
        }, 700); // Задержка 700 мс
    };

    // Этап 7: Интеллектуальное преобразование (95-100%)
    stageSeven = function () {
        try {
            progressTracker.style.width = '100%';
            logDebug("Начало финального этапа 7");

            try {
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
            } catch (e) {
                logDebug("Ошибка при очистке формул: " + e.message);
                // Продолжаем выполнение, даже если не удалось очистить
            }

            try {
                // Финальное свечение
                const finalGlow = document.createElement('div');
                finalGlow.style.position = 'absolute';
                finalGlow.style.inset = '0';
                finalGlow.style.background = 'radial-gradient(circle at center, rgba(140, 255, 220, 0.3) 0%, rgba(26, 38, 53, 0) 70%)';
                finalGlow.style.opacity = '0';
                finalGlow.style.transition = 'opacity 0.3s ease-in-out';
                finalGlow.style.zIndex = '30';

                formulasArea.appendChild(finalGlow);

                // Показываем свечение
                setTimeout(() => {
                    finalGlow.style.opacity = '1';
                    logDebug("Финальное свечение отображено");

                    // Финальный текст
                    try {
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

                        // Показываем текст
                        finalText.style.opacity = '1';
                        finalText.style.transform = 'translate(-50%, -50%) scale(1)';
                    } catch (e) {
                        logDebug("Ошибка при создании финального текста: " + e.message);
                        // Продолжаем выполнение
                    }

                    // В любом случае, устанавливаем флаг завершения анимации
                    logDebug("Этап 7 завершен, устанавливаем флаг завершения анимации");
                    window.animationCompleted = true;

                    // Очищаем таймаут анимации, если он был установлен
                    if (window.animationTimeout) {
                        clearTimeout(window.animationTimeout);
                        logDebug("Таймаут анимации очищен");
                    }
                }, 200);
            } catch (e) {
                logDebug("Ошибка при создании финального свечения: " + e.message);
                // Даже в случае ошибки, устанавливаем флаг завершения анимации
                window.animationCompleted = true;
            }
        } catch (e) {
            logDebug("Критическая ошибка в stageSeven: " + e.message);
            // Гарантируем установку флага завершения анимации
            window.animationCompleted = true;

            // Очищаем таймаут анимации, если он был установлен
            if (window.animationTimeout) {
                clearTimeout(window.animationTimeout);
                logDebug("Таймаут анимации очищен (критическая ошибка)");
            }
        }
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

    // Создаем функции для внешнего использования
    window.startLoadingAnimation = function () {
        console.log('Запуск анимации загрузки...');

        // Сбрасываем флаг завершения анимации в начале процесса
        window.animationCompleted = false;

        try {
            // Проверяем наличие контейнера для анимации
            let loadingContainer = document.getElementById('loading-animation');
            if (!loadingContainer) {
                console.log('Контейнер загрузки не найден, создаем новый');

                // Пробуем найти контейнер результатов
                const resultsPanel = document.querySelector('.results-panel');
                if (resultsPanel) {
                    // Создаем контейнер для загрузки
                    loadingContainer = document.createElement('div');
                    loadingContainer.id = 'loading-animation';
                    loadingContainer.className = 'text-center py-8';
                    loadingContainer.style.display = 'block';
                    loadingContainer.style.visibility = 'visible';
                    loadingContainer.style.opacity = '1';

                    // Создаем контейнер для математической доски
                    const mathBoardContainer = document.createElement('div');
                    mathBoardContainer.id = 'mathBoardContainer';
                    mathBoardContainer.className = 'math-board-container';
                    mathBoardContainer.style.position = 'relative';
                    mathBoardContainer.style.display = 'block';
                    mathBoardContainer.style.visibility = 'visible';
                    mathBoardContainer.style.width = '100%';
                    mathBoardContainer.style.height = '280px';
                    mathBoardContainer.style.backgroundColor = 'rgba(26, 38, 53, 0.3)';
                    mathBoardContainer.style.borderRadius = '8px';
                    mathBoardContainer.style.overflow = 'hidden';
                    mathBoardContainer.style.margin = '0 auto';
                    mathBoardContainer.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';

                    // Создаем структуру для доски
                    mathBoardContainer.innerHTML = `
                        <!-- Фоновая сетка для математического вида -->
                        <div class="math-grid" style="position:absolute; inset:0; background-image: linear-gradient(rgba(140, 255, 220, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(140, 255, 220, 0.05) 1px, transparent 1px); background-size: 20px 20px;"></div>

                        <!-- Контур дома на фоне - более заметный -->
                        <div class="house-background-outline" style="position:absolute; inset:0; opacity:0.35;">
                            <svg width="100%" height="100%" viewBox="0 0 800 280" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
                                <g stroke="rgba(140, 255, 220, 0.8)" fill="none" stroke-width="2">
                                    <!-- Фундамент -->
                                    <rect x="150" y="230" width="500" height="40" />

                                    <!-- Стены -->
                                    <rect x="180" y="90" width="440" height="140" />

                                    <!-- Крыша -->
                                    <path d="M 150 90 L 400 30 L 650 90" />
                                    
                                    <!-- Дополнительные детали -->
                                    <!-- Окна -->
                                    <rect x="240" y="120" width="80" height="60" stroke-dasharray="2,1" />
                                    <rect x="480" y="120" width="80" height="60" stroke-dasharray="2,1" />
                                    
                                    <!-- Дверь -->
                                    <rect x="350" y="170" width="100" height="60" />
                                    
                                    <!-- Дополнительные линии крыши -->
                                    <line x1="400" y1="30" x2="400" y2="90" stroke-dasharray="4,2" />
                                    
                                    <!-- Размерные линии -->
                                    <line x1="130" y1="90" x2="130" y2="230" stroke-dasharray="5,3" stroke-opacity="0.6" />
                                    <line x1="670" y1="90" x2="670" y2="230" stroke-dasharray="5,3" stroke-opacity="0.6" />
                                </g>
                            </svg>
                        </div>

                        <!-- Область формул и расчетов -->
                        <div class="formulas-area" id="formulas-area" style="position:absolute; inset:0;"></div>

                        <!-- Полоса загрузки -->
                        <div id="progress-tracker" style="position:absolute; bottom:0; left:0; height:3px; background:rgba(140, 255, 220, 0.7); width:0%; transition:width 0.5s ease;"></div>
                    `;

                    loadingContainer.appendChild(mathBoardContainer);

                    // Добавляем контейнер в начало результатов
                    const firstChild = resultsPanel.querySelector(':first-child');
                    resultsPanel.insertBefore(loadingContainer, firstChild);

                    logDebug("Создан новый контейнер для анимации загрузки");
                } else {
                    console.error('Контейнер результатов не найден, невозможно создать контейнер анимации');
                    logDebug("Контейнер результатов не найден");
                    window.animationCompleted = true;
                    return;
                }
            } else {
                // Если контейнер уже существует, делаем его видимым
                loadingContainer.style.display = 'block';
                loadingContainer.style.visibility = 'visible';
                loadingContainer.style.opacity = '1';
                loadingContainer.classList.remove('hidden'); // Удаляем класс hidden, если он есть
            }

            // Проверяем, есть ли mathBoardContainer
            let mathBoardContainer = document.getElementById('mathBoardContainer');
            if (!mathBoardContainer) {
                logDebug("MathBoardContainer не найден, пропускаем анимацию");
                window.animationCompleted = true;
                return;
            }

            // Проверяем/создаем область формул
            let formulasArea = document.getElementById('formulas-area');
            if (!formulasArea) {
                logDebug("Создаем область формул");
                formulasArea = document.createElement('div');
                formulasArea.id = 'formulas-area';
                formulasArea.className = 'formulas-area';
                formulasArea.style.position = 'absolute';
                formulasArea.style.inset = '0';
                mathBoardContainer.appendChild(formulasArea);
            }

            // Проверяем/создаем прогресс-трекер
            let progressTracker = document.getElementById('progress-tracker');
            if (!progressTracker) {
                logDebug("Создаем прогресс-трекер");
                progressTracker = document.createElement('div');
                progressTracker.id = 'progress-tracker';
                progressTracker.style.position = 'absolute';
                progressTracker.style.bottom = '0';
                progressTracker.style.left = '0';
                progressTracker.style.height = '3px';
                progressTracker.style.background = 'rgba(140, 255, 220, 0.7)';
                progressTracker.style.width = '0%';
                progressTracker.style.transition = 'width 0.5s ease';
                formulasArea.appendChild(progressTracker);
            }

            // Функция для создания SVG линии между элементами
            const createLine = function (x1, y1, x2, y2, delay) {
                setTimeout(() => {
                    try {
                        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                        svg.style.position = 'absolute';
                        svg.style.top = '0';
                        svg.style.left = '0';
                        svg.style.width = '100%';
                        svg.style.height = '100%';
                        svg.style.pointerEvents = 'none';
                        svg.style.zIndex = '15';

                        const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                        // Создаем кривую вместо прямой линии
                        const dx = (x2 - x1) * 0.5;
                        const pathData = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

                        line.setAttribute('d', pathData);
                        line.setAttribute('stroke', 'rgba(140, 230, 210, 0.6)');
                        line.setAttribute('stroke-width', '1');
                        line.setAttribute('fill', 'none');
                        line.setAttribute('stroke-dasharray', '3, 2');

                        // Анимация рисования
                        const length = 100; // Примерная длина
                        line.style.strokeDasharray = length;
                        line.style.strokeDashoffset = length;
                        line.style.animation = 'drawLine 1.5s ease-out forwards';

                        svg.appendChild(line);
                        formulasArea.appendChild(svg);
                    } catch (e) {
                        logDebug("Ошибка при создании SVG линии: " + e.message);
                    }
                }, delay);
            };

            // Функция для создания элемента формулы
            const createFormulaElement = function (content, position, style, delay) {
                setTimeout(() => {
                    try {
                        const element = document.createElement('div');

                        // Базовые стили формулы
                        const baseStyle = {
                            position: 'absolute',
                            color: 'rgba(220, 255, 240, 0.9)',
                            fontFamily: '"Segoe UI", Arial, sans-serif',
                            fontSize: '16px',
                            textShadow: '0 0 3px rgba(120, 255, 200, 0.4)',
                            opacity: '0',
                            transform: 'scale(0.95)',
                            transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
                            padding: '8px 12px',
                            borderRadius: '4px',
                            zIndex: '20',
                            ...position
                        };

                        // Применяем стили
                        Object.assign(element.style, baseStyle, style);
                        element.innerHTML = content;
                        element.className = 'formula-element';
                        formulasArea.appendChild(element);

                        // Анимируем появление после рендеринга
                        setTimeout(() => {
                            element.style.opacity = '1';
                            element.style.transform = 'scale(1)';
                        }, 50);

                        return element;
                    } catch (e) {
                        logDebug("Ошибка при создании элемента формулы: " + e.message);
                        return null;
                    }
                }, delay);
            };

            // Начинаем анимацию
            logDebug("Запускаем последовательную анимацию");

            // Очищаем предыдущую анимацию
            const children = formulasArea.children;
            for (let i = children.length - 1; i >= 0; i--) {
                if (children[i].id !== 'progress-tracker') {
                    formulasArea.removeChild(children[i]);
                }
            }

            // Этап 1: Начальный прогресс (0-10%)
            progressTracker.style.width = '10%';

            // Этап 2: Добавляем формулы (10-30%)
            setTimeout(() => {
                progressTracker.style.width = '30%';
                logDebug("Этап 2: Добавление формул");

                try {
                    // Формула объема
                    createFormulaElement(
                        'V = a × b × h',
                        { left: '20%', top: '20%' },
                        { fontSize: '18px' },
                        0
                    );

                    // Формула площади
                    createFormulaElement(
                        'S = L × W',
                        { right: '20%', top: '30%' },
                        { fontSize: '18px' },
                        300
                    );

                    // Периметр
                    createFormulaElement(
                        'P = 2(L + W)',
                        { left: '15%', top: '45%' },
                        { fontSize: '17px', opacity: '0.8' },
                        600
                    );

                    // Добавляем линии между формулами
                    createLine('30%', '25%', '70%', '35%', 900);

                    logDebug("Формулы добавлены успешно");
                } catch (e) {
                    logDebug("Ошибка при добавлении формул: " + e.message);
                }

                // Этап 3: Дополнительные формулы (30-60%)
                setTimeout(() => {
                    progressTracker.style.width = '60%';
                    logDebug("Этап 3: Дополнительные формулы");

                    try {
                        // Формула для бетона
                        createFormulaElement(
                            'V<sub>бетона</sub> = P × h × t × k',
                            { left: '25%', top: '65%' },
                            { fontSize: '17px', background: 'rgba(60, 100, 120, 0.2)', borderRadius: '6px' },
                            0
                        );

                        // Формула для кирпичей
                        createFormulaElement(
                            'N<sub>кирпича</sub> = S<sub>стен</sub> / S<sub>1кирпича</sub> × 1.1',
                            { right: '25%', top: '50%' },
                            { fontSize: '16px', background: 'rgba(120, 60, 60, 0.2)', borderRadius: '6px' },
                            300
                        );

                        // Добавляем линии между формулами
                        createLine('30%', '50%', '25%', '65%', 600);
                        createLine('70%', '40%', '65%', '50%', 600);

                        logDebug("Дополнительные формулы добавлены успешно");
                    } catch (e) {
                        logDebug("Ошибка при добавлении дополнительных формул: " + e.message);
                    }

                    // Этап 4: 3D модель дома (60-90%)
                    setTimeout(() => {
                        progressTracker.style.width = '90%';
                        logDebug("Этап 4: 3D модель дома");

                        try {
                            // Добавляем схему дома
                            const houseDiv = document.createElement('div');
                            houseDiv.style.position = 'absolute';
                            houseDiv.style.left = '50%';
                            houseDiv.style.top = '50%';
                            houseDiv.style.transform = 'translate(-50%, -50%)';
                            houseDiv.style.width = '200px';
                            houseDiv.style.height = '150px';
                            houseDiv.style.zIndex = '25';
                            houseDiv.innerHTML = `<svg width="200" height="150" viewBox="0 0 200 150">
                                <style>
                                    @keyframes glowEffect {
                                        0%, 100% { filter: drop-shadow(0 0 3px rgba(140, 255, 220, 0.3)); }
                                        50% { filter: drop-shadow(0 0 8px rgba(140, 255, 220, 0.6)); }
                                    }
                                    .house-lines {
                                        animation: glowEffect 4s infinite ease-in-out;
                                    }
                                </style>
                                <g class="house-lines">
                                    <polygon points="100,10 190,60 190,140 10,140 10,60" 
                                             fill="rgba(100, 180, 160, 0.1)" 
                                             stroke="rgba(190, 255, 230, 0.8)" 
                                             stroke-width="2"/>
                                    <line x1="10" y1="60" x2="100" y2="10" stroke="rgba(190, 255, 230, 0.8)" stroke-width="2"/>
                                    <line x1="100" y1="10" x2="190" y2="60" stroke="rgba(190, 255, 230, 0.8)" stroke-width="2"/>
                                    <line x1="100" y1="10" x2="100" y2="140" stroke="rgba(190, 255, 230, 0.8)" stroke-width="1" stroke-dasharray="4 2"/>
                                </g>
                            </svg>`;
                            houseDiv.className = 'formula-element';
                            formulasArea.appendChild(houseDiv);

                            logDebug("3D модель дома добавлена успешно");
                        } catch (e) {
                            logDebug("Ошибка при добавлении 3D модели дома: " + e.message);
                        }

                        // Финальный этап (90-100%)
                        setTimeout(() => {
                            progressTracker.style.width = '100%';
                            logDebug("Финальный этап: Завершение");

                            try {
                                // Удаляем все формулы с плавной анимацией
                                const formulas = document.querySelectorAll('.formula-element');
                                formulas.forEach(el => {
                                    el.style.opacity = '0';
                                    el.style.transform = 'scale(0.9)';
                                    setTimeout(() => {
                                        if (el.parentNode === formulasArea) {
                                            formulasArea.removeChild(el);
                                        }
                                    }, 500);
                                });

                                // Удаляем все SVG линии
                                const svgs = formulasArea.querySelectorAll('svg');
                                svgs.forEach(svg => {
                                    svg.style.opacity = '0';
                                    setTimeout(() => {
                                        if (svg.parentNode === formulasArea) {
                                            formulasArea.removeChild(svg);
                                        }
                                    }, 500);
                                });

                                logDebug("Формулы и линии очищены успешно");
                            } catch (e) {
                                logDebug("Ошибка при очистке формул: " + e.message);
                            }

                            setTimeout(() => {
                                try {
                                    // Финальное свечение
                                    const finalGlow = document.createElement('div');
                                    finalGlow.style.position = 'absolute';
                                    finalGlow.style.inset = '0';
                                    finalGlow.style.background = 'radial-gradient(circle at center, rgba(140, 255, 220, 0.3) 0%, rgba(26, 38, 53, 0) 70%)';
                                    finalGlow.style.zIndex = '30';
                                    finalGlow.className = 'final-glow';
                                    formulasArea.appendChild(finalGlow);

                                    logDebug("Финальное свечение добавлено успешно");
                                } catch (e) {
                                    logDebug("Ошибка при добавлении финального свечения: " + e.message);
                                }

                                try {
                                    // Финальный текст
                                    const finalText = document.createElement('div');
                                    finalText.style.position = 'absolute';
                                    finalText.style.left = '50%';
                                    finalText.style.top = '50%';
                                    finalText.style.transform = 'translate(-50%, -50%)';
                                    finalText.style.color = 'rgba(220, 255, 240, 0.9)';
                                    finalText.style.fontFamily = '"Segoe UI", Arial, sans-serif';
                                    finalText.style.fontSize = '22px';
                                    finalText.style.fontWeight = '600';
                                    finalText.style.textAlign = 'center';
                                    finalText.style.textShadow = '0 0 10px rgba(140, 255, 220, 0.6)';
                                    finalText.style.zIndex = '40';
                                    finalText.innerHTML = 'Расчет завершен';
                                    finalText.className = 'final-text';
                                    formulasArea.appendChild(finalText);

                                    logDebug("Финальный текст добавлен успешно");
                                } catch (e) {
                                    logDebug("Ошибка при добавлении финального текста: " + e.message);
                                }

                                // Устанавливаем флаг завершения анимации
                                logDebug("Анимация полностью завершена");
                                window.animationCompleted = true;
                            }, 600);
                        }, 800); // 0.8 секунды на финальный этап
                    }, 800); // 0.8 секунды на этап 4
                }, 800); // 0.8 секунды на этап 3
            }, 800); // 0.8 секунды на этап 2

            // Добавляем стили для анимаций
            const style = document.createElement('style');
            style.textContent = `
                @keyframes drawLine {
                    to { stroke-dashoffset: 0; }
                }
            `;
            document.head.appendChild(style);

            // Устанавливаем защитный таймер на случай зависания (5 секунд)
            window.animationTimeout = setTimeout(() => {
                if (!window.animationCompleted) {
                    logDebug("Сработал защитный таймер (5 сек). Принудительное завершение анимации.");
                    window.animationCompleted = true;

                    // Очищаем все в области формул, кроме трекера прогресса
                    try {
                        const keepElements = ['progress-tracker'];
                        document.querySelectorAll('#formulas-area > *').forEach(el => {
                            if (!el.id || !keepElements.includes(el.id)) {
                                el.remove();
                            }
                        });

                        // Показываем финальный текст в любом случае
                        const emergencyText = document.createElement('div');
                        emergencyText.style.position = 'absolute';
                        emergencyText.style.left = '50%';
                        emergencyText.style.top = '50%';
                        emergencyText.style.transform = 'translate(-50%, -50%)';
                        emergencyText.style.color = 'rgba(220, 255, 240, 0.9)';
                        emergencyText.style.fontFamily = '"Segoe UI", Arial, sans-serif';
                        emergencyText.style.fontSize = '22px';
                        emergencyText.style.fontWeight = '600';
                        emergencyText.style.textAlign = 'center';
                        emergencyText.style.textShadow = '0 0 10px rgba(140, 255, 220, 0.6)';
                        emergencyText.style.zIndex = '999'; // Высший приоритет
                        emergencyText.innerHTML = 'Расчет завершен';
                        formulasArea.appendChild(emergencyText);

                        // Устанавливаем ширину прогресса в 100%
                        if (progressTracker) {
                            progressTracker.style.width = '100%';
                        }
                    } catch (e) {
                        logDebug("Ошибка при аварийной очистке: " + e.message);
                    }
                }
            }, 5000);
        } catch (e) {
            logDebug("Критическая ошибка в анимации: " + e.message);
            window.animationCompleted = true;
        }
    };
});