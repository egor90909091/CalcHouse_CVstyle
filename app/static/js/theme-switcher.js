/**
 * theme-switcher.js - Скрипт для переключения между светлой и темной темой
 */

document.addEventListener('DOMContentLoaded', function () {
    // Получаем элементы DOM
    const themeToggle = document.getElementById('themeToggle');
    const htmlElement = document.documentElement;
    const bodyElement = document.body;

    // Проверка сохраненной темы
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        htmlElement.classList.remove('light-theme');
        htmlElement.classList.add('dark-theme');
        bodyElement.classList.remove('light-theme');
        bodyElement.classList.add('dark-theme');
    } else {
        htmlElement.classList.add('light-theme');
        htmlElement.classList.remove('dark-theme');
        bodyElement.classList.add('light-theme');
        bodyElement.classList.remove('dark-theme');
    }

    // Функция для обновления стилей контейнера с определенным стилем
    function updateStyleContainerTheme() {
        const isDarkTheme = htmlElement.classList.contains('dark-theme');
        const selectedFurnitureContainer = document.getElementById('selectedFurnitureContainer');

        if (selectedFurnitureContainer && !selectedFurnitureContainer.classList.contains('hidden')) {
            const containerDiv = selectedFurnitureContainer.querySelector('div');
            const selectedFurnitureTitle = document.getElementById('selectedFurnitureTitle');
            const selectedFurnitureContent = document.getElementById('selectedFurnitureContent');

            if (containerDiv && selectedFurnitureTitle && selectedFurnitureContent) {
                // Получаем текущий текст стиля, если он есть
                const styleDiv = selectedFurnitureContent.querySelector('div');
                const styleText = styleDiv ? styleDiv.textContent : '';

                // Применяем стили в зависимости от темы
                if (isDarkTheme) {
                    containerDiv.className = 'p-5 bg-gray-800 rounded-lg border border-gray-700 shadow-sm';
                    selectedFurnitureTitle.className = 'font-medium mb-3 text-center text-white';
                    selectedFurnitureContent.innerHTML = `
                        <div class="text-lg font-medium text-white text-center">${styleText}</div>
                    `;
                } else {
                    containerDiv.className = 'p-5 bg-white rounded-lg border border-gray-200 shadow-sm';
                    selectedFurnitureTitle.className = 'font-medium mb-3 text-center text-gray-900';
                    selectedFurnitureContent.innerHTML = `
                        <div class="text-lg font-medium text-gray-900 text-center">${styleText}</div>
                    `;
                }
            }
        }
    }

    // Вызываем функцию при загрузке страницы
    updateStyleContainerTheme();

    // Обработчик клика для переключения темы
    themeToggle.addEventListener('click', function () {
        // Добавляем класс для анимации свечения
        this.classList.add('switching');

        // Узнаем текущую тему
        const isDarkTheme = htmlElement.classList.contains('dark-theme');

        if (isDarkTheme) {
            // Переключаем на светлую тему
            htmlElement.classList.remove('dark-theme');
            htmlElement.classList.add('light-theme');
            bodyElement.classList.remove('dark-theme');
            bodyElement.classList.add('light-theme');
        } else {
            // Переключаем на темную тему
            htmlElement.classList.add('dark-theme');
            htmlElement.classList.remove('light-theme');
            bodyElement.classList.add('dark-theme');
            bodyElement.classList.remove('light-theme');
        }

        // Обновляем стили контейнера с определенным стилем
        updateStyleContainerTheme();

        // Сохраняем выбор в localStorage
        localStorage.setItem('theme', isDarkTheme ? 'light' : 'dark');

        // Удаляем класс анимации после завершения
        setTimeout(() => {
            this.classList.remove('switching');
        }, 800);
    });
});