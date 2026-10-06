# Смена — дневник смен водителя

Небольшое full-stack приложение на **Python / FastAPI** для учёта поездок водителя. Сервер хранит данные в JSON, считает дневную сводку и идемпотентно принимает новые поездки. Адаптивный клиент написан на HTML, CSS и vanilla JavaScript.

![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![Tests](https://img.shields.io/badge/tests-pytest-0A9EDC)

## Что сделано

- дневная сводка: число поездок, выручка, комиссия и сумма «на руки»;
- разбивка выручки и количества поездок по наличным и карте;
- список поездок за выбранный день и навигация по датам;
- добавление поездки из интерфейса или напрямую через API;
- Pydantic-валидация суммы, комиссии, дат, часового пояса и способа оплаты;
- защита от повторной записи по уникальному `id`, включая параллельные запросы;
- потокобезопасная и атомарная запись JSON-файла;
- Swagger/OpenAPI-документация из коробки;
- тесты доменной логики, API, валидации и защиты от дублей.

## Стек

- Python 3.11+;
- FastAPI + Pydantic;
- Uvicorn;
- pytest;
- HTML, CSS, vanilla JavaScript.

## Запуск в Docker

Самый короткий способ запуска:

```bash
docker compose up --build
```

Откройте [http://localhost:8000](http://localhost:8000). Папка `data` подключается в контейнер как volume, поэтому добавленные поездки сохраняются между перезапусками.

Остановить приложение:

```bash
docker compose down
```

## Локальный запуск

Создайте виртуальное окружение и установите зависимости:

```bash
python -m venv .venv
```

Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

macOS / Linux:

```bash
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Приложение: [http://localhost:8000](http://localhost:8000)

Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)

Тесты:

```bash
pytest -q
```

## API

### Получить поездки и сводку за день

```http
GET /api/day?date=2026-10-01
```

Ответ содержит `date`, `summary` и `trips`. День поездки определяется в часовом поясе, указанном в ISO-строке `start`.

### Добавить поездку

```http
POST /api/trips
Content-Type: application/json

{
  "id": "t6",
  "start": "2026-10-01T14:10:00+05:00",
  "end": "2026-10-01T14:32:00+05:00",
  "amount": 2100,
  "payment": "card",
  "commission": 315
}
```

- `201 Created` — поездка добавлена;
- `200 OK` и `"duplicate": true` — запрос с таким `id` уже обработан, дубль не создан;
- `422 Unprocessable Entity` — данные не прошли проверку.

Путь к данным можно переопределить переменной окружения `TRIPS_FILE`.

## Структура

```text
app/models.py     Pydantic-модели и валидация
app/domain.py     расчёт дневной сводки
app/store.py      JSON-хранилище и идемпотентность
app/main.py       FastAPI-приложение и маршруты
public/           веб-интерфейс
data/trips.json   демонстрационные данные
tests/            pytest-тесты
Dockerfile        образ приложения
compose.yaml      запуск с постоянным JSON-хранилищем
```

## Как использовался ИИ

ИИ помог подготовить первичный каркас API, интерфейс и тестовые сценарии. Код был проверен и доработан вручную: дата поездки считается в часовом поясе исходной ISO-строки, добавлена строгая Pydantic-валидация и потоковая блокировка с атомарной заменой JSON-файла. Это устраняет гонку в наивной схеме «прочитать — проверить — записать», которая могла создать дубль при одновременных запросах.
