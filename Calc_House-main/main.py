from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
import os

from app.api import calculator, materials, recommendations, image_recognition

app = FastAPI(
    title="Строительный калькулятор",
    description="API для расчета стоимости строительства и получения рекомендаций",
    version="1.0.0",
)

# Настройка CORS для взаимодействия с фронтендом
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене заменить на конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение статических файлов
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Настройка шаблонов
templates = Jinja2Templates(directory="app/templates")


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
    from app.services.ai_service import AIService

    # Настройка логирования
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger("main")

    # Обработчик сигнала прерывания
    def handle_shutdown(signum, frame):
        logger.info("Получен сигнал прерывания, выполняем корректное завершение...")

        # Закрываем все сессии и ресурсы
        try:
            # Закрываем сессию DeepSeek API если есть
            ai_service = AIService()
            if hasattr(ai_service, "session") and ai_service.session:
                logger.info("Закрываем сессию DeepSeek API")
                ai_service.session.close()

            # Любые другие ресурсы, которые нужно освободить
            logger.info("Все ресурсы корректно освобождены")
        except Exception as e:
            logger.error(f"Ошибка при закрытии ресурсов: {str(e)}")

        sys.exit(0)

    # Регистрируем обработчики сигналов
    signal.signal(signal.SIGINT, handle_shutdown)  # Ctrl+C
    signal.signal(signal.SIGTERM, handle_shutdown)  # kill

    # Запускаем сервер с таймаутом для сокетов
    config = Config(
        "main:app", host="0.0.0.0", port=8001, reload=True, timeout_keep_alive=5
    )
    server = uvicorn.Server(config)

    try:
        logger.info("Запуск сервера...")
        server.run()
    except KeyboardInterrupt:
        logger.info(
            "Прерывание с клавиатуры (Ctrl+C), выполняем корректное завершение..."
        )
        handle_shutdown(None, None)
