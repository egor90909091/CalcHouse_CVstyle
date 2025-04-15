from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

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

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
