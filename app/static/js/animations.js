/**
 * animation.js - Упрощенная версия скрипта для анимации математической доски
 */

// Инициализируем обработчик событий после загрузки DOM
document.addEventListener('DOMContentLoaded', function () {
    console.log("Инициализация анимации...");
    // Подготавливаем стили для анимации
    ensureAnimationStyles();
});

/**
 * Добавляет необходимые стили для анимации
 */
function ensureAnimationStyles() {
    if (!document.getElementById('animation-styles')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'animation-styles';
        styleElement.textContent = `
            @keyframes drawLine {
                to { stroke-dashoffset: 0; }
            }
            
            @keyframes formula-pulsate {
                0%, 100% { opacity: 1; background-color: rgba(100, 180, 160, 0.15); }
                50% { opacity: 0.8; background-color: rgba(100, 180, 160, 0.2); }
            }
            
            .formula-element {
                position: absolute;
                color: rgba(220, 255, 240, 0.9);
                font-family: 'Segoe UI', Arial, sans-serif;
                font-size: 16px;
                text-shadow: 0 0 3px rgba(120, 255, 200, 0.4);
                opacity: 0;
                transform: scale(0.95);
                transition: opacity 0.8s ease-out, transform 0.8s ease-out;
                padding: 8px 12px;
                border-radius: 4px;
                z-index: 20;
            }
            
            .formula-element.visible {
                opacity: 1;
                transform: scale(1);
            }
            
            .math-board-container {
                position: relative;
                width: 100%;
                height: 350px;
                background-color: #1a2635;
                border-radius: 16px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
                overflow: hidden;
                z-index: 1000;
            }
            
            .math-grid {
                position: absolute;
                inset: 0;
                background-image: linear-gradient(rgba(100, 255, 180, 0.07) 1px, transparent 1px), 
                                  linear-gradient(90deg, rgba(100, 255, 180, 0.07) 1px, transparent 1px);
                background-size: 20px 20px;
            }
            
            #formulas-area {
                position: absolute;
                inset: 0;
                z-index: 1001;
            }
            
            #progress-tracker {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 2px;
                width: 0%;
                background: linear-gradient(90deg, rgba(100, 255, 180, 0.3), rgba(140, 220, 255, 0.7));
                transition: width 0.6s ease-out;
                z-index: 1002;
            }
        `;
        document.head.appendChild(styleElement);
    }
}

/**
 * Главная функция запуска анимации доски
 */
window.startArchitecturalBoardAnimation = function () {
    console.log("Запуск анимации архитектурной доски");

    // Проверка и инициализация всех необходимых элементов
    const mathBoardContainer = document.getElementById('mathBoardContainer');
    if (!mathBoardContainer) {
        console.error("Контейнер математической доски не найден");
        window.animationCompleted = true;
        if (typeof window.updateAnimationStatus === 'function') {
            window.updateAnimationStatus(true);
        }
        return;
    }

    // Создание и проверка основных элементов
    let formulasArea = document.getElementById('formulas-area');
    if (!formulasArea) {
        formulasArea = document.createElement('div');
        formulasArea.id = 'formulas-area';
        formulasArea.style.position = 'absolute';
        formulasArea.style.inset = '0';
        mathBoardContainer.appendChild(formulasArea);
    }

    let progressTracker = document.getElementById('progress-tracker');
    if (!progressTracker) {
        progressTracker = document.createElement('div');
        progressTracker.id = 'progress-tracker';
        progressTracker.style.position = 'absolute';
        progressTracker.style.bottom = '0';
        progressTracker.style.left = '0';
        progressTracker.style.height = '2px';
        progressTracker.style.background = 'linear-gradient(90deg, rgba(100, 255, 180, 0.3), rgba(140, 220, 255, 0.7))';
        progressTracker.style.width = '0%';
        progressTracker.style.transition = 'width 0.6s ease-out';
        mathBoardContainer.appendChild(progressTracker);
    }

    // Создаем фоновую сетку, если её нет
    if (!mathBoardContainer.querySelector('.math-grid')) {
        const mathGrid = document.createElement('div');
        mathGrid.className = 'math-grid';
        mathBoardContainer.insertBefore(mathGrid, mathBoardContainer.firstChild);
    }

    // Запускаем анимацию в защищенном режиме
    try {
        // Очищаем предыдущую анимацию
        while (formulasArea.firstChild) {
            if (formulasArea.firstChild.id !== 'progress-tracker') {
                formulasArea.removeChild(formulasArea.firstChild);
            }
        }

        // Сбрасываем флаг завершения
        window.animationCompleted = false;

        // Гарантируем наличие стилей
        ensureAnimationStyles();

        // Запускаем последовательность анимации
        runSimplifiedAnimation(formulasArea, progressTracker);
    } catch (error) {
        console.error("Ошибка при запуске анимации:", error);
        window.animationCompleted = true;
        if (typeof window.updateAnimationStatus === 'function') {
            window.updateAnimationStatus(true);
        }
        if (typeof window.showDemoResults === 'function') {
            setTimeout(window.showDemoResults, 100);
        }
    }
};

/**
 * Упрощенная последовательность анимации
 */
function runSimplifiedAnimation(formulasArea, progressTracker) {
    console.log("Начало анимации расчета");

    // Устанавливаем надежный таймаут на случай зависания анимации
    const safetyTimeout = setTimeout(() => {
        console.log("Сработал таймаут безопасности в runSimplifiedAnimation");
        window.animationCompleted = true;
        if (typeof window.updateAnimationStatus === 'function') {
            window.updateAnimationStatus(true);
        }
        if (typeof window.showDemoResults === 'function') {
            window.showDemoResults();
        }
    }, 5000);

    // Обновляем индикатор прогресса через временные интервалы
    const progressSteps = [
        { value: "10%", delay: 200 },
        { value: "30%", delay: 1000 },
        { value: "60%", delay: 2000 },
        { value: "80%", delay: 3000 },
        { value: "100%", delay: 4000 }
    ];

    progressSteps.forEach(step => {
        setTimeout(() => {
            if (progressTracker) progressTracker.style.width = step.value;
        }, step.delay);
    });

    // Основные анимируемые элементы - формулы
    const formulas = [
        {
            content: '<span style="font-size: 19px;">V = a × b × h</span>',
            position: { left: '10%', top: '20%' },
            delay: 500
        },
        {
            content: '<span style="font-size: 19px;">S = L × W</span>',
            position: { left: '60%', top: '15%' },
            delay: 1000
        },
        {
            content: '<span style="font-size: 18px;">∑ V<sub>бетона</sub> = 0,4м × 0,5м × L<sub>периметра</sub></span>',
            position: { left: '20%', top: '40%' },
            style: { background: 'rgba(60, 100, 120, 0.2)' },
            delay: 1500,
            pulse: true
        },
        {
            content: '<span style="font-size: 18px;">N<sub>кирпича</sub> = S<sub>стен</sub> / S<sub>1кирпича</sub> × k<sub>запаса</sub></span>',
            position: { left: '50%', top: '60%' },
            style: { background: 'rgba(120, 60, 60, 0.2)' },
            delay: 2000,
            pulse: true
        },
        {
            content: `<svg width="150" height="120" viewBox="0 0 150 120">
                        <g stroke="rgba(190, 255, 230, 0.8)" fill="none" stroke-width="2">
                            <polygon points="75,10 140,50 140,110 10,110 10,50 75,10" />
                            <line x1="10" y1="50" x2="75" y2="10" />
                            <line x1="75" y1="10" x2="140" y2="50" />
                            <line x1="75" y1="10" x2="75" y2="110" stroke-dasharray="4,2" />
                        </g>
                    </svg>`,
            position: { left: '40%', top: '35%' },
            delay: 2500
        }
    ];

    // Создаем элементы формул
    const createdElements = [];
    formulas.forEach(formula => {
        setTimeout(() => {
            try {
                const element = document.createElement('div');
                element.className = 'formula-element';
                element.style.position = 'absolute';
                element.style.color = 'rgba(220, 255, 240, 0.9)';
                element.style.fontFamily = '"Segoe UI", Arial, sans-serif';
                element.style.fontSize = '16px';
                element.style.textShadow = '0 0 3px rgba(120, 255, 200, 0.4)';
                element.style.opacity = '0';
                element.style.transform = 'scale(0.95)';
                element.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
                element.style.padding = '8px 12px';
                element.style.borderRadius = '4px';
                element.style.zIndex = '20';

                // Применяем позицию
                if (formula.position) {
                    Object.assign(element.style, formula.position);
                }

                // Применяем дополнительные стили
                if (formula.style) {
                    Object.assign(element.style, formula.style);
                }

                // Устанавливаем содержимое
                element.innerHTML = formula.content;

                // Добавляем пульсацию
                if (formula.pulse) {
                    element.style.animation = 'formula-pulsate 2s ease-in-out infinite';
                }

                formulasArea.appendChild(element);
                createdElements.push(element);

                // Анимация появления
                setTimeout(() => {
                    element.style.opacity = '1';
                    element.style.transform = 'scale(1)';
                }, 50);
            } catch (e) {
                console.error("Ошибка при создании элемента формулы:", e);
            }
        }, formula.delay);
    });

    // Рисуем соединительные линии между элементами
    setTimeout(() => {
        try {
            if (createdElements.length >= 2) {
                drawSimpleConnection(createdElements[0], createdElements[1], formulasArea);
            }
            if (createdElements.length >= 3) {
                drawSimpleConnection(createdElements[1], createdElements[2], formulasArea);
            }
            if (createdElements.length >= 4) {
                drawSimpleConnection(createdElements[2], createdElements[3], formulasArea);
            }
        } catch (e) {
            console.error("Ошибка при создании соединений:", e);
        }
    }, 3000);

    // Финальный этап - завершение анимации
    setTimeout(() => {
        // Очищаем защитный таймаут
        clearTimeout(safetyTimeout);

        try {
            // Создаем финальное свечение
            const finalGlow = document.createElement('div');
            finalGlow.style.position = 'absolute';
            finalGlow.style.inset = '0';
            finalGlow.style.background = 'radial-gradient(circle at center, rgba(140, 255, 220, 0.3) 0%, rgba(26, 38, 53, 0) 70%)';
            finalGlow.style.opacity = '0';
            finalGlow.style.transition = 'opacity 0.5s ease-in-out';
            finalGlow.style.zIndex = '30';
            formulasArea.appendChild(finalGlow);

            setTimeout(() => {
                finalGlow.style.opacity = '1';

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
                formulasArea.appendChild(finalText);

                // Отмечаем завершение анимации - ВАЖНОЕ ИЗМЕНЕНИЕ
                console.log("Нормальное завершение анимации");
                window.animationCompleted = true;
                // Важно это добавить - синхронизируем с локальной переменной в calculator.js
                if (typeof window.updateAnimationStatus === 'function') {
                    window.updateAnimationStatus(true);
                }
            }, 300);
        } catch (e) {
            console.error("Ошибка при создании финального эффекта:", e);
            // Гарантируем завершение анимации даже при ошибке
            console.log("Завершение анимации через блок catch");
            window.animationCompleted = true;
            if (typeof window.updateAnimationStatus === 'function') {
                window.updateAnimationStatus(true);
            }
        }
    }, 4500);
}

/**
 * Упрощенная функция для рисования соединений между элементами
 */
function drawSimpleConnection(fromElement, toElement, container) {
    if (!fromElement || !toElement || !container) return;

    try {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '15';

        const containerRect = container.getBoundingClientRect();
        const fromRect = fromElement.getBoundingClientRect();
        const toRect = toElement.getBoundingClientRect();

        // Координаты относительно контейнера
        const x1 = fromRect.left + fromRect.width / 2 - containerRect.left;
        const y1 = fromRect.top + fromRect.height / 2 - containerRect.top;
        const x2 = toRect.left + toRect.width / 2 - containerRect.left;
        const y2 = toRect.top + toRect.height / 2 - containerRect.top;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');

        // Создаем изогнутую линию
        const dx = (x2 - x1) * 0.5;
        const pathData = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

        line.setAttribute('d', pathData);
        line.setAttribute('stroke', 'rgba(140, 230, 210, 0.6)');
        line.setAttribute('stroke-width', '1');
        line.setAttribute('fill', 'none');
        line.setAttribute('stroke-dasharray', '2, 2');

        // Анимация рисования линии
        const length = 100; // Используем фиксированное значение для надежности
        line.style.strokeDasharray = length;
        line.style.strokeDashoffset = length;
        line.style.animation = 'drawLine 1.5s ease-out forwards';

        svg.appendChild(line);
        container.appendChild(svg);
    } catch (error) {
        console.error("Ошибка при рисовании соединения:", error);
    }
}

/**
 * Глобальная функция для отладки
 */
function logDebug(message) {
    if (window.DEBUG) {
        console.log('[Animation Debug] ' + message);
    }
}

// Экспортируем все необходимые функции в глобальный контекст
window.logDebug = logDebug;
window.runSimplifiedAnimation = runSimplifiedAnimation;
window.drawSimpleConnection = drawSimpleConnection;
window.ensureAnimationStyles = ensureAnimationStyles;