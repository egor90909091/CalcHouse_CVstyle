/**
 * utils.js - Вспомогательные функции для калькулятора
 */

// Константа для включения/отключения отладки
const DEBUG = false;

/**
 * Функция для вывода отладочной информации
 * @param {string} message - Сообщение для вывода
 */
function logDebug(message) {
    if (!DEBUG) return;

    // Только выводим в консоль если отладка включена
    console.log(`[DEBUG] ${message}`);
}

/**
 * Проверка наличия DOM-элемента по ID
 * @param {string} id - ID элемента для проверки
 * @returns {HTMLElement|null} - Найденный элемент или null
 */
function checkElement(id) {
    const element = document.getElementById(id);
    logDebug(`Элемент #${id}: ${element ? 'найден' : 'НЕ НАЙДЕН'}`);
    return element;
}

/**
 * Форматирование числа как цены
 * @param {number} price - Числовое значение для форматирования
 * @returns {string} - Отформатированная строка с ценой
 */
function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU').format(Math.round(price));
}

/**
 * Функция для расчета площади и периметра
 * @param {number} area - Площадь дома в м²
 * @returns {Object} - Объект с рассчитанными значениями
 */
function calculateHouseDimensions(area) {
    // Предполагаем, что дом имеет квадратную форму
    const side = Math.sqrt(area);
    const perimeter = side * 4;

    return {
        side: side,
        perimeter: perimeter
    };
}

/**
 * Функция для создания HTML элемента с указанными атрибутами
 * @param {string} tagName - Имя HTML тега
 * @param {Object} attributes - Атрибуты элемента
 * @param {string|Array} content - Содержимое элемента (строка или массив дочерних элементов)
 * @returns {HTMLElement} - Созданный HTML элемент
 */
function createElement(tagName, attributes = {}, content = '') {
    const element = document.createElement(tagName);

    // Устанавливаем атрибуты
    for (const [key, value] of Object.entries(attributes)) {
        if (key === 'style' && typeof value === 'object') {
            Object.assign(element.style, value);
        } else if (key === 'className') {
            element.className = value;
        } else if (key === 'dataset' && typeof value === 'object') {
            for (const [dataKey, dataValue] of Object.entries(value)) {
                element.dataset[dataKey] = dataValue;
            }
        } else {
            element.setAttribute(key, value);
        }
    }

    // Добавляем содержимое
    if (typeof content === 'string') {
        element.textContent = content;
    } else if (Array.isArray(content)) {
        content.forEach(child => {
            if (child instanceof HTMLElement) {
                element.appendChild(child);
            }
        });
    }

    return element;
}

/**
 * Плавное скрытие элемента
 * @param {HTMLElement} element - Элемент для скрытия
 * @param {number} duration - Длительность анимации в мс
 * @param {Function} callback - Функция обратного вызова после скрытия
 */
function fadeOut(element, duration = 300, callback = null) {
    if (!element) return;

    // Сохраняем начальную непрозрачность
    const startOpacity = parseFloat(window.getComputedStyle(element).opacity);

    // Создаем анимацию
    let start = null;
    function animate(timestamp) {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const opacity = Math.max(startOpacity - (progress / duration * startOpacity), 0);

        element.style.opacity = opacity;

        if (progress < duration) {
            requestAnimationFrame(animate);
        } else {
            element.style.display = 'none';
            if (typeof callback === 'function') callback();
        }
    }

    requestAnimationFrame(animate);
}

/**
 * Плавное отображение элемента
 * @param {HTMLElement} element - Элемент для отображения
 * @param {number} duration - Длительность анимации в мс
 * @param {Function} callback - Функция обратного вызова после отображения
 */
function fadeIn(element, duration = 300, callback = null) {
    if (!element) return;

    // Устанавливаем начальную непрозрачность и отображение
    element.style.opacity = '0';
    element.style.display = '';

    // Создаем анимацию
    let start = null;
    function animate(timestamp) {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const opacity = Math.min(progress / duration, 1);

        element.style.opacity = opacity;

        if (progress < duration) {
            requestAnimationFrame(animate);
        } else {
            if (typeof callback === 'function') callback();
        }
    }

    requestAnimationFrame(animate);
}

/**
 * Преобразует DTO объекты из API в формат для отображения
 * @param {Object} apiResponse - Ответ от API
 * @returns {Object} - Объект для отображения
 */
function mapApiResponseToViewModel(apiResponse) {
    // Функция для преобразования данных от API в формат для отображения
    // Например, можно изменить названия полей, форматировать значения и т.д.

    if (!apiResponse) return null;

    const result = {
        foundation: [],
        walls: [],
        roof: []
    };

    // Предполагаем, что API вернуло breakdown - разбивку по категориям
    if (apiResponse.breakdown) {
        // Проходим по всем категориям
        apiResponse.breakdown.forEach(category => {
            switch (category.category.toLowerCase()) {
                case 'фундамент':
                    category.items.forEach(item => {
                        result.foundation.push({
                            name: item.name,
                            quantity: item.quantity,
                            unit: item.unit
                        });
                    });
                    break;
                case 'стены':
                    category.items.forEach(item => {
                        result.walls.push({
                            name: item.name,
                            quantity: item.quantity,
                            unit: item.unit
                        });
                    });
                    break;
                case 'кровля':
                    category.items.forEach(item => {
                        result.roof.push({
                            name: item.name,
                            quantity: item.quantity,
                            unit: item.unit
                        });
                    });
                    break;
            }
        });
    }

    return result;
}