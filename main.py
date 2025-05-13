from fastapi import FastAPI, Request, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
import os
import time
import asyncio
from pathlib import Path
import datetime
from contextlib import asynccontextmanager

from app.api import calculator, materials, recommendations, image_recognition
from app.api.furniture import router as furniture_router
from app.services.session_service import get_session_service
from app.services.ai_service import AIService


# Определяем lifespan контекстный менеджер вместо on_event
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Код запуска (аналог startup_event)
    import logging

    logger = logging.getLogger("main")
    logger.info("Инициализация сервисов при запуске приложения...")

    try:
        # Инициализация AI сервиса
        ai_service = AIService()

        # Инициализируем сессию
        await ai_service.init_session()

        # Запускаем воркеры
        await ai_service.start_workers()

        logger.info("Все сервисы успешно инициализированы")
    except Exception as e:
        logger.error(f"Ошибка при инициализации сервисов: {str(e)}")
        import traceback

        logger.error(f"Трассировка: {traceback.format_exc()}")

    # Передаем управление FastAPI на время работы приложения
    yield

    # Код завершения (аналог cleanup_sessions)
    logger.info("Выполняется очистка сессий перед завершением работы...")

    try:
        # Корректное завершение работы AI сервиса
        ai_service = AIService()
        await ai_service.close()

        # Закрываем все асинхронные задачи кроме текущей
        tasks = [t for t in asyncio.all_tasks() if t is not asyncio.current_task()]

        # Отменяем задачи
        for task in tasks:
            task.cancel()

        # Ожидаем завершения всех задач с обработкой исключений
        if tasks:
            try:
                # Устанавливаем небольшой таймаут для завершения задач
                await asyncio.wait(tasks, timeout=5.0)
            except asyncio.CancelledError:
                pass  # Игнорируем отмененные задачи

        logger.info("Все асинхронные задачи завершены")
    except Exception as e:
        logger.error(f"Ошибка при очистке сессий: {str(e)}")
        import traceback

        logger.error(f"Трассировка: {traceback.format_exc()}")

    logger.info("Очистка сессий завершена.")


# Создаем экземпляр FastAPI с lifespan
app = FastAPI(
    title="Строительный калькулятор",
    description="API для расчета стоимости строительства и получения рекомендаций",
    version="1.0.0",
    lifespan=lifespan,
)

# Настройка CORS для взаимодействия с фронтендом
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене заменить на конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Middleware для работы с сессиями
@app.middleware("http")
async def session_middleware(request: Request, call_next):
    # Начало обработки запроса
    start_time = time.time()

    # Получаем сервис сессий
    session_service = get_session_service()

    # Получаем или создаем идентификатор сессии
    session_id = session_service.get_or_create_session_id(request)

    # Обрабатываем запрос
    response = await call_next(request)

    # Устанавливаем cookie с идентификатором сессии
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        max_age=3600 * 24,  # 24 часа
        samesite="lax",
    )

    # Логируем время выполнения запроса
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)

    return response


# Подключение статических файлов
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Настройка шаблонов
templates = Jinja2Templates(directory="app/templates")

# Добавляем функцию now() в контекст Jinja2
templates.env.globals["now"] = lambda: datetime.datetime.now().timestamp()


# Главная страница
@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/furniture", response_class=HTMLResponse)
async def furniture(request: Request):
    return templates.TemplateResponse("furniture.html", {"request": request})


# Подключение маршрутов API
app.include_router(calculator.router, prefix="/api", tags=["calculator"])
app.include_router(materials.router, prefix="/api", tags=["materials"])
app.include_router(recommendations.router, prefix="/api", tags=["recommendations"])
app.include_router(image_recognition.router, prefix="/api", tags=["image_recognition"])
app.include_router(furniture_router, prefix="/api", tags=["furniture"])


def safe_float(value, default=0):
    if isinstance(value, list):
        # Если это список, возьмите первое значение или используйте значение по умолчанию
        return float(value[0]) if value else default
    return float(value) if value is not None else default


if __name__ == "__main__":
    import uvicorn
    import signal
    import sys
    import logging
    from uvicorn.config import Config

    # Настройка логирования
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    logger = logging.getLogger("main")

    # Запускаем сервер с таймаутом для сокетов
    config = Config(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        timeout_keep_alive=15,
        timeout_graceful_shutdown=10,  # Увеличиваем время для корректного завершения
    )

    logger.info("Запуск сервера...")

    # Вместо запуска server.run() и регистрации обработчиков сигналов
    # используем встроенные механизмы uvicorn
    uvicorn.run(
        app="main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        timeout_keep_alive=15,
        log_level="info",
    )
