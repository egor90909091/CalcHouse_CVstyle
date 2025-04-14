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

        // Сохраняем выбор в localStorage
        localStorage.setItem('theme', isDarkTheme ? 'light' : 'dark');

        // Удаляем класс анимации после завершения
        setTimeout(() => {
            this.classList.remove('switching');
        }, 800);
    });
});