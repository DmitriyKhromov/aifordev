# Мини-анкета

Учебное full-stack приложение: анкета по результатам урока «Настройка рабочих сред ИИ».

## Стек

- Backend: Python, FastAPI
- Frontend: React + Vite
- Хранение ответов: в памяти процесса (список)
- Запуск: один Docker-образ, порт `8080`

## API

### `GET /questions`

Возвращает 5 вопросов. Типы:

| Тип | Описание |
| --- | --- |
| `single_choice` | один вариант |
| `multiple_choice` | несколько вариантов |
| `text` | свободный текст |
| `scale` | оценка 1–5 |
| `boolean` | да / нет |

Вопросы `q1`–`q4` обязательные, `q5` — необязательный.

### `POST /answers`

Принимает ответы, проверяет `questionId` и обязательность, сохраняет отправку в общий список в памяти.

Пример тела:

```json
{
  "answers": [
    { "questionId": "q1", "value": "Cursor" },
    { "questionId": "q2", "value": ["MCP-серверы", "Skills / навыки агента"] },
    { "questionId": "q3", "value": "Настроил правила проекта" },
    { "questionId": "q4", "value": 4 },
    { "questionId": "q5", "value": true }
  ]
}
```

Ответ `201`:

```json
{ "sessionId": "..." }
```

## Запуск через Docker

```bash
docker build -t mini-anketa .
docker run --rm -p 8080:8080 mini-anketa
```

Чтобы сохранить образ в файл для сдачи:

```bash
docker save mini-anketa:latest -o mini-anketa.tar
```

Откройте в браузере: [http://localhost:8080](http://localhost:8080)

Образ собран на `python:3.12-alpine` и без extras `uvicorn[standard]`, чтобы уменьшить размер.

Frontend обращается к API по относительным путям `/questions` и `/answers` — backend раздаёт и API, и собранный UI из одного контейнера.
