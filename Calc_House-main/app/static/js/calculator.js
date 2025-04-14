/**
 * calculator.js - Основной файл логики калькулятора строительных материалов
 */

// Переменная для хранения предыдущих параметров расчета
let lastCalculationParams = {};
// Счетчик расчетов для нумерации в печатной версии
let calculationCounter = 0;

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', function () {
    logDebug("DOM загружен. Инициализация калькулятора...");

    // Найдем форму и кнопку калькулятора
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

    // Обработчик отправки формы
    calculatorForm.addEventListener('submit', function (e) {
        e.preventDefault();
        logDebug("Форма отправлена!");

        // Получаем текущие параметры формы
        const currentParams = getFormParams(calculatorForm);

        // Проверяем, изменились ли параметры с последнего расчета
        const sameParams = areParamsEqual(currentParams, lastCalculationParams);

        // Сохраняем текущие параметры для будущих сравнений
        lastCalculationParams = { ...currentParams };

        // Анимация перехода от формы к результатам
        calculatorPanel.classList.remove('active');
        calculatorPanel.classList.add('hidden');
        resultsPanel.classList.remove('hidden');

        // Используем setTimeout для последовательной анимации
        setTimeout(() => {
            resultsPanel.classList.add('active');

            // Запускаем анимацию расчета и показываем результаты
            startCalculationAnimation();
        }, 50);
    });

    // Обработчик кнопки "Изменить параметры"
    if (recalcButton) {
        recalcButton.addEventListener('click', function () {
            logDebug("Кнопка 'Изменить параметры' нажата");

            // Анимация перехода от результатов к форме
            resultsPanel.classList.remove('active');
            resultsPanel.classList.add('hidden');

            // Используем setTimeout для последовательной анимации
            setTimeout(() => {
                calculatorPanel.classList.remove('hidden');
                calculatorPanel.classList.add('active');

                // Сбрасываем анимацию
                resetAnimation();
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

                logDebug("Запускаем последовательность анимации");
                // Запускаем анимацию из отдельного файла animations.js
                if (typeof startArchitecturalBoardAnimation === 'function') {
                    startArchitecturalBoardAnimation();
                } else {
                    console.error("Функция анимации не найдена");
                    showDemoResults();
                }
            } catch (error) {
                console.error("Ошибка при запуске анимации:", error);
                // В случае ошибки, показываем результаты без анимации
                showDemoResults();
            }
        }, 500);
    } else {
        console.error("Элемент анимации не найден");
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

    if (progressTracker) progressTracker.style.width = '0%';

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

    if (mathBoardContainer) {
        mathBoardContainer.innerHTML = '';
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

    logDebug("Анимация сброшена");
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

    container.innerHTML = '';

    items.forEach((item, index) => {
        const materialItem = document.createElement('div');
        materialItem.className = 'flex justify-between mb-2 material-item';
        materialItem.style.color = 'var(--results-text)';
        materialItem.style.transition = 'color var(--transition-speed) ease';
        materialItem.style.animationDelay = `${index * 150}ms`;

        const nameSpan = document.createElement('span');
        nameSpan.textContent = item.name;
        nameSpan.style.color = 'var(--results-text)';

        const valueSpan = document.createElement('span');
        valueSpan.className = 'font-semibold';
        valueSpan.textContent = `${item.quantity} ${item.unit}`;
        valueSpan.style.color = 'var(--results-value)';
        valueSpan.style.fontWeight = '600';

        materialItem.appendChild(nameSpan);
        materialItem.appendChild(valueSpan);

        container.appendChild(materialItem);

        // Запускаем анимацию появления с небольшой задержкой
        setTimeout(() => {
            materialItem.classList.add('visible');
        }, index * 150);
    });

    logDebug(`Заполнен раздел с ${items.length} элементами`);
}

/**
 * Глобальная функция для показа результатов
 */
window.showDemoResults = function () {
    logDebug("Вызвана функция showDemoResults");

    // Получаем элементы анимации
    const loadingAnimation = document.getElementById('loading-animation');

    // Скрываем анимацию
    if (loadingAnimation) {
        loadingAnimation.classList.add('hidden');
        logDebug("Анимация загрузки скрыта");
    }

    // Получаем параметры из формы
    const formData = new FormData(document.getElementById('calculatorForm'));
    const params = {};
    for (let [key, value] of formData.entries()) {
        params[key] = value;
    }

    // Расчет строительных материалов
    // Этот блок содержит всю бизнес-логику расчета количества материалов
    // (код расчетов сокращен для краткости, здесь представлен только принцип)

    // Базовые параметры дома
    const houseArea = parseFloat(params.area || 100); // Площадь дома, м²
    const floorHeight = parseFloat(params.floorHeight || 2.7); // Высота этажа, м
    const floors = parseInt(params.floors || 1); // Количество этажей

    // Рассчитываем периметр
    const houseSide = Math.sqrt(houseArea);
    const housePerimeter = houseSide * 4;

    // Расчет фундамента
    const foundationType = params.foundationType || 'strip';
    const concreteVolume = housePerimeter * 0.4 * 0.5 * 1.05; // Примерный расчет объема бетона
    const reinforcementWeight = concreteVolume * 70; // Примерный расчет веса арматуры
    const formworkArea = housePerimeter * 0.5 * 2; // Примерный расчет площади опалубки

    // Расчет стен
    const wallMaterial = params.wallMaterial || 'brick';
    const wallsHeight = floorHeight * floors;
    const wallsArea = housePerimeter * wallsHeight * 0.8; // с учетом 20% на проемы

    let wallsResult = { name: "Материал стен", quantity: 0, unit: "" };
    let mortarVolume = 0;

    switch (wallMaterial) {
        case 'brick':
            const brickCount = Math.ceil(wallsArea * 52); // Примерный расчет кол-ва кирпичей
            mortarVolume = (brickCount / 1000) * 0.25; // Примерный расчет объема раствора
            wallsResult = { name: "Кирпич рядовой", quantity: brickCount, unit: "шт." };
            break;
        case 'wood':
            const beamVolume = wallsArea * 0.2; // Примерный расчет объема дерева
            wallsResult = { name: "Брус", quantity: beamVolume.toFixed(1), unit: "м³" };
            break;
        case 'block':
            const blockCount = Math.ceil(wallsArea * 6.67); // Примерный расчет кол-ва блоков
            mortarVolume = wallsArea * 0.02; // Примерный расчет объема клея
            wallsResult = { name: "Газоблок", quantity: blockCount, unit: "шт." };
            break;
        case 'concrete':
            // Уже учтено в расчете фундамента
            wallsResult = { name: "Бетон B20", quantity: (wallsArea * 0.2).toFixed(1), unit: "м³" };
            break;
        case 'panel':
            const panelCount = Math.ceil(wallsArea / (1.2 * 2.8)); // Примерный расчет кол-ва панелей
            wallsResult = { name: "SIP-панели", quantity: panelCount, unit: "шт." };
            break;
    }

    // Расчет кровли
    const roofType = params.roofType || 'metal';
    const roofConstruction = params.roofConstruction || 'gable';
    const roofAngle = parseInt(params.roofAngle || 30);

    // Примерный расчет площади кровли
    const roofArea = houseArea * 1.2; // С учетом свесов и угла наклона
    const rafterCount = Math.ceil(housePerimeter / 1.2) + 2; // Примерный расчет кол-ва стропил

    let roofingMaterial = { name: "", quantity: 0, unit: "м²" };
    switch (roofType) {
        case 'metal':
            roofingMaterial = { name: "Металлочерепица", quantity: Math.ceil(roofArea * 1.1), unit: "м²" };
            break;
        case 'tile':
            roofingMaterial = { name: "Керамическая черепица", quantity: Math.ceil(roofArea * 1.15), unit: "м²" };
            break;
        case 'shingle':
            roofingMaterial = { name: "Гибкая черепица", quantity: Math.ceil(roofArea * 1.12), unit: "м²" };
            break;
        case 'slate':
            roofingMaterial = { name: "Шифер", quantity: Math.ceil(roofArea * 1.08), unit: "м²" };
            break;
        case 'flat':
            roofingMaterial = { name: "Рулонная кровля", quantity: Math.ceil(roofArea * 1.15), unit: "м²" };
            break;
    }

    // Количество крепежа
    const fastenerCount = Math.ceil(roofArea * 5); // Примерно 5 шт на м²

    // Данные для отображения результатов
    const calculatedData = {
        foundation: [
            { name: "Бетон B20", quantity: concreteVolume.toFixed(1), unit: "м³" },
            { name: "Арматура A400", quantity: Math.round(reinforcementWeight), unit: "кг" },
            { name: "Опалубка", quantity: Math.round(formworkArea), unit: "м²" }
        ],
        walls: [
            wallsResult,
            { name: "Раствор/клей", quantity: mortarVolume.toFixed(1), unit: "м³" },
            { name: "Утеплитель", quantity: Math.round(wallsArea), unit: "м²" }
        ],
        roof: [
            { name: "Стропила", quantity: rafterCount, unit: "шт." },
            roofingMaterial,
            { name: "Крепеж", quantity: fastenerCount, unit: "шт." }
        ]
    };

    logDebug(`Рассчитано материалов: Бетон: ${concreteVolume.toFixed(1)} м³, ${wallsResult.name}: ${wallsResult.quantity} ${wallsResult.unit}`);

    // Через небольшую задержку скрываем анимацию загрузки и показываем результаты
    setTimeout(() => {
        if (loadingAnimation) {
            loadingAnimation.classList.add('hidden');
            logDebug("Анимация загрузки скрыта");
        }

        // Проверяем наличие контейнеров для результатов
        const foundationMaterials = document.getElementById('foundationMaterials');
        const wallMaterials = document.getElementById('wallMaterials');
        const roofMaterials = document.getElementById('roofMaterials');

        // Анимация появления заголовков
        const foundationTitle = document.getElementById('foundation-title');
        const wallsTitle = document.getElementById('walls-title');
        const roofTitle = document.getElementById('roof-title');

        // Заполняем разделы с задержкой, как будто "разворачиваем" чертеж
        setTimeout(() => {
            if (foundationTitle) {
                foundationTitle.classList.remove('opacity-0');
                foundationTitle.classList.add('transition-opacity', 'duration-500');
            }
            fillSection(foundationMaterials, calculatedData.foundation);
            logDebug("Заполнен раздел фундамента");
        }, 300);

        setTimeout(() => {
            if (wallsTitle) {
                wallsTitle.classList.remove('opacity-0');
                wallsTitle.classList.add('transition-opacity', 'duration-500');
            }
            fillSection(wallMaterials, calculatedData.walls);
            logDebug("Заполнен раздел стен");
        }, 800);

        setTimeout(() => {
            if (roofTitle) {
                roofTitle.classList.remove('opacity-0');
                roofTitle.classList.add('transition-opacity', 'duration-500');
            }
            fillSection(roofMaterials, calculatedData.roof);
            logDebug("Заполнен раздел крыши");
        }, 1300);

        // Подготавливаем данные для печати
        preparePrintView();

    }, 1000);
};