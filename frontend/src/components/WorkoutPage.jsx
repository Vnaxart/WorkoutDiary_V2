import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import {
  createWorkoutResult,
  EXERCISE_TYPE_REPETITIONS,
  EXERCISE_TYPE_TIME,
  pluralizeRussian,
  formatApproaches,
  formatDuration,
} from '../utils/workout';

function expandPresetItems(preset) {
  const steps = [];

  preset.items.forEach((item) => {
    for (let setNumber = 1; setNumber <= item.sets; setNumber += 1) {
      steps.push({
        ...item,
        setNumber,
        presetExerciseId: item.id,
      });
    }
  });

  return steps;
}

export default function WorkoutPage({ presets, onWorkoutSaved }) {
  const [presetId, setPresetId] = useState('');
  const [workoutStartedAt, setWorkoutStartedAt] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stepStartedAt, setStepStartedAt] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [results, setResults] = useState([]);
  const [note, setNote] = useState('');
  const [finished, setFinished] = useState(false);
  const [actualRepetitions, setActualRepetitions] = useState('');

  const preset = presets.find((item) => item.id === Number(presetId));
  const steps = useMemo(() => (preset ? expandPresetItems(preset) : []), [preset]);
  const current = steps[currentIndex];
  const inProgress = Boolean(stepStartedAt);
  const progressPercent = steps.length > 0 ? Math.round((results.length / steps.length) * 100) : 0;

  useEffect(() => {
    if (!inProgress || !current || current.type !== EXERCISE_TYPE_TIME) return undefined;

    if (secondsLeft <= 0) {

      finishSet();
      return undefined;
    }

    const timer = setInterval(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearInterval(timer);
  }, [current, inProgress, secondsLeft]);

  function resetWorkoutState() {
    setWorkoutStartedAt(null);
    setCurrentIndex(0);
    setStepStartedAt(null);
    setSecondsLeft(0);
    setResults([]);
    setNote('');
    setFinished(false);
    setActualRepetitions('');
  }

  function startWorkout() {
    setWorkoutStartedAt(new Date());
    setCurrentIndex(0);
    setStepStartedAt(null);
    setSecondsLeft(0);
    setResults([]);
    setNote('');
    setFinished(false);
    setActualRepetitions('');
  }

  function startSet() {
    if (!current) return;

    const now = new Date();
    setStepStartedAt(now);

    if (current.type === EXERCISE_TYPE_TIME) setSecondsLeft(current.seconds);
    if (current.type === EXERCISE_TYPE_REPETITIONS) setActualRepetitions(String(current.repetitions ?? ''));
  }

  function finishSet() {
    if (!current || !stepStartedAt) return;

    const now = new Date();
    const actualValue = current.type === EXERCISE_TYPE_REPETITIONS ? Number(actualRepetitions) : null;

    if (current.type === EXERCISE_TYPE_REPETITIONS && (!actualValue || actualValue <= 0)) return;


    const result = createWorkoutResult(current, stepStartedAt, now, actualValue);

    setResults((items) => [...items, result]);
    setStepStartedAt(null);
    setSecondsLeft(0);
    setActualRepetitions('');

    if (currentIndex + 1 >= steps.length) setFinished(true);
    else setCurrentIndex(currentIndex + 1);
  }

  async function saveWorkout() {
    const now = new Date();


    const setResults = results.map((result) => ({
      presetExerciseId: result.presetExerciseId,
      exerciseName: result.exerciseName,
      type: result.type === EXERCISE_TYPE_REPETITIONS ? 1 : 2,
      setNumber: result.setNumber,
      plannedRepetitions: result.plannedRepetitions,
      plannedSeconds: result.plannedSeconds,
      actualRepetitions: result.actualRepetitions,
      actualSeconds: result.actualSeconds,
    }));

    const payload = {
      presetId: Number(presetId),
      startedAt: workoutStartedAt.toISOString(),
      finishedAt: now.toISOString(),
      note: note.trim(),
      setResults,
    };

    try {
      await api.saveWorkout(payload);
      await onWorkoutSaved();
      resetWorkoutState();
      alert('Тренировка сохранена');
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Ошибка сохранения: ' + error.message);
    }
  }

  return (
    <section className="card">
      <div className="card-heading">
        <span className="icon-pill">▶</span>
        <div>
          <h2>Проведение тренировки</h2>
          <p className="muted">Следуйте шагам пресета, отмечайте фактический результат и сохраняйте тренировку в историю.</p>
        </div>
      </div>

      {!workoutStartedAt && (
        <div className="form compact">
          <label>Выберите пресет</label>
          <select value={presetId} onChange={(event) => setPresetId(event.target.value)}>
            <option value="">Не выбран</option>
            {presets.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <button disabled={!presetId} onClick={startWorkout}>
            Начать тренировку
          </button>
        </div>
      )}

      {workoutStartedAt && current && !finished && (
        <div className="workout-layout">
          <div className="workout-step">
            <p className="muted">Шаг {currentIndex + 1} из {steps.length}</p>
            <h3>{current.exerciseName}</h3>
            <p className="exercise-instruction-text">{current.exerciseDescription}</p>
            <div className="badge">Подход {current.setNumber} из {current.sets}</div>
            <p className="muted">Всего: {formatApproaches(current.sets)}</p>

            {current.type === EXERCISE_TYPE_REPETITIONS ? (
              <p className="target">Нужно выполнить: {current.repetitions} {pluralizeRussian(current.repetitions, 'повторение', 'повторения', 'повторений')}</p>
            ) : (
              <p className="target">Таймер: {formatDuration(secondsLeft || current.seconds)}</p>
            )}

            {!inProgress && <button onClick={startSet}>Начать подход</button>}

            {inProgress && current.type === EXERCISE_TYPE_REPETITIONS && (
              <div className="form compact">
                <label>Фактические повторения</label>
                <input
                  type="number"
                  min="1"
                  value={actualRepetitions}
                  onChange={(event) => setActualRepetitions(event.target.value)}
                />
                <button onClick={finishSet}>Закончить подход</button>
              </div>
            )}

            {inProgress && current.type === EXERCISE_TYPE_TIME && <div className="timer">{secondsLeft}</div>}
          </div>

          <aside className="progress-panel">
            <strong>Прогресс тренировки</strong>
            <div className="progress-bar" aria-label="Прогресс тренировки">
              <span style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="muted">Выполнено {results.length} из {steps.length} подходов</p>
            {preset && <span className="chip">{preset.name}</span>}
          </aside>
        </div>
      )}

      {finished && (
        <div className="form compact">
          <h3>Тренировка завершена</h3>
          <div className="progress-bar" aria-label="Прогресс тренировки">
            <span style={{ width: '100%' }} />
          </div>
          <label>Описание: как прошла тренировка</label>
          <textarea
            rows="6"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Например: всё выполнил, тяжело далась планка..."
            required
          />
          <button disabled={!note.trim()} onClick={saveWorkout}>
            Сохранить тренировку
          </button>
        </div>
      )}
    </section>
  );
}
