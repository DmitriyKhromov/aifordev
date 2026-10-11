from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

QUESTIONS: list[dict[str, Any]] = [
    {
        "id": "q1",
        "text": "Какой инструмент вы выбрали основной средой для работы с ИИ-агентом?",
        "type": "single_choice",
        "required": True,
        "options": [
            "Cursor",
            "VS Code + расширение",
            "JetBrains IDE",
            "Другое",
        ],
    },
    {
        "id": "q2",
        "text": "Какие элементы окружения вы уже настроили? (можно несколько)",
        "type": "multiple_choice",
        "required": True,
        "options": [
            "Правила проекта (.cursor/rules)",
            "Skills / навыки агента",
            "MCP-серверы",
            "Переменные окружения / API-ключи",
            "Шаблоны промптов",
        ],
    },
    {
        "id": "q3",
        "text": "Опишите кратко, какая задача у вас лучше всего получилась с помощью ИИ на уроке.",
        "type": "text",
        "required": True,
    },
    {
        "id": "q4",
        "text": "Оцените, насколько уверенно вы теперь настраиваете рабочую среду ИИ (1 — совсем нет, 5 — уверенно).",
        "type": "scale",
        "required": True,
        "min": 1,
        "max": 5,
    },
    {
        "id": "q5",
        "text": "Планируете ли вы использовать эти настройки в реальном проекте на этой неделе?",
        "type": "boolean",
        "required": False,
    },
]

QUESTIONS_BY_ID = {q["id"]: q for q in QUESTIONS}

submissions: list[dict[str, Any]] = []

app = FastAPI(title="Мини-анкета")


class AnswerItem(BaseModel):
    questionId: str
    value: Any


class AnswersPayload(BaseModel):
    answers: list[AnswerItem] = Field(min_length=1)


class SubmitResponse(BaseModel):
    sessionId: str


def _validate_answer_value(question: dict[str, Any], value: Any) -> None:
    qtype = question["type"]
    qid = question["id"]

    if qtype == "single_choice":
        if not isinstance(value, str) or value not in question["options"]:
            raise HTTPException(
                status_code=400,
                detail=f"Некорректный ответ для вопроса {qid}: ожидается один из вариантов",
            )
    elif qtype == "multiple_choice":
        if (
            not isinstance(value, list)
            or not value
            or not all(isinstance(v, str) for v in value)
            or not all(v in question["options"] for v in value)
        ):
            raise HTTPException(
                status_code=400,
                detail=f"Некорректный ответ для вопроса {qid}: ожидается список вариантов",
            )
    elif qtype == "text":
        if not isinstance(value, str) or not value.strip():
            raise HTTPException(
                status_code=400,
                detail=f"Некорректный ответ для вопроса {qid}: ожидается непустой текст",
            )
    elif qtype == "scale":
        if not isinstance(value, int) or not (
            question["min"] <= value <= question["max"]
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Некорректный ответ для вопроса {qid}: "
                    f"ожидается целое число от {question['min']} до {question['max']}"
                ),
            )
    elif qtype == "boolean":
        if not isinstance(value, bool):
            raise HTTPException(
                status_code=400,
                detail=f"Некорректный ответ для вопроса {qid}: ожидается true/false",
            )


@app.get("/questions")
def get_questions() -> list[dict[str, Any]]:
    return QUESTIONS


@app.post("/answers", status_code=201, response_model=SubmitResponse)
def post_answers(payload: AnswersPayload) -> SubmitResponse:
    seen: set[str] = set()
    normalized: dict[str, Any] = {}

    for item in payload.answers:
        if item.questionId not in QUESTIONS_BY_ID:
            raise HTTPException(
                status_code=400,
                detail=f"Неизвестный questionId: {item.questionId}",
            )
        if item.questionId in seen:
            raise HTTPException(
                status_code=400,
                detail=f"Дублирующий questionId: {item.questionId}",
            )
        seen.add(item.questionId)
        question = QUESTIONS_BY_ID[item.questionId]
        _validate_answer_value(question, item.value)
        normalized[item.questionId] = item.value

    for question in QUESTIONS:
        if question["required"] and question["id"] not in normalized:
            raise HTTPException(
                status_code=400,
                detail=f"Отсутствует обязательный ответ: {question['id']}",
            )

    session_id = str(uuid.uuid4())
    submissions.append(
        {
            "sessionId": session_id,
            "answers": [
                {"questionId": qid, "value": value}
                for qid, value in normalized.items()
            ],
        }
    )
    return SubmitResponse(sessionId=session_id)


STATIC_DIR = Path(__file__).resolve().parent / "static"

if STATIC_DIR.exists():
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
