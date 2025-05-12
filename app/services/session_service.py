import os
import json
import logging
import time
from datetime import datetime
from typing import Dict, Optional, Any
from fastapi import Request, Depends
from pathlib import Path

logger = logging.getLogger(__name__)

# Время жизни сессии в секундах (по умолчанию 24 часа)
SESSION_TTL = int(os.getenv("SESSION_TTL", "86400"))

# Максимальное количество запросов в истории для каждого пользователя
MAX_HISTORY_ITEMS = int(os.getenv("MAX_HISTORY_ITEMS", "10"))


class SessionService:
    """Сервис для управления пользовательскими сессиями и историей запросов"""

    def __init__(self):
        """Инициализация сервиса сессий"""
        # Путь к директории для хранения данных сессий
        self.data_dir = Path(__file__).parent.parent / "static" / "data" / "sessions"
        os.makedirs(self.data_dir, exist_ok=True)

        # Словарь активных сессий: session_id -> session_data
        self.active_sessions = {}

        # Загружаем существующие сессии
        self._load_existing_sessions()

        logger.info(
            f"Инициализирован сервис сессий, загружено {len(self.active_sessions)} активных сессий"
        )

    def _load_existing_sessions(self):
        """Загрузка существующих сессий из файловой системы"""
        try:
            for session_file in self.data_dir.glob("session_*.json"):
                try:
                    with open(session_file, "r", encoding="utf-8") as f:
                        session_data = json.load(f)

                    # Проверяем, не истекла ли сессия
                    session_id = session_file.stem.replace("session_", "")
                    last_activity = session_data.get("last_activity", 0)

                    if time.time() - last_activity <= SESSION_TTL:
                        self.active_sessions[session_id] = session_data
                    else:
                        # Удаляем истекшие сессии
                        session_file.unlink(missing_ok=True)

                except Exception as e:
                    logger.error(
                        f"Ошибка при загрузке файла сессии {session_file}: {str(e)}"
                    )
        except Exception as e:
            logger.error(f"Ошибка при загрузке существующих сессий: {str(e)}")

    def get_or_create_session_id(self, request: Request) -> str:
        """
        Получение или создание идентификатора сессии пользователя
        """
        # Проверяем, есть ли идентификатор сессии в cookies
        session_id = request.cookies.get("session_id")

        # Проверяем, существует ли сессия и не истекла ли она
        if session_id and session_id in self.active_sessions:
            # Обновляем время последней активности
            self.active_sessions[session_id]["last_activity"] = time.time()
            return session_id

        # Создаем новый идентификатор сессии
        import uuid

        session_id = str(uuid.uuid4())

        # Создаем новую сессию
        self.active_sessions[session_id] = {
            "created_at": time.time(),
            "last_activity": time.time(),
            "user_agent": request.headers.get("user-agent", ""),
            "ip": request.client.host if request.client else None,
            "request_history": [],
        }

        # Сохраняем сессию в файл
        self._save_session(session_id)

        logger.info(f"Создана новая сессия: {session_id}")
        return session_id

    def _save_session(self, session_id: str):
        """Сохранение данных сессии в файл"""
        try:
            session_file = self.data_dir / f"session_{session_id}.json"
            with open(session_file, "w", encoding="utf-8") as f:
                json.dump(
                    self.active_sessions[session_id], f, ensure_ascii=False, indent=2
                )
        except Exception as e:
            logger.error(f"Ошибка при сохранении сессии {session_id}: {str(e)}")

    async def save_request_history(
        self, session_id: str, request_id: str, request: Any, response: Any
    ):
        """
        Асинхронное сохранение истории запросов для пользователя
        """
        try:
            if session_id not in self.active_sessions:
                logger.warning(
                    f"Попытка сохранить историю для несуществующей сессии: {session_id}"
                )
                return

            # Создаем запись о запросе
            history_item = {
                "request_id": request_id,
                "timestamp": datetime.now().isoformat(),
                "calculator_data": {
                    "area": request.calculator_data.area,
                    "foundation_type": request.calculator_data.foundation_type.value,
                    "wall_material": request.calculator_data.wall_material.value,
                    "roof_type": request.calculator_data.roof_type.value,
                    "floors": request.calculator_data.floors,
                },
                "summary": response.summary,
                "recommendation_count": len(response.recommendations),
            }

            # Добавляем запись в историю запросов пользователя
            session_data = self.active_sessions[session_id]
            session_data["request_history"].append(history_item)

            # Ограничиваем количество записей в истории
            if len(session_data["request_history"]) > MAX_HISTORY_ITEMS:
                session_data["request_history"] = session_data["request_history"][
                    -MAX_HISTORY_ITEMS:
                ]

            # Обновляем время последней активности
            session_data["last_activity"] = time.time()

            # Сохраняем сессию
            self._save_session(session_id)

            logger.debug(
                f"Сохранена история запроса {request_id} для сессии {session_id}"
            )

        except Exception as e:
            logger.error(
                f"Ошибка при сохранении истории запроса {request_id}: {str(e)}"
            )

    def get_session_data(self, session_id: str) -> Optional[Dict]:
        """
        Получение данных сессии пользователя
        """
        if session_id not in self.active_sessions:
            return None

        # Обновляем время последней активности
        self.active_sessions[session_id]["last_activity"] = time.time()
        self._save_session(session_id)

        return self.active_sessions[session_id]


# Создаем синглтон сервиса сессий
_session_service = None


def get_session_service() -> SessionService:
    """
    Фабрика для получения экземпляра сервиса сессий
    """
    global _session_service
    if _session_service is None:
        _session_service = SessionService()
    return _session_service
