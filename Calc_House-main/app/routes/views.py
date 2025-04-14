@router.get("/test")
async def index_simple():
    """Тестовая страница для проверки работы сервера"""
    return templates.TemplateResponse("index_simple.html", {"request": {}})
