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
let lastRecommendationParams = null; // Для отслеживания последних параметров запроса рекомендаций
let isRecommendationRequestInProgress = false; // Флаг для отслеживания текущего запроса
let recommendationsRequested = false; // Флаг для отслеживания запроса рекомендаций
let recommendationRequestTimeout = null; // Для хранения таймаута запроса рекомендаций

/**
 * Вспомогательная функция для правильного возврата к калькулятору
 */
function navigateToCalculator() {
    // Проверяем, на какой странице мы находимся
    const currentPath = window.location.pathname;
    const calculatorPanel = document.querySelector('.calculator-panel');

    // Если калькулятор найден на текущей странице
    if (calculatorPanel) {
        // Показываем его
        calculatorPanel.classList.remove('hidden');
        calculatorPanel.classList.add('active');

        // Скрываем результаты
        const resultsPanel = document.querySelector('.results-panel');
        if (resultsPanel) {
            resultsPanel.classList.remove('active');
            resultsPanel.classList.add('hidden');
        }

        // Сбрасываем флаги
        isCalculating = false;
        window.animationCompleted = false;

        // Прокручиваем к форме
        calculatorPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });

        return true;
    }
    // Если мы на главной странице, нужно нажать на кнопку "Начать расчет"
    else if (currentPath === '/' || currentPath === '') {
        const startCalculationButton = document.querySelector('a[href="#calculator"], .btn-primary, button.start-calculation');
        if (startCalculationButton) {
            startCalculationButton.click();
            return true;
        }
    }

    // Если ни один из вариантов не подходит, перезагружаем страницу
    logDebug("Не удалось найти калькулятор или кнопку для его запуска. Перезагрузка...");

    // Проверяем, находимся ли мы не на странице с калькулятором
    if (currentPath !== '/calculator' && currentPath !== '/calculator/') {
        // Переходим на страницу с калькулятором
        window.location.href = '/calculator';
    } else {
        // Просто перезагружаем текущую страницу
        location.reload();
    }

    return false;
}

/**
 * Функция для обработки отправки формы калькулятора
 * @param {Event} event - Событие отправки формы
 * @returns {Promise<void>}
 */
async function handleFormSubmit(event) {
    event.preventDefault();

    // Получаем форму и данные
    const form = event.target;
    const params = getFormParams(form);

    // Показываем анимацию загрузки
    startCalculationAnimation();

    try {
        // Получаем данные с сервера
        const detailedData = await fetchDetailedMaterials(params);

        // Показываем результаты расчета
        showDetailedResults(detailedData, params);

        // Показываем рекомендации ИИ
        setTimeout(() => {
            showAIRecommendations(params);
        }, 1000);
    } catch (error) {
        console.error("Ошибка при обработке формы:", error);

        // В случае ошибки показываем базовый результат
        resetAnimation();
        showBasicResults(params);

        // Показываем уведомление об ошибке
        alert(`Ошибка при расчете: ${error.message}`);
    }
}

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', function () {
    logDebug("DOM загружен. Инициализация калькулятора...");

    // Разблокировка F12 и других клавиш для разработки
    document.addEventListener('keydown', function (e) {
        // Разрешаем F12 и другие клавиши разработчика
        if (e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && e.key === 'I') ||
            (e.ctrlKey && e.shiftKey && e.key === 'J') ||
            (e.ctrlKey && e.key === 'u')) {
            // Отменяем любые обработчики по умолчанию, которые могут блокировать эти комбинации
            e.stopImmediatePropagation();
            return true; // Разрешаем действие по умолчанию
        }
    }, true);

    // Если в window есть обработчики, которые могут блокировать F12
    const originalAddEventListener = window.addEventListener;
    window.addEventListener = function (type, listener, options) {
        if (type === 'keydown' || type === 'keyup' || type === 'keypress') {
            const wrappedListener = function (e) {
                // Если это F12 или другие клавиши разработчика, не блокируем их
                if (e.key === 'F12' ||
                    (e.ctrlKey && e.shiftKey && e.key === 'I') ||
                    (e.ctrlKey && e.shiftKey && e.key === 'J') ||
                    (e.ctrlKey && e.key === 'u')) {
                    return true;
                }
                return listener.apply(this, arguments);
            };
            return originalAddEventListener.call(this, type, wrappedListener, options);
        }
        return originalAddEventListener.call(this, type, listener, options);
    };

    // Обработчик для кнопок на главной странице
    const startButtons = document.querySelectorAll('a[href="#calculator"], .btn-primary, button.start-calculation');
    if (startButtons && startButtons.length > 0) {
        logDebug(`Найдены кнопки 'Начать расчет': ${startButtons.length} шт.`);

        startButtons.forEach(button => {
            button.addEventListener('click', function (e) {
                logDebug("Нажата кнопка 'Начать расчет'");

                // Скрываем главную страницу
                const homePage = document.querySelector('.home-page, .landing-section, .main-landing');
                if (homePage) {
                    homePage.classList.add('hidden');
                }

                // Показываем калькулятор
                const calculatorPanel = document.querySelector('.calculator-panel');
                if (calculatorPanel) {
                    calculatorPanel.classList.remove('hidden');
                    calculatorPanel.classList.add('active');

                    // Прокручиваем к форме
                    calculatorPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    } else {
        logDebug("Кнопки 'Начать расчет' не найдены");
    }

    // Находим форму калькулятора
    const calculatorForm = document.getElementById('calculatorForm');

    // Если форма найдена, добавляем обработчик события отправки
    if (calculatorForm) {
        // Удаляем встроенный обработчик в атрибуте onsubmit
        calculatorForm.onsubmit = null;

        // Добавляем наш обработчик
        calculatorForm.addEventListener('submit', handleFormSubmit);

        console.log("Обработчик формы калькулятора инициализирован");
    } else {
        console.error("Форма калькулятора не найдена!");
    }

    // Инициализируем остальные обработчики
    setupInterfaceMonitor();
    setupFormChangeTracking();

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

    // Находим элементы интерфейса для обработки событий
    const resultsPanel = document.querySelector('.results-panel');
    const recalcButton = document.getElementById('recalcButton');
    const printButton = document.getElementById('printButton');

    // Обработчик для кнопки "Изменить параметры"
    if (recalcButton) {
        recalcButton.addEventListener('click', function () {
            logDebug("Нажата кнопка 'Изменить параметры'");

            if (calculatorForm && resultsPanel) {
                // Скрываем результаты, показываем форму
                resultsPanel.classList.add('hidden');
                resultsPanel.classList.remove('active');

                const calculatorPanel = document.querySelector('.calculator-panel');
                if (calculatorPanel) {
                    calculatorPanel.classList.remove('hidden');
                    calculatorPanel.classList.add('active');

                    // Прокручиваем к форме
                    calculatorPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }

                // Сбрасываем анимацию расчета
                resetAnimation();
            }
        });
    }

    // Обработчик для кнопки "Распечатать результаты"
    if (printButton) {
        printButton.addEventListener('click', function () {
            logDebug("Нажата кнопка 'Распечатать результаты'");
            preparePrintView();
            window.print();
        });
    }
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
 * Функция для получения параметров формы
 * @param {HTMLFormElement} form - Форма для получения параметров
 * @return {Object} - Параметры формы
 */
function getFormParams(form) {
    const formData = new FormData(form);
    const params = {};

    // Обрабатываем обычные поля формы
    for (let [key, value] of formData.entries()) {
        // Если ключ уже существует - значит это множественный выбор (чекбоксы)
        if (params[key] !== undefined) {
            // Если значение еще не является массивом, преобразуем его в массив
            if (!Array.isArray(params[key])) {
                params[key] = [params[key]];
            }
            // Добавляем новое значение в массив
            params[key].push(value);
        } else {
            params[key] = value;
        }
    }

    // Всегда задаем пустой массив для дополнительных опций
    params.additionalOptions = [];

    return params;
}

/**
 * Функция для сравнения параметров
 * @param {Object} params1 - Первый набор параметров
 * @param {Object} params2 - Второй набор параметров
 * @return {boolean} - true если параметры идентичны
 */
function areParamsEqual(params1, params2) {
    // Если один из объектов null или undefined, они не равны
    if (!params1 || !params2) return false;

    // Получаем все ключи из обоих объектов
    const keys1 = Object.keys(params1);
    const keys2 = Object.keys(params2);

    // Если количество ключей разное, объекты не равны
    if (keys1.length !== keys2.length) return false;

    // Проверяем каждый ключ
    for (const key of keys1) {
        // Если ключ отсутствует во втором объекте, они не равны
        if (!(key in params2)) return false;

        // Особая обработка для массивов
        if (Array.isArray(params1[key]) && Array.isArray(params2[key])) {
            if (params1[key].length !== params2[key].length) return false;
            for (let i = 0; i < params1[key].length; i++) {
                if (params1[key][i] !== params2[key][i]) return false;
            }
        }
        // Проверка для числовых значений - сравниваем с погрешностью
        else if (typeof params1[key] === 'number' && typeof params2[key] === 'number') {
            if (Math.abs(params1[key] - params2[key]) > 0.001) return false;
        }
        // Для всех остальных типов - строгое сравнение
        else if (params1[key] !== params2[key]) {
            return false;
        }
    }

    return true;
}

/**
 * Сброс анимации расчета и очистка всех элементов
 */
function resetAnimation() {
    logDebug("Сброс анимации расчета");

    // Удаляем старые элементы анимации, если они есть
    document.querySelectorAll('.formula-element, .math-symbol, .final-glow, .final-text, .formula-container, .svg-arrow, svg.line-animation').forEach(el => {
        if (el && el.parentNode) {
            el.parentNode.removeChild(el);
        }
    });

    // Очищаем контейнер с формулами
    const formulasArea = document.getElementById('formulas-area');
    if (formulasArea) {
        formulasArea.innerHTML = '';
    }

    // Сбрасываем индикатор прогресса
    const progressTracker = document.getElementById('progress-tracker');
    if (progressTracker) {
        progressTracker.style.width = '0%';
    }

    // Скрываем контейнер с анимацией
    const loadingAnimation = document.getElementById('loading-animation');
    if (loadingAnimation) {
        loadingAnimation.style.display = 'none';
    }

    // Удаляем все svg элементы
    document.querySelectorAll('svg.computation-line').forEach(el => {
        if (el && el.parentNode) {
            el.parentNode.removeChild(el);
        }
    });

    // Сбрасываем флаги анимации
    window.animationCompleted = false;
    window.useSimpleAnimation = false;
    if (window.animationTimeout) {
        clearTimeout(window.animationTimeout);
        window.animationTimeout = null;
    }

    // Удаляем все пользовательские стили, добавленные для анимации
    const animationStyles = document.getElementById('animation-styles');
    if (animationStyles) {
        animationStyles.parentNode.removeChild(animationStyles);
    }

    logDebug("Анимация расчета сброшена");
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

    // Сбрасываем флаги для нового расчета
    if (window.newCalculationStarted) {
        window.demoResultsShown = false;
        recommendationsRequested = false;
        window.newCalculationStarted = false;
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
 * Функция для демонстрации результатов расчета
 * Получает данные от API и отображает их
 */
async function showDemoResults() {
    try {
        logDebug("Вызвана функция showDemoResults");

        // Получаем форму и данные
        const form = document.getElementById('calculatorForm');
        const params = form ? getFormParams(form) : {};

        // Показываем анимацию загрузки
        if (typeof startCalculationAnimation === 'function') {
            startCalculationAnimation();
        }

        // Получаем данные с сервера
        const detailedData = await fetchDetailedMaterials(params);

        // Показываем результаты расчета
        showDetailedResults(detailedData, params);

        // Показываем рекомендации ИИ
        setTimeout(() => {
            showAIRecommendations(params);
        }, 1000);
    } catch (error) {
        console.error("Ошибка при отображении результатов:", error);

        // В случае ошибки показываем базовый результат
        resetAnimation();
        showBasicResults(params);

        // Показываем уведомление об ошибке
        alert(`Ошибка при расчете: ${error.message}`);
    }
}

/**
 * Функция для получения детализированных материалов через API
 * @param {Object} params - Параметры формы
 * @returns {Promise} - Promise с данными материалов
 */
async function fetchDetailedMaterials(params) {
    try {
        logDebug("Запрашиваем детализированные материалы с сервера");

        // Показываем индикатор загрузки
        showLoadingState(true);

        // Отправляем запрос на сервер для расчета материалов
        const response = await fetch('/api/form-calculate-materials', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Ошибка при расчете: ${errorData.detail || 'Неизвестная ошибка'}`);
        }

        // Получаем ответ от сервера
        const data = await response.json();

        // Скрываем индикатор загрузки
        showLoadingState(false);

        return data;
    } catch (error) {
        logDebug("Ошибка при получении материалов: " + error.message);
        console.error("Ошибка при получении материалов:", error);

        // Скрываем индикатор загрузки
        showLoadingState(false);

        // В случае ошибки возвращаем пустой объект с категориями
        return {
            foundation: [],
            walls: [],
            roof: [],
            total_cost: 0
        };
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

        // Опалубка для ленточного фундамента
        const formworkArea = Math.round(perimeter * 2 * 0.6);
        foundation.push({
            name: "Опалубка из фанеры",
            quantity: formworkArea,
            unit: "м²",
            price: 225,
            total_cost: formworkArea * 225
        });

        // Гидроизоляция для ленточного фундамента
        const waterproofingArea = Math.round(perimeter * 1.5);
        foundation.push({
            name: "Гидроизоляция рулонная",
            quantity: waterproofingArea,
            unit: "м²",
            price: 120,
            total_cost: waterproofingArea * 120
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

        // Гидроизоляция для плитного фундамента
        const waterproofingArea = Math.round(area * 1.1);
        foundation.push({
            name: "Гидроизоляция мембранная",
            quantity: waterproofingArea,
            unit: "м²",
            price: 180,
            total_cost: waterproofingArea * 180
        });

        // Подушка песчаная
        const sandVolume = (area * 0.15).toFixed(1);
        foundation.push({
            name: "Песчаная подушка",
            quantity: sandVolume,
            unit: "м³",
            price: 1200,
            total_cost: Math.round(sandVolume * 1200)
        });
    } else if (params.foundationType === 'pile') {
        // Количество свай: периметр / шаг свай (примерно 1.5м)
        const pileCount = Math.ceil(perimeter / 1.5);
        foundation.push({
            name: "Сваи железобетонные",
            quantity: pileCount,
            unit: "шт.",
            price: 3200,
            total_cost: pileCount * 3200
        });

        // Ростверк: периметр * ширина * высота
        const grillageVolume = (perimeter * 0.3 * 0.4).toFixed(1);
        foundation.push({
            name: "Бетон для ростверка",
            quantity: grillageVolume,
            unit: "м³",
            price: 5300,
            total_cost: Math.round(grillageVolume * 5300)
        });

        // Арматура для ростверка
        const grillageRebarWeight = Math.round(perimeter * 5 * 1.2);
        foundation.push({
            name: "Арматура для ростверка",
            quantity: grillageRebarWeight,
            unit: "кг",
            price: 75,
            total_cost: grillageRebarWeight * 75
        });

        // Гидроизоляция для свайного фундамента
        const waterproofingArea = Math.round(perimeter * 0.8);
        foundation.push({
            name: "Гидроизоляция ростверка",
            quantity: waterproofingArea,
            unit: "м²",
            price: 120,
            total_cost: waterproofingArea * 120
        });
    } else if (params.foundationType === 'column') {
        // Количество столбов: периметр / шаг столбов (примерно 2м)
        const columnCount = Math.ceil(perimeter / 2);
        foundation.push({
            name: "Бетонные столбы",
            quantity: columnCount,
            unit: "шт.",
            price: 1500,
            total_cost: columnCount * 1500
        });

        // Ростверк для столбчатого фундамента
        const beamVolume = (perimeter * 0.25 * 0.3).toFixed(1);
        foundation.push({
            name: "Бетон для ростверка",
            quantity: beamVolume,
            unit: "м³",
            price: 5100,
            total_cost: Math.round(beamVolume * 5100)
        });

        // Гидроизоляция для столбчатого фундамента
        const waterproofingArea = Math.round(perimeter * 0.6);
        foundation.push({
            name: "Гидроизоляция ростверка",
            quantity: waterproofingArea,
            unit: "м²",
            price: 120,
            total_cost: waterproofingArea * 120
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

        // Утеплитель для кирпичных стен
        const insulationArea = Math.round(perimeter * wallHeight);
        walls.push({
            name: "Утеплитель фасадный",
            quantity: insulationArea,
            unit: "м²",
            price: 380,
            total_cost: insulationArea * 380
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

        // Межвенцовый утеплитель
        const interLayerCount = Math.round(wallHeight / 0.15); // высота стены / высота бруса
        walls.push({
            name: "Межвенцовый утеплитель",
            quantity: perimeter * interLayerCount,
            unit: "м.п.",
            price: 45,
            total_cost: perimeter * interLayerCount * 45
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

        // Утеплитель для блочных стен
        const insulationArea = Math.round(perimeter * wallHeight);
        walls.push({
            name: "Утеплитель фасадный",
            quantity: insulationArea,
            unit: "м²",
            price: 350,
            total_cost: insulationArea * 350
        });
    } else if (params.wallMaterial === 'concrete') {
        // Бетон для монолитных стен: периметр * толщина * высота
        const concreteVolume = (perimeter * 0.2 * wallHeight).toFixed(1);
        walls.push({
            name: "Бетон B25",
            quantity: concreteVolume,
            unit: "м³",
            price: 5500,
            total_cost: Math.round(concreteVolume * 5500)
        });

        // Арматура для стен
        const wallRebarWeight = Math.round(perimeter * wallHeight * 15);
        walls.push({
            name: "Арматура для стен",
            quantity: wallRebarWeight,
            unit: "кг",
            price: 75,
            total_cost: wallRebarWeight * 75
        });

        // Опалубка
        const formworkArea = Math.round(perimeter * wallHeight * 2);
        walls.push({
            name: "Опалубка для стен",
            quantity: formworkArea,
            unit: "м²",
            price: 225,
            total_cost: formworkArea * 225
        });

        // Утеплитель для монолитных стен
        const insulationArea = Math.round(perimeter * wallHeight);
        walls.push({
            name: "Утеплитель фасадный",
            quantity: insulationArea,
            unit: "м²",
            price: 380,
            total_cost: insulationArea * 380
        });
    } else if (params.wallMaterial === 'panel') {
        // Панели для стен (количество панелей зависит от размера)
        const panelCount = Math.ceil(perimeter * wallHeight / 6); // примерно 6м² на панель
        walls.push({
            name: "Стеновые панели",
            quantity: panelCount,
            unit: "шт.",
            price: 9500,
            total_cost: panelCount * 9500
        });

        // Крепежные элементы для панелей
        walls.push({
            name: "Крепежные элементы",
            quantity: panelCount * 4, // 4 крепления на панель
            unit: "компл.",
            price: 350,
            total_cost: panelCount * 4 * 350
        });

        // Герметик для швов
        const jointLength = perimeter * (Math.ceil(wallHeight / 3) + 1); // швы вертикальные и горизонтальные
        walls.push({
            name: "Герметик для швов",
            quantity: Math.ceil(jointLength / 10), // 10 метров на тюбик
            unit: "тюбик",
            price: 280,
            total_cost: Math.ceil(jointLength / 10) * 280
        });
    }

    // Расчет для крыши
    let roof = [];
    const roofArea = area * 1.2;

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
    } else if (params.roofType === 'tile') {
        // Керамическая черепица: площадь крыши * коэффициент
        const tileArea = Math.round(roofArea * 1.15);
        roof.push({
            name: "Керамическая черепица",
            quantity: tileArea,
            unit: "м²",
            price: 1200,
            total_cost: tileArea * 1200
        });
    } else if (params.roofType === 'shingle') {
        // Гибкая черепица: площадь крыши * коэффициент
        const shingleArea = Math.round(roofArea * 1.15);
        roof.push({
            name: "Гибкая черепица",
            quantity: shingleArea,
            unit: "м²",
            price: 550,
            total_cost: shingleArea * 550
        });
    } else if (params.roofType === 'flat') {
        // Плоская кровля: площадь крыши * коэффициент
        const flatRoofArea = Math.round(roofArea * 1.05);
        roof.push({
            name: "Рулонная кровля",
            quantity: flatRoofArea,
            unit: "м²",
            price: 350,
            total_cost: flatRoofArea * 350
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

    // Добавляем гидроизоляцию и обрешетку для скатных крыш
    if (params.roofType !== 'flat') {
        // Обрешетка
        roof.push({
            name: "Обрешетка",
            quantity: Math.round(roofArea * 3),
            unit: "м.п.",
            price: 35,
            total_cost: Math.round(roofArea * 3) * 35
        });

        // Гидроизоляция
        roof.push({
            name: "Гидроизоляция",
            quantity: Math.ceil(roofArea * 1.05),
            unit: "м²",
            price: 85,
            total_cost: Math.ceil(roofArea * 1.05) * 85
        });

        // Утеплитель для кровли
        if (params.roofType === 'metal' || params.roofType === 'tile') {
            roof.push({
                name: "Утеплитель кровельный",
                quantity: Math.round(roofArea),
                unit: "м²",
                price: 380,
                total_cost: Math.round(roofArea) * 380
            });
        }
    } else {
        // Для плоской кровли
        roof.push({
            name: "Утеплитель для плоской кровли",
            quantity: Math.round(roofArea * 1.05),
            unit: "м²",
            price: 420,
            total_cost: Math.round(roofArea * 1.05) * 420
        });

        roof.push({
            name: "Пароизоляция",
            quantity: Math.round(roofArea * 1.1),
            unit: "м²",
            price: 65,
            total_cost: Math.round(roofArea * 1.1) * 65
        });
    }

    // Возвращаем результаты
    return {
        foundation: foundation.length > 0 ? foundation : [
            {
                name: "Материалы для выбранного типа фундамента",
                quantity: 1,
                unit: "компл.",
                price: 50000,
                total_cost: 50000
            }
        ],
        walls: walls.length > 0 ? walls : [
            {
                name: "Материалы для выбранного типа стен",
                quantity: 1,
                unit: "компл.",
                price: 70000,
                total_cost: 70000
            }
        ],
        roof: roof.length > 0 ? roof : [
            {
                name: "Материалы для выбранного типа кровли",
                quantity: 1,
                unit: "компл.",
                price: 60000,
                total_cost: 60000
            }
        ]
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

    // Добавляем обработчики на новые кнопки
    const newRecalcButton = document.getElementById('recalcButton');
    if (newRecalcButton) {
        newRecalcButton.addEventListener('click', function (e) {
            e.preventDefault();

            logDebug("Кнопка 'Изменить параметры' нажата (новая)");

            // Скрываем панель результатов
            resultsPanel.classList.remove('active');
            resultsPanel.classList.add('hidden');

            // Используем новую функцию навигации к калькулятору
            setTimeout(() => {
                navigateToCalculator();
            }, 50);
        });

        logDebug("Добавлен новый обработчик на кнопку 'Изменить параметры'");
    }

    const newPrintButton = document.getElementById('printButton');
    if (newPrintButton) {
        newPrintButton.addEventListener('click', function () {
            logDebug("Кнопка 'Распечатать результаты' нажата (новая)");
            preparePrintView();
            window.print();
        });
    }

    // Перезапускаем функцию отображения результатов
    setTimeout(showDemoResults, 100);
}

/**
 * Проверяет, находится ли элемент в видимой области окна
 * @param {Element} el - Элемент для проверки
 * @returns {Boolean} - true, если элемент виден
 */
function isElementInViewport(el) {
    if (!el) return false;

    const rect = el.getBoundingClientRect();

    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

/**
 * Функция для отображения ИИ рекомендаций по строительству в существующей рамке
 * @param {Object} params - Параметры калькулятора
 * @param {String} priority - Приоритет рекомендаций (cost, quality, speed)
 * @param {Boolean} forceUpdate - Принудительно обновить рекомендации даже если параметры не изменились
 */
async function showAIRecommendations(params, focusPriority = 'cost', forceUpdate = false) {
    try {
        // Если запрос уже выполняется, не начинаем новый
        if (isRecommendationRequestInProgress) {
            logDebug("Запрос рекомендаций уже выполняется, новый запрос отменен");
            return;
        }

        // Проверяем, изменились ли параметры с последнего запроса
        const paramsKey = JSON.stringify(params) + focusPriority;
        if (!forceUpdate && lastRecommendationParams === paramsKey) {
            logDebug("Параметры не изменились, пропускаем запрос рекомендаций");
            return;
        }

        logDebug(`Запрос ИИ рекомендаций с приоритетом: ${focusPriority}`);
        isRecommendationRequestInProgress = true;

        // Находим существующий контейнер с рекомендациями
        const recommendationsContainer = document.querySelector('.ai-recommendations');
        if (!recommendationsContainer) {
            logDebug("Контейнер с рекомендациями не найден");
            isRecommendationRequestInProgress = false;
            return;
        }

        // Находим или создаем контейнер для контента рекомендаций
        let contentContainer = document.getElementById('ai-recommendations-content');
        if (!contentContainer) {
            logDebug("Контейнер для контента рекомендаций не найден, создаем новый");
            contentContainer = document.createElement('div');
            contentContainer.id = 'ai-recommendations-content';
            contentContainer.className = 'space-y-3';
            recommendationsContainer.appendChild(contentContainer);
        }

        // Очищаем контейнер перед запросом, чтобы там не было предыдущих рекомендаций
        contentContainer.innerHTML = '';

        // Показываем контейнер рекомендаций всегда, даже если он пустой
        recommendationsContainer.classList.remove('hidden');

        // Добавляем индикатор загрузки
        const heading = recommendationsContainer.querySelector('.ai-recommendations-title, h4, h3, h2');
        if (heading) {
            heading.innerHTML = `
                <div class="flex items-center justify-center">
                    <span>Подготовка персональных рекомендаций...</span>
                    <div class="loader ml-2"></div>
                </div>
            `;
        }

        // Готовим параметры для запроса
        const requestBody = {
            calculator_data: {
                area: parseFloat(params.area) || 0,
                foundation_type: params.foundationType || "strip",
                wall_material: params.wallMaterial || "brick",
                floors: parseInt(params.floors) || 1,
                roof_type: params.roofType || "metal",
                additional_options: [] // Всегда пустой массив, так как дополнительные опции убраны
            },
            budget: params.budget ? parseFloat(params.budget) : null,
            priority: focusPriority
        };

        logDebug("Подготовленные параметры для AI: " + JSON.stringify(requestBody));

        // Отображаем индикатор загрузки
        showLoadingState(true);

        // Отменяем предыдущий таймаут, если он существует
        if (recommendationRequestTimeout) {
            clearTimeout(recommendationRequestTimeout);
        }

        // Устанавливаем таймаут для запроса (30 секунд вместо 15)
        recommendationRequestTimeout = setTimeout(() => {
            logDebug("Превышено время ожидания ответа от сервера");
            isRecommendationRequestInProgress = false;

            // Обрабатываем ошибку таймаута
            handleRecommendationError(contentContainer, heading, "Превышено время ожидания ответа от сервера");
        }, 30000); // 30 секунд таймаут

        // Отправляем запрос
        let response;
        try {
            response = await fetch('/api/recommendations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody),
                timeout: 25000 // Увеличиваем таймаут до 25 секунд
            });
        } catch (error) {
            clearTimeout(recommendationRequestTimeout);
            recommendationRequestTimeout = null;
            isRecommendationRequestInProgress = false;

            // Обрабатываем ошибку сети
            handleRecommendationError(contentContainer, heading, `Ошибка соединения: ${error.message}`);
            return;
        }

        // Очищаем таймаут, так как запрос завершен
        clearTimeout(recommendationRequestTimeout);
        recommendationRequestTimeout = null;

        if (!response.ok) {
            isRecommendationRequestInProgress = false;

            // Обрабатываем ошибку API
            handleRecommendationError(contentContainer, heading, `Ошибка API: ${response.status} ${response.statusText}`);
            return;
        }

        const data = await response.json();
        logDebug(`Получены рекомендации: ${data.recommendations ? data.recommendations.length : 0}`);

        // Сохраняем параметры этого запроса как последние успешные
        lastRecommendationParams = paramsKey;

        // Обновляем заголовок
        if (heading) {
            heading.textContent = 'Рекомендации ИИ-ассистента по строительству';
        }

        // Очищаем индикатор загрузки
        showLoadingState(false);

        // Добавляем рекомендации
        if (data.recommendations && data.recommendations.length > 0) {
            // Берем только первую рекомендацию, независимо от количества полученных
            const recommendation = data.recommendations[0];

            // Создаем параграф для лайфхака
            const paragraph = document.createElement('p');
            paragraph.className = 'text-indent-paragraph';

            // Получаем текст рекомендации
            let recommendationText = '';
            if (typeof recommendation === 'object' && recommendation !== null) {
                if (recommendation.text) {
                    recommendationText = recommendation.text;
                } else if (recommendation.description) {
                    recommendationText = recommendation.description;
                } else if (recommendation.content) {
                    recommendationText = recommendation.content;
                } else if (recommendation.message) {
                    recommendationText = recommendation.message;
                } else {
                    recommendationText = JSON.stringify(recommendation);
                }
            } else {
                recommendationText = String(recommendation);
            }

            paragraph.textContent = recommendationText;
            contentContainer.appendChild(paragraph);
        } else {
            contentContainer.innerHTML = '<p class="text-center text-gray-500">Нет доступных рекомендаций для текущих параметров.</p>';
        }

        // Прокручиваем к рекомендациям, если они не видны
        if (!isElementInViewport(recommendationsContainer)) {
            recommendationsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    } catch (error) {
        console.error('Ошибка при загрузке лайфхака:', error);

        // Находим контейнеры снова, на случай, если они не были доступны в блоке try
        const recommendationsContainer = document.querySelector('.ai-recommendations');
        const contentContainer = document.getElementById('ai-recommendations-content');
        const heading = recommendationsContainer?.querySelector('.ai-recommendations-title, h4, h3, h2');

        // Обрабатываем общую ошибку
        handleRecommendationError(contentContainer, heading, error.message);
    } finally {
        showLoadingState(false);
        isRecommendationRequestInProgress = false;
    }
}

/**
 * Функция для обработки ошибок при загрузке рекомендаций
 * @param {Element} contentContainer - Контейнер для контента рекомендаций
 * @param {Element} heading - Заголовок блока рекомендаций
 * @param {String} errorMessage - Сообщение об ошибке
 */
function handleRecommendationError(contentContainer, heading, errorMessage) {
    console.error('Ошибка при получении рекомендаций:', errorMessage);

    // Сбрасываем флаг запроса рекомендаций, чтобы можно было повторить запрос
    recommendationsRequested = false;

    // Восстанавливаем заголовок
    if (heading) {
        heading.textContent = 'Рекомендации ИИ-ассистента по строительству';
    }

    // Проверяем, что контейнер существует
    if (!contentContainer) return;

    // Очищаем контейнер полностью
    contentContainer.innerHTML = '';

    // Создаем параграф для стандартного лайфхака при ошибке
    const fallbackRecommendation = document.createElement('p');
    fallbackRecommendation.className = 'text-indent-paragraph';

    // Выбираем один из заготовленных лайфхаков
    const fallbackTexts = [
        'Для получения наилучших результатов при строительстве, фотографируйте каждый этап работы. Это поможет отследить скрытые коммуникации и избежать проблем при последующих ремонтах.',
        'Используйте качественную гидроизоляцию фундамента с двойным слоем защиты. Экономия на этом этапе может привести к серьезным проблемам и дорогостоящим ремонтам в будущем.',
        'При планировании электропроводки предусмотрите на 30% больше розеток, чем кажется необходимым сейчас. Это избавит от необходимости использовать удлинители и снизит риск перегрузки сети.'
    ];

    // Выбираем случайный лайфхак
    const randomIndex = Math.floor(Math.random() * fallbackTexts.length);
    fallbackRecommendation.textContent = fallbackTexts[randomIndex];

    // Добавляем лайфхак в контейнер
    contentContainer.appendChild(fallbackRecommendation);
}

// Модифицируем showDemoResults, чтобы добавить вызов ИИ рекомендаций
const originalShowDemoResults = window.showDemoResults || function () { };
window.showDemoResults = function () {
    // Проверяем, завершена ли анимация
    if (window.animationCompleted !== true) {
        logDebug("Анимация ещё не завершена, ожидаем...");
        // Повторяем через 500 мс, если анимация не завершена
        setTimeout(window.showDemoResults, 500);
        return;
    }

    // Вызываем оригинальную функцию только если не было вызовов ранее
    if (!window.demoResultsShown) {
        originalShowDemoResults.apply(this, arguments);
        window.demoResultsShown = true;
    }

    // Запрашиваем рекомендации только один раз для этого расчета
    if (!recommendationsRequested && lastCalculationParams && Object.keys(lastCalculationParams).length > 0) {
        // Отмечаем, что рекомендации уже запрошены
        recommendationsRequested = true;

        // Сбрасываем кеш рекомендаций для гарантированного получения новой рекомендации
        lastRecommendationParams = null;

        // Ждем завершения анимации или показа результатов
        setTimeout(() => {
            // Запрашиваем новые рекомендации с принудительным обновлением
            showAIRecommendations(lastCalculationParams, 'cost', true);
        }, 1500);
    }
};

// Добавляем стили для лоадера
const styleTag = document.createElement('style');
styleTag.textContent = `
    .loader {
        border: 3px solid rgba(130, 180, 230, 0.3);
        border-radius: 50%;
        border-top: 3px solid #3498db;
        width: 16px;
        height: 16px;
        display: inline-block;
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(styleTag);

/**
 * Функция для восстановления интерфейса в случае ошибок
 */
function recoverInterface() {
    try {
        console.log("Запуск восстановления интерфейса...");

        // Очищаем все потенциальные таймеры
        if (window.animationTimeout) {
            clearTimeout(window.animationTimeout);
            console.log("Очищен таймаут анимации");
        }

        // Остановка всех анимаций
        document.querySelectorAll('.formula-element, svg, .final-glow, .final-text').forEach(el => {
            if (el && el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });

        // Сброс флагов анимации
        window.animationCompleted = true;

        // Восстановление видимости UI-элементов
        const mainElements = [
            'header',
            '.main-header',
            '.container',
            '.calculator-container',
            '#calculator-form',
            '.results-panel'
        ];

        mainElements.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (el) {
                    el.style.display = '';
                    el.style.visibility = '';
                    el.style.opacity = '1';
                }
            });
        });

        // Восстановление прокрутки страницы
        document.body.style.overflow = '';

        console.log("Восстановление интерфейса завершено");
    } catch (e) {
        console.error("Ошибка при восстановлении интерфейса:", e);
    }
}

/**
 * Функция для мониторинга возможных зависаний интерфейса
 */
function setupInterfaceMonitor() {
    // Проверка состояния интерфейса каждые 10 секунд
    const monitorInterval = setInterval(() => {
        try {
            const header = document.querySelector('header') || document.querySelector('.main-header');
            const calculatorForm = document.querySelector('#calculator-form');
            const loadingContainer = document.getElementById('loading-animation');

            // Проверяем признаки зависания: скрытый хедер при активном лоадере
            if (header && calculatorForm && loadingContainer) {
                const headerHidden = (
                    header.style.display === 'none' ||
                    header.style.visibility === 'hidden' ||
                    parseFloat(header.style.opacity) === 0
                );

                const loaderVisible = (
                    loadingContainer.style.display !== 'none' &&
                    loadingContainer.style.visibility !== 'hidden'
                );

                const animationStuck = window.animationStartTime &&
                    (Date.now() - window.animationStartTime > 8000) &&
                    !window.animationCompleted;

                if ((headerHidden && loaderVisible) || animationStuck) {
                    console.warn("Обнаружено потенциальное зависание интерфейса. Запуск восстановления...");
                    recoverInterface();
                }
            }
        } catch (e) {
            console.error("Ошибка в мониторе интерфейса:", e);
        }
    }, 10000);

    // Добавляем специальную обработку для кнопки эскейп (аварийное восстановление)
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            console.log("Нажата клавиша Escape - запуск восстановления интерфейса");
            recoverInterface();
        }
    });

    return monitorInterval;
}

// Запускаем монитор интерфейса при загрузке страницы
document.addEventListener('DOMContentLoaded', function () {
    const interfaceMonitor = setupInterfaceMonitor();
    console.log("Монитор интерфейса активирован");

    // Отслеживаем начало анимации
    const originalStartCalculationAnimation = window.startCalculationAnimation || function () { };
    window.startCalculationAnimation = function () {
        window.animationStartTime = Date.now();
        window.animationCompleted = false;
        originalStartCalculationAnimation.apply(this, arguments);
    };

    // Добавляем отслеживание изменений в форме калькулятора
    setupFormChangeTracking();
});

/**
 * Функция для отслеживания изменений в форме калькулятора
 */
function setupFormChangeTracking() {
    const calculatorForm = document.getElementById('calculatorForm');
    if (!calculatorForm) {
        console.error("Форма калькулятора не найдена");
        return;
    }

    // Получаем все поля ввода в форме
    const formInputs = calculatorForm.querySelectorAll('input, select, textarea');

    // Добавляем обработчик для каждого поля
    formInputs.forEach(input => {
        input.addEventListener('change', function () {
            // При изменении любого поля сбрасываем кеш рекомендаций и флаги
            lastRecommendationParams = null;
            recommendationsRequested = false;
            window.demoResultsShown = false;

            // Проверяем, является ли изменяемое поле одним из основных параметров
            const isKeyParam = ['foundationType', 'wallMaterial', 'roofType', 'floors', 'area'].includes(input.name);

            // Если изменяется один из ключевых параметров, полностью очищаем результаты
            if (isKeyParam) {
                logDebug("Изменен ключевой параметр расчета: " + input.name + ", полная очистка результатов");
                clearAllCalculationResults();
            }

            logDebug("Поле изменено, кеш рекомендаций и флаги сброшены: " + input.name);
        });
    });

    logDebug(`Отслеживание изменений настроено для ${formInputs.length} полей формы`);
}

/**
 * Отображает или скрывает индикатор загрузки рекомендаций
 * @param {Boolean} isLoading - Флаг загрузки
 */
function showLoadingState(isLoading) {
    const recommendationsContainer = document.querySelector('.ai-recommendations');
    const contentContainer = document.getElementById('ai-recommendations-content');

    if (!recommendationsContainer || !contentContainer) return;

    if (isLoading) {
        // Создаем и показываем индикатор загрузки
        const loader = document.createElement('div');
        loader.id = 'ai-recommendations-loader';
        loader.className = 'flex justify-center items-center py-6';
        loader.innerHTML = `
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
            <span class="ml-3 text-gray-700">Загружаем рекомендации...</span>
        `;

        // Сохраняем существующий контент, если он есть
        const existingContent = contentContainer.innerHTML;
        if (existingContent && !contentContainer.dataset.savedContent) {
            contentContainer.dataset.savedContent = existingContent;
        }

        contentContainer.innerHTML = '';
        contentContainer.appendChild(loader);
        recommendationsContainer.classList.remove('hidden');
    } else {
        // Удаляем индикатор загрузки если он есть
        const loader = document.getElementById('ai-recommendations-loader');
        if (loader) {
            loader.remove();
        }

        // Восстанавливаем контент только если нет нового контента
        if (contentContainer.children.length === 0 && contentContainer.dataset.savedContent) {
            contentContainer.innerHTML = contentContainer.dataset.savedContent;
            delete contentContainer.dataset.savedContent;
        }
    }
}

/**
 * Функция для полной очистки всех результатов и анимаций
 */
function clearAllCalculationResults() {
    // Сброс всех флагов
    lastRecommendationParams = null;
    recommendationsRequested = false;
    window.demoResultsShown = false;
    window.animationCompleted = false;
    window.newCalculationStarted = true;

    // Очистка контейнера с рекомендациями
    const recommendationsContainer = document.querySelector('.ai-recommendations');
    const contentContainer = document.getElementById('ai-recommendations-content');

    if (contentContainer) {
        contentContainer.innerHTML = '';
    }

    if (recommendationsContainer) {
        // Скрываем контейнер с рекомендациями до получения новых
        recommendationsContainer.classList.add('hidden');

        const heading = recommendationsContainer.querySelector('.ai-recommendations-title, h4, h3, h2');
        if (heading) {
            heading.textContent = 'Рекомендации ИИ-ассистента по строительству';
        }
    }

    // Сброс анимаций
    resetAnimation();

    // Очистка результатов расчета
    const foundationMaterials = document.getElementById('foundationMaterials');
    const wallMaterials = document.getElementById('wallMaterials');
    const roofMaterials = document.getElementById('roofMaterials');

    if (foundationMaterials) foundationMaterials.innerHTML = '';
    if (wallMaterials) wallMaterials.innerHTML = '';
    if (roofMaterials) roofMaterials.innerHTML = '';

    // Сброс заголовков результатов
    const foundationTitle = document.getElementById('foundation-title');
    const wallsTitle = document.getElementById('walls-title');
    const roofTitle = document.getElementById('roof-title');

    if (foundationTitle) foundationTitle.classList.add('opacity-0');
    if (wallsTitle) wallsTitle.classList.add('opacity-0');
    if (roofTitle) roofTitle.classList.add('opacity-0');

    // Сброс таймаутов
    if (recommendationRequestTimeout) {
        clearTimeout(recommendationRequestTimeout);
        recommendationRequestTimeout = null;
    }

    logDebug("Все результаты расчета и анимации очищены");
}