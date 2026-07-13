from typing import Literal
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=8000)


class ChatContextItem(BaseModel):
    name: str
    qty: float
    unit: str


class ChatContextSection(BaseModel):
    items: list[ChatContextItem] = []


class ChatContext(BaseModel):
    footprint_area_m2: float
    perimeter_m: float
    foundation_length_m: float
    roof_area_m2: float
    floors_count: int
    foundation: ChatContextSection
    walls: ChatContextSection
    floors: ChatContextSection
    roof: ChatContextSection


class ChatRequest(BaseModel):
    context: ChatContext
    history: list[ChatMessage] = []
    question: str = Field(max_length=1000)


class ChatResponse(BaseModel):
    answer: str