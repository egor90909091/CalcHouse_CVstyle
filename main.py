from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

import os
import datetime
from contextlib import asynccontextmanager

from app.api import image_recognition
from app.api.chat import router as chat_router
from app.api.furniture import router as furniture_router
from app.api.v2 import router as v2_router
from app.services.ai_service import AIService


@asynccontextmanager
async def lifespan(app: FastAPI):
    import logging

    logger = logging.getLogger("main")
    logger.info("Инициализация сервисов при запуске приложения...")

    try:
        ai_service = AIService()
        await ai_service.init_session()
        logger.info("Все сервисы успешно инициализированы")
    except Exception as e:
        logger.error(f"Ошибка при инициализации сервисов: {str(e)}")

    yield

    logger.info("Завершение работы...")
    try:
        ai_service = AIService()
        await ai_service.close()
        logger.info("Сервис AI корректно остановлен")
    except Exception as e:
        logger.error(f"Ошибка при очистке: {str(e)}")

    logger.info("Завершено.")


app = FastAPI(
    title="Строительный калькулятор",
    description="API для расчёта стоимости строительства и чата с ИИ-прорабом",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def process_time_middleware(request, call_next):
    import time

    start_time = time.time()
    response = await call_next(request)
    response.headers["X-Process-Time"] = str(time.time() - start_time)
    return response


app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")
templates.env.globals["now"] = lambda: datetime.datetime.now().timestamp()


@app.get("/", response_class=HTMLResponse)
async def root():
    react_path = os.path.join(os.path.dirname(__file__), "app", "static", "react", "index.html")
    if os.path.exists(react_path):
        with open(react_path, encoding="utf-8") as f:
            return HTMLResponse(f.read())
    return HTMLResponse("<h1>Сборка фронтенда не найдена. Запустите: cd frontend && npm run build</h1>", status_code=500)


@app.get("/furniture", response_class=HTMLResponse)
async def furniture_page():
    react_path = os.path.join(os.path.dirname(__file__), "app", "static", "react", "index.html")
    if os.path.exists(react_path):
        with open(react_path, encoding="utf-8") as f:
            return HTMLResponse(f.read())
    return HTMLResponse("<h1>Сборка фронтенда не найдена. Запустите: cd frontend && npm run build</h1>", status_code=500)


app.include_router(chat_router, prefix="/api", tags=["chat"])
app.include_router(image_recognition.router, prefix="/api", tags=["image_recognition"])
app.include_router(furniture_router, prefix="/api", tags=["furniture"])
app.include_router(v2_router, prefix="/api/v2", tags=["v2"])


if __name__ == "__main__":
    import uvicorn
    import logging

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    logger = logging.getLogger("main")
    logger.info("Запуск сервера...")

    uvicorn.run(
        app="main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        timeout_keep_alive=15,
        log_level="info",
    )