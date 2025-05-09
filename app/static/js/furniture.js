document.addEventListener('DOMContentLoaded', () => {
    // Элементы DOM
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const selectFileBtn = document.getElementById('selectFileBtn');
    const changeFileBtn = document.getElementById('changeFileBtn');
    const emptyState = document.getElementById('emptyState');
    const previewState = document.getElementById('previewState');
    const imagePreview = document.getElementById('imagePreview');
    const previewOverlay = document.getElementById('previewOverlay');
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

    // Обработка загрузки файла
    dropZone.addEventListener('drop', handleDrop, false);
    selectFileBtn.addEventListener('click', () => fileInput.click());
    if (changeFileBtn) {
        changeFileBtn.addEventListener('click', () => fileInput.click());
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

            // Переключаем на режим предпросмотра
            emptyState.classList.add('hidden');
            previewState.classList.remove('hidden');

            // Скрываем результаты, если они были показаны
            resultSection.classList.add('hidden');

            // Показываем статус анализа
            analyzingStatus.textContent = 'Анализ изображения...';
            analyzingStatus.classList.remove('hidden');

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
            // В случае ошибки также скрываем индикатор
            analyzingStatus.classList.add('hidden');
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
            item.addEventListener('click', handleFurnitureSelection);
        });
    } else {
        console.error("Не найдено элементов мебели на странице");
    }

    // Функция обработки выбора мебели
    function handleFurnitureSelection() {
        console.log("Нажата кнопка мебели:", this.textContent);

        // Получаем тип мебели из атрибута data-type
        const furnitureType = this.getAttribute('data-type');
        const furnitureName = this.textContent;

        // Используем поисковый термин
        const furnitureSearchTerm = furnitureSearchTerms[furnitureType] || furnitureType;

        // Получаем стиль из результатов анализа
        let currentStyle = 'Modern'; // Значение по умолчанию

        // Если есть результаты анализа, берем стиль из них
        if (window.analysisResults && window.analysisResults.name) {
            // Приводим первую букву к верхнему регистру для соответствия формату
            const detectedStyle = window.analysisResults.name.charAt(0).toUpperCase() +
                window.analysisResults.name.slice(1);

            // Проверяем наличие в списке доступных стилей
            if (availableStyles.includes(detectedStyle)) {
                currentStyle = detectedStyle;
            } else {
                // Для близких совпадений (например, "modern" и "Modern")
                const matchingStyle = availableStyles.find(
                    s => s.toLowerCase() === window.analysisResults.name.toLowerCase()
                );
                if (matchingStyle) {
                    currentStyle = matchingStyle;
                }
            }
        }

        console.log(`Поиск мебели: стиль ${currentStyle}, тип ${furnitureSearchTerm}`);

        // Показываем название выбранной мебели
        if (selectedFurnitureTitle) {
            selectedFurnitureTitle.textContent = furnitureName;
        }

        // Показываем контейнер результатов, если он был скрыт
        if (selectedFurnitureContainer) {
            selectedFurnitureContainer.classList.remove('hidden');
        }

        // Показываем индикатор загрузки
        if (selectedFurnitureContent) {
            selectedFurnitureContent.innerHTML = `
                <div class="flex flex-col items-center py-4">
                    <div class="w-10 h-10 mb-3 relative">
                        <div class="w-full h-full border-2 rounded-full" style="border-color: var(--border-color)"></div>
                        <div class="w-full h-full border-t-2 rounded-full absolute top-0 left-0 animate-spin" style="border-color: var(--accent-color, #60a5fa)"></div>
                    </div>
                    <p style="color: var(--secondary-text)">Загрузка вариантов мебели...</p>
                </div>
            `;
        }

        // Отправляем запрос к API
        fetch('/api/furniture/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                style: currentStyle,
                furniture: furnitureSearchTerm,
                max_items: 6
            })
        })
            .then(response => {
                // Логируем ответ для отладки
                console.log('Response status:', response.status);

                // Если ответ не 200 OK, пробуем получить текст ошибки
                if (!response.ok) {
                    return response.text().then(text => {
                        console.error('Error response:', text);
                        throw new Error(`Server error: ${response.status} ${text}`);
                    });
                }

                return response.json();
            })
            .then(data => {
                console.log('Получен ответ от API:', data);

                if (data.status === 'success' && data.data) {
                    // Отображаем результаты
                    let resultsHTML = '';

                    // Проверяем, есть ли данные
                    const furnitureItems = Object.entries(data.data);

                    if (furnitureItems.length > 0) {
                        resultsHTML = '<div class="grid grid-cols-2 gap-3">';
                        furnitureItems.forEach(([link, itemData]) => {
                            resultsHTML += `
                            <div class="furniture-result-item overflow-hidden">
                                <a href="${link}" target="_blank" rel="noopener noreferrer" class="block rounded-lg shadow-sm border transition-all duration-300">
                                    <div class="p-2">
                                        <img src="${itemData.image_url}" alt="Мебель" class="rounded w-full h-auto mb-2 object-cover">
                                        <p class="text-xs mb-1 truncate">${furnitureName}</p>
                                        <p class="text-xs font-bold">${itemData.price} ₽</p>
                                    </div>
                                </a>
                            </div>
                        `;
                        });
                        resultsHTML += '</div>';
                    } else {
                        resultsHTML = '<p class="text-center py-4">Не найдено подходящей мебели для этого стиля.</p>';
                    }

                    if (selectedFurnitureContent) {
                        selectedFurnitureContent.innerHTML = resultsHTML;
                    }
                } else {
                    if (selectedFurnitureContent) {
                        selectedFurnitureContent.innerHTML = '<p>Ошибка при загрузке данных. Пожалуйста, попробуйте позже.</p>';
                    }
                }
            })
            .catch(error => {
                console.error('API request error:', error);
                if (selectedFurnitureContent) {
                    selectedFurnitureContent.innerHTML = '<p>Произошла ошибка при запросе данных.</p>';
                }
            });
    }
}); 