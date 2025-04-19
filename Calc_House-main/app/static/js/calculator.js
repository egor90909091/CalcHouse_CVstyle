/**
 * calculator.js - Основной файл логики калькулятора строительных материалов
 */

// Включаем DEBUG режим для отладки
// Этот код переопределит значение в utils.js, если он загружен
window.DEBUG = true;

// Переменные для работы калькулятора
let lastCalculationParams = {};
let calculationCounter = 0;
let isCalculating = false; // Флаг для отслеживания процесса расчета

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', function () {
    logDebug("DOM загружен. Инициализация калькулятора...");

    // Проверка загрузки animations.js
    if (typeof startArchitecturalBoardAnimation !== 'function') {
        logDebug("Внимание: функция startArchitecturalBoardAnimation не найдена. Возможно, файл animations.js не загружен или содержит ошибки.");

        // Определяем простую заглушку функции анимации, которая сразу вызывает результаты
        window.startArchitecturalBoardAnimation = function () {
            logDebug("Вызвана заглушка функции анимации");
            setTimeout(showDemoResults, 500);
        };
    }

    // Проверяем существование функции logDebug
    if (typeof logDebug !== 'function') {
        window.logDebug = function (message) {
            console.log('[DEBUG] ' + message);
        };
    }

    // Находим форму и кнопку калькулятора
    const calculatorForm = document.getElementById('calculatorForm');
    const calculatorPanel = document.querySelector('.calculator-panel');
    const resultsPanel = document.querySelector('.results-panel');
    const recalcButton = document.getElementById('recalcButton');
    const printButton = document.getElementById('printButton');

    // Проверка наличия элементов
    if (!calculatorForm || !calculatorPanel || !resultsPanel) {
        console.error("Ошибка: необходимые элементы не найдены!");
        return;
    }

    logDebug("Элементы найдены, настраиваем обработчики событий");

    // Обработка отправки формы калькулятора
    calculatorForm.addEventListener('submit', function (e) {
        e.preventDefault();

        // Проверяем, не выполняется ли уже расчет
        if (isCalculating) {
            logDebug("Расчет уже выполняется, игнорируем повторную отправку формы");
            return;
        }

        // Устанавливаем флаг расчета
        isCalculating = true;

        logDebug("Форма калькулятора отправлена");

        try {
            // Получаем текущие параметры из формы
            const currentParams = getFormParams(this);

            // Проверяем, изменились ли параметры с предыдущего расчета
            if (areParamsEqual(currentParams, lastCalculationParams)) {
                logDebug("Параметры не изменились с предыдущего расчета");
            }

            // Сохраняем текущие параметры
            lastCalculationParams = currentParams;

            // Анимация перехода от формы к результатам
            calculatorPanel.classList.remove('active');
            calculatorPanel.classList.add('hidden');
            resultsPanel.classList.remove('hidden');

            // Проверяем существование контейнера для анимации
            const loadingAnimation = document.getElementById('loading-animation');
            if (!loadingAnimation) {
                logDebug("Контейнер для анимации не найден, создаем новый");
                const resultsContainer = document.getElementById('results');

                if (resultsContainer) {
                    // Создаем контейнер для анимации
                    const newLoadingAnimation = document.createElement('div');
                    newLoadingAnimation.id = 'loading-animation';
                    newLoadingAnimation.className = 'text-center py-8';

                    // Создаем контейнер для математической доски
                    const mathBoardContainer = document.createElement('div');
                    mathBoardContainer.id = 'mathBoardContainer';
                    mathBoardContainer.className = 'math-board-container';

                    newLoadingAnimation.appendChild(mathBoardContainer);

                    // Добавляем в начало контейнера результатов
                    resultsContainer.insertBefore(newLoadingAnimation, resultsContainer.firstChild);

                    logDebug("Созданы контейнеры для анимации");
                }
            }

            // Используем setTimeout для последовательной анимации
            setTimeout(() => {
                // Скрываем панель калькулятора
                calculatorPanel.classList.add('hidden');
                calculatorPanel.classList.remove('active');

                // Показываем панель результатов (но пока только анимацию)
                resultsPanel.classList.remove('hidden');

                // Сбрасываем предыдущие результаты
                resetAnimation();

                // Запускаем анимацию и показываем результаты после задержки
                try {
                    // Если доступна функция startLoadingAnimation
                    if (typeof window.startLoadingAnimation === 'function') {
                        logDebug("Вызываем функцию анимации из animations.js");
                        window.startLoadingAnimation();

                        // Увеличиваем задержку до 6000 мс (6 секунд), чтобы анимация успела полностью завершиться
                        setTimeout(() => {
                            // Активируем панель результатов
                            resultsPanel.classList.add('active');
                            // Показываем результаты расчета
                            showDemoResults();
                            logDebug("Результаты отображены после анимации");
                            // Сбрасываем флаг расчета
                            isCalculating = false;
                        }, 6000); // Увеличиваем с 3000 до 6000 мс
                    } else {
                        // Если нет, используем прямой вызов функции
                        logDebug("Функция анимации недоступна, вызываем непосредственно showDemoResults");
                        resultsPanel.classList.add('active');
                        startCalculationAnimation();
                        // Сбрасываем флаг расчета
                        isCalculating = false;
                    }
                } catch (error) {
                    console.error("Ошибка при запуске анимации:", error);
                    logDebug("Ошибка при анимации, переходим к результатам напрямую: " + error.message);

                    // В случае любой ошибки, показываем результаты напрямую
                    resultsPanel.classList.add('active');
                    // Устанавливаем флаг завершения анимации в случае ошибки, чтобы результаты отобразились
                    window.animationCompleted = true;
                    showDemoResults();
                    // Сбрасываем флаг расчета
                    isCalculating = false;
                }
            }, 50);
        } catch (error) {
            console.error("Ошибка при обработке формы:", error);
            logDebug("Ошибка при обработке формы: " + error.message);

            // В случае ошибки всё равно показываем результаты
            showDemoResults();

            // Сбрасываем флаг расчета даже в случае ошибки
            isCalculating = false;
        }
    });

    // Обработчик кнопки "Изменить параметры"
    if (recalcButton) {
        recalcButton.addEventListener('click', function () {
            logDebug("Кнопка 'Изменить параметры' нажата");

            // Скрываем панель результатов
            resultsPanel.classList.remove('active');
            resultsPanel.classList.add('hidden');

            // Используем setTimeout для последовательной анимации
            setTimeout(() => {
                // Показываем панель калькулятора
                calculatorPanel.classList.remove('hidden');
                calculatorPanel.classList.add('active');

                // Сбрасываем анимацию и подготавливаем для следующего расчета
                resetAnimation();

                // Сохраняем прокрутку к форме для удобства
                calculatorPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });

                logDebug("Панель калькулятора активирована для нового расчета");
            }, 50);
        });
    }

    // Обработка кнопки "Распечатать результаты"
    if (printButton) {
        printButton.addEventListener('click', function () {
            logDebug("Кнопка 'Распечатать результаты' нажата");
            preparePrintView();
            window.print();
        });
    }

    // Переключение параметров фундамента
    const foundationType = document.getElementById('foundationType');
    const foundationParamsContainers = document.querySelectorAll('.foundation-params');

    if (foundationType) {
        foundationType.addEventListener('change', function () {
            foundationParamsContainers.forEach(container => {
                container.classList.add('hidden');
            });
            const selectedType = this.value;
            const targetElement = document.querySelector(`.${selectedType}-params`);
            if (targetElement) {
                targetElement.classList.remove('hidden');
            }
        });
    }

    // Переключение параметров стен
    const wallMaterial = document.getElementById('wallMaterial');
    const wallParamsContainers = document.querySelectorAll('.wall-params');

    if (wallMaterial) {
        wallMaterial.addEventListener('change', function () {
            wallParamsContainers.forEach(container => {
                container.classList.add('hidden');
            });
            const selectedType = this.value;
            const targetElement = document.querySelector(`.${selectedType}-params`);
            if (targetElement) {
                targetElement.classList.remove('hidden');
            }
        });
    }

    // Переключение параметров кровли
    const roofType = document.getElementById('roofType');
    const roofMaterialsContainers = document.querySelectorAll('.roof-materials');

    if (roofType) {
        roofType.addEventListener('change', function () {
            roofMaterialsContainers.forEach(container => {
                container.classList.add('hidden');
            });
            const selectedType = this.value;
            const targetElement = document.querySelector(`.${selectedType}-materials`);
            if (targetElement) {
                targetElement.classList.remove('hidden');
            }
        });
    }

    // Инициализация отображения параметров при загрузке
    if (foundationType) foundationType.dispatchEvent(new Event('change'));
    if (wallMaterial) wallMaterial.dispatchEvent(new Event('change'));
});

/**
 * Подготовка печатного вида
 */
function preparePrintView() {
    // Увеличиваем счетчик расчетов
    calculationCounter++;

    // Устанавливаем дату и номер расчета
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('ru-RU');

    const printDateElement = document.getElementById('print-date');
    const printNumberElement = document.getElementById('print-number');

    if (printDateElement) {
        printDateElement.textContent = formattedDate;
    }

    if (printNumberElement) {
        printNumberElement.textContent = calculationCounter.toString().padStart(5, '0');
    }

    // Добавляем атрибут даты к контейнеру результатов для печати
    const resultsElement = document.getElementById('results');
    if (resultsElement) {
        resultsElement.setAttribute('data-print-date', formattedDate);
    }
}

/**
 * Запуск анимации расчета
 */
function startCalculationAnimation() {
    logDebug("Запуск анимации расчета");

    // Проверяем, существует ли функция logDebug, и если нет, создаем её
    if (typeof logDebug !== 'function') {
        window.logDebug = function (message) {
            console.log('[DEBUG] ' + message);
        };
    }

    // Проверим, существует ли функция анимации в window
    if (typeof window.startLoadingAnimation !== 'function') {
        logDebug("Функция анимации в window не найдена, пробуем создать необходимые элементы вручную");

        // Создаем необходимые элементы для анимации
        const resultsPanel = document.querySelector('.results-panel');
        if (resultsPanel) {
            // Создаем контейнер для анимации, если его нет
            let loadingAnimation = document.getElementById('loading-animation');
            if (!loadingAnimation) {
                loadingAnimation = document.createElement('div');
                loadingAnimation.id = 'loading-animation';
                loadingAnimation.className = 'text-center py-8';
                resultsPanel.insertBefore(loadingAnimation, resultsPanel.firstChild);
                logDebug("Создан контейнер для анимации загрузки");
            }

            // Создаем контейнер для математической доски, если его нет
            let mathBoardContainer = document.getElementById('mathBoardContainer');
            if (!mathBoardContainer) {
                mathBoardContainer = document.createElement('div');
                mathBoardContainer.id = 'mathBoardContainer';
                mathBoardContainer.className = 'math-board-container';
                loadingAnimation.appendChild(mathBoardContainer);
                logDebug("Создан контейнер для математической доски");
            }

            // Создаем область для формул, если её нет
            let formulasArea = document.getElementById('formulas-area');
            if (!formulasArea) {
                formulasArea = document.createElement('div');
                formulasArea.id = 'formulas-area';
                formulasArea.className = 'formulas-area';
                mathBoardContainer.appendChild(formulasArea);
                logDebug("Создана область для формул");
            }

            // Создаем индикатор прогресса, если его нет
            let progressTracker = document.getElementById('progress-tracker');
            if (!progressTracker) {
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
                logDebug("Создан индикатор прогресса");
            }

            // Устанавливаем флаг для упрощенной анимации
            window.useSimpleAnimation = true;
            logDebug("Установлен флаг упрощенной анимации");
        }
    }

    // Показываем контейнер с анимацией расчета
    const loadingAnimation = document.getElementById('loading-animation');
    if (loadingAnimation) {
        loadingAnimation.style.display = 'block';
        loadingAnimation.style.visibility = 'visible';
        loadingAnimation.style.opacity = '1';
        logDebug("Анимация загрузки показана");

        // Запускаем последовательность анимации
        setTimeout(() => {
            try {
                // Добавляем фокус на контейнер для надежности
                if (loadingAnimation) {
                    loadingAnimation.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }

                logDebug("Вызываем функцию анимации из animations.js");
                // Проверяем, доступна ли функция анимации
                if (typeof window.startLoadingAnimation === 'function') {
                    // Сбрасываем флаг завершения анимации перед запуском
                    window.animationCompleted = false;

                    // Запускаем анимацию
                    window.startLoadingAnimation();

                    // Добавляем запасной таймер, который гарантированно покажет результаты через 6 секунд
                    // даже если анимация не завершится корректно
                    setTimeout(() => {
                        logDebug("Запасной таймер для отображения результатов");
                        // Принудительно устанавливаем флаг завершения анимации
                        window.animationCompleted = true;
                        showDemoResults();
                    }, 6000);
                } else {
                    console.error("Функция анимации не найдена");
                    logDebug("Файл animations.js не загружен или функция не определена");
                    // Устанавливаем флаг завершения анимации
                    window.animationCompleted = true;
                    // Если функция не определена, показываем результаты напрямую
                    showDemoResults();
                }
            } catch (error) {
                console.error("Ошибка при запуске анимации:", error);
                logDebug("Ошибка при запуске анимации: " + error.message);
                // Устанавливаем флаг завершения анимации
                window.animationCompleted = true;
                // В случае ошибки, показываем результаты без анимации
                showDemoResults();
            }
        }, 500);
    } else {
        console.error("Элемент анимации не найден");
        logDebug("Контейнер для анимации загрузки не найден");
        // Устанавливаем флаг завершения анимации
        window.animationCompleted = true;
        // Если анимация недоступна, показываем результаты сразу
        showDemoResults();
    }
}

/**
 * Функция для сбора параметров из формы
 * @param {HTMLFormElement} form - Форма с данными
 * @return {Object} - Объект с параметрами формы
 */
function getFormParams(form) {
    const formData = new FormData(form);
    const params = {};
    for (let [key, value] of formData.entries()) {
        params[key] = value;
    }
    return params;
}

/**
 * Функция для сравнения параметров
 * @param {Object} params1 - Первый набор параметров
 * @param {Object} params2 - Второй набор параметров
 * @return {boolean} - true если параметры идентичны
 */
function areParamsEqual(params1, params2) {
    if (!params1 || !params2) return false;
    return JSON.stringify(params1) === JSON.stringify(params2);
}

/**
 * Функция для сброса анимации
 */
function resetAnimation() {
    // Сбрасываем стили прогресс-бара и текста статуса
    const progressTracker = document.getElementById('progress-tracker');
    const formulasArea = document.getElementById('formulas-area');
    const mathBoardContainer = document.getElementById('mathBoardContainer');
    const loadingAnimation = document.getElementById('loading-animation');

    // Сначала убедимся, что контейнер анимации загрузки существует и видим
    if (loadingAnimation) {
        loadingAnimation.style.display = 'block';
        loadingAnimation.style.visibility = 'visible';
        loadingAnimation.style.opacity = '1';
    } else {
        // Если контейнер анимации загрузки не существует, создаем его
        const resultsPanel = document.querySelector('.results-panel');
        if (resultsPanel) {
            const newLoadingContainer = document.createElement('div');
            newLoadingContainer.id = 'loading-animation';
            newLoadingContainer.className = 'text-center py-8';

            const newMathBoardContainer = document.createElement('div');
            newMathBoardContainer.id = 'mathBoardContainer';
            newMathBoardContainer.className = 'math-board-container';

            newLoadingContainer.appendChild(newMathBoardContainer);

            // Вставляем в начало панели результатов
            resultsPanel.insertBefore(newLoadingContainer, resultsPanel.firstChild);

            logDebug("Создан новый контейнер для анимации загрузки при сбросе");
        }
    }

    // Сбрасываем прогресс трекер
    if (progressTracker) progressTracker.style.width = '0%';

    // Очищаем область формул
    if (formulasArea) {
        // Очищаем область от предыдущей анимации
        while (formulasArea.firstChild) {
            if (formulasArea.firstChild.id === 'progress-tracker') {
                const progressTracker = formulasArea.firstChild;
                progressTracker.style.width = '0%';
            } else {
                formulasArea.removeChild(formulasArea.firstChild);
            }
        }
    }

    // Сбрасываем/реинициализируем математическую доску
    if (mathBoardContainer) {
        mathBoardContainer.innerHTML = '';
        // Если доступна функция инициализации доски из animations.js
        if (typeof initMathBoard === 'function') {
            initMathBoard();
        }
    }

    // Сбрасываем заголовки результатов
    const foundationTitle = document.getElementById('foundation-title');
    const wallsTitle = document.getElementById('walls-title');
    const roofTitle = document.getElementById('roof-title');

    if (foundationTitle) foundationTitle.classList.add('opacity-0');
    if (wallsTitle) wallsTitle.classList.add('opacity-0');
    if (roofTitle) roofTitle.classList.add('opacity-0');

    // Очищаем контейнеры с результатами
    const foundationMaterials = document.getElementById('foundationMaterials');
    const wallMaterials = document.getElementById('wallMaterials');
    const roofMaterials = document.getElementById('roofMaterials');

    if (foundationMaterials) foundationMaterials.innerHTML = '';
    if (wallMaterials) wallMaterials.innerHTML = '';
    if (roofMaterials) roofMaterials.innerHTML = '';

    logDebug("Анимация сброшена и подготовлена для следующего расчета");
}

/**
 * Функция для заполнения раздела данными
 * @param {HTMLElement} container - Контейнер для наполнения
 * @param {Array} items - Массив элементов для отображения
 */
function fillSection(container, items) {
    if (!container) {
        logDebug("Контейнер не найден при заполнении данными");
        return;
    }

    logDebug("Заполнение секции, элементов: " + (items ? items.length : 0));

    // Очищаем контейнер перед заполнением
    container.innerHTML = '';

    // Проверка на наличие элементов
    if (!items || items.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.textContent = "Нет данных для отображения";
        emptyMessage.className = "text-gray-500 text-center py-4";
        container.appendChild(emptyMessage);
        return;
    }

    // Добавляем заголовки для столбцов
    const headerRow = document.createElement('div');
    headerRow.className = 'grid grid-cols-4 gap-2 mb-3 font-semibold material-header';
    headerRow.style.borderBottom = '1px solid var(--border-color)';
    headerRow.style.paddingBottom = '6px';

    const nameHeader = document.createElement('div');
    nameHeader.textContent = 'Наименование';

    const quantityHeader = document.createElement('div');
    quantityHeader.textContent = 'Количество';
    quantityHeader.className = 'text-right';

    const priceHeader = document.createElement('div');
    priceHeader.textContent = 'Цена за ед.';
    priceHeader.className = 'text-right';

    const totalHeader = document.createElement('div');
    totalHeader.textContent = 'Стоимость';
    totalHeader.className = 'text-right';

    headerRow.appendChild(nameHeader);
    headerRow.appendChild(quantityHeader);
    headerRow.appendChild(priceHeader);
    headerRow.appendChild(totalHeader);

    container.appendChild(headerRow);

    let sectionTotal = 0;

    items.forEach((item, index) => {
        // Пропускаем элементы без имени или количества
        if (!item.name) {
            logDebug("Пропускаем элемент без имени");
            return;
        }

        const materialItem = document.createElement('div');
        materialItem.className = 'grid grid-cols-4 gap-2 mb-2 material-item';
        materialItem.style.color = 'var(--results-text)';
        materialItem.style.transition = 'color var(--transition-speed) ease';
        materialItem.style.animationDelay = `${index * 150}ms`;

        const nameSpan = document.createElement('div');
        nameSpan.textContent = item.name;
        nameSpan.style.color = 'var(--results-text)';

        const valueSpan = document.createElement('div');
        valueSpan.className = 'font-semibold text-right';
        if (item.quantity !== undefined && item.unit !== undefined) {
            valueSpan.textContent = `${item.quantity} ${item.unit}`;
        } else {
            valueSpan.textContent = '—';
        }
        valueSpan.style.color = 'var(--results-value)';
        valueSpan.style.fontWeight = '600';

        const priceSpan = document.createElement('div');
        priceSpan.className = 'font-semibold text-right';
        priceSpan.textContent = item.price ? `${item.price} ₽` : '—';
        priceSpan.style.color = 'var(--results-value)';

        const totalSpan = document.createElement('div');
        totalSpan.className = 'font-semibold text-right';

        if (item.total_cost || (item.price && item.quantity)) {
            const totalCost = item.total_cost || (item.price * item.quantity);
            totalSpan.textContent = `${Math.round(totalCost).toLocaleString('ru-RU')} ₽`;
            sectionTotal += totalCost;
        } else {
            totalSpan.textContent = '—';
        }

        totalSpan.style.color = 'var(--accent-color)';

        materialItem.appendChild(nameSpan);
        materialItem.appendChild(valueSpan);
        materialItem.appendChild(priceSpan);
        materialItem.appendChild(totalSpan);

        container.appendChild(materialItem);

        // Запускаем анимацию появления с небольшой задержкой
        setTimeout(() => {
            materialItem.classList.add('visible');
        }, index * 150);
    });

    // Добавляем строку с итогом по разделу
    if (sectionTotal > 0) {
        const totalRow = document.createElement('div');
        totalRow.className = 'grid grid-cols-4 gap-2 mt-4 pt-2 font-bold material-item total-row';
        totalRow.style.borderTop = '1px solid var(--border-color)';

        const totalLabel = document.createElement('div');
        totalLabel.textContent = 'Итого по разделу:';
        totalLabel.style.gridColumn = '1 / 4';

        const totalValue = document.createElement('div');
        totalValue.className = 'text-right';
        totalValue.textContent = `${Math.round(sectionTotal).toLocaleString('ru-RU')} ₽`;
        totalValue.style.color = 'var(--accent-color)';

        totalRow.appendChild(totalLabel);
        totalRow.appendChild(totalValue);

        container.appendChild(totalRow);
    }

    logDebug(`Заполнен раздел с ${items.length} элементами, на сумму ${sectionTotal.toFixed(2)} руб.`);
}

/**
 * Глобальная функция для показа результатов
 */
window.showDemoResults = function () {
    console.log("Вызвана функция showDemoResults");
    logDebug("Вызвана функция showDemoResults");

    // Проверяем, существует ли функция logDebug
    if (typeof logDebug !== 'function') {
        window.logDebug = function (message) {
            console.log('[DEBUG] ' + message);
        };
    }

    // Проверяем флаг завершения анимации
    if (window.animationCompleted !== true) {
        logDebug("Анимация ещё не завершена, ожидаем...");
        // Повторяем через 500 мс, если анимация не завершена
        setTimeout(window.showDemoResults, 500);
        return;
    }

    // Проверяем, были ли результаты уже показаны
    if (document.querySelector('.material-item.visible')) {
        logDebug("Результаты уже отображены, пропускаем повторный вызов");
        console.log("Результаты уже отображены, пропускаем повторный вызов");
        return;
    }

    // Получаем элементы анимации
    const loadingAnimation = document.getElementById('loading-animation');

    // Скрываем анимацию
    if (loadingAnimation) {
        loadingAnimation.classList.add('hidden');
        logDebug("Анимация загрузки скрыта, показываем результаты");
    }

    try {
        logDebug("Начинаем расчет материалов");
        console.log("Начинаем расчет материалов");

        // Первым делом показываем панель результатов
        const calculatorPanel = document.querySelector('.calculator-panel');
        const resultsPanel = document.querySelector('.results-panel');

        if (calculatorPanel && resultsPanel) {
            calculatorPanel.classList.add('hidden');
            calculatorPanel.classList.remove('active');
            resultsPanel.classList.remove('hidden');
            resultsPanel.classList.add('active');
            console.log("Панель результатов показана");
        } else {
            console.error("Панели не найдены:", calculatorPanel, resultsPanel);
        }

        // Получаем параметры из формы или используем значения по умолчанию
        let params = {};
        try {
            const form = document.getElementById('calculatorForm');
            if (form) {
                const formData = new FormData(form);
                for (let [key, value] of formData.entries()) {
                    params[key] = value;
                }
                logDebug("Параметры формы получены успешно: " + JSON.stringify(params));
            } else {
                logDebug("Форма калькулятора не найдена, используем параметры по умолчанию");
                // Устанавливаем параметры по умолчанию
                params = {
                    area: 100,
                    floorHeight: 2.7,
                    floors: 1,
                    foundationType: 'strip',
                    wallMaterial: 'brick',
                    roofType: 'metal',
                    roofConstruction: 'gable',
                    roofAngle: 30,
                    roof_package: 'standard'
                };
            }
        } catch (error) {
            console.error("Ошибка при получении параметров формы:", error);
            logDebug("Ошибка при получении параметров: " + error.message);
            // Устанавливаем параметры по умолчанию
            params = {
                area: 100,
                floorHeight: 2.7,
                floors: 1,
                foundationType: 'strip',
                wallMaterial: 'brick',
                roofType: 'metal',
                roofConstruction: 'gable',
                roofAngle: 30,
                roof_package: 'standard'
            };
        }

        // Загружаем материалы напрямую, без использования Promise и async/await
        try {
            logDebug("Получаем данные напрямую через showBasicResults");
            console.log("Получаем данные напрямую через showBasicResults");
            // Используем базовый расчет материалов и передаем результат в showDetailedResults
            const detailedMaterials = showBasicResults(params);
            console.log("Получены результаты расчета:", detailedMaterials);
            showDetailedResults(detailedMaterials, params);
        } catch (error) {
            console.error("Ошибка при расчете базовых материалов:", error);
            logDebug("Ошибка при расчете базовых материалов: " + error.message);

            // Создаем тестовые данные на случай ошибки
            const testData = {
                foundation: [
                    { name: "Бетон B20", quantity: "10.5", unit: "м³", price: 5100, total_cost: 53550 },
                    { name: "Арматура A400", quantity: 735, unit: "кг", price: 75, total_cost: 55125 }
                ],
                walls: [
                    { name: "Кирпич рядовой", quantity: 6240, unit: "шт.", price: 30, total_cost: 187200 },
                    { name: "Раствор для кладки", quantity: "3.6", unit: "м³", price: 4150, total_cost: 14940 }
                ],
                roof: [
                    { name: "Металлочерепица", quantity: 132, unit: "м²", price: 650, total_cost: 85800 },
                    { name: "Стропила", quantity: 14, unit: "шт.", price: 750, total_cost: 10500 }
                ]
            };

            // Показываем тестовые данные
            console.log("Показываем тестовые данные из-за ошибки");
            showDetailedResults(testData, params);
        }
    } catch (error) {
        console.error("Ошибка при показе результатов:", error);
        logDebug("Критическая ошибка при отображении результатов: " + error.message);

        // Показываем сообщение об ошибке в интерфейсе
        const resultsPanel = document.querySelector('.results-panel');
        if (resultsPanel) {
            resultsPanel.innerHTML = `
                <div class="p-5 text-center">
                    <h3 class="text-xl text-red-600 mb-3">Произошла ошибка при расчете</h3>
                    <p>Пожалуйста, попробуйте еще раз или обновите страницу.</p>
                    <button id="recalcButton" class="mt-4 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg">
                        Вернуться к форме
                    </button>
                </div>
            `;

            // Добавляем обработчик для кнопки возврата
            const recalcButton = document.getElementById('recalcButton');
            if (recalcButton) {
                recalcButton.addEventListener('click', function () {
                    const calculatorPanel = document.querySelector('.calculator-panel');
                    if (calculatorPanel) {
                        calculatorPanel.classList.remove('hidden');
                        calculatorPanel.classList.add('active');
                        resultsPanel.classList.remove('active');
                        resultsPanel.classList.add('hidden');
                    }
                });
            }
        }
    }
};

/**
 * Функция для получения детализированных материалов через API
 * @param {Object} params - Параметры формы
 * @returns {Promise} - Promise с данными материалов
 */
async function fetchDetailedMaterials(params) {
    try {
        logDebug("Запрашиваем детализированные материалы для фундамента, стен и кровли");

        // Базовые параметры дома для расчета количества
        const houseArea = parseFloat(params.area || 100); // Площадь дома, м²
        const floorHeight = parseFloat(params.floorHeight || 2.7); // Высота этажа, м
        const floors = parseInt(params.floors || 1); // Количество этажей

        // Рассчитываем периметр
        const houseSide = Math.sqrt(houseArea);
        const housePerimeter = houseSide * 4;

        // Расчет объемов и площадей
        const wallsHeight = floorHeight * floors;
        const wallsArea = housePerimeter * wallsHeight * 0.8; // с учетом 20% на проемы
        const concreteVolume = housePerimeter * 0.4 * 0.5 * 1.05; // Примерный расчет объема бетона
        const reinforcementWeight = concreteVolume * 70; // Примерный расчет веса арматуры
        const formworkArea = housePerimeter * 0.5 * 2; // Примерный расчет площади опалубки
        const roofArea = houseArea * 1.2; // С учетом свесов и угла наклона

        // Вместо запроса к API, формируем данные локально
        // ФУНДАМЕНТ
        const foundationMaterials = [];
        const foundationType = params.foundationType || 'strip';

        if (foundationType === 'strip') {
            foundationMaterials.push({
                name: "Бетон B20",
                quantity: concreteVolume.toFixed(1),
                unit: "м³",
                price: 5100,
                total_cost: concreteVolume * 5100
            });
            foundationMaterials.push({
                name: "Арматура A400",
                quantity: Math.round(reinforcementWeight),
                unit: "кг",
                price: 75,
                total_cost: reinforcementWeight * 75
            });
            foundationMaterials.push({
                name: "Опалубка из фанеры",
                quantity: Math.round(formworkArea),
                unit: "м²",
                price: 225,
                total_cost: formworkArea * 225
            });
            foundationMaterials.push({
                name: "Гидроизоляция рулонная",
                quantity: Math.round(housePerimeter * 1.5),
                unit: "м²",
                price: 120,
                total_cost: Math.round(housePerimeter * 1.5) * 120
            });
        } else if (foundationType === 'slab') {
            foundationMaterials.push({
                name: "Бетон B25",
                quantity: (concreteVolume * 1.2).toFixed(1),
                unit: "м³",
                price: 5500,
                total_cost: concreteVolume * 1.2 * 5500
            });
            foundationMaterials.push({
                name: "Арматура A400",
                quantity: Math.round(reinforcementWeight * 1.3),
                unit: "кг",
                price: 75,
                total_cost: reinforcementWeight * 1.3 * 75
            });
            foundationMaterials.push({
                name: "Песок для подушки",
                quantity: Math.round(houseArea * 0.15),
                unit: "м³",
                price: 800,
                total_cost: Math.round(houseArea * 0.15) * 800
            });
        } else if (foundationType === 'pile') {
            foundationMaterials.push({
                name: "Сваи железобетонные",
                quantity: Math.ceil(housePerimeter / 1.5),
                unit: "шт.",
                price: 3200,
                total_cost: Math.ceil(housePerimeter / 1.5) * 3200
            });
            foundationMaterials.push({
                name: "Бетон для ростверка",
                quantity: (concreteVolume * 0.7).toFixed(1),
                unit: "м³",
                price: 5300,
                total_cost: concreteVolume * 0.7 * 5300
            });
        } else if (foundationType === 'column') {
            foundationMaterials.push({
                name: "Бетонные столбы",
                quantity: Math.ceil(housePerimeter / 1.5),
                unit: "шт.",
                price: 1500,
                total_cost: Math.ceil(housePerimeter / 1.5) * 1500
            });
            foundationMaterials.push({
                name: "Бетон B20",
                quantity: (concreteVolume * 0.5).toFixed(1),
                unit: "м³",
                price: 5100,
                total_cost: concreteVolume * 0.5 * 5100
            });
        }

        // СТЕНЫ
        const wallsMaterials = [];
        const wallMaterial = params.wallMaterial || 'brick';

        if (wallMaterial === 'brick') {
            const brickCount = Math.ceil(wallsArea * 52);
            wallsMaterials.push({
                name: "Кирпич рядовой",
                quantity: brickCount,
                unit: "шт.",
                price: 30,
                total_cost: brickCount * 30
            });
            wallsMaterials.push({
                name: "Раствор для кладки",
                quantity: (wallsArea * 0.03).toFixed(1),
                unit: "м³",
                price: 4150,
                total_cost: wallsArea * 0.03 * 4150
            });
            wallsMaterials.push({
                name: "Утеплитель",
                quantity: Math.round(wallsArea),
                unit: "м²",
                price: 350,
                total_cost: Math.round(wallsArea) * 350
            });
        } else if (wallMaterial === 'wood') {
            const beamVolume = wallsArea * 0.2;
            wallsMaterials.push({
                name: "Брус",
                quantity: beamVolume.toFixed(1),
                unit: "м³",
                price: 27500,
                total_cost: beamVolume * 27500
            });
            wallsMaterials.push({
                name: "Утеплитель для стен",
                quantity: Math.round(wallsArea),
                unit: "м²",
                price: 350,
                total_cost: Math.round(wallsArea) * 350
            });
            wallsMaterials.push({
                name: "Межвенцовый утеплитель",
                quantity: Math.round(housePerimeter * 10),
                unit: "м.п.",
                price: 45,
                total_cost: Math.round(housePerimeter * 10) * 45
            });
        } else if (wallMaterial === 'block') {
            const blockCount = Math.ceil(wallsArea * 6.67);
            wallsMaterials.push({
                name: "Газоблок",
                quantity: blockCount,
                unit: "шт.",
                price: 165,
                total_cost: blockCount * 165
            });
            wallsMaterials.push({
                name: "Клей для блоков",
                quantity: (wallsArea * 0.02).toFixed(1),
                unit: "м³",
                price: 4500,
                total_cost: wallsArea * 0.02 * 4500
            });
            wallsMaterials.push({
                name: "Утеплитель",
                quantity: Math.round(wallsArea),
                unit: "м²",
                price: 350,
                total_cost: Math.round(wallsArea) * 350
            });
        } else if (wallMaterial === 'concrete') {
            wallsMaterials.push({
                name: "Бетон B25",
                quantity: (wallsArea * 0.2).toFixed(1),
                unit: "м³",
                price: 5500,
                total_cost: wallsArea * 0.2 * 5500
            });
            wallsMaterials.push({
                name: "Арматура для стен",
                quantity: Math.round(wallsArea * 15),
                unit: "кг",
                price: 75,
                total_cost: Math.round(wallsArea * 15) * 75
            });
            wallsMaterials.push({
                name: "Опалубка для стен",
                quantity: Math.round(wallsArea * 2),
                unit: "м²",
                price: 225,
                total_cost: Math.round(wallsArea * 2) * 225
            });
        } else if (wallMaterial === 'panel') {
            const panelCount = Math.ceil(wallsArea / (1.2 * 2.8));
            wallsMaterials.push({
                name: "SIP-панели",
                quantity: panelCount,
                unit: "шт.",
                price: 3500,
                total_cost: panelCount * 3500
            });
            wallsMaterials.push({
                name: "Монтажный комплект",
                quantity: panelCount,
                unit: "компл.",
                price: 750,
                total_cost: panelCount * 750
            });
        }

        // КРОВЛЯ
        const roofMaterials = [];
        const roofType = params.roofType || 'metal';
        let priceMultiplier = 1.0;

        if (roofType === 'metal') {
            priceMultiplier = 1.5;
        } else if (roofType === 'tile') {
            priceMultiplier = 1.2;
        } else if (roofType === 'shingle') {
            priceMultiplier = 1.12;
        } else if (roofType === 'flat') {
            priceMultiplier = 1.15;
        }

        // Стропила
        let rafterCount = Math.ceil(housePerimeter / 1.2) + 2;
        roofMaterials.push({
            name: "Стропила",
            quantity: rafterCount,
            unit: "шт.",
            price: 750 * priceMultiplier,
            total_cost: rafterCount * 750 * priceMultiplier
        });

        // Основной кровельный материал
        if (roofType === 'metal') {
            roofMaterials.push({
                name: "Металлочерепица",
                quantity: Math.ceil(roofArea * 1.1),
                unit: "м²",
                price: 650 * priceMultiplier,
                total_cost: Math.ceil(roofArea * 1.1) * 650 * priceMultiplier
            });
        } else if (roofType === 'tile') {
            roofMaterials.push({
                name: "Керамическая черепица",
                quantity: Math.ceil(roofArea * 1.15),
                unit: "м²",
                price: 1200 * priceMultiplier,
                total_cost: Math.ceil(roofArea * 1.15) * 1200 * priceMultiplier
            });
        } else if (roofType === 'shingle') {
            roofMaterials.push({
                name: "Гибкая черепица",
                quantity: Math.ceil(roofArea * 1.12),
                unit: "м²",
                price: 550 * priceMultiplier,
                total_cost: Math.ceil(roofArea * 1.12) * 550 * priceMultiplier
            });
        } else if (roofType === 'flat') {
            roofMaterials.push({
                name: "Рулонная кровля",
                quantity: Math.ceil(roofArea * 1.15),
                unit: "м²",
                price: 350 * priceMultiplier,
                total_cost: Math.ceil(roofArea * 1.15) * 350 * priceMultiplier
            });
        }

        // Дополнительные материалы в зависимости от комплектации
        if (roofType !== 'flat') {
            roofMaterials.push({
                name: "Обрешетка",
                quantity: Math.round(roofArea * 3),
                unit: "м.п.",
                price: 35 * priceMultiplier,
                total_cost: Math.round(roofArea * 3) * 35 * priceMultiplier
            });

            roofMaterials.push({
                name: "Гидроизоляция",
                quantity: Math.ceil(roofArea * 1.05),
                unit: "м²",
                price: 85 * priceMultiplier,
                total_cost: Math.ceil(roofArea * 1.05) * 85 * priceMultiplier
            });
        }

        const result = {
            foundation: foundationMaterials,
            walls: wallsMaterials,
            roof: roofMaterials
        };

        logDebug("Сформированы данные о материалах, всего позиций: " +
            (foundationMaterials.length + wallsMaterials.length + roofMaterials.length));

        return result;
    } catch (error) {
        console.error("Ошибка при получении детализированных материалов:", error);
        throw error;
    }
}

/**
 * Функция для отображения детализированных результатов
 * @param {Object} detailedData - Детализированные данные материалов
 * @param {Object} params - Параметры формы
 */
function showDetailedResults(detailedData, params) {
    logDebug("Отображение детализированных результатов");
    logDebug("Полученные данные: " + JSON.stringify(detailedData));

    // Проверяем наличие контейнеров для результатов и создаем их при необходимости
    const resultsPanel = document.querySelector('.results-panel');
    if (!resultsPanel || !resultsPanel.classList.contains('active')) {
        logDebug("Панель результатов не активна, делаем её активной");

        // Скрываем форму и показываем результаты если нужно
        const calculatorPanel = document.querySelector('.calculator-panel');
        if (calculatorPanel) {
            calculatorPanel.classList.remove('active');
            calculatorPanel.classList.add('hidden');
        }

        if (resultsPanel) {
            resultsPanel.classList.remove('hidden');
            resultsPanel.classList.add('active');
        }
    }

    // Проверяем наличие всех необходимых контейнеров
    const foundationMaterials = document.getElementById('foundationMaterials');
    const wallMaterials = document.getElementById('wallMaterials');
    const roofMaterials = document.getElementById('roofMaterials');

    if (!foundationMaterials || !wallMaterials || !roofMaterials) {
        logDebug("Контейнеры для результатов отсутствуют");
        createResultContainersIfNeeded();
        return;
    }

    // Скрываем анимацию загрузки
    const loadingAnimation = document.getElementById('loading-animation');
    if (loadingAnimation) {
        loadingAnimation.classList.add('hidden');
    }

    // Проверяем, что данные существуют и имеют правильную структуру
    if (!detailedData) {
        logDebug("Ошибка: данные отсутствуют");
        return;
    }

    if (!detailedData.foundation || !detailedData.walls || !detailedData.roof) {
        logDebug("Ошибка: неполные данные о материалах");
        // Если данные отсутствуют, создаем пустые массивы
        if (!detailedData.foundation) detailedData.foundation = [];
        if (!detailedData.walls) detailedData.walls = [];
        if (!detailedData.roof) detailedData.roof = [];
    }

    logDebug("Размеры массивов: " +
        "foundation=" + (detailedData.foundation ? detailedData.foundation.length : 0) +
        ", walls=" + (detailedData.walls ? detailedData.walls.length : 0) +
        ", roof=" + (detailedData.roof ? detailedData.roof.length : 0));

    // Через небольшую задержку показываем результаты
    setTimeout(() => {
        // Анимация появления заголовков
        const foundationTitle = document.getElementById('foundation-title');
        const wallsTitle = document.getElementById('walls-title');
        const roofTitle = document.getElementById('roof-title');

        // Проверяем непустоту данных перед отображением
        const hasFoundationData = detailedData.foundation && detailedData.foundation.length > 0;
        const hasWallsData = detailedData.walls && detailedData.walls.length > 0;
        const hasRoofData = detailedData.roof && detailedData.roof.length > 0;

        // Если данных нет, добавляем пустые заполнители
        if (!hasFoundationData) {
            detailedData.foundation = [{
                name: "Данные отсутствуют",
                quantity: 0,
                unit: "",
                price: 0,
                total_cost: 0
            }];
        }

        if (!hasWallsData) {
            detailedData.walls = [{
                name: "Данные отсутствуют",
                quantity: 0,
                unit: "",
                price: 0,
                total_cost: 0
            }];
        }

        if (!hasRoofData) {
            detailedData.roof = [{
                name: "Данные отсутствуют",
                quantity: 0,
                unit: "",
                price: 0,
                total_cost: 0
            }];
        }

        // Заполняем разделы с задержкой
        setTimeout(() => {
            if (foundationTitle) {
                foundationTitle.classList.remove('opacity-0');
                foundationTitle.classList.add('transition-opacity', 'duration-500');
            }
            logDebug("Заполняем раздел фундамента", detailedData.foundation);
            fillSection(foundationMaterials, detailedData.foundation);
            logDebug("Заполнен раздел фундамента");
        }, 300);

        setTimeout(() => {
            if (wallsTitle) {
                wallsTitle.classList.remove('opacity-0');
                wallsTitle.classList.add('transition-opacity', 'duration-500');
            }
            logDebug("Заполняем раздел стен", detailedData.walls);
            fillSection(wallMaterials, detailedData.walls);
            logDebug("Заполнен раздел стен");
        }, 800);

        setTimeout(() => {
            if (roofTitle) {
                roofTitle.classList.remove('opacity-0');
                roofTitle.classList.add('transition-opacity', 'duration-500');
            }
            logDebug("Заполняем раздел крыши", detailedData.roof);
            fillSection(roofMaterials, detailedData.roof);
            logDebug("Заполнен раздел крыши");
        }, 1300);

        // Добавляем вывод общей стоимости
        setTimeout(() => {
            // Рассчитываем общую стоимость
            let totalCost = 0;

            // Суммируем все разделы
            ['foundation', 'walls', 'roof'].forEach(section => {
                if (detailedData[section]) {
                    detailedData[section].forEach(item => {
                        if (item.total_cost) {
                            totalCost += item.total_cost;
                        }
                    });
                }
            });

            // Создаем блок для отображения итоговой суммы
            const resultsContainer = document.getElementById('results');
            if (resultsContainer) {
                // Проверяем, нет ли уже блока с итоговой суммой
                let totalBlock = document.getElementById('total-cost-block');
                if (!totalBlock) {
                    totalBlock = document.createElement('div');
                    totalBlock.id = 'total-cost-block';
                    totalBlock.className = 'mt-8 p-4 rounded-lg shadow-lg border-2 total-cost-container';
                    totalBlock.style.borderColor = 'var(--accent-color)';
                    totalBlock.style.backgroundColor = 'var(--surface-accent)';
                    totalBlock.innerHTML = `
                        <div class="flex justify-between items-center">
                            <h3 class="text-xl font-bold">Общая стоимость материалов:</h3>
                            <span class="text-2xl font-bold">${Math.round(totalCost).toLocaleString('ru-RU')} ₽</span>
                        </div>
                    `;

                    // Вставляем блок перед примечанием
                    const noteContainer = document.querySelector('.note-container');
                    if (noteContainer) {
                        noteContainer.parentNode.insertBefore(totalBlock, noteContainer);
                    } else {
                        // Если блок с примечанием не найден, добавляем в конец
                        resultsContainer.appendChild(totalBlock);
                    }
                } else {
                    // Обновляем сумму, если блок уже существует
                    const costSpan = totalBlock.querySelector('span');
                    if (costSpan) {
                        costSpan.textContent = `${Math.round(totalCost).toLocaleString('ru-RU')} ₽`;
                    }
                }
            }
        }, 1800);

        // Подготавливаем данные для печати
        preparePrintView();
    }, 300);
}

/**
 * Выполняет базовые расчеты материалов без обращения к серверу
 * @param {Object} params - Параметры дома и материалов
 * @returns {Object} - Объект с рассчитанными материалами для фундамента, стен и крыши
 */
function showBasicResults(params) {
    logDebug("Выполняем базовые расчеты материалов");

    // Расчет площади и периметра
    const area = parseFloat(params.area) || 100;
    const perimeter = Math.sqrt(area) * 4;
    const floors = parseInt(params.floors) || 1;
    const floorHeight = parseFloat(params.floorHeight) || 2.7;
    const wallHeight = floorHeight * floors;

    // Расчет для фундамента
    let foundation = [];
    if (params.foundationType === 'strip') {
        // Объем бетона: периметр * ширина * глубина
        const concreteVolume = (perimeter * 0.4 * 0.6).toFixed(1);
        foundation.push({
            name: "Бетон B20",
            quantity: concreteVolume,
            unit: "м³",
            price: 5100,
            total_cost: Math.round(concreteVolume * 5100)
        });

        // Арматура: периметр * количество прутьев * вес 1 метра
        const rebarWeight = Math.round(perimeter * 7 * 1.5);
        foundation.push({
            name: "Арматура A400",
            quantity: rebarWeight,
            unit: "кг",
            price: 75,
            total_cost: Math.round(rebarWeight * 75)
        });
    } else if (params.foundationType === 'slab') {
        // Объем бетона: площадь * толщина
        const concreteVolume = (area * 0.2).toFixed(1);
        foundation.push({
            name: "Бетон B25",
            quantity: concreteVolume,
            unit: "м³",
            price: 5500,
            total_cost: Math.round(concreteVolume * 5500)
        });

        // Арматурная сетка: площадь * 1.1 (запас)
        const meshArea = Math.round(area * 1.1);
        foundation.push({
            name: "Сетка арматурная",
            quantity: meshArea,
            unit: "м²",
            price: 350,
            total_cost: Math.round(meshArea * 350)
        });
    }

    // Расчет для стен
    let walls = [];
    if (params.wallMaterial === 'brick') {
        // Кирпичи: периметр * высота * количество на м²
        const brickCount = Math.round(perimeter * wallHeight * 52);
        walls.push({
            name: "Кирпич рядовой",
            quantity: brickCount,
            unit: "шт.",
            price: 30,
            total_cost: brickCount * 30
        });

        // Раствор: объем стен * коэффициент
        const mortarVolume = (perimeter * wallHeight * 0.25 * 0.12).toFixed(1);
        walls.push({
            name: "Раствор для кладки",
            quantity: mortarVolume,
            unit: "м³",
            price: 4150,
            total_cost: Math.round(mortarVolume * 4150)
        });
    } else if (params.wallMaterial === 'block') {
        // Блоки: периметр * высота * количество на м²
        const blockCount = Math.round(perimeter * wallHeight * 8);
        walls.push({
            name: "Газобетонные блоки",
            quantity: blockCount,
            unit: "шт.",
            price: 180,
            total_cost: blockCount * 180
        });

        // Клей: мешки на количество блоков
        const glueCount = Math.ceil(blockCount / 25);
        walls.push({
            name: "Клей для блоков",
            quantity: glueCount,
            unit: "мешок",
            price: 380,
            total_cost: glueCount * 380
        });
    } else if (params.wallMaterial === 'wood') {
        // Брус: периметр * высота * количество рядов
        const beamCount = Math.round(perimeter * 0.5 + wallHeight * 2);
        walls.push({
            name: "Брус 150x150",
            quantity: beamCount,
            unit: "шт.",
            price: 850,
            total_cost: beamCount * 850
        });

        // Утеплитель: площадь стен
        const insulationArea = Math.round(perimeter * wallHeight);
        walls.push({
            name: "Минеральная вата",
            quantity: insulationArea,
            unit: "м²",
            price: 550,
            total_cost: insulationArea * 550
        });
    }

    // Расчет для крыши
    let roof = [];
    const roofArea = area * 1.2; // примерная площадь крыши с учетом свесов и угла наклона

    if (params.roofType === 'metal') {
        // Металлочерепица: площадь крыши * коэффициент
        const metalTileArea = Math.round(roofArea * 1.1);
        roof.push({
            name: "Металлочерепица",
            quantity: metalTileArea,
            unit: "м²",
            price: 650,
            total_cost: metalTileArea * 650
        });
    } else if (params.roofType === 'soft') {
        // Мягкая кровля: площадь крыши * коэффициент
        const softRoofArea = Math.round(roofArea * 1.15);
        roof.push({
            name: "Гибкая черепица",
            quantity: softRoofArea,
            unit: "м²",
            price: 550,
            total_cost: softRoofArea * 550
        });
    }

    // Стропила для всех типов крыш
    const raftersCount = Math.ceil(Math.sqrt(area) * 1.5);
    roof.push({
        name: "Стропила",
        quantity: raftersCount,
        unit: "шт.",
        price: 750,
        total_cost: raftersCount * 750
    });

    // Возвращаем результаты
    return {
        foundation: foundation,
        walls: walls,
        roof: roof
    };
}

/**
 * Функция для создания контейнеров результатов если они отсутствуют
 */
function createResultContainersIfNeeded() {
    logDebug("Создание контейнеров для результатов");

    // Находим панель результатов
    const resultsPanel = document.querySelector('.results-panel');
    if (!resultsPanel) {
        console.error("Панель результатов не найдена");
        return;
    }

    // Находим div с id="results"
    let resultsDiv = document.getElementById('results');
    if (!resultsDiv) {
        resultsDiv = document.createElement('div');
        resultsDiv.id = 'results';
        resultsDiv.className = 'space-y-6';
        resultsPanel.appendChild(resultsDiv);
    }

    // Создаем структуру контейнеров для результатов
    const sectionsHTML = `
        <!-- Секции результатов -->
        <div class="mt-8 space-y-6">
            <!-- Фундамент -->
            <div class="mb-6">
                <h4 class="text-lg font-semibold mb-3 opacity-0" id="foundation-title">Фундамент:</h4>
                <div id="foundationMaterials" class="space-y-2 pl-4"></div>
            </div>

            <!-- Стены -->
            <div class="mb-6">
                <h4 class="text-lg font-semibold mb-3 opacity-0" id="walls-title">Стены:</h4>
                <div id="wallMaterials" class="space-y-2 pl-4"></div>
            </div>

            <!-- Кровля -->
            <div class="mb-6">
                <h4 class="text-lg font-semibold mb-3 opacity-0" id="roof-title">Кровля:</h4>
                <div id="roofMaterials" class="space-y-2 pl-4"></div>
            </div>
        </div>
        
        <!-- Кнопки управления -->
        <div class="flex flex-col sm:flex-row gap-4 mt-6 no-print">
            <button id="recalcButton" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg w-full sm:w-auto">
                Изменить параметры
            </button>
            <button id="printButton" class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg w-full sm:w-auto">
                Распечатать результаты
            </button>
        </div>
    `;

    // Добавляем HTML в контейнер результатов
    resultsDiv.innerHTML = sectionsHTML;

    // Перезапускаем функцию отображения результатов
    setTimeout(showDemoResults, 100);
}