/**
 * Упрощенный calculator.js - Отправляет данные в Python и управляет UI
 */

// Глобальные переменные
let lastCalculationParams = {};
let animationCompleted = false;

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

    // Установка значений из URL, если они есть
    loadFormValues();
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
        foundationTypeSelect.addEventListener('change', function () {
            switchFoundationParams(this.value);
        });
        // Вызываем сразу для установки начального состояния
        switchFoundationParams(foundationTypeSelect.value);
    }

    // Инициализация переключателя количества этажей
    const floorsSelect = document.getElementById('floorsSelect');
    if (floorsSelect) {
        floorsSelect.addEventListener('change', function () {
            const floors = parseInt(this.value);
            const floorTypeContainer = document.getElementById('floorTypeContainer');

            if (floorTypeContainer) {
                floorTypeContainer.style.display = floors > 1 ? 'block' : 'none';
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
}

/**
 * Переключает видимость параметров в зависимости от типа стен
 */
function switchWallParams(wallType) {
    // Скрываем все блоки параметров стен
    document.querySelectorAll('.wall-params').forEach(div => {
        div.style.display = 'none';
    });

    // Показываем только блок для выбранного материала
    const targetBlock = document.querySelector(`.wall-params.${wallType}-params`);
    if (targetBlock) {
        targetBlock.style.display = 'block';
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
    // Скрываем все параметры полов
    document.querySelectorAll('.floor-params').forEach(div => {
        div.classList.add('hidden');
    });

    // Показываем только выбранный тип
    const targetElement = document.querySelector(`.floor-params.${floorType}-params`);
    if (targetElement) {
        targetElement.classList.remove('hidden');
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
    // Загружаем из localStorage
    const savedParams = localStorage.getItem('calculatorParams');

    if (savedParams) {
        try {
            const params = JSON.parse(savedParams);
            applyFormValues(params);
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

        applyFormValues(params);
    }
}

/**
 * Применяет значения к форме
 */
function applyFormValues(params) {
    const form = document.getElementById('calculatorForm');
    if (!form) return;

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

            // Вызываем событие change для select-элементов
            if (element.tagName === 'SELECT') {
                element.dispatchEvent(new Event('change'));
            }
        }
    }
}

/**
 * Обрабатывает отправку формы
 */
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

    // Сохраняем параметры 
    lastCalculationParams = params;
    localStorage.setItem('calculatorParams', JSON.stringify(params));

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
        document.getElementById('roof-title')
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

    // Заполняем разделы результатов
    fillResultSections(data);
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

    // Проверяем наличие контейнеров
    if (!foundationContainer || !wallsContainer || !roofContainer) {
        console.error("Контейнеры для результатов не найдены");
        return;
    }

    // Очищаем контейнеры
    foundationContainer.innerHTML = '';
    wallsContainer.innerHTML = '';
    roofContainer.innerHTML = '';

    // Подготавливаем данные
    const materials = data.materials || data;

    // Заполняем секции
    fillSection(foundationContainer, materials.foundation);
    fillSection(wallsContainer, materials.walls);
    fillSection(roofContainer, materials.roof);

    // Заполняем межэтажные перекрытия, если есть
    if (floorsContainer && materials.floors && materials.floors.length > 0) {
        fillSection(floorsContainer, materials.floors);
    }

    // Отображаем общую стоимость
    displayTotalCost(data.total_cost || 0);
}

/**
 * Заполняет раздел данными из ответа API
 */
function fillSection(container, items) {
    if (!container || !items || items.length === 0) return;

    // Добавляем заголовки столбцов
    const headerRow = document.createElement('div');
    headerRow.className = 'grid grid-cols-4 gap-2 mb-3 font-semibold material-header';
    headerRow.innerHTML = `
        <div>Наименование</div>
        <div class="text-right">Количество</div>
        <div class="text-right">Цена за ед.</div>
        <div class="text-right">Стоимость</div>
    `;
    container.appendChild(headerRow);

    // Добавляем материалы
    let sectionTotal = 0;

    items.forEach((item, index) => {
        if (!item.name) return;

        const materialRow = document.createElement('div');
        materialRow.className = 'grid grid-cols-4 gap-2 mb-2 material-item';

        // Используем готовую стоимость из данных
        const totalCost = item.total_cost || 0;
        sectionTotal += totalCost;

        materialRow.innerHTML = `
            <div>${item.name}</div>
            <div class="font-semibold text-right">${item.quantity} ${item.unit || ''}</div>
            <div class="font-semibold text-right">${item.price ? `${item.price} ₽` : '—'}</div>
            <div class="font-semibold text-right">${Math.round(totalCost).toLocaleString('ru-RU')} ₽</div>
        `;

        container.appendChild(materialRow);

        // Анимация появления
        setTimeout(() => {
            materialRow.classList.add('visible');
        }, index * 150);
    });

    // Добавляем итог по разделу
    if (sectionTotal > 0) {
        const totalRow = document.createElement('div');
        totalRow.className = 'grid grid-cols-4 gap-2 mt-4 pt-2 font-bold material-item total-row';
        totalRow.innerHTML = `
            <div style="grid-column: 1 / 4">Итого по разделу:</div>
            <div class="text-right">${Math.round(sectionTotal).toLocaleString('ru-RU')} ₽</div>
        `;
        container.appendChild(totalRow);
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
                <div class="loader ml-2"></div>
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
                // Добавляем общую сводку
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

                    recDiv.innerHTML = `
                        <div class="ai-rec-category">${rec.category || 'Рекомендация'}</div>
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
    // Текущая дата
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('ru-RU');

    // Установка даты для печати
    const printDateElement = document.getElementById('print-date');
    if (printDateElement) {
        printDateElement.textContent = formattedDate;
    }

    // Добавляем атрибут даты к контейнеру результатов
    const resultsElement = document.getElementById('results');
    if (resultsElement) {
        resultsElement.setAttribute('data-print-date', formattedDate);
    }
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