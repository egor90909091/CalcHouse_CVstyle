function createMaterialCard(material) {
    // Создаем карточку для отображения материала
    const materialCard = document.createElement('div');
    materialCard.classList.add('material-card', 'rounded-lg', 'p-4', 'mb-4', 'shadow-md', 'bg-white');

    const materialTitle = document.createElement('h4');
    materialTitle.classList.add('font-medium', 'mb-2');
    materialTitle.textContent = material.name;

    const materialDetails = document.createElement('div');
    materialDetails.classList.add('grid', 'grid-cols-2', 'gap-2', 'text-sm');

    // Проверяем, является ли материал арматурой
    const isRebar = material.name.includes('Арматура') && material.detail && material.detail.includes('м.п.');

    // Количество и единицы измерения
    const quantityContainer = document.createElement('div');

    if (isRebar) {
        // Для арматуры показываем и вес, и длину
        quantityContainer.innerHTML = `<span class="text-gray-600">Вес:</span> ${material.quantity} ${material.unit}`;

        // Добавляем отдельную строку для длины арматуры
        const lengthContainer = document.createElement('div');
        lengthContainer.classList.add('col-span-2', 'mt-1', 'text-sm', 'text-gray-700');

        // Извлекаем информацию о длине из detail
        let lengthInfo = material.detail;

        // Форматируем вывод
        if (material.name.includes('продольная')) {
            lengthContainer.innerHTML = `<span class="text-gray-600">Длина:</span> ${lengthInfo}`;
        } else if (material.name.includes('поперечная')) {
            // Для поперечной арматуры (хомутов) формат другой
            const parts = lengthInfo.split(' (');
            if (parts.length > 1) {
                const count = parts[0];
                const length = parts[1].replace(')', '');
                lengthContainer.innerHTML = `<span class="text-gray-600">Количество:</span> ${count}<br>
                                            <span class="text-gray-600">Общая длина:</span> ${length}`;
            } else {
                lengthContainer.innerHTML = `<span class="text-gray-600">Детали:</span> ${lengthInfo}`;
            }
        }

        materialDetails.appendChild(lengthContainer);
    } else {
        // Для других материалов оставляем обычный формат
        quantityContainer.innerHTML = `<span class="text-gray-600">Количество:</span> ${material.quantity} ${material.unit}`;
    }

    // Цена за единицу
    const priceContainer = document.createElement('div');
    priceContainer.innerHTML = `<span class="text-gray-600">Цена:</span> ${material.price ? material.price.toLocaleString() + ' ₽/' + material.unit : 'Не указана'}`;

    // Общая стоимость
    const totalContainer = document.createElement('div');
    totalContainer.classList.add('col-span-2', 'text-right', 'font-medium');
    totalContainer.innerHTML = `<span class="text-gray-600">Стоимость:</span> ${material.total_cost ? material.total_cost.toLocaleString() + ' ₽' : 'Не указана'}`;

    materialDetails.appendChild(quantityContainer);
    materialDetails.appendChild(priceContainer);
    materialDetails.appendChild(totalContainer);

    // Если есть дополнительная информация И это не арматура (для арматуры мы уже вывели информацию выше)
    if (material.detail && !isRebar) {
        const detailContainer = document.createElement('div');
        detailContainer.classList.add('col-span-2', 'mt-2', 'text-sm', 'text-gray-600');
        detailContainer.textContent = material.detail;
        materialDetails.appendChild(detailContainer);
    }

    materialCard.appendChild(materialTitle);
    materialCard.appendChild(materialDetails);

    return materialCard;
}

// Функция для загрузки и отображения результатов расчета
function loadResults() {
    const resultsContainer = document.getElementById('results-content');
    const loadingElement = document.getElementById('loading');
    const errorElement = document.getElementById('error-message');

    // Показываем загрузку
    loadingElement.classList.remove('hidden');
    resultsContainer.classList.add('hidden');
    errorElement.classList.add('hidden');

    // Получаем результаты расчета
    fetch('/api/calculator/results')
        .then(response => {
            if (!response.ok) {
                throw new Error('Ошибка при получении результатов');
            }
            return response.json();
        })
        .then(data => {
            // Скрываем загрузку и показываем контейнер результатов
            loadingElement.classList.add('hidden');
            resultsContainer.classList.remove('hidden');

            // Очищаем контейнеры для категорий материалов
            const foundationContainer = document.getElementById('foundation-materials');
            const wallsContainer = document.getElementById('walls-materials');
            const roofContainer = document.getElementById('roof-materials');

            foundationContainer.innerHTML = '';
            wallsContainer.innerHTML = '';
            roofContainer.innerHTML = '';

            // Отображаем материалы фундамента
            if (data.materials.foundation && data.materials.foundation.length > 0) {
                data.materials.foundation.forEach(material => {
                    foundationContainer.appendChild(createMaterialCard(material));
                });
            } else {
                foundationContainer.innerHTML = '<p class="text-gray-500">Нет данных о материалах фундамента</p>';
            }

            // Отображаем материалы стен
            if (data.materials.walls && data.materials.walls.length > 0) {
                data.materials.walls.forEach(material => {
                    wallsContainer.appendChild(createMaterialCard(material));
                });
            } else {
                wallsContainer.innerHTML = '<p class="text-gray-500">Нет данных о материалах стен</p>';
            }

            // Отображаем материалы кровли
            if (data.materials.roof && data.materials.roof.length > 0) {
                data.materials.roof.forEach(material => {
                    roofContainer.appendChild(createMaterialCard(material));
                });
            } else {
                roofContainer.innerHTML = '<p class="text-gray-500">Нет данных о материалах кровли</p>';
            }

            // Отображаем общую стоимость
            const totalCostElement = document.getElementById('total-cost');
            totalCostElement.textContent = data.total_cost ? data.total_cost.toLocaleString() + ' ₽' : 'Нет данных';
        })
        .catch(error => {
            // Показываем сообщение об ошибке
            loadingElement.classList.add('hidden');
            errorElement.classList.remove('hidden');
            errorElement.textContent = 'Ошибка при загрузке результатов: ' + error.message;
            console.error('Ошибка:', error);
        });
} 