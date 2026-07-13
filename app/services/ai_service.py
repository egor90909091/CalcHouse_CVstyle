import json
import os
import logging
import asyncio
import aiohttp
from dotenv import load_dotenv
from app.models.chat import ChatRequest

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-v4-flash")
CHAT_MAX_TOKENS = int(os.getenv("CHAT_MAX_TOKENS", "8000"))
HTTP_TIMEOUT = int(os.getenv("HTTP_TIMEOUT", "240"))
RETRY_ATTEMPTS = int(os.getenv("RETRY_ATTEMPTS", "2"))

if DEEPSEEK_API_KEY:
    logger.info(f"API ключ DeepSeek найден, длина: {len(DEEPSEEK_API_KEY)}")
else:
    logger.warning("API ключ DeepSeek не найден в переменных окружения")

logger.info(f"Модель чата: {DEEPSEEK_MODEL}, max_tokens: {CHAT_MAX_TOKENS}")


class AIService:
    """Stateless сервис чата с DeepSeek API"""

    _instance = None
    _session = None

    def __new__(cls):
        if not cls._instance:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if hasattr(self, "_initialized"):
            return
        self._initialized = True
        if not DEEPSEEK_API_KEY:
            logger.warning("API ключ DeepSeek не найден в .env файле.")
        else:
            logger.info("Сервис AI инициализирован с DeepSeek API")

    async def init_session(self):
        if not self._session:
            self._session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(
                    total=HTTP_TIMEOUT,
                    connect=30,
                    sock_connect=30,
                    sock_read=HTTP_TIMEOUT,
                ),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                },
            )
            logger.info("Инициализирована HTTP сессия для DeepSeek")

    async def chat(self, request: ChatRequest) -> str:
        if not DEEPSEEK_API_KEY:
            raise RuntimeError("DeepSeek API ключ не настроен (DEEPSEEK_API_KEY в .env)")

        await self.init_session()

        context_json = json.dumps(request.context.model_dump(), ensure_ascii=False)

        system_prompt = (
    "Ты — ИИ-ассистент по строительству с 20-летним опытом. "
    "Пользователь построил смету дома в калькуляторе. "
    f"Вот его смета: {context_json}. "
    "Твоя задача — дать конкретные, практичные советы по строительству, "
    "исходя из материалов из сметы. "
    "О чём говорить: "
    "- Неочевидные нюансы конкретных материалов из сметы: газобетон требует "
    "армпояса под перекрытием и мауэрлатом, иначе трескается; брус 200мм "
    "даёт усадку 2-3 года, нельзя сразу стеклить окна; металлочерепица "
    "нуждается в идеально ровной обрешётке с шагом 350мм, иначе листы "
    "не стыкуются. "
    "- Защитные приёмы для фундамента и кровли: марка бетона не ниже М300, "
    "толщина защитного слоя 40мм, вертикальная гидроизоляция ленты "
    "рубероидом или мембраной, вентиляция подкровельного пространства — "
    "приток через софиты и вытяжка через конёк, шаг обрешётки 350±10мм. "
    "- Соотношение цена-практичность: где можно оптимизировать расходы "
    "без потери качества (например, песчаная подушка 200мм под лентой, "
    "замена монолитного на сборно-монолитное перекрытие, или упрощённый "
    "стропильный шаг для двускатной кровли). "
    "- Конкретные цифры и параметры, применимые на стройке: шаг стропил, "
    "марка бетона, диаметр арматуры, тип гидроизоляции, толщина утеплителя "
    "по региону, и т.д. "
    "Отвечай на русском, ёмко, живо — как опытный прораб объясняет другу. "
    "Форматируй ответ в Markdown: заголовки (##), жирный шрифт, нумерованные "
    "и маркированные списки. Можно использовать таблицы Markdown для "
    "сравнения материалов или параметров. "
    "СТРОГИЕ ЗАПРЕТЫ: "
    "- КАТЕГОРИЧЕСКИ НЕ упоминай в любом виде окна, двери, инженерные сети "
    "(электрику, водопровод, отопление, канализацию) и отделку. "
    "Эти позиции не входят в смету калькулятора и не являются «отсутствием» "
    "или «ошибкой» — они просто рассчитываются отдельно. "
    "НЕ пиши про «скрытые проблемы», «что не учтено», что чего-то «нет» "
    "или «не хватает» в смете. "
    "- НЕ комментируй итоговую стоимость сметы (не говори что она «низкая», "
    "«высокая», «подозрительная» или «нереалистичная»). "
    "- НЕ советуй «перепроверить смету» или «запросить полный расчёт». "
    "- НЕ давай банальных советов вроде «выбирайте качественные материалы» "
    "или «обратитесь к специалисту». "
    "Концентрируйся только на конкретных, полезных, неочевидных советах "
    "по материалам и конструкциям из сметы — с цифрами и параметрами, "
    "которые можно применить прямо на стройке. "
    "ТЕМАТИЧЕСКИЙ КОНТРОЛЬ: "
    "Ты отвечаешь ИСКЛЮЧИТЕЛЬНО на темы строительства, ремонта, материалов, "
    "конструкций, смет и сопутствующих строительных работ. "
    "Если вопрос пользователя НЕ связан со строительством или ремонтом "
    "(например: политика, религия, спорт, наука, программирование, "
    "медицина, финансы, личные отношения, кулинария, путешествия, "
    "развлечения, философия и т.п.) — КАТЕГОРИЧЕСКИ откажись отвечать. "
    "Формат отказа — строго одна короткая фраза в blockquote Markdown: "
    "\"> Этот вопрос вне темы нашей консультации. Я отвечаю только по строительству, "
    "ремонту и материалам из вашей сметы.\" "
    "Не пытайся ответить на поставленный вопрос даже частично, не комментируй его, "
    "не проявляй любопытство. Просто дай отказ вышеуказанным шаблоном. "
    "Если вопрос связан со строительством лишь частично — отвечай только "
    "на строительную часть, остальное игнорируй. "
    "Не вступай в дискуссии о причинах отказа, не извиняйся многословно. "
    "Один отказ — одна строка в blockquote. "
    "ПОЛИТИКА, РЕЛИГИЯ И КОНТРОВЕРСИВНЫЕ ТЕМЫ: "
    "При любых вопросах о политике, религии, национальности, идеологии, "
    "войнах, выборах, общественных дебатах и т.п. — сразу отказ по шаблону, "
    "без каких-либо пояснений или комментариев по существу."
)

        messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
        for msg in request.history:
            messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": request.question})

        payload = {
            "model": DEEPSEEK_MODEL,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": CHAT_MAX_TOKENS,
        }

        last_error = None
        for attempt in range(RETRY_ATTEMPTS):
            try:
                assert self._session is not None
                async with self._session.post(
                    DEEPSEEK_API_URL, json=payload, raise_for_status=True
                ) as response:
                    data = await response.json()
                    answer = data["choices"][0]["message"]["content"]
                    logger.info(f"DeepSeek ответил ({len(answer)} символов)")
                    return answer
            except (aiohttp.ClientError, asyncio.TimeoutError, KeyError) as e:
                last_error = e
                if attempt < RETRY_ATTEMPTS - 1:
                    wait = 2**attempt
                    logger.warning(f"Ошибка ({attempt+1}/{RETRY_ATTEMPTS}): {e}, retry через {wait}с")
                    await asyncio.sleep(wait)
                else:
                    raise

        raise RuntimeError(f"DeepSeek API недоступен после {RETRY_ATTEMPTS} попыток: {last_error}")

    async def close(self):
        if self._session:
            await self._session.close()
            logger.info("HTTP сессия закрыта")