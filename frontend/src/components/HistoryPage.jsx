import { useState } from 'react';
import { api } from '../api';
import {
  EXERCISE_TYPE_REPETITIONS,
  EXERCISE_TYPE_TIME,
  formatDuration,
  formatSetCount,
  getDefaultHistoryFilters,
  pluralizeRussian,
} from '../utils/workout';

function getWorkoutExerciseSummary(setResults = []) {
  const grouped = new Map();

  setResults.forEach((result) => {
    const name = result.exerciseName || 'Упражнение без названия';
    const key = `${name}_${result.type}`;
    const current = grouped.get(key) || {
      name,
      type: result.type,
      sets: 0,
      totalRepetitions: 0,
      totalSeconds: 0,
    };

    current.sets += 1;

    if (result.type === EXERCISE_TYPE_REPETITIONS) {
      current.totalRepetitions += Number(result.actualRepetitions || 0);
    }

    if (result.type === EXERCISE_TYPE_TIME) {
      current.totalSeconds += Number(result.actualSeconds || 0);
    }

    grouped.set(key, current);
  });

  return Array.from(grouped.values());
}

function formatExerciseSummary(summary) {
  const setText = formatSetCount(summary.sets);

  if (summary.type === EXERCISE_TYPE_REPETITIONS) {
    return `${setText}, ${summary.totalRepetitions} ${pluralizeRussian(summary.totalRepetitions, 'повторение', 'повторения', 'повторений')}`;
  }

  if (summary.type === EXERCISE_TYPE_TIME) {
    return `${setText}, ${formatDuration(summary.totalSeconds)}`;
  }

  return setText;
}

export default function HistoryPage() {
  const defaults = getDefaultHistoryFilters();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [search, setSearch] = useState(defaults.search);
  const [items, setItems] = useState([]);

  async function load() {
    // История фильтруется по периоду и по названию пресета.
    const data = await api.getWorkouts(from, to, search);
    setItems(Array.isArray(data) ? data : []);
  }

  function resetFilters() {
    const nextDefaults = getDefaultHistoryFilters();
    setFrom(nextDefaults.from);
    setTo(nextDefaults.to);
    setSearch(nextDefaults.search);
    setItems([]);
  }

  return (
    <section className="card">
      <div className="card-heading">
        <span className="icon-pill">↺</span>
        <div>
          <h2>История тренировок</h2>
          <p className="muted">Фильтруйте записи по периоду и смотрите, какие упражнения были выполнены.</p>
        </div>
      </div>

      <div className="filters history-filters">
        <input
          className="search-input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Поиск по названию пресета"
        />
        <label>С</label>
        <input className="date-input" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        <label>По</label>
        <input className="date-input" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        <button type="button" className="secondary" onClick={resetFilters}>
          Сбросить
        </button>
        <button onClick={load}>Показать</button>
      </div>

      <div className="list">
        {items.map((workout) => {
          const exerciseSummary = getWorkoutExerciseSummary(workout.setResults);

          return (
            <article className="list-item" key={workout.id}>
              <div className="history-item-content">
                <h3>{workout.presetName}</h3>
                <p className="muted">{new Date(workout.startedAt).toLocaleString()} — {new Date(workout.finishedAt).toLocaleString()}</p>
                <p><b>Описание:</b> {workout.note}</p>
                <span className="chip">Выполнено всего: {formatSetCount((workout.setResults || []).length)}</span>

                {exerciseSummary.length > 0 && (
                  <div className="history-exercises">
                    <b>Упражнения:</b>
                    <ul>
                      {exerciseSummary.map((summary) => (
                        <li key={`${summary.name}_${summary.type}`}>
                          <span>{summary.name}</span>
                          <span className="muted">{formatExerciseSummary(summary)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </article>
          );
        })}
        {items.length === 0 && <div className="empty-state"><p className="muted">Выберите период и нажмите «Показать».</p></div>}
      </div>
    </section>
  );
}
