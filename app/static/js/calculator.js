/**
 * Упрощенный calculator.js - Отправляет данные в Python и управляет UI
 */



/**
 * Глобальные переменные
 */
let lastCalculationParams = {};
let animationCompleted = false;

/**
 * Сохраняет параметры калькулятора в localStorage
 */
function updateCalculatorParams() {
    // Проверяем, что форма существует
    const form = document.getElementById('calculatorForm');
    if (!form) return;

    try {
        // Собираем данные формы
        const formData = new FormData(form);
        const params = {};

        // Преобразуем FormData в объект
        for (let [key, value] of formData.entries()) {
            params[key] = value;
        }

        // Получаем состояние видимости блоков арматуры
        const rebarParamsBlocks = document.querySelectorAll('[id$="-params"]');
        rebarParamsBlocks.forEach(block => {
            const id = block.id;
            params[`${id}_visible`] = block.style.display !== 'none';
        });

        // Сохраняем параметры в localStorage
        localStorage.setItem('calculatorParams', JSON.stringify(params));

        console.log("Параметры калькулятора сохранены");
    } catch (error) {
        console.error("Ошибка при сохранении параметров:", error);
    }
}

/**
 * Функция для обновления статуса анимации
 * Будет вызываться из animations.js
 */
window.updateAnimationStatus = function (status) {
    console.log("Обновление статуса анимации:", status);
    animationCompleted = status;
};
/**
 * Сохраняет параметры калькулятора в localStorage
 */
function updateCalculatorParams() {
    // Проверяем, что форма существует
    const form = document.getElementById('calculatorForm');
    if (!form) return;

    try {
        // Собираем данные формы
        const formData = new FormData(form);
        const params = {};

        // Преобразуем FormData в объект
        for (let [key, value] of formData.entries()) {
            params[key] = value;
        }

        // Получаем состояние видимости блоков арматуры
        const rebarParamsBlocks = document.querySelectorAll('[id$="-params"]');
        rebarParamsBlocks.forEach(block => {
            const id = block.id;
            params[`${id}_visible`] = block.style.display !== 'none';
        });

        // Сохраняем параметры в localStorage
        localStorage.setItem('calculatorParams', JSON.stringify(params));

        console.log("Параметры калькулятора сохранены");
    } catch (error) {
        console.error("Ошибка при сохранении параметров:", error);
    }
}

/**
 * Функция для обновления статуса анимации
 * Будет вызываться из animations.js
 */
window.updateAnimationStatus = function (status) {
    console.log("Обновление статуса анимации:", status);
    animationCompleted = status;
};
/**
 * Функция для обновления статуса анимации
 * Будет вызываться из animations.js
 */
window.updateAnimationStatus = function (status) {
    console.log("Обновление статуса анимации:", status);
    animationCompleted = status;
};

// При загрузке DOM
document.addEventListener('DOMContentLoaded', function () {
    console.log("DOM загружен. Инициализация калькулятора...");

    // Инициализация переключателей
    initializeSwitchers();

    // Инициализация формы
    setupForm();

    // Инициализация обработчиков для дополнительных параметров стен
    initCalculator();

    // Установка значений из URL, если они есть
    loadFormValues();

    // Инициализация блока перекрытий, если выбрано больше 1 этажа
    const floorsSelect = document.getElementById('floorsSelect');
    if (floorsSelect && parseInt(floorsSelect.value) > 1) {
        const floorTypeSelect = document.getElementById('floorType');
        if (floorTypeSelect && floorTypeSelect.value) {
            switchFloorParams(floorTypeSelect.value);
        }
    }
});

/**
 * Инициализирует все переключатели на странице
 */
function initializeSwitchers() {
    // Инициализация переключателя стен
    const wallMaterialSelect = document.getElementById('wallMaterial');
    if (wallMaterialSelect) {
        wallMaterialSelect.addEventListener('change', function () {
            switchWallParams(this.value);
        });
        // Вызываем сразу для установки начального состояния
        switchWallParams(wallMaterialSelect.value);
    }

    // Инициализация переключателя фундамента
    const foundationTypeSelect = document.getElementById('foundationType');
    if (foundationTypeSelect) {
        // Сначала устанавливаем начальное состояние без обработчика события
        // чтобы избежать дублирования с setupFormChangeListeners
        switchFoundationParams(foundationTypeSelect.value);
    }

    // Инициализация переключателей арматуры (шестеренки)
    const rebarToggles = document.querySelectorAll('.rebar-toggle');
    rebarToggles.forEach(toggle => {
        toggle.addEventListener('click', function () {
            // Получаем ID соответствующего блока параметров арматуры
            const toggleId = this.id;
            const paramsId = toggleId.replace('-toggle', '-params');
            const paramsBlock = document.getElementById(paramsId);

            if (paramsBlock) {
                // Показываем или скрываем блок параметров
                if (paramsBlock.style.display === 'none') {
                    paramsBlock.style.display = 'grid';
                } else {
                    paramsBlock.style.display = 'none';
                }

                // Сохраняем состояние в localStorage
                updateCalculatorParams();
            }
        });
    });

    // Инициализация переключателя количества этажей
    const floorsSelect = document.getElementById('floorsSelect');
    if (floorsSelect) {
        floorsSelect.addEventListener('change', function () {
            const floors = parseInt(this.value);
            const floorTypeContainer = document.getElementById('floorTypeContainer');

            if (floorTypeContainer) {
                floorTypeContainer.style.display = floors > 1 ? 'block' : 'none';

                // Если выбрано больше 1 этажа, инициализируем параметры перекрытий
                if (floors > 1) {
                    const floorTypeSelect = document.getElementById('floorType');
                    if (floorTypeSelect && floorTypeSelect.value) {
                        switchFloorParams(floorTypeSelect.value);
                    }
                } else {
                    // Скрываем параметры перекрытий, если выбран 1 этаж
                    const floorParamsContainer = document.getElementById('floorParams');
                    if (floorParamsContainer) {
                        floorParamsContainer.style.display = 'none';
                    }
                }
            }
        });
        // Вызываем сразу для установки начального состояния
        floorsSelect.dispatchEvent(new Event('change'));
    }

    // Инициализация переключателя типа пола
    const floorTypeSelect = document.getElementById('floorType');
    if (floorTypeSelect) {
        floorTypeSelect.addEventListener('change', function () {
            switchFloorParams(this.value);
        });
        // Вызываем сразу для установки начального состояния
        if (floorTypeSelect.value) {
            switchFloorParams(floorTypeSelect.value);
        }
    }

    // Инициализация переключателя кровли
    const roofTypeSelect = document.getElementById('roofType');
    if (roofTypeSelect) {
        roofTypeSelect.addEventListener('change', function () {
            switchRoofParams(this.value);
        });
        // Вызываем сразу для установки начального состояния
        switchRoofParams(roofTypeSelect.value);
    }

    // Обработчик для переключения толщины панелей
    const panelType = document.getElementById('panelType');
    if (panelType) {
        panelType.addEventListener('change', function () {
            // Скрываем все выпадающие списки толщины
            document.querySelectorAll('.panel-thickness').forEach(el => {
                el.classList.add('hidden');
            });

            // Показываем соответствующий выпадающий список в зависимости от типа панели
            if (this.value === 'sip_panels') {
                document.getElementById('sipThickness').classList.remove('hidden');
            } else if (this.value === 'concrete_panels') {
                document.getElementById('concreteThickness').classList.remove('hidden');
            } else if (this.value === 'sandwich_panels') {
                document.getElementById('sandwichThickness').classList.remove('hidden');
            }
        });
    }

    // Вызываем событие изменения для инициализации правильных элементов
    if (roofTypeSelect) {
        roofTypeSelect.dispatchEvent(new Event('change'));
    }

    // Инициализируем панели с правильными выпадающими списками
    if (panelType) {
        panelType.dispatchEvent(new Event('change'));
    }
}

/**
 * Переключает видимость параметров в зависимости от типа стен
 */
function switchWallParams(wallType) {
    console.log("Переключение на тип стен:", wallType);

    // Сначала скрываем все блоки параметров стен (удаляем любые классы, которые могут включать отображение)
    document.querySelectorAll('.wall-params').forEach(div => {
        console.log("Скрываю блок:", div.className);
        div.style.display = 'none';
        div.classList.add('hidden');
    });

    // Собираем все возможные селекторы для разных типов стен
    const selectors = [
        `.wall-params.${wallType}-params`,
        `#${wallType}Params`,
        `.${wallType}-walls-section`
    ];

    // Проходим по селекторам и пытаемся найти целевой блок
    let targetFound = false;
    for (const selector of selectors) {
        const targetBlock = document.querySelector(selector);
        if (targetBlock) {
            console.log("Найден целевой блок по селектору:", selector);
            targetBlock.style.display = 'block';
            targetBlock.classList.remove('hidden');
            targetFound = true;

            // После отображения блока параметров, убедимся что вложенные элементы тоже видны
            const nestedParams = targetBlock.querySelectorAll('select, input');
            if (nestedParams.length > 0) {
                console.log(`Найдено ${nestedParams.length} вложенных параметров`);
            }

            break;
        }
    }

    if (!targetFound) {
        console.warn("⚠️ Не найден блок параметров для типа стен:", wallType);
        console.warn("Доступные блоки стен:");
        document.querySelectorAll('.wall-params').forEach(div => {
            console.warn(" - " + div.className);
        });
    }

    // Вызываем обработчики для новых параметров
    if (typeof setupWallMaterialsHandlers === 'function') {
        setupWallMaterialsHandlers();
    }
}

/**
 * Переключает видимость параметров в зависимости от типа фундамента
 */
function switchFoundationParams(foundationType) {
    // Скрываем все типы фундаментов
    document.querySelectorAll('.foundation-type').forEach(div => {
        div.style.display = 'none';
    });

    // Показываем только выбранный тип
    const targetElement = document.getElementById(`${foundationType}Foundation`);
    if (targetElement) {
        targetElement.style.display = 'block';
    }
}

/**
 * Переключает видимость параметров в зависимости от типа пола
 */
function switchFloorParams(floorType) {
    const floorParamsContainer = document.getElementById('floorParams');
    const concreteParams = document.getElementById('concrete-floor-params');
    const slabParams = document.getElementById('slab-floor-params');

    // Показываем основной контейнер параметров перекрытий
    if (floorParamsContainer) {
        floorParamsContainer.style.display = 'block';
    }

    // Скрываем все блоки параметров
    [concreteParams, slabParams].forEach(block => {
        if (block) block.style.display = 'none';
    });

    // Показываем нужный блок параметров
    switch (floorType) {
        case 'concrete':
            if (concreteParams) {
                concreteParams.style.display = 'grid';
                updateConcreteFloorOptions();
            }
            break;
        case 'slab':
            if (slabParams) {
                slabParams.style.display = 'grid';
            }
            break;
    }
}

function updateConcreteFloorOptions() {
    const spanLength = document.getElementById('concrete-floor-span');
    const thickness = document.getElementById('concrete-floor-thickness');

    if (spanLength && thickness) {
        spanLength.addEventListener('change', function () {
            const span = parseFloat(this.value);
            if (span <= 4) {
                thickness.value = '180';
            } else {
                thickness.value = '200';
            }
        });
    }
}

/**
 * Переключает видимость параметров в зависимости от типа кровли
 */
function switchRoofParams(roofType) {
    // Скрываем все параметры кровли
    document.querySelectorAll('.roof-params').forEach(div => {
        div.classList.add('hidden');
    });

    // Показываем только выбранный тип
    const targetElement = document.querySelector(`.roof-params.${roofType}-params`);
    if (targetElement) {
        targetElement.classList.remove('hidden');
    }

    // Устанавливаем значение типа материала кровли
    const roofMaterialInput = document.querySelector('input[name="roofMaterial"]');
    if (roofMaterialInput) {
        roofMaterialInput.value = roofType === 'flat' ? 'membrane' : roofType;
    }
}

/**
 * Настраивает форму калькулятора
 */
function setupForm() {
    // Находим форму калькулятора
    const calculatorForm = document.getElementById('calculatorForm');

    // Если форма найдена, добавляем обработчик события отправки
    if (calculatorForm) {
        calculatorForm.addEventListener('submit', function (e) {
            e.preventDefault();

            // Если форма уже отправляется, не отправляем повторно
            if (window.isFormSubmitting) {
                return false;
            }

            // Устанавливаем флаг отправки формы
            window.isFormSubmitting = true;

            // Запускаем расчет
            handleFormSubmit(e)
                .finally(() => {
                    // После завершения обработки снимаем флаг
                    setTimeout(() => {
                        window.isFormSubmitting = false;
                    }, 1000);
                });
        });
    }

    // Настраиваем кнопки управления результатами
    setupResultButtons();
}

/**
 * Настраивает кнопки управления результатами
 */
function setupResultButtons() {
    // Обработчик для кнопки "Изменить параметры"
    const recalcButton = document.getElementById('recalcButton');
    if (recalcButton) {
        recalcButton.addEventListener('click', function () {
            // Скрываем результаты, показываем форму
            const resultsPanel = document.querySelector('.results-panel');
            const calculatorPanel = document.querySelector('.calculator-panel');

            if (resultsPanel && calculatorPanel) {
                resultsPanel.classList.add('hidden');
                resultsPanel.classList.remove('active');
                calculatorPanel.classList.remove('hidden');
                calculatorPanel.classList.add('active');

                // Сохраняем состояние интерфейса (показываем форму)
                localStorage.setItem('calculatorUiState', 'form');

                // Прокручиваем к форме
                calculatorPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }

    // Обработчик для кнопки "Распечатать результаты"
    const printButton = document.getElementById('printButton');
    if (printButton) {
        printButton.addEventListener('click', function () {
            preparePrintView();
            window.print();
        });
    }
}

/**
 * Загружает значения формы из URL или localStorage
 */
function loadFormValues() {
    // Очищаем все параметры фундамента перед загрузкой сохраненных значений
    document.querySelectorAll('.foundation-type').forEach(div => {
        div.style.display = 'none';
    });

    // Загружаем из localStorage
    const savedParams = localStorage.getItem('calculatorParams');
    // Проверяем, есть ли сохраненное состояние интерфейса
    const savedUiState = localStorage.getItem('calculatorUiState');

    if (savedParams) {
        try {
            const params = JSON.parse(savedParams);

            // Важно: сначала устанавливаем тип фундамента и переключаем связанные поля
            if (params.foundationType) {
                const foundationTypeSelect = document.getElementById('foundationType');
                if (foundationTypeSelect) {
                    foundationTypeSelect.value = params.foundationType;
                    switchFoundationParams(params.foundationType);
                    console.log("Восстановлен тип фундамента:", params.foundationType);
                }
            }

            // Затем применяем все остальные значения
            applyFormValues(params);

            // Если есть сохраненное состояние UI и оно указывает на то, что должны отображаться результаты
            if (savedUiState === 'results') {
                // Асинхронно восстанавливаем результаты
                setTimeout(() => {
                    restoreCalculationResults(params);
                }, 100);
            }
        } catch (e) {
            console.error("Ошибка при загрузке из localStorage:", e);
        }
    }

    // Загружаем из URL (имеет приоритет над localStorage)
    const queryString = window.location.search;
    if (queryString) {
        const urlParams = new URLSearchParams(queryString);
        const params = {};

        urlParams.forEach((value, key) => {
            params[key] = value;
        });

        // Важно: сначала устанавливаем тип фундамента и переключаем связанные поля
        if (params.foundationType) {
            const foundationTypeSelect = document.getElementById('foundationType');
            if (foundationTypeSelect) {
                foundationTypeSelect.value = params.foundationType;
                switchFoundationParams(params.foundationType);
            }
        }

        // Затем применяем все остальные значения
        applyFormValues(params);
    }
}

/**
 * Применяет значения к форме
 */
function applyFormValues(params) {
    const form = document.getElementById('calculatorForm');
    if (!form) return;

    // Временно отключаем автоматическое переключение для select элементов
    const disableAutoSwitch = true;

    for (const [key, value] of Object.entries(params)) {
        const element = form.elements[key];
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = value === true || value === 'true';
            } else if (element.type === 'radio') {
                const radioOptions = form.querySelectorAll(`input[name="${key}"]`);
                radioOptions.forEach(radio => {
                    radio.checked = radio.value === value;
                });
            } else {
                element.value = value;
            }

            // Вызываем событие change для select-элементов, кроме foundationType
            // который уже был обработан в loadFormValues
            if (element.tagName === 'SELECT' && key !== 'foundationType' && !disableAutoSwitch) {
                element.dispatchEvent(new Event('change'));
            }
        }
    }

    // Применение дополнительных параметров для деревянных стен
    if (params.wallMaterial === 'wood') {
        // Применение новых параметров для деревянных стен
        if (params.woodInsulationType && document.querySelector('[name="woodInsulationType"]')) {
            document.querySelector('[name="woodInsulationType"]').value = params.woodInsulationType;
        }

        if (params.woodInterlayer && document.querySelector('[name="woodInterlayer"]')) {
            document.querySelector('[name="woodInterlayer"]').value = params.woodInterlayer;
        }

        if (params.woodTreatment && document.querySelector('[name="woodTreatment"]')) {
            document.querySelector('[name="woodTreatment"]').value = params.woodTreatment;
        }
    } else if (params.wallMaterial === 'block') {
        // Применение новых параметров для блочных стен
        if (params.blockAdhesiveType && document.querySelector('[name="blockAdhesiveType"]')) {
            document.querySelector('[name="blockAdhesiveType"]').value = params.blockAdhesiveType;
        }

        if (params.blockInsulationType && document.querySelector('[name="blockInsulationType"]')) {
            document.querySelector('[name="blockInsulationType"]').value = params.blockInsulationType;
        }

        if (params.blockReinforcement && document.querySelector('[name="blockReinforcement"]')) {
            document.querySelector('[name="blockReinforcement"]').value = params.blockReinforcement;
        }
    } else if (params.wallMaterial === 'panel') {
        // Применение новых параметров для панельных стен
        if (params.panelMountingType && document.querySelector('[name="panelMountingType"]')) {
            document.querySelector('[name="panelMountingType"]').value = params.panelMountingType;
        }

        if (params.panelSealantType && document.querySelector('[name="panelSealantType"]')) {
            document.querySelector('[name="panelSealantType"]').value = params.panelSealantType;
        }

        if (params.panelJointInsulation && document.querySelector('[name="panelJointInsulation"]')) {
            document.querySelector('[name="panelJointInsulation"]').value = params.panelJointInsulation;
        }
    }

    // Восстанавливаем состояние видимости блоков арматуры
    for (const [key, value] of Object.entries(params)) {
        if (key.endsWith('_visible')) {
            const blockId = key.replace('_visible', '');
            const block = document.getElementById(blockId);
            if (block) {
                block.style.display = value === 'true' || value === true ? 'grid' : 'none';
            }
        }
    }
}

/**
 * Обрабатывает отправку формы с правильным сбросом предыдущих результатов
 */
async function handleFormSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const params = {};

    // Собираем данные формы
    for (let [key, value] of formData.entries()) {
        params[key] = value;
    }

    // Добавление выбранной толщины панели в зависимости от типа
    if (params.wallMaterial === 'panel') {
        const panelType = params.panelType || 'sip_panels';

        if (panelType === 'sip_panels' && document.getElementById('sipThickness')) {
            params.thickness = document.getElementById('sipThickness').value;
        } else if (panelType === 'concrete_panels' && document.getElementById('concreteThickness')) {
            params.thickness = document.getElementById('concreteThickness').value;
        } else if (panelType === 'sandwich_panels' && document.getElementById('sandwichThickness')) {
            params.thickness = document.getElementById('sandwichThickness').value;
        }
    }

    // Сохраняем параметры 
    lastCalculationParams = params;
    localStorage.setItem('calculatorParams', JSON.stringify(params));

    // Сохраняем состояние интерфейса (показываем результаты)
    localStorage.setItem('calculatorUiState', 'results');

    // Проверяем обязательные поля
    if (!params.area) {
        alert("Пожалуйста, укажите площадь дома");
        return;
    }

    // Переключаемся на панель результатов
    switchToResultsPanel();

    // НОВОЕ: Предварительно очищаем все секции с результатами
    clearAllResults();

    // Затем запускаем анимацию
    startCalculationAnimation();

    // Устанавливаем минимальную продолжительность анимации (не менее 4 секунд)
    const animationStartTime = Date.now();
    const minAnimationDuration = 4000; // 4 секунды

    try {
        // Запускаем получение данных параллельно с анимацией
        const dataPromise = fetchDetailedMaterials(params);

        // Ждем одновременно завершения анимации и получения данных
        const [data] = await Promise.all([
            dataPromise,
            waitForAnimationComplete()
        ]);

        // Обеспечиваем минимальное время для отображения анимации
        const elapsedTime = Date.now() - animationStartTime;
        if (elapsedTime < minAnimationDuration) {
            await new Promise(resolve => setTimeout(resolve, minAnimationDuration - elapsedTime));
        }

        // Показываем результаты расчета
        showDetailedResults(data, params);

        // Показываем рекомендации ИИ
        setTimeout(() => {
            showAIRecommendations(params);
        }, 1000);
    } catch (error) {
        console.error("Ошибка при получении данных:", error);
        alert(`Ошибка при расчете: ${error.message}`);
        resetAnimation();
    }
}

/**
 * Очищает все предыдущие результаты перед новым расчетом
 */
function clearAllResults() {
    // Очистка результатов по категориям
    const containers = [
        document.getElementById('foundationMaterials'),
        document.getElementById('wallMaterials'),
        document.getElementById('roofMaterials'),
        document.getElementById('floorMaterials'),
        document.getElementById('ai-recommendations-content')
    ];

    containers.forEach(container => {
        if (container) {
            container.innerHTML = '';
        }
    });

    // Скрываем заголовки до появления новых результатов
    const titles = [
        document.getElementById('foundation-title'),
        document.getElementById('walls-title'),
        document.getElementById('roof-title'),
        document.getElementById('floors-title')
    ];

    titles.forEach(title => {
        if (title) {
            title.style.opacity = '0';
        }
    });

    // Удаляем блок с общей стоимостью
    const totalCostBlock = document.getElementById('total-cost-block');
    if (totalCostBlock) {
        totalCostBlock.remove();
    }

    // Также удаляем любые видимые элементы материалов
    const visibleItems = document.querySelectorAll('.material-item.visible');
    visibleItems.forEach(item => {
        item.classList.remove('visible');
    });

    // Удаляем все строки результатов
    const allMaterialItems = document.querySelectorAll('.material-item');
    allMaterialItems.forEach(item => {
        item.remove();
    });
}

/**
 * Переключается на панель результатов и сбрасывает предыдущие результаты
 */
function switchToResultsPanel() {
    const calculatorPanel = document.querySelector('.calculator-panel');
    const resultsPanel = document.querySelector('.results-panel');

    if (calculatorPanel && resultsPanel) {
        calculatorPanel.classList.add('hidden');
        calculatorPanel.classList.remove('active');
        resultsPanel.classList.remove('hidden');
        resultsPanel.classList.add('active');

        // Прокручиваем к панели результатов
        resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * Вспомогательная функция для ожидания завершения анимации
 */
function waitForAnimationComplete() {
    return new Promise(resolve => {
        const checkAnimation = () => {
            if (animationCompleted) {
                resolve();
            } else {
                setTimeout(checkAnimation, 300);
            }
        };
        checkAnimation();
    });
}

/**
 * Запускает анимацию расчета
 */
function startCalculationAnimation() {
    const loadingAnimation = document.getElementById('loading-animation');
    if (!loadingAnimation) return;

    // Показываем контейнер анимации
    loadingAnimation.style.display = 'block';
    loadingAnimation.style.visibility = 'visible';
    loadingAnimation.style.opacity = '1';
    loadingAnimation.style.zIndex = '1000';

    // Проверяем наличие контейнера доски
    let mathBoardContainer = document.getElementById('mathBoardContainer');
    if (!mathBoardContainer) {
        mathBoardContainer = document.createElement('div');
        mathBoardContainer.id = 'mathBoardContainer';
        mathBoardContainer.className = 'math-board-container';
        loadingAnimation.appendChild(mathBoardContainer);
    }

    // Сбрасываем флаг завершения анимации
    window.animationCompleted = false;
    animationCompleted = false;

    // Запускаем анимацию с небольшой задержкой
    setTimeout(() => {
        try {
            if (typeof window.startArchitecturalBoardAnimation === 'function') {
                window.startArchitecturalBoardAnimation();
            } else {
                throw new Error("Функция анимации не найдена");
            }
        } catch (error) {
            console.error("Ошибка при запуске анимации:", error);
            window.animationCompleted = true;
            animationCompleted = true;
        }

        // Запасной таймер на случай зависания анимации
        setTimeout(() => {
            if (!animationCompleted) {
                console.log("Принудительное завершение анимации после таймаута безопасности");
                window.animationCompleted = true;
                animationCompleted = true;
            }
        }, 7000); // Увеличено с 6000 до 7000 мс, чтобы дать анимации больше времени
    }, 300);
}

/**
 * Сбрасывает анимацию расчета
 */
function resetAnimation() {
    // Сбрасываем флаг завершения анимации
    animationCompleted = true;

    // Скрываем контейнер анимации
    const loadingAnimation = document.getElementById('loading-animation');
    if (loadingAnimation) {
        loadingAnimation.style.display = 'none';
    }

    // Очищаем формулы
    const formulasArea = document.getElementById('formulas-area');
    if (formulasArea) {
        formulasArea.innerHTML = '';
    }

    // Сбрасываем прогресс
    const progressTracker = document.getElementById('progress-tracker');
    if (progressTracker) {
        progressTracker.style.width = '0%';
    }
}

/**
 * Получает данные о материалах с сервера Python
 */
async function fetchDetailedMaterials(params) {
    const response = await fetch('/api/form-calculate-materials', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
        timeout: 10000 // 10 секунд таймаут
    });

    if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

/**
 * Отображает результаты расчета
 */
function showDetailedResults(data, params) {
    // Скрываем анимацию
    const loadingAnimation = document.getElementById('loading-animation');
    if (loadingAnimation) {
        loadingAnimation.style.display = 'none';
    }

    // Устанавливаем текущую дату расчета
    setCurrentDate();

    // Заполняем разделы результатов
    fillResultSections(data);
}

/**
 * Устанавливает текущую дату расчета
 */
function setCurrentDate() {
    // Текущая дата
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('ru-RU');
    console.log("Установка даты расчета:", formattedDate);

    // Установка даты 
    const printDateElement = document.getElementById('print-date');
    if (printDateElement) {
        printDateElement.textContent = formattedDate;
    } else {
        console.warn("Элемент print-date не найден");
    }

    // Добавляем атрибут даты к контейнеру результатов
    const resultsElement = document.getElementById('results');
    if (resultsElement) {
        resultsElement.setAttribute('data-print-date', formattedDate);
    }
}

/**
 * Заполняет разделы результатов
 */
function fillResultSections(data) {
    // Получаем контейнеры
    const foundationContainer = document.getElementById('foundationMaterials');
    const wallsContainer = document.getElementById('wallMaterials');
    const roofContainer = document.getElementById('roofMaterials');
    const floorsContainer = document.getElementById('floorMaterials');

    // Получаем заголовки
    const foundationTitle = document.getElementById('foundation-title');
    const wallsTitle = document.getElementById('walls-title');
    const roofTitle = document.getElementById('roof-title');
    const floorsTitle = document.getElementById('floors-title');

    // Проверяем наличие контейнеров
    if (!foundationContainer || !wallsContainer || !roofContainer) {
        console.error("Контейнеры для результатов не найдены");
        return;
    }

    // Очищаем контейнеры
    foundationContainer.innerHTML = '';
    wallsContainer.innerHTML = '';
    roofContainer.innerHTML = '';
    if (floorsContainer) {
        floorsContainer.innerHTML = '';
    }

    // Подготавливаем данные
    const materials = data.materials || data;

    // Заполняем секции
    fillSection(foundationContainer, materials.foundation);
    fillSection(wallsContainer, materials.walls);
    fillSection(roofContainer, materials.roof);

    // Показываем заголовки
    if (foundationTitle) foundationTitle.style.opacity = '1';
    if (wallsTitle) wallsTitle.style.opacity = '1';
    if (roofTitle) roofTitle.style.opacity = '1';

    // Заполняем межэтажные перекрытия, если есть
    if (floorsContainer && materials.floors && materials.floors.length > 0) {
        fillSection(floorsContainer, materials.floors);
        // Показываем заголовок для межэтажных перекрытий
        if (floorsTitle) floorsTitle.style.opacity = '1';
    } else {
        // Скрываем заголовок, если данных нет
        if (floorsTitle) floorsTitle.style.opacity = '0';
    }

    // Отображаем общую стоимость
    displayTotalCost(data.total_cost || 0);
}

/**
 * Заполняет раздел данными из ответа API
 */
function fillSection(container, items) {
    if (!container || !items || items.length === 0) return;

    // Проверяем, является ли устройство мобильным
    const isMobile = window.innerWidth <= 576;
    const isVerySmall = window.innerWidth <= 375;

    // Добавляем заголовки столбцов с более короткими названиями для мобильных
    const headerRow = document.createElement('div');
    headerRow.className = 'grid grid-cols-4 gap-2 mb-3 font-semibold material-header';

    // Добавляем класс для мобильных устройств
    if (isVerySmall) {
        // Сверхкороткие заголовки для очень маленьких экранов
        headerRow.classList.add('mobile-header');
        headerRow.innerHTML = `
    <div>Название</div>
    <div class="text-right">Кол.</div>
    <div class="text-right">₽/ед</div>
    <div class="text-right">Итого</div>
`;
    } else if (isMobile) {
        // Сокращенные заголовки для мобильных
        headerRow.classList.add('mobile-header');
        headerRow.innerHTML = `
    <div>Наименование</div>
    <div class="text-right">Кол-во</div>
    <div class="text-right">Цена</div>
    <div class="text-right">Сумма</div>
`;
    } else {
        // Полные заголовки для десктопов
        headerRow.innerHTML = `
    <div>Наименование</div>
    <div class="text-right">Количество</div>
    <div class="text-right">Цена за ед.</div>
    <div class="text-right">Стоимость</div>
`;
    }

    container.appendChild(headerRow);

    // Добавляем материалы
    let sectionTotal = 0;

    // Проверка на наличие дополнительных деталей расчета
    let hasCalculationDetails = false;
    let calculationDetailsHtml = '';

    // Ищем первый элемент, у которого есть детальная информация о расчетах
    for (const item of items) {
        if (item.detail && item.detail.includes('Расчет:')) {
            hasCalculationDetails = true;
            calculationDetailsHtml += `<div class="calculation-detail">${item.detail}</div>`;
        }
        if (item.calculation_details) {
            hasCalculationDetails = true;
            const details = item.calculation_details;

            if (details.type === 'concrete') {
                calculationDetailsHtml += `
                <div class="calculation-details-box p-3 bg-gray-50 dark:bg-gray-800 rounded-lg my-3">
                    <h5 class="font-semibold mb-2">Детали расчета монолитного перекрытия:</h5>
                    <ul class="list-disc list-inside space-y-1 pl-2">
                        <li>Площадь перекрытий: ${details.area.toFixed(2)} м²</li>
                        <li>Толщина плиты: ${details.thickness * 1000} мм</li>
                        <li>Объем бетона: ${details.concrete_volume.toFixed(2)} м³</li>
                        <li>Расход арматуры: ${details.rebar_weight.toFixed(2)} т (${(details.rebar_weight * 1000).toFixed(0)} кг)</li>
                    </ul>
                </div>`;
            } else if (details.type === 'slab') {
                calculationDetailsHtml += `
                <div class="calculation-details-box p-3 bg-gray-50 dark:bg-gray-800 rounded-lg my-3">
                    <h5 class="font-semibold mb-2">Детали расчета плитного перекрытия:</h5>
                    <ul class="list-disc list-inside space-y-1 pl-2">
                        <li>Площадь перекрытий: ${details.area.toFixed(2)} м²</li>
                        <li>Тип плиты: ${details.slab_type}</li>
                        <li>Размеры плиты: ${details.slab_dimensions}</li>
                        <li>Количество плит: ${details.num_slabs} шт</li>
                        <li>Объем раствора: ${details.mortar_volume.toFixed(2)} м³</li>
                    </ul>
                </div>`;
            }
        }
    }

    items.forEach((item, index) => {
        if (!item.name) return;

        const materialRow = document.createElement('div');
        materialRow.className = 'grid grid-cols-4 gap-2 mb-2 material-item';

        // Добавляем класс для мобильных устройств
        if (isMobile) {
            materialRow.classList.add('mobile-item');
        }

        // Форматируем название материала
        let itemName = item.name;

        // Замена английских обозначений на русские
        // Создаем словарь для замены технических названий материалов
        const materialTranslations = {
            'aerated_concrete': 'газобетон',
            'foam_concrete': 'пенобетон',
            'expanded_clay': 'керамзитобетон',
            'brick_solid': 'кирпич полнотелый',
            'brick_hollow': 'кирпич пустотелый',
            'silicate_brick': 'кирпич силикатный',
            'porous_block': 'поризованный блок',
            'timber': 'брус',
            'round_log': 'бревно',
            'sip_panels': 'СИП-панели',
            'concrete_panels': 'ж/б панели',
            'sandwich_panels': 'сэндвич-панели',
            'panels': 'панели',
            'waterproofing_roll': 'гидроизоляция рулонная',
            'waterproofing_membrane': 'гидроизоляция мембранная',
            'waterproofing_mastic': 'гидроизоляция обмазочная',
            'waterproofing_ultrathin': 'ультратонкая гидроизоляция',
            'concrete_b15': 'бетон В15',
            'concrete_b20': 'бетон В20',
            'concrete_b25': 'бетон В25',
            'concrete_b30': 'бетон В30',
            'formwork_plywood': 'опалубка фанерная',
            'formwork_metal': 'опалубка металлическая',
            'formwork_wood': 'опалубка деревянная',
            'rebar_a300': 'арматура А300',
            'rebar_a400': 'арматура А400',
            'rebar_a500': 'арматура А500',
            'insulation_mineral': 'минеральная вата',
            'insulation_foam': 'пенополистирол',
            'insulation_basalt': 'базальтовая вата',
            'insulation_ecowool': 'эковата',
            'mortar_cement': 'цементный раствор',
            'mortar_lime': 'известковый раствор',
            'mortar_cement_lime': 'цементно-известковый раствор',
            'metal': 'металлочерепица',
            'tile': 'керамическая черепица',
            'shingle': 'гибкая черепица',
            'flat': 'плоская кровля'
        };

        // Ищем и заменяем все английские обозначения материалов на русские
        for (const [key, value] of Object.entries(materialTranslations)) {
            if (itemName.includes(key)) {
                itemName = itemName.replace(key, value);
            }
        }

        // Форматирование размеров бруса без десятичных знаков
        if (itemName.includes('x') && itemName.includes('.0')) {
            itemName = itemName.replace(/(\d+)\.0/g, '$1');
        }

        // Используем готовую стоимость из данных
        const totalCost = item.total_cost || 0;
        sectionTotal += totalCost;

        // Форматируем числа для лучшей читаемости
        const formattedQuantity = typeof item.quantity === 'number'
            ? item.quantity < 10 ? item.quantity.toFixed(2) : Math.round(item.quantity)
            : item.quantity;

        const formattedPrice = item.price
            ? Math.round(item.price).toLocaleString('ru-RU')
            : '—';

        const formattedTotal = Math.round(totalCost).toLocaleString('ru-RU');

        materialRow.innerHTML = `
    <div>${itemName}</div>
    <div class="font-semibold text-right">${formattedQuantity} ${item.unit || ''}</div>
    <div class="font-semibold text-right">${formattedPrice} ₽</div>
    <div class="font-semibold text-right">${formattedTotal} ₽</div>
`;

        container.appendChild(materialRow);

        // Анимация появления
        setTimeout(() => {
            materialRow.classList.add('visible');
        }, index * 150);
    });

    // Добавляем блок с деталями расчета, если они есть
    if (hasCalculationDetails && calculationDetailsHtml) {
        const detailsContainer = document.createElement('div');
        detailsContainer.className = 'calculation-details w-full mb-4';
        detailsContainer.innerHTML = calculationDetailsHtml;
        container.appendChild(detailsContainer);

        // Анимация появления для блока с деталями
        setTimeout(() => {
            detailsContainer.classList.add('visible');
        }, items.length * 150 + 100);
    }

    // Добавляем итог по разделу
    if (sectionTotal > 0) {
        const totalRow = document.createElement('div');
        totalRow.className = 'grid grid-cols-4 gap-2 mt-4 pt-2 font-bold material-item total-row';

        // Добавляем класс для мобильных устройств
        if (isMobile) {
            totalRow.classList.add('mobile-total');
        }

        totalRow.innerHTML = `
    <div style="grid-column: 1 / 4">Итого по разделу:</div>
    <div class="text-right">${Math.round(sectionTotal).toLocaleString('ru-RU')} ₽</div>
`;
        container.appendChild(totalRow);

        // Делаем строку с итогом сразу видимой
        setTimeout(() => {
            totalRow.classList.add('visible');
        }, 100);
    }
}

/**
 * Отображает общую стоимость
 */
function displayTotalCost(totalCost) {
    const resultsContainer = document.getElementById('results');
    if (!resultsContainer) return;

    // Ищем блок с общей стоимостью или создаем его
    let totalBlock = document.getElementById('total-cost-block');

    if (!totalBlock) {
        totalBlock = document.createElement('div');
        totalBlock.id = 'total-cost-block';
        totalBlock.className = 'mt-8 p-4 rounded-lg shadow-lg border-2 total-cost-container';

        // Вставляем перед примечанием
        const noteContainer = document.querySelector('.note-container');
        if (noteContainer) {
            noteContainer.parentNode.insertBefore(totalBlock, noteContainer);
        } else {
            resultsContainer.appendChild(totalBlock);
        }
    }

    // Обновляем сумму
    totalBlock.innerHTML = `
    <div class="flex justify-between items-center">
        <h3 class="text-xl font-bold">Общая стоимость материалов:</h3>
        <span class="text-2xl font-bold">${Math.round(totalCost).toLocaleString('ru-RU')} ₽</span>
    </div>
`;
}

/**
 * Запрашивает рекомендации от ИИ с улучшенным визуальным оформлением
 */
/**
 * Запрашивает рекомендации от ИИ с упрощенным визуальным оформлением
 */
function showAIRecommendations(params) {
    const recommendationsContainer = document.querySelector('.ai-recommendations');
    const contentContainer = document.getElementById('ai-recommendations-content');

    if (!recommendationsContainer || !contentContainer) return;

    // Удаляем захардкоженный класс фона
    recommendationsContainer.classList.remove('bg-gray-900');

    // Добавляем классы, соответствующие теме, и показываем контейнер
    recommendationsContainer.classList.remove('hidden');
    recommendationsContainer.classList.add('loading');

    // Индикатор загрузки в заголовке
    const heading = recommendationsContainer.querySelector('.ai-recommendations-title');
    if (heading) {
        // Удаляем захардкоженный класс цвета
        heading.classList.remove('text-blue-400');

        heading.innerHTML = `
    <div class="flex items-center">
        <span>Рекомендации ИИ-ассистента</span>
        
    </div>
`;
    }

    // Очищаем контейнер и показываем красивую анимацию загрузки
    contentContainer.innerHTML = `
    <div class="loading-container">
        <div class="fancy-spinner">
            <div class="ring"></div>
            <div class="ring"></div>
            <div class="dot"></div>
        </div>
        <p class="loading-text">Анализ проекта и подготовка рекомендаций...</p>
    </div>
`;

    // Готовим параметры запроса
    const requestBody = {
        calculator_data: {
            area: parseFloat(params.area) || 0,
            foundation_type: params.foundationType || "strip",
            wall_material: params.wallMaterial || "brick",
            floors: parseInt(params.floors) || 1,
            roof_type: params.roofType || "metal"
        },
        priority: 'cost'
    };

    // Отправляем запрос
    fetch('/api/recommendations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Ошибка API: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Убираем состояние загрузки
            recommendationsContainer.classList.remove('loading');

            // Обновляем заголовок
            if (heading) {
                heading.textContent = 'Рекомендации ИИ-ассистента';
            }

            // ВАЖНО: полностью очищаем контейнер перед добавлением нового содержимого
            contentContainer.innerHTML = '';

            // Добавляем рекомендации
            if (data.recommendations && data.recommendations.length > 0) {
                // Добавляем общую сводку без заголовка "сводка"
                if (data.summary) {
                    const summaryDiv = document.createElement('div');
                    summaryDiv.className = 'ai-summary mb-4 p-4 rounded-lg border theme-summary';
                    summaryDiv.textContent = data.summary;
                    contentContainer.appendChild(summaryDiv);
                }

                // Добавляем рекомендации
                const recommendationsDiv = document.createElement('div');
                recommendationsDiv.className = 'ai-recommendations-list';

                data.recommendations.forEach(rec => {
                    const recDiv = document.createElement('div');
                    recDiv.className = 'ai-recommendation-card';

                    // Упрощенный HTML без блока категории
                    recDiv.innerHTML = `
        <h3 class="ai-rec-title">${rec.title || 'Рекомендация'}</h3>
        <div class="ai-rec-description">${rec.description || ''}</div>
        ${rec.impact ? `<div class="ai-rec-impact">${rec.impact}</div>` : ''}
    `;

                    recommendationsDiv.appendChild(recDiv);
                });

                contentContainer.appendChild(recommendationsDiv);
            } else {
                contentContainer.innerHTML = '<div class="ai-no-recommendations">Нет доступных рекомендаций для текущих параметров.</div>';
            }
        })
        .catch(error => {
            // Убираем состояние загрузки
            recommendationsContainer.classList.remove('loading');

            // ВАЖНО: полностью очищаем контейнер перед отображением ошибки
            contentContainer.innerHTML = '';

            // Показываем сообщение об ошибке
            contentContainer.innerHTML = `<div class="ai-error">Не удалось загрузить рекомендации. ${error.message}</div>`;

            // Сбрасываем заголовок
            if (heading) {
                heading.textContent = 'Рекомендации ИИ-ассистента';
            }
        });
}

/**
 * Подготавливает вид для печати
 */
function preparePrintView() {
    // Используем функцию установки даты
    setCurrentDate();

    // Проверка содержимого всех print-date элементов на странице для отладки
    document.querySelectorAll('[id="print-date"]').forEach((el, i) => {
        console.log(`print-date элемент ${i}:`, el.textContent);
    });
}

/**
 * Функция для показа результатов после завершения анимации
 */
window.showDemoResults = function () {
    // Если анимация еще не завершена, ждем
    if (!animationCompleted) {
        setTimeout(window.showDemoResults, 300);
        return;
    }

    // Проверяем, были ли результаты уже показаны
    if (document.querySelector('.material-item.visible')) {
        return;
    }

    // Скрываем анимацию
    const loadingAnimation = document.getElementById('loading-animation');
    if (loadingAnimation) {
        loadingAnimation.classList.add('hidden');
    }

    // Если у нас есть данные от API, показываем их
    // Если нет - ничего не делаем, пользователь сам повторит запрос
};

/**
 * Восстанавливает отображение результатов расчета
 */
async function restoreCalculationResults(params) {
    // Показываем панель результатов сразу
    switchToResultsPanel();

    try {
        // Запрашиваем данные для восстановления результатов
        // Показываем индикатор загрузки, но без анимации расчетов
        const loadingAnimation = document.getElementById('loading-animation');
        if (loadingAnimation) {
            // Создаем простой индикатор загрузки вместо полной анимации
            loadingAnimation.innerHTML = '<div class="simple-loading">Загрузка сохраненных результатов...</div>';
            loadingAnimation.style.display = 'block';
        }

        // Загружаем данные с сервера
        const data = await fetchDetailedMaterials(params);

        // Сразу скрываем индикатор загрузки
        if (loadingAnimation) {
            loadingAnimation.style.display = 'none';
        }

        // Устанавливаем дату расчета
        setCurrentDate();

        // Показываем восстановленные результаты без анимации
        showDetailedResults(data, params);

        // Показываем рекомендации ИИ
        showAIRecommendations(params);
    } catch (error) {
        console.error("Ошибка при восстановлении результатов:", error);

        // Если не удалось восстановить результаты, возвращаемся к форме
        const calculatorPanel = document.querySelector('.calculator-panel');
        const resultsPanel = document.querySelector('.results-panel');

        if (calculatorPanel && resultsPanel) {
            resultsPanel.classList.add('hidden');
            resultsPanel.classList.remove('active');
            calculatorPanel.classList.remove('hidden');
            calculatorPanel.classList.add('active');
        }

        // Сбрасываем сохраненное состояние UI
        localStorage.setItem('calculatorUiState', 'form');
    }
}

/**
 * Настраивает обработчики событий изменения для всех полей формы
 */
function setupFormChangeListeners() {
    const form = document.getElementById('calculatorForm');
    if (!form) return;

    // Особые обработчики для ключевых селектов с автоматическим сохранением
    const foundationTypeSelect = document.getElementById('foundationType');
    if (foundationTypeSelect) {
        foundationTypeSelect.addEventListener('change', function () {
            console.log(`Изменение типа фундамента: ${this.value}`);
            // Сначала переключаем видимые параметры
            switchFoundationParams(this.value);
            // Затем сохраняем состояние
            updateCalculatorParams();
        });
    }

    // Добавляем обработчики для всех селектов (выпадающих списков)
    const selects = form.querySelectorAll('select');
    selects.forEach(select => {
        // Пропускаем foundationType, так как для него отдельный обработчик выше
        if (select.id === 'foundationType') return;

        select.addEventListener('change', function () {
            console.log(`Изменение значения в селекте ${select.name}: ${select.value}`);
            updateCalculatorParams();
        });
    });

    // Добавляем обработчики для всех инпутов (текстовых полей, числовых, чекбоксы)
    const inputs = form.querySelectorAll('input');
    inputs.forEach(input => {
        // Для текстовых и числовых полей используем событие input
        // Для чекбоксов и радио-кнопок - change
        const eventType = (input.type === 'checkbox' || input.type === 'radio') ? 'change' : 'input';

        input.addEventListener(eventType, function () {
            console.log(`Изменение значения в поле ${input.name}: ${input.value}`);
            updateCalculatorParams();
        });
    });

    console.log("Установлены обработчики для сохранения параметров формы");
}

/**
 * Инициализирует калькулятор
 */
function initCalculator() {
    // Обработчики для дополнительных параметров стен
    setupWallMaterialsHandlers();

    // Добавляем обработчики для сохранения параметров формы
    setupFormChangeListeners();

    // Добавляем обработчик изменения размера окна для мобильной версии
    window.addEventListener('resize', handleWindowResize);
}

/**
 * Обрабатывает изменение размера окна для обновления мобильных классов
 */
function handleWindowResize() {
    const isMobile = window.innerWidth <= 576;
    const isVerySmall = window.innerWidth <= 375;

    // Обновим заголовки с учетом текущего размера экрана
    updateTableHeaders(isMobile, isVerySmall);

    // Обновляем классы заголовков таблицы
    const headerRows = document.querySelectorAll('.material-header');
    headerRows.forEach(row => {
        if (isMobile) {
            row.classList.add('mobile-header');
        } else {
            row.classList.remove('mobile-header');
        }
    });

    // Обновляем классы строк таблицы
    const materialRows = document.querySelectorAll('.material-item:not(.total-row)');
    materialRows.forEach(row => {
        if (isMobile) {
            row.classList.add('mobile-item');
        } else {
            row.classList.remove('mobile-item');
        }
    });

    // Обновляем классы итоговых строк
    const totalRows = document.querySelectorAll('.total-row');
    totalRows.forEach(row => {
        if (isMobile) {
            row.classList.add('mobile-total');
        } else {
            row.classList.remove('mobile-total');
        }
    });

    // Обновляем размеры колонок в зависимости от размера экрана
    if (isVerySmall) {
        document.querySelectorAll('.mobile-item').forEach(row => {
            row.style.gridTemplateColumns = '1.2fr 0.7fr 0.5fr 0.7fr';

            // Добавляем увеличенные вертикальные отступы для очень маленьких экранов
            row.style.marginBottom = '0.7rem';
            row.style.paddingBottom = '0.3rem';
        });

        // Отдельно настраиваем заголовки
        document.querySelectorAll('.mobile-header').forEach(row => {
            row.style.gridTemplateColumns = '1.2fr 0.7fr 0.5fr 0.7fr';
            row.style.fontSize = '0.7rem';
        });
    } else if (isMobile) {
        document.querySelectorAll('.mobile-item').forEach(row => {
            row.style.gridTemplateColumns = '1.8fr 0.8fr 0.7fr 0.7fr';

            // Устанавливаем стандартные отступы для мобильных
            row.style.marginBottom = '0.5rem';
            row.style.paddingBottom = '0.2rem';
        });

        // Отдельно настраиваем заголовки
        document.querySelectorAll('.mobile-header').forEach(row => {
            row.style.gridTemplateColumns = '1.8fr 0.8fr 0.7fr 0.7fr';
            row.style.fontSize = '0.78rem';
        });
    } else {
        // Сбрасываем inline-стили для десктопа
        document.querySelectorAll('.material-item, .material-header').forEach(row => {
            row.style.gridTemplateColumns = '';
            row.style.marginBottom = '';
            row.style.paddingBottom = '';
            row.style.fontSize = '';
        });
    }
}

/**
 * Обновляет текст заголовков таблиц в зависимости от размера экрана
 */
function updateTableHeaders(isMobile, isVerySmall) {
    const headerRows = document.querySelectorAll('.material-header');

    headerRows.forEach(header => {
        const headerCells = header.querySelectorAll('div');
        if (headerCells.length < 4) return;

        if (isVerySmall) {
            // Сверхкраткие заголовки
            headerCells[0].textContent = 'Название';
            headerCells[1].textContent = 'Кол.';
            headerCells[2].textContent = '₽/ед';
            headerCells[3].textContent = 'Итого';
        } else if (isMobile) {
            // Сокращенные заголовки
            headerCells[0].textContent = 'Наименование';
            headerCells[1].textContent = 'Кол-во';
            headerCells[2].textContent = 'Цена';
            headerCells[3].textContent = 'Сумма';
        } else {
            // Полные заголовки
            headerCells[0].textContent = 'Наименование';
            headerCells[1].textContent = 'Количество';
            headerCells[2].textContent = 'Цена за ед.';
            headerCells[3].textContent = 'Стоимость';
        }
    });
}

/**
 * Настраивает обработчики событий для всех типов материалов стен
 */
function setupWallMaterialsHandlers() {
    // Деревянные стены - дополнительные параметры
    if (document.querySelector('[name="woodInsulationType"]')) {
        document.querySelector('[name="woodInsulationType"]').addEventListener('change', function (e) {
            updateCalculatorParams();
        });
    }

    if (document.querySelector('[name="woodInterlayer"]')) {
        document.querySelector('[name="woodInterlayer"]').addEventListener('change', function (e) {
            updateCalculatorParams();
        });
    }

    if (document.querySelector('[name="woodTreatment"]')) {
        document.querySelector('[name="woodTreatment"]').addEventListener('change', function (e) {
            updateCalculatorParams();
        });
    }

    // Блочные стены - дополнительные параметры
    if (document.querySelector('[name="blockAdhesiveType"]')) {
        document.querySelector('[name="blockAdhesiveType"]').addEventListener('change', function (e) {
            updateCalculatorParams();
        });
    }

    if (document.querySelector('[name="blockReinforcement"]')) {
        document.querySelector('[name="blockReinforcement"]').addEventListener('change', function (e) {
            updateCalculatorParams();
        });
    }

    // Панельные стены - дополнительные параметры
    if (document.querySelector('[name="panel_mounting_type"]')) {
        document.querySelector('[name="panel_mounting_type"]').addEventListener('change', function (e) {
            updateCalculatorParams();
        });
    }

    if (document.querySelector('[name="panel_sealant_type"]')) {
        document.querySelector('[name="panel_sealant_type"]').addEventListener('change', function (e) {
            updateCalculatorParams();
        });
    }

    if (document.querySelector('[name="panel_joint_insulation"]')) {
        document.querySelector('[name="panel_joint_insulation"]').addEventListener('change', function (e) {
            updateCalculatorParams();
        });
    }
}

/**
 * Собирает параметры из формы калькулятора
 */
function getCalculatorParams() {
    const form = document.getElementById('calculatorForm');
    if (!form) return {};

    const formData = new FormData(form);
    const params = {};

    // Собираем данные формы
    for (let [key, value] of formData.entries()) {
        params[key] = value;
    }

    // Получаем состояние видимости блоков арматуры
    const rebarParamsBlocks = document.querySelectorAll('[id$="-params"]');
    rebarParamsBlocks.forEach(block => {
        const id = block.id;
        params[`${id}_visible`] = block.style.display !== 'none';
    });

    // Обновление для включения всех дополнительных опций стен
    if (params.wall_material === 'wood') {
        params.woodSize = document.querySelector('[name="woodSize"]').value;

        // Добавление новых параметров для деревянных стен
        if (document.querySelector('[name="wood_insulation_type"]')) {
            params.wood_insulation_type = document.querySelector('[name="wood_insulation_type"]').value;
        }

        if (document.querySelector('[name="wood_interlayer"]')) {
            params.wood_interlayer = document.querySelector('[name="wood_interlayer"]').value;
        }
    } else if (params.wall_material === 'block') {
        params.blockType = document.querySelector('[name="blockType"]').value;
        params.blockThickness = document.querySelector('[name="blockThickness"]').value;

        // Добавление новых параметров для блочных стен
        if (document.querySelector('[name="blockAdhesiveType"]')) {
            params.blockAdhesiveType = document.querySelector('[name="blockAdhesiveType"]').value;
        }

        if (document.querySelector('[name="blockInsulationType"]')) {
            params.blockInsulationType = document.querySelector('[name="blockInsulationType"]').value;
        }

        if (document.querySelector('[name="blockReinforcement"]')) {
            params.blockReinforcement = document.querySelector('[name="blockReinforcement"]').value;
        }
    } else if (params.wall_material === 'panel') {
        params.panelType = document.querySelector('[name="panelType"]').value;
        params.panelThickness = document.querySelector('[name="panelThickness"]').value;

        // Добавление новых параметров для панельных стен
        if (document.querySelector('[name="panel_mounting_type"]')) {
            params.panel_mounting_type = document.querySelector('[name="panel_mounting_type"]').value;
        }

        if (document.querySelector('[name="panel_sealant_type"]')) {
            params.panel_sealant_type = document.querySelector('[name="panel_sealant_type"]').value;
        }

        if (document.querySelector('[name="panel_joint_insulation"]')) {
            params.panel_joint_insulation = document.querySelector('[name="panel_joint_insulation"]').value;
        }
    }

    return params;
}