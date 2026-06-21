import { useState } from 'react';
import { api } from '../api';

const emptyForm = { name: '', description: '' };

export default function ExercisesPage({ exercises, onChanged }) {
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [selected, setSelected] = useState(null);

  function edit(exercise) {
    setEditingId(exercise.id);
    setForm({ name: exercise.name, description: exercise.description });
  }

  async function submit(e) {
    e.preventDefault();
    if (editingId) await api.updateExercise(editingId, form);
    else await api.createExercise(form);
    setForm(emptyForm);
    setEditingId(null);
    await onChanged();
  }

  async function remove(id) {
    if (!confirm('Удалить упражнение?')) return;
    await api.deleteExercise(id);
    await onChanged();
  }

  return (
    <section className="grid two">
      <div className="card">
        <div className="card-heading">
          <span className="icon-pill">+</span>
          <div>
            <h2>{editingId ? 'Редактировать упражнение' : 'Создать упражнение'}</h2>
            <p className="muted">Добавьте понятное название и подробную инструкцию с переносами строк.</p>
          </div>
        </div>

        <form onSubmit={submit} className="form">
          <label>Название</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <label>Инструкция по выполнению</label>
          <textarea rows="8" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          <div className="actions">
            <button type="submit">{editingId ? 'Сохранить' : 'Добавить'}</button>
            {editingId && <button type="button" className="secondary" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Отмена</button>}
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-heading">
          <span className="icon-pill">🏋</span>
          <div>
            <h2>Список упражнений</h2>
            <p className="muted">База движений, из которой собираются пресеты и тренировки.</p>
          </div>
        </div>

        <div className="list">
          {exercises.map((exercise) => {
            const descriptionPreview = exercise.description.length > 120
              ? `${exercise.description.slice(0, 120)}...`
              : exercise.description;

            return (
              <article key={exercise.id} className="list-item">
                <div>
                  <h3>{exercise.name}</h3>
                  <p className="exercise-instruction-text preview">{descriptionPreview}</p>
                </div>
                <div className="row-actions">
                  <button className="secondary" onClick={() => setSelected(exercise)}>Инструкция</button>
                  <button className="secondary" onClick={() => edit(exercise)}>Изменить</button>
                  <button className="danger" onClick={() => remove(exercise.id)}>Удалить</button>
                </div>
              </article>
            );
          })}
          {exercises.length === 0 && <div className="empty-state"><p className="muted">Пока нет упражнений. Создайте первое упражнение слева.</p></div>}
        </div>
      </div>

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{selected.name}</h2>
            <p className="exercise-instruction-text">{selected.description}</p>
            <button onClick={() => setSelected(null)}>Закрыть</button>
          </div>
        </div>
      )}
    </section>
  );
}
