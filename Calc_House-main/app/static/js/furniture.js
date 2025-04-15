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
}); 