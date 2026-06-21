import { useState } from 'react';
import { api } from '../api';
import {
  EXERCISE_TYPE_REPETITIONS,
  EXERCISE_TYPE_TIME,
  formatApproaches,
  formatDuration,
  formatRepetitions,
  getDefaultPresetItem,
  applyPresetItemTypeDefaults,
} from '../utils/workout';

export default function PresetsPage({ exercises, presets, onChanged }) {
  const [name, setName] = useState('');
  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);

  function resetForm() {
    setName('');
    setItems([]);
    setEditingId(null);
  }

  function addItem() {
    if (exercises.length === 0) return;
    setItems([...items, getDefaultPresetItem(exercises[0].id, items.length + 1)]);
  }

  function updateItem(index, patch) {
    setItems(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function removeItem(index) {
    setItems(items.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({
      ...item,
      order: itemIndex + 1,
    })));
  }

  function editPreset(preset) {
    setEditingId(preset.id);
    setName(preset.name);
    setItems(preset.items.map((item) => ({
      id: item.id,
      exerciseId: item.exerciseId,
      order: item.order,
      type: item.type,
      sets: item.sets,
      repetitions: item.repetitions,
      seconds: item.seconds,
    })));
  }

  async function submit(event) {
    event.preventDefault();

    const payload = { name, items };

    if (editingId) await api.updatePreset(editingId, payload);
    else await api.createPreset(payload);

    resetForm();
    await onChanged();
  }

  async function removePreset(id) {
    if (!confirm('Удалить пресет?')) return;

    await api.deletePreset(id);

    if (editingId === id) resetForm();
    await onChanged();
  }

  return (
    <section className="grid two">
      <div className="card wide">
        <div className="card-heading">
          <span className="icon-pill">✓</span>
          <div>
            <h2>{editingId ? 'Редактировать пресет' : 'Создать пресет'}</h2>
            <p className="muted">Соберите тренировочный план: выберите упражнения, тип выполнения, подходы и повторения.</p>
          </div>
        </div>

        <form onSubmit={submit} className="form">
          <label>Название пресета</label>
          <input value={name} onChange={(event) => setName(event.target.value)} required />

          <div className="section-title">
            <h3>Упражнения в пресете</h3>
            <button type="button" className="secondary" onClick={addItem} disabled={exercises.length === 0}>
              Добавить упражнение
            </button>
          </div>

          {items.map((item, index) => (
            <div key={item.id || index} className="preset-editor-row">
              <label className="field preset-exercise-field">
                <span>Упражнение</span>
                <select
                  className="preset-exercise-select"
                  value={item.exerciseId}
                  title={exercises.find((exercise) => exercise.id === Number(item.exerciseId))?.name || ''}
                  onChange={(event) => updateItem(index, { exerciseId: Number(event.target.value) })}
                >
                  {exercises.map((exercise) => (
                    <option key={exercise.id} value={exercise.id} title={exercise.name}>
                      {exercise.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Тип</span>
                <select
                  value={item.type}
                  onChange={(event) => updateItem(index, applyPresetItemTypeDefaults(Number(event.target.value), item))}
                >
                  <option value={EXERCISE_TYPE_REPETITIONS}>Повторения</option>
                  <option value={EXERCISE_TYPE_TIME}>Время</option>
                </select>
              </label>

              <label className="field">
                <span>Подходы</span>
                <input
                  type="number"
                  min="1"
                  value={item.sets}
                  onChange={(event) => updateItem(index, { sets: Number(event.target.value) })}
                  placeholder="Например, 3"
                  aria-label="Количество подходов"
                />
              </label>

              {item.type === EXERCISE_TYPE_REPETITIONS ? (
                <label className="field">
                  <span>Повторения в подходе</span>
                  <input
                    type="number"
                    min="1"
                    value={item.repetitions || ''}
                    onChange={(event) => updateItem(index, { repetitions: Number(event.target.value) })}
                    placeholder="Например, 10"
                    aria-label="Количество повторений в каждом подходе"
                  />
                </label>
              ) : (
                <label className="field">
                  <span>Секунд в подходе</span>
                  <input
                    type="number"
                    min="1"
                    value={item.seconds || ''}
                    onChange={(event) => updateItem(index, { seconds: Number(event.target.value) })}
                    placeholder="Например, 60"
                    aria-label="Длительность каждого подхода в секундах"
                  />
                </label>
              )}

              <button type="button" className="danger preset-row-remove" onClick={() => removeItem(index)} aria-label="Удалить упражнение из пресета">
                ×
              </button>
            </div>
          ))}

          {items.length === 0 && (
            <div className="empty-state">
              <p className="muted">Добавьте хотя бы одно упражнение, чтобы создать пресет.</p>
            </div>
          )}

          <div className="actions">
            <button type="submit" disabled={items.length === 0}>
              {editingId ? 'Сохранить пресет' : 'Создать пресет'}
            </button>
            {editingId && (
              <button type="button" className="secondary" onClick={resetForm}>
                Отмена
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-heading">
          <span className="icon-pill">#</span>
          <div>
            <h2>Готовые пресеты</h2>
            <p className="muted">Выберите готовый план для редактирования или запуска тренировки.</p>
          </div>
        </div>

        <div className="list">
          {presets.map((preset) => (
            <article className="list-item" key={preset.id}>
              <div>
                <h3>{preset.name}</h3>
                <ul className="preset-summary-list">
                  {preset.items.map((item) => (
                    <li className="preset-summary-item" key={item.id}>
                      <strong>{item.exerciseName}</strong>
                      <div className="preset-meta">
                        <span className="chip">Подходы: {formatApproaches(item.sets)}</span>
                        {item.type === EXERCISE_TYPE_REPETITIONS ? (
                          <span className="chip accent">Повторения: {formatRepetitions(item.repetitions)}</span>
                        ) : (
                          <span className="chip warn">Время: {formatDuration(item.seconds)}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="row-actions">
                <button className="secondary" onClick={() => editPreset(preset)}>
                  Изменить
                </button>
                <button className="danger" onClick={() => removePreset(preset.id)}>
                  Удалить
                </button>
              </div>
            </article>
          ))}
          {presets.length === 0 && <div className="empty-state"><p className="muted">Пока нет пресетов. Создайте первый план тренировки выше.</p></div>}
        </div>
      </div>
    </section>
  );
}
