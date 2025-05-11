document.addEventListener('DOMContentLoaded', () => {
    // Элементы DOM
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const selectFileBtn = document.getElementById('selectFileBtn');
    const emptyState = document.getElementById('emptyState');
    const previewState = document.getElementById('previewState');
    const imagePreview = document.getElementById('imagePreview');
    const imageContainer = document.getElementById('imageContainer');
    const analyzingStatus = document.getElementById('analyzing-status');
    const resultSection = document.getElementById('resultSection');
    const analysisResults = document.getElementById('analysisResults');

    // Элементы для выбора мебели
    const roomSelect = document.getElementById('roomSelect');
    const furnitureSections = document.querySelectorAll('.furniture-room-section');
    const furnitureItems = document.querySelectorAll('.furniture-item');
    const selectedFurnitureContainer = document.getElementById('selectedFurnitureContainer');
    const selectedFurnitureTitle = document.getElementById('selectedFurnitureTitle');
    const selectedFurnitureContent = document.getElementById('selectedFurnitureContent');
    const clearSelectionBtn = document.getElementById('clearSelectionBtn');

    let lastRequestTime = 0;
    const requestInterval = 6000; // 6 секунд между запросами

    // Обработка drag & drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropZone.classList.add('border-primary', 'bg-gray-50');
    }

    function unhighlight() {
        dropZone.classList.remove('border-primary', 'bg-gray-50');
    }

    // Функция для сброса состояния загрузки изображения
    function resetImageState() {
        dropZone.classList.remove('has-image');
    }

    // Обработка загрузки файла
    dropZone.addEventListener('drop', handleDrop, false);
    selectFileBtn.addEventListener('click', () => fileInput.click());
    if (imageContainer) {
        imageContainer.addEventListener('click', () => fileInput.click());
    }
    fileInput.addEventListener('change', handleFileSelect);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    function handleFileSelect(e) {
        const files = e.target.files;
        handleFiles(files);
    }

    function handleFiles(files) {
        if (files.length === 0) return;

        const file = files[0];
        if (!isValidImageType(file)) {
            showError('Пожалуйста, загрузите изображение в формате JPG, PNG или WebP');
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            // Устанавливаем новое изображение
            imagePreview.src = e.target.result;

            // Добавляем класс для правильного отображения состояния
            dropZone.classList.add('has-image');

            // Скрываем результаты, если они были показаны
            resultSection.classList.add('hidden');

            // Скрываем статус анализа, но не показываем его текст
            analyzingStatus.textContent = '';
            analyzingStatus.classList.add('hidden');

            // Автоматически запускаем анализ
            analyzeImage(file);
        };
        reader.readAsDataURL(file);
    }

    function isValidImageType(file) {
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        return validTypes.includes(file.type);
    }

    // Функция анализа изображения
    async function analyzeImage(file) {
        try {
            const now = Date.now();
            if (now - lastRequestTime < requestInterval) {
                const timeLeft = Math.ceil((requestInterval - (now - lastRequestTime)) / 1000);
                showError(`Пожалуйста, подождите ${timeLeft} секунд перед следующим запросом`);
                return;
            }

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/predict', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Ошибка при анализе изображения');
            }

            const result = await response.json();
            displayResults(result);

            resultSection.classList.remove('hidden');
            lastRequestTime = Date.now();

            // Скрываем индикатор анализа
            analyzingStatus.classList.add('hidden');

            // Сохраняем результаты для использования при выборе мебели
            window.analysisResults = result.predicted_class;

        } catch (error) {
            showError(error.message);
            // В случае ошибки также скрываем индикатор и сбрасываем состояние
            analyzingStatus.classList.add('hidden');
            resetImageState();
        }
    }

    function displayResults(result) {
        analysisResults.innerHTML = '';

        if (result.success) {
            const predictedClass = result.predicted_class;

            const resultCard = document.createElement('div');
            resultCard.className = 'bg-gray-50 dark:bg-gray-700 p-4 rounded-lg fade-in border border-gray-200 dark:border-gray-600';
            resultCard.innerHTML = `
                <h4 class="font-semibold mb-3 dark:text-gray-200">Рекомендуемый стиль мебели:</h4>
                <p class="text-lg dark:text-white">${predictedClass.name}</p>
                <div class="mt-4">
                    <a href="#" class="text-primary hover:underline dark:text-blue-400">Посмотреть примеры мебели</a>
                </div>
            `;
            analysisResults.appendChild(resultCard);
        } else {
            showError(result.error || 'Произошла ошибка при анализе изображения');
        }
    }

    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded relative fade-in';
        errorDiv.innerHTML = `
            <span class="block sm:inline">${message}</span>
            <span class="absolute top-0 bottom-0 right-0 px-4 py-3">
                <svg class="fill-current h-6 w-6 text-red-500 dark:text-red-400" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <title>Закрыть</title>
                    <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
                </svg>
            </span>
        `;
        analysisResults.innerHTML = '';
        analysisResults.appendChild(errorDiv);
        resultSection.classList.remove('hidden');

        // Если произошла ошибка, сбрасываем состояние изображения
        resetImageState();
    }

    // ======== НОВЫЙ КОД: ФУНКЦИОНАЛЬНОСТЬ ВЫБОРА МЕБЕЛИ ========

    // Словарь доступных стилей (соответствует STYLE_DICT на сервере)
    const availableStyles = [
        "Asian", "Boho", "Contemporary", "Country", "Eclectic",
        "Ecostyle", "English Style", "Futurism", "Loft",
        "Mediterranean (Coastal)", "Minimalism", "Modern",
        "Neoclassicism", "Provence", "Rustic", "Scandinavian", "Victorian"
    ];

    // Словарь для преобразования data-type в поисковые термины
    const furnitureSearchTerms = {
        // Зал
        "sofa": "диван",
        "coffee_table": "журнальный стол",
        "tv_stand": "тумба для тв",
        "armchair": "кресло",
        "bookshelf": "книжный шкаф",

        // Спальня
        "bed": "кровать",
        "nightstand": "прикроватная тумба",
        "wardrobe": "шкаф для одежды",
        "dresser": "комод",

        // Ванная
        "vanity": "тумба с раковиной",
        "bathroom_cabinet": "шкаф для ванной",
        "shower_cabin": "душевая кабина",
        "bathtub": "ванна",

        // Туалетная комната
        "toilet": "унитаз",
        "small_cabinet": "тумба для туалета",
        "sink": "раковина",

        // Прихожая
        "coat_rack": "вешалка для одежды",
        "mirror": "зеркало в комнату",
        "shoe_cabinet": "обувница",
        "console_table": "консоль прихожая",
        "bench": "банкетка прихожая"
    };

    // Переключение комнат при выборе из выпадающего списка
    if (roomSelect) {
        console.log("Инициализация переключателя комнат");
        roomSelect.addEventListener('change', function () {
            const selectedRoom = this.value;
            console.log(`Выбрана комната: ${selectedRoom}`);

            // Скрыть все секции мебели
            furnitureSections.forEach(section => {
                section.classList.add('hidden');
            });

            // Показать секцию для выбранной комнаты
            const activeSection = document.querySelector(`.furniture-room-section[data-room="${selectedRoom}"]`);
            if (activeSection) {
                activeSection.classList.remove('hidden');
            }

            // Скрыть контейнер с результатами, если он был открыт
            if (selectedFurnitureContainer) {
                selectedFurnitureContainer.classList.add('hidden');
            }
        });
    }

    // Инициализация - показываем мебель для комнаты, выбранной по умолчанию
    if (roomSelect) {
        const initialRoom = roomSelect.value;
        const initialRoomSection = document.querySelector(`.furniture-room-section[data-room="${initialRoom}"]`);
        if (initialRoomSection) {
            initialRoomSection.classList.remove('hidden');
        }
    }

    // Добавление обработчиков событий для кнопок мебели
    if (furnitureItems && furnitureItems.length > 0) {
        console.log(`Найдено ${furnitureItems.length} элементов мебели`);

        furnitureItems.forEach(item => {
            if (!item.dataset.label) {
                item.dataset.label = item.textContent.trim();
            }
            item.addEventListener('click', handleFurnitureSelection);
        });
    } else {
        console.error("Не найдено элементов мебели на странице");
    }

    // Храним выбранные варианты для каждого типа мебели
    const selectedFurnitureChoices = {};
    let expandedSquare = null;
    let expandedSquareOriginalParent = null;
    let expandedSquareOriginalNext = null;

    // Функция для создания грид-карточек внутри квадрата
    function renderFurnitureGrid(squareBtn, furnitureName, furnitureType, itemsArr) {
        // Сначала полностью очищаем контент
        squareBtn.innerHTML = '';

        const selected = selectedFurnitureChoices[furnitureType]?.link;
        let cards = '';
        itemsArr.forEach(([link, item], idx) => {
            cards += `
                <div class="furniture-carousel-card" style="margin-bottom:0.5rem;">
                    <img src="${item.image_url}" alt="${furnitureName}">
                    <div class="item-label">${furnitureName}</div>
                    <div class="item-price">${item.price} ₽</div>
                    <button class="select-btn${selected === link ? ' selected' : ''}" data-link="${link}" data-idx="${idx}" ${selected === link ? 'disabled' : ''}>${selected === link ? 'Выбрано' : 'Выбрать'}</button>
                </div>
            `;
        });

        // Добавляем новый контент
        const gridContent = document.createElement('div');
        gridContent.innerHTML = `
            <button class="close-expand" title="Закрыть">×</button>
            <div class="furniture-grid-cards">
                ${cards}
            </div>
        `;
        squareBtn.appendChild(gridContent);

        // Кнопка закрытия
        squareBtn.querySelector('.close-expand').addEventListener('click', (e) => {
            e.stopPropagation();
            collapseSquare(squareBtn);
        });

        // Кнопки выбора
        squareBtn.querySelectorAll('.select-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                try {
                    const idx = +btn.dataset.idx;
                    if (itemsArr && itemsArr[idx]) {
                        const [link, item] = itemsArr[idx];
                        // Сохраняем выбор для данного типа мебели
                        selectedFurnitureChoices[furnitureType] = {
                            link,
                            item,
                            name: furnitureName
                        };
                        // Закрываем расширенный квадрат
                        collapseSquare(squareBtn);
                        // Обновляем отображение выбранных элементов
                        updateSelectedSquare();
                    }
                } catch (error) {
                    console.error('Ошибка при выборе элемента:', error);
                    collapseSquare(squareBtn);
                }
            });
        });
    }

    function expandSquare(squareBtn, furnitureName, furnitureType, itemsArr) {
        // Схлопываем предыдущий, если есть
        if (expandedSquare && expandedSquare !== squareBtn) {
            collapseSquare(expandedSquare);
        }

        // Очистка содержимого кнопки перед расширением
        squareBtn.innerHTML = '';

        // Добавляем класс расширения прямо на месте
        squareBtn.classList.add('expanded');
        expandedSquare = squareBtn;

        // Рендерим содержимое
        renderFurnitureGrid(squareBtn, furnitureName, furnitureType, itemsArr);
    }

    function collapseSquare(squareBtn) {
        if (!squareBtn) return;

        // Очищаем содержимое и восстанавливаем исходную надпись
        squareBtn.classList.remove('expanded');

        // Безопасно восстанавливаем текст
        if (squareBtn.dataset && squareBtn.dataset.label) {
            squareBtn.innerHTML = squareBtn.dataset.label;
        }

        expandedSquare = null;
    }

    function updateSelectedSquare() {
        const selectedSquare = document.getElementById('selectedFurnitureSquare');
        const choices = Object.values(selectedFurnitureChoices);

        if (!selectedSquare) return;

        // Очищаем содержимое перед обновлением
        selectedSquare.innerHTML = '';

        // Управляем отображением кнопки очистки
        if (choices.length > 0) {
            clearSelectionBtn.classList.remove('hidden');

            // Создаем элементы DOM вместо сложных строковых шаблонов
            choices.forEach(choice => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'selected-item';

                const img = document.createElement('img');
                img.src = choice.item.image_url;
                img.alt = choice.name;

                const nameDiv = document.createElement('div');
                nameDiv.className = 'item-label';
                nameDiv.textContent = choice.name;

                const priceDiv = document.createElement('div');
                priceDiv.className = 'item-price';
                priceDiv.textContent = `${choice.item.price} ₽`;

                const link = document.createElement('a');
                link.href = choice.link;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.className = 'select-btn';
                link.style.marginTop = '0.7rem';
                link.textContent = 'Перейти к товару';

                itemDiv.appendChild(img);
                itemDiv.appendChild(nameDiv);
                itemDiv.appendChild(priceDiv);
                itemDiv.appendChild(link);

                selectedSquare.appendChild(itemDiv);
            });

            selectedSquare.classList.remove('hidden');
        } else {
            clearSelectionBtn.classList.add('hidden');

            // Добавляем сообщение о пустом выборе
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-selection-message';
            emptyMessage.textContent = 'Здесь появятся выбранные вами товары';
            selectedSquare.appendChild(emptyMessage);
        }
    }

    // Функция очистки выбранных товаров
    function clearSelectedItems() {
        // Очищаем объект с выбранными товарами
        Object.keys(selectedFurnitureChoices).forEach(key => {
            delete selectedFurnitureChoices[key];
        });

        // Обновляем отображение
        updateSelectedSquare();

        // Снимаем выделение со всех кнопок
        furnitureItems.forEach(item => item.classList.remove('selected'));

        // Показываем уведомление
        showNotification('Выбранные товары очищены');
    }

    // Добавляем обработчик для кнопки очистки
    if (clearSelectionBtn) {
        clearSelectionBtn.addEventListener('click', clearSelectedItems);
    }

    // Обновленная функция выбора мебели
    function handleFurnitureSelection() {
        // Сначала снимаем выделение со всех кнопок
        furnitureItems.forEach(item => item.classList.remove('selected'));

        // Выделяем текущую
        this.classList.add('selected');

        const furnitureType = this.getAttribute('data-type');
        const furnitureName = this.textContent.trim();
        const furnitureSearchTerm = furnitureSearchTerms[furnitureType] || furnitureType;

        // Определяем текущий стиль
        let currentStyle = 'Modern';
        if (window.analysisResults && window.analysisResults.name) {
            const detectedStyle = window.analysisResults.name.charAt(0).toUpperCase() + window.analysisResults.name.slice(1);
            if (availableStyles.includes(detectedStyle)) {
                currentStyle = detectedStyle;
            } else {
                const matchingStyle = availableStyles.find(s => s.toLowerCase() === window.analysisResults.name.toLowerCase());
                if (matchingStyle) currentStyle = matchingStyle;
            }
        }

        // Показываем индикатор загрузки внутри кнопки
        const originalContent = this.innerHTML;
        this.innerHTML = `<div class="flex flex-col items-center justify-center w-full h-full">
            <div class="w-8 h-8 mb-2 border-2 border-gray-200 dark:border-gray-700 rounded-full animate-spin border-t-2 border-blue-500 dark:border-blue-400"></div>
            <span style="color:var(--secondary-text)">Загрузка...</span>
        </div>`;

        // Запрашиваем данные с сервера
        fetch('/api/furniture/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                style: currentStyle,
                furniture: furnitureSearchTerm,
                max_items: 6
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success' && data.data) {
                    const itemsArr = Object.entries(data.data);
                    if (itemsArr.length > 0) {
                        // Очищаем кнопку перед добавлением новых данных
                        this.innerHTML = '';
                        // Расширяем квадрат и показываем варианты
                        expandSquare(this, furnitureName, furnitureType, itemsArr);
                    } else {
                        // Возвращаем кнопку в исходное состояние вместо показа "Нет вариантов"
                        this.classList.remove('expanded');
                        this.innerHTML = this.dataset.label;

                        // Показываем временное уведомление
                        showNotification('К сожалению, варианты не найдены');
                    }
                } else {
                    // Аналогично восстанавливаем исходное состояние при ошибке
                    this.classList.remove('expanded');
                    this.innerHTML = this.dataset.label;
                }
            })
            .catch(() => {
                // И при сетевой ошибке тоже
                this.classList.remove('expanded');
                this.innerHTML = this.dataset.label;
            });
    }

    // Вспомогательная функция для показа уведомлений
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification fade-in';
        notification.innerHTML = message;
        notification.style.position = 'fixed';
        notification.style.top = '10%';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.backgroundColor = 'rgba(0,0,0,0.7)';
        notification.style.color = 'white';
        notification.style.padding = '12px 20px';
        notification.style.borderRadius = '8px';
        notification.style.zIndex = '1000';
        document.body.appendChild(notification);

        // Удаляем уведомление через 3 секунды
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => document.body.removeChild(notification), 500);
        }, 3000);
    }
}); 