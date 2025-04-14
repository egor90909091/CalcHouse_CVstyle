# Строительный калькулятор

Современный веб-сайт на FastAPI с интерактивным калькулятором стоимости строительства дома и системой ИИ-рекомендаций.

## Функциональность

- Калькулятор стоимости строительства дома с учетом различных параметров
- Получение актуальных цен на строительные материалы
- ИИ-рекомендации по оптимизации строительства на основе введенных параметров
- Современный адаптивный интерфейс

## Технический стек

### Backend
- FastAPI
- Pydantic
- aiohttp
- Uvicorn

### Frontend
- React.js
- Tailwind CSS

## Установка и запуск

1. Клонируйте репозиторий:
```
git clone https://github.com/yourusername/construction-calculator.git
cd construction-calculator
```

2. Создайте и активируйте виртуальное окружение:
```
python -m venv venv
source venv/bin/activate  # На Windows: venv\Scripts\activate
```

3. Установите зависимости:
```
pip install -r requirements.txt
```

4. Создайте файл .env в корневой директории и добавьте в него:
```
OPENAI_API_KEY=ваш_ключ_api
```

5. Запустите сервер:
```
python main.py
```

6. Откройте в браузере: http://localhost:8000

## API Endpoints

- `/api/calculate` - Расчет стоимости строительства
- `/api/materials` - Получение актуальных материалов и цен
- `/api/recommendations` - Получение ИИ-рекомендаций
