// Импортируем нужные компоненты из Framer Motion
const { motion, AnimatePresence } = window.Motion || {};
// Импортируем необходимые хуки из React
const { useState, useEffect, useRef } = React;

// Функция для вывода логов
function log(message, type = 'info') {
    const prefix = '[BuildingAnimation]';
    switch (type) {
        case 'error':
            console.error(`${prefix} ${message}`);
            break;
        case 'warn':
            console.warn(`${prefix} ${message}`);
            break;
        default:
            console.log(`${prefix} ${message}`);
    }
}

// Пустой компонент для анимации строительства дома (отключен в пользу новой анимации чертежной доски)
const BuildingAnimation = () => {
    log("BuildingAnimation компонент инициализирован (отключен)");

    useEffect(() => {
        log("Эффект инициализирован");

        // Функция для показа результатов 
        function showResults() {
            log("Показываем результаты");

            // Показываем результаты
            setTimeout(() => {
                const results = document.getElementById('results');
                if (results) {
                    results.classList.remove('hidden');
                    log("Блок результатов показан");

                    // Показываем анимацию загрузки результатов
                    const loadingAnimation = document.getElementById('loading-animation');
                    if (loadingAnimation) {
                        loadingAnimation.classList.remove('hidden');
                        log("Анимация загрузки показана");
                    }

                    // Через небольшую задержку вызываем функцию отображения результатов
                    setTimeout(() => {
                        if (typeof window.showDemoResults === 'function') {
                            log("Вызываем функцию showDemoResults");
                            window.showDemoResults();
                        } else {
                            log("Функция showDemoResults не найдена", 'error');
                        }
                    }, 1500);
                } else {
                    log("Блок результатов не найден", 'error');
                }
            }, 300);
        }

        // Обработчик события для запуска показа результатов
        const form = document.getElementById('calculatorForm');
        if (form) {
            log("Добавляем обработчик отправки формы");

            const submitHandler = (e) => {
                log("Форма отправлена");
                e.preventDefault();

                // Скрываем форму
                form.classList.add('hidden');
                log("Форма скрыта");

                // Показываем результаты напрямую (пропускаем старую анимацию строительства)
                showResults();
            };

            // Используем capture: true для гарантии выполнения
            form.addEventListener('submit', submitHandler, { capture: true });

            // Cleanup при размонтировании
            return () => {
                form.removeEventListener('submit', submitHandler, { capture: true });
            };
        } else {
            log("Форма калькулятора не найдена", 'warn');
        }
    }, []);

    // Не рендерим ничего
    return null;
};

// Монтируем компонент
ReactDOM.render(
    <BuildingAnimation />,
    document.getElementById('building-animation-container')
); 