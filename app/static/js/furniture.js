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

    // Элементы для выбора мебели
    const roomSelect = document.getElementById('roomSelect');
    const furnitureSections = document.querySelectorAll('.furniture-room-section');
    const furnitureItems = document.querySelectorAll('.furniture-item');
    const selectedFurnitureContainer = document.getElementById('selectedFurnitureContainer');
    const selectedFurnitureTitle = document.getElementById('selectedFurnitureTitle');
    const selectedFurnitureContent = document.getElementById('selectedFurnitureContent');
    const clearSelectionBtn = document.getElementById('clearSelectionBtn');
    const roomSelectContainer = document.querySelector('.room-select-container');

    let lastRequestTime = 0;
    const requestInterval = 6000; // 6 секунд между запросами

    // Инициализация видимости контейнера при загрузке
    if (selectedFurnitureContainer) {
        selectedFurnitureContainer.classList.add('hidden');
    }

    // Добавим обработчик изменения размера окна для адаптивности
    window.addEventListener('resize', handleWindowResize);

    // Функция обработки изменения размера окна
    function handleWindowResize() {
        // Если изображение загружено (dropZone имеет класс has-image)
        if (dropZone.classList.contains('has-image')) {
            setImageLoadedState();
        }
    }

    // Вызовем функцию при загрузке страницы
    handleWindowResize();

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
        emptyState.style.display = 'flex';
        previewState.style.display = 'none';
    }

    // Функция для установки состояния с загруженным изображением
    function setImageLoadedState() {
        dropZone.classList.add('has-image');
        emptyState.style.display = 'none';
        previewState.style.display = 'block';

        // Обработка адаптивного отображения на мобильных устройствах
        if (window.innerWidth <= 768) {
            // Для мобильных - добавим дополнительные стили для контейнера превью
            previewState.style.display = 'flex';
            previewState.style.flexDirection = 'column';

            // Убедимся, что изображение отображается над всеми остальными элементами
            const imageContainer = document.getElementById('imageContainer');
            if (imageContainer) {
                imageContainer.style.order = '-1';
            }
        }
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
            setImageLoadedState();

            // Показываем контейнер превью и скрываем пустое состояние
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

            // Сохраняем результаты для использования при выборе мебели
            window.analysisResults = result.predicted_class;

            // Показываем предсказанный стиль в контейнере
            if (selectedFurnitureContainer && selectedFurnitureTitle && selectedFurnitureContent) {
                const styleName = window.analysisResults.name.charAt(0).toUpperCase() + window.analysisResults.name.slice(1);
                const translatedStyle = styleTranslations[styleName] || styleName;
                selectedFurnitureTitle.textContent = 'Определенный стиль:';

                // Проверяем текущую тему
                const isDarkTheme = document.documentElement.classList.contains('dark-theme');

                // Применяем соответствующие стили контейнера
                const containerDiv = selectedFurnitureContainer.querySelector('div');
                if (containerDiv) {
                    if (isDarkTheme) {
                        containerDiv.className = 'p-5 bg-gray-800 rounded-lg border border-gray-700 shadow-sm';
                    } else {
                        containerDiv.className = 'p-5 bg-white rounded-lg border border-gray-200 shadow-sm';
                    }
                }

                // Устанавливаем стили для заголовка и содержимого
                if (isDarkTheme) {
                    selectedFurnitureTitle.className = 'font-medium mb-3 text-center text-white';
                    selectedFurnitureContent.innerHTML = `
                        <div class="text-lg font-medium text-white text-center">${translatedStyle}</div>
                    `;
                } else {
                    selectedFurnitureTitle.className = 'font-medium mb-3 text-center text-gray-900';
                    selectedFurnitureContent.innerHTML = `
                        <div class="text-lg font-medium text-gray-900 text-center">${translatedStyle}</div>
                    `;
                }

                selectedFurnitureContainer.classList.remove('hidden');

                // Перемещаем контейнер после изображения и перед выбором комнаты
                if (imageContainer && roomSelectContainer) {
                    imageContainer.insertAdjacentElement('afterend', selectedFurnitureContainer);
                }
            }

            // Скрываем индикатор анализа
            if (analyzingStatus) {
                analyzingStatus.classList.add('hidden');
            }

            lastRequestTime = Date.now();

        } catch (error) {
            console.error('Ошибка анализа:', error.message);
            // В случае ошибки также скрываем индикатор и сбрасываем состояние
            if (analyzingStatus) {
                analyzingStatus.classList.add('hidden');
            }
            resetImageState();
        }
    }

    function showError(message) {
        console.error('Ошибка:', message);

        // Используем функцию showNotification для отображения ошибки
        showNotification(message, true);

        // Если произошла ошибка, сбрасываем состояние изображения
        resetImageState();
    }

    // ======== НОВЫЙ КОД: ФУНКЦИОНАЛЬНОСТЬ ВЫБОРА МЕБЕЛИ ========

    // Словарь для перевода стилей на русский язык
    const styleTranslations = {
        "Asian": "Азиатский",
        "Boho": "Бохо",
        "Contemporary": "Современный",
        "Country": "Кантри",
        "Eclectic": "Эклектика",
        "Ecostyle": "Экостиль",
        "English Style": "Английский",
        "Futurism": "Футуризм",
        "Loft": "Лофт",
        "Mediterranean (Coastal)": "Средиземноморский",
        "Minimalism": "Минимализм",
        "Modern": "Модерн",
        "Neoclassicism": "Неоклассика",
        "Provence": "Прованс",
        "Rustic": "Рустик",
        "Scandinavian": "Скандинавский",
        "Victorian": "Викторианский"
    };

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
        "tv": "телевизор",
        "armchair": "кресло",
        "bookshelf": "книжный шкаф",

        // Спальня
        "bed": "кровать",
        "nightstand": "прикроватная тумба",
        "wardrobe": "шкаф для одежды",
        "dresser": "комод",

        // Ванная
        "vanity": "тумбочка под раковину",
        "faucet": "смеситель для ванной",
        "bathroom_mirror": "зеркало для ванной",
        "bathroom_cabinet": "шкаф для ванной",

        // Туалетная комната
        "toilet": "унитаз",
        "small_cabinet": "тумба для туалета",
        "sink": "раковина",

        // Прихожая
        "coat_rack": "вешалка для одежды",
        "mirror": "зеркало в комнату",
        "shoe_cabinet": "обувница",
        "console_table": "консоль прихожая",
        "bench": "банкетка прихожая",

        // Комната с рабочим местом
        "desk": "рабочий стол",
        "office_chair": "компьютерный стул",
        "computer": "компьютер с монитором комплект",
        "laptop": "ноутбук",
        "shelf": "подвесная полка для комнаты",
        "table_lamp": "ночник"
    };

    // Специальные категории, для которых не учитывается стиль при поиске
    const styleIndependentCategories = ["tv", "computer", "laptop"];

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
            // Сохраняем обработчик в самом элементе для возможности его удаления
            item._clickHandler = handleFurnitureSelection;
            item.addEventListener('click', item._clickHandler);
        });
    } else {
        console.error("Не найдено элементов мебели на странице");
    }

    // Храним выбранные варианты для каждого типа мебели
    const selectedFurnitureChoices = {};
    let expandedSquare = null;
    let expandedSquareOriginalParent = null;
    let expandedSquareOriginalNext = null;

    // Добавляем глобальную переменную для отслеживания текущей активной категории
    let currentActiveCategory = null;

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
        gridContent.className = 'expanded-content';
        gridContent.innerHTML = `
            <button class="close-expand" title="Закрыть">×</button>
            <div class="furniture-grid-cards">
                ${cards}
            </div>
        `;
        squareBtn.appendChild(gridContent);

        // Добавляем обработчик клика на весь расширенный контент, чтобы остановить всплытие
        squareBtn.addEventListener('click', (e) => {
            // Останавливаем всплытие события, чтобы не срабатывало повторное нажатие
            e.stopPropagation();
        });

        // Находим контейнер с гридами и добавляем ему обработчик для остановки всплытия
        const gridContainer = squareBtn.querySelector('.furniture-grid-cards');
        if (gridContainer) {
            gridContainer.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

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

        // Убираем обработчик клика на время расширения, чтобы избежать дублирования
        const originalClickHandler = squareBtn._clickHandler;
        if (originalClickHandler) {
            squareBtn.removeEventListener('click', originalClickHandler);
        }

        // Рендерим содержимое
        renderFurnitureGrid(squareBtn, furnitureName, furnitureType, itemsArr);
    }

    function collapseSquare(squareBtn) {
        if (!squareBtn) return;

        // Очищаем содержимое и восстанавливаем исходную надпись
        squareBtn.classList.remove('expanded');

        // Удаляем все обработчики событий
        const newSquare = squareBtn.cloneNode(false);
        if (squareBtn.parentNode) {
            squareBtn.parentNode.replaceChild(newSquare, squareBtn);
        }

        // Безопасно восстанавливаем текст
        if (squareBtn.dataset && squareBtn.dataset.label) {
            newSquare.innerHTML = squareBtn.dataset.label;
        }

        // Восстанавливаем обработчик клика
        newSquare.dataset.type = squareBtn.dataset.type;
        newSquare.dataset.label = squareBtn.dataset.label;
        newSquare.addEventListener('click', handleFurnitureSelection);
        newSquare._clickHandler = handleFurnitureSelection;

        // Копируем все классы
        squareBtn.classList.forEach(cls => {
            newSquare.classList.add(cls);
        });

        expandedSquare = null;
    }

    function updateSelectedSquare() {
        const selectedSquare = document.getElementById('selectedFurnitureSquare');
        const choices = Object.values(selectedFurnitureChoices);

        if (!selectedSquare || !selectedFurnitureContainer) return;

        // Очищаем содержимое перед обновлением
        selectedSquare.innerHTML = '';

        // Управляем отображением кнопки очистки и контейнера
        if (choices.length > 0) {
            clearSelectionBtn.classList.remove('hidden');
            selectedFurnitureContainer.classList.remove('hidden');
            selectedSquare.classList.remove('hidden');

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
        } else {
            // Скрываем кнопку очистки и контейнер при отсутствии выбранных товаров
            clearSelectionBtn.classList.add('hidden');
            selectedFurnitureContainer.classList.add('hidden');
            selectedSquare.classList.add('hidden');
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

        // Снимаем выделение со всех кнопок и сбрасываем активную категорию
        furnitureItems.forEach(item => {
            item.classList.remove('selected', 'active');
        });

        // Если есть активная категория и открыты результаты, обновляем их
        if (currentActiveCategory) {
            const furnitureType = currentActiveCategory.getAttribute('data-type');
            const furnitureName = currentActiveCategory.textContent.trim();
            currentActiveCategory = null;

            // Если контейнер результатов видим, обновляем отображение
            const resultsContainer = document.getElementById('furnitureSearchResults');
            if (!resultsContainer.classList.contains('hidden')) {
                const resultsContent = document.getElementById('furnitureResultsContent');
                if (resultsContent) {
                    // Найдем все кнопки "Выбрано" и изменим их на "Выбрать"
                    const selectButtons = resultsContent.querySelectorAll('.select-btn');
                    selectButtons.forEach(btn => {
                        btn.textContent = 'Выбрать';
                        btn.disabled = false;
                        btn.classList.remove('bg-green-500', 'hover:bg-green-600');
                        btn.classList.add('bg-blue-500', 'hover:bg-blue-600');
                    });
                }
            }
        }

        // Показываем уведомление
        showNotification('Выбранные товары очищены');
    }

    // Добавляем обработчик для кнопки очистки
    if (clearSelectionBtn) {
        clearSelectionBtn.addEventListener('click', clearSelectedItems);
    }

    // Обновленная функция выбора мебели
    function handleFurnitureSelection() {
        const furnitureType = this.getAttribute('data-type');
        const furnitureName = this.textContent.trim();
        const furnitureSearchTerm = furnitureSearchTerms[furnitureType] || furnitureType;

        // Если нажали на ту же категорию и она уже активна - скрываем результаты
        if (this === currentActiveCategory) {
            // Снимаем активное состояние
            this.classList.remove('active', 'selected');
            currentActiveCategory = null;

            // Скрываем результаты поиска
            hideFurnitureResults();
            return;
        }

        // Снимаем выделение со всех кнопок категорий и убираем класс expanded
        furnitureItems.forEach(item => {
            item.classList.remove('active', 'selected', 'expanded');
            if (item.dataset && item.dataset.label) {
                item.innerHTML = item.dataset.label;
            }
        });

        // Выделяем текущую категорию
        this.classList.add('active');
        currentActiveCategory = this;

        // Показываем индикатор загрузки
        showFurnitureLoading(furnitureName);

        // Определяем, загружена ли картинка
        const isImageLoaded = dropZone.classList.contains('has-image');

        // Для телевизоров и других стиль-независимых категорий не используем стиль
        const isStyleIndependent = styleIndependentCategories.includes(furnitureType);

        // Определяем стиль: пустой, если нет изображения или стиль от категории не зависит
        let searchStyle = "";

        // Используем стиль из анализа изображения только если:
        // 1. Изображение загружено
        // 2. Категория зависит от стиля
        // 3. Результаты анализа доступны
        if (isImageLoaded && !isStyleIndependent && window.analysisResults && window.analysisResults.name) {
            const detectedStyle = window.analysisResults.name.charAt(0).toUpperCase() + window.analysisResults.name.slice(1);
            if (availableStyles.includes(detectedStyle)) {
                searchStyle = detectedStyle;
            } else {
                const matchingStyle = availableStyles.find(s => s.toLowerCase() === window.analysisResults.name.toLowerCase());
                if (matchingStyle) searchStyle = matchingStyle;
            }
        }

        console.log(`Отправка запроса: стиль="${searchStyle}", мебель="${furnitureSearchTerm}", изображение загружено: ${isImageLoaded}`);

        // Запрашиваем данные с сервера
        fetch('/api/furniture/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                style: searchStyle,
                furniture: furnitureSearchTerm,
                max_items: 6
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success' && data.data) {
                    const itemsArr = Object.entries(data.data);
                    if (itemsArr.length > 0) {
                        // Показываем результаты
                        renderFurnitureResults(itemsArr, furnitureName, furnitureType);
                    } else {
                        // Показываем сообщение, что варианты не найдены
                        showNoResultsMessage(furnitureName);
                    }
                } else {
                    // Показываем сообщение об ошибке
                    showNoResultsMessage(furnitureName, true);
                }
            })
            .catch((error) => {
                console.error('Ошибка при поиске мебели:', error);
                showNoResultsMessage(furnitureName, true);
            });
    }

    // Функция для показа индикатора загрузки
    function showFurnitureLoading(categoryName) {
        const resultsContainer = document.getElementById('furnitureSearchResults');
        const loadingIndicator = document.getElementById('furnitureLoadingIndicator');
        const resultsContent = document.getElementById('furnitureResultsContent');
        const resultsTitle = document.getElementById('furnitureResultsTitle');

        // Обновляем заголовок, сохраняя HTML-структуру с классами
        resultsTitle.innerHTML = `Варианты: ${categoryName}`;

        // Убедимся, что классы для темной темы применены
        if (document.documentElement.classList.contains('dark-theme')) {
            resultsTitle.classList.add('text-white');
            resultsTitle.classList.remove('text-gray-900');
        } else {
            resultsTitle.classList.add('text-gray-900');
            resultsTitle.classList.remove('text-white');
        }

        // Очищаем предыдущие результаты
        resultsContent.innerHTML = '';

        // Показываем контейнер результатов и индикатор загрузки
        resultsContainer.classList.remove('hidden');
        loadingIndicator.classList.remove('hidden');
    }

    // Функция для показа сообщения, что ничего не найдено
    function showNoResultsMessage(categoryName, isError = false) {
        const resultsContainer = document.getElementById('furnitureSearchResults');
        const loadingIndicator = document.getElementById('furnitureLoadingIndicator');
        const resultsContent = document.getElementById('furnitureResultsContent');

        // Скрываем индикатор загрузки
        loadingIndicator.classList.add('hidden');

        // Отображаем сообщение
        resultsContent.innerHTML = `
            <div class="w-full text-center p-4 ${isError ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}">
                ${isError ? 'Ошибка при поиске вариантов' : `К сожалению, подходящих вариантов для категории "${categoryName}" не найдено`}
            </div>
        `;

        // Убедимся, что контейнер результатов видим
        resultsContainer.classList.remove('hidden');
    }

    // Функция для скрытия результатов поиска
    function hideFurnitureResults() {
        const resultsContainer = document.getElementById('furnitureSearchResults');
        const loadingIndicator = document.getElementById('furnitureLoadingIndicator');

        // Скрываем контейнер и индикатор
        resultsContainer.classList.add('hidden');
        loadingIndicator.classList.add('hidden');
    }

    // Функция для отображения результатов поиска
    function renderFurnitureResults(itemsArr, furnitureName, furnitureType) {
        const resultsContainer = document.getElementById('furnitureSearchResults');
        const loadingIndicator = document.getElementById('furnitureLoadingIndicator');
        const resultsContent = document.getElementById('furnitureResultsContent');

        // Скрываем индикатор загрузки
        loadingIndicator.classList.add('hidden');

        // Очищаем контейнер результатов
        resultsContent.innerHTML = '';

        // Создаем элементы для каждого найденного предмета
        itemsArr.forEach(([link, item]) => {
            const isSelected = selectedFurnitureChoices[furnitureType]?.link === link;
            const cardElement = document.createElement('div');
            cardElement.className = 'furniture-result-card';

            // Создаем содержимое карточки
            cardElement.innerHTML = `
                <img src="${item.image_url}" alt="${furnitureName}">
                <div class="item-price text-gray-900 dark:text-white font-medium">${item.price} ₽</div>
                <button class="select-btn mt-2 w-full py-1.5 px-3 rounded-lg text-white bg-blue-500 hover:bg-blue-600 transition-colors ${isSelected ? 'bg-green-500 hover:bg-green-600' : ''}"
                        data-link="${link}" ${isSelected ? 'disabled' : ''}>
                    ${isSelected ? 'Выбрано' : 'Выбрать'}
                </button>
            `;

            // Добавляем обработчик для кнопки выбора
            const selectBtn = cardElement.querySelector('.select-btn');
            selectBtn.addEventListener('click', () => {
                // Сохраняем выбор для данного типа мебели
                selectedFurnitureChoices[furnitureType] = {
                    link,
                    item,
                    name: furnitureName
                };

                // Обновляем отображение выбранных элементов
                updateSelectedSquare();

                // Обновляем отображение результатов, чтобы отметить выбранный элемент
                renderFurnitureResults(itemsArr, furnitureName, furnitureType);
            });

            resultsContent.appendChild(cardElement);
        });

        // Показываем контейнер результатов
        resultsContainer.classList.remove('hidden');
    }

    // Вспомогательная функция для показа уведомлений
    function showNotification(message, isError = false) {
        const notification = document.createElement('div');
        notification.className = `notification fade-in ${isError ? 'bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-200' : 'bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-200'}`;
        notification.innerHTML = message;
        notification.style.position = 'fixed';
        notification.style.top = '10%';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
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

    // Добавим функцию для обработки адаптивности при загрузке и изменении размера окна
    function handleResponsiveLayout() {
        const isMobile = window.innerWidth < 576;
        const isSmallMobile = window.innerWidth < 375;

        // Получаем все карточки с мебелью
        const selectedItems = document.querySelectorAll('.selected-item');
        const resultCards = document.querySelectorAll('.furniture-result-card');
        const carouselCards = document.querySelectorAll('.furniture-carousel-card');

        // Применяем адаптивные стили в зависимости от размера экрана
        if (isSmallMobile) {
            // Очень маленькие экраны (до 375px)
            adjustCardSizes(selectedItems, 140, 110);
            adjustCardSizes(resultCards, 130);
            adjustCardSizes(carouselCards, 130);
        } else if (isMobile) {
            // Мобильные устройства (до 576px)
            adjustCardSizes(selectedItems, 160, 130);
            adjustCardSizes(resultCards, 150);
            adjustCardSizes(carouselCards, 140);
        } else {
            // Стандартные размеры для больших экранов
            adjustCardSizes(selectedItems, 200, 160);
            adjustCardSizes(resultCards, 180);
            adjustCardSizes(carouselCards, 180);
        }
    }

    // Вспомогательная функция для изменения размеров карточек
    function adjustCardSizes(elements, cardWidth, imgSize) {
        elements.forEach(element => {
            element.style.width = `${cardWidth}px`;

            // Если передан размер изображения, меняем его
            if (imgSize) {
                const img = element.querySelector('img');
                if (img) {
                    img.style.width = `${imgSize}px`;
                    img.style.height = `${imgSize}px`;
                }
            }
        });
    }

    // Запускаем функцию при загрузке страницы и при изменении размера окна
    window.addEventListener('load', handleResponsiveLayout);
    window.addEventListener('resize', handleResponsiveLayout);

    // Функция для создания карточки выбранной мебели
    function createFurnitureCard(item) {
        // Создаем карточку
        const card = document.createElement('div');
        card.className = 'selected-item';
        card.dataset.itemId = item.id;

        // Добавляем изображение
        const img = document.createElement('img');
        img.src = item.image_url || `/static/images/furniture/${item.type}.jpg`;
        img.alt = item.name;
        card.appendChild(img);

        // Добавляем название
        const label = document.createElement('div');
        label.className = 'item-label';
        label.textContent = item.name;
        card.appendChild(label);

        // Добавляем цену
        const price = document.createElement('div');
        price.className = 'price';
        price.textContent = `${item.price} ₽`;
        card.appendChild(price);

        // Добавляем кнопку "Выбрать"
        const button = document.createElement('button');
        button.className = 'select-btn';
        button.textContent = item.selected ? 'Удалить' : 'Выбрать';
        button.onclick = () => toggleItemSelection(item, button, card);
        card.appendChild(button);

        // Применяем адаптивные стили к созданной карточке
        setTimeout(() => handleResponsiveLayout(), 0);

        return card;
    }
}); 