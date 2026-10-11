import { useEffect, useState } from "react";

function QuestionField({ question, value, onChange }) {
  const { id, text, type, required, options, min, max } = question;

  return (
    <fieldset className="question">
      <legend>
        {text}
        {required ? " *" : " (необязательно)"}
      </legend>

      {type === "single_choice" &&
        options.map((option) => (
          <label key={option} className="option">
            <input
              type="radio"
              name={id}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              required={required}
            />
            {option}
          </label>
        ))}

      {type === "multiple_choice" &&
        options.map((option) => {
          const selected = Array.isArray(value) ? value : [];
          return (
            <label key={option} className="option">
              <input
                type="checkbox"
                name={`${id}-${option}`}
                checked={selected.includes(option)}
                onChange={(event) => {
                  if (event.target.checked) {
                    onChange([...selected, option]);
                  } else {
                    onChange(selected.filter((item) => item !== option));
                  }
                }}
              />
              {option}
            </label>
          );
        })}

      {type === "text" && (
        <textarea
          name={id}
          rows={3}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          required={required}
        />
      )}

      {type === "scale" && (
        <div className="scale">
          {Array.from({ length: max - min + 1 }, (_, index) => min + index).map(
            (n) => (
              <label key={n} className="option">
                <input
                  type="radio"
                  name={id}
                  value={n}
                  checked={value === n}
                  onChange={() => onChange(n)}
                  required={required}
                />
                {n}
              </label>
            )
          )}
        </div>
      )}

      {type === "boolean" && (
        <div className="boolean">
          <label className="option">
            <input
              type="radio"
              name={id}
              checked={value === true}
              onChange={() => onChange(true)}
              required={required}
            />
            Да
          </label>
          <label className="option">
            <input
              type="radio"
              name={id}
              checked={value === false}
              onChange={() => onChange(false)}
              required={required}
            />
            Нет
          </label>
        </div>
      )}
    </fieldset>
  );
}

export default function App() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch("/questions")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Не удалось загрузить вопросы");
        }
        return response.json();
      })
      .then((data) => {
        setQuestions(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  function updateAnswer(questionId, value) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    for (const question of questions) {
      const value = answers[question.id];
      if (question.required) {
        if (
          value === undefined ||
          value === "" ||
          (Array.isArray(value) && value.length === 0)
        ) {
          setError(`Заполните обязательный вопрос: ${question.text}`);
          return;
        }
      }
    }

    const payload = {
      answers: Object.entries(answers)
        .filter(([, value]) => {
          if (value === undefined || value === "") return false;
          if (Array.isArray(value) && value.length === 0) return false;
          return true;
        })
        .map(([questionId, value]) => ({ questionId, value })),
    };

    setSending(true);
    try {
      const response = await fetch("/answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const detail = body?.detail;
        const message = Array.isArray(detail)
          ? detail.map((item) => item.msg || JSON.stringify(item)).join("; ")
          : detail || "Не удалось отправить ответы";
        throw new Error(message);
      }

      setSubmitted(true);
    } catch (err) {
      setError(
        typeof err.message === "string"
          ? err.message
          : "Не удалось отправить ответы"
      );
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <main className="page">
        <p>Загрузка вопросов…</p>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="page">
        <h1>Спасибо!</h1>
        <p>Ваши ответы сохранены.</p>
      </main>
    );
  }

  return (
    <main className="page">
      <h1>Мини-анкета</h1>
      <p className="lead">
        По результатам урока «Настройка рабочих сред ИИ»
      </p>

      <form onSubmit={handleSubmit}>
        {questions.map((question) => (
          <QuestionField
            key={question.id}
            question={question}
            value={answers[question.id]}
            onChange={(value) => updateAnswer(question.id, value)}
          />
        ))}

        {error && <p className="error">{String(error)}</p>}

        <button type="submit" disabled={sending}>
          {sending ? "Отправка…" : "Отправить"}
        </button>
      </form>
    </main>
  );
}
