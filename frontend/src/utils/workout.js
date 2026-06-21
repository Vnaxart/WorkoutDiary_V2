export const EXERCISE_TYPE_REPETITIONS = 1;
export const EXERCISE_TYPE_TIME = 2;


export function pluralizeRussian(count, one, few, many) {
  const absCount = Math.abs(count) % 100;
  const lastDigit = absCount % 10;

  if (absCount > 10 && absCount < 20) return many;
  if (lastDigit === 1) return one;
  if (lastDigit >= 2 && lastDigit <= 4) return few;
  return many;
}

export function formatSetCount(count) {
  return `${count} ${pluralizeRussian(count, 'подход', 'подхода', 'подходов')}`;
}

export function getDefaultPresetItem(exerciseId, order) {
  return {
    exerciseId,
    order,
    type: EXERCISE_TYPE_REPETITIONS,
    sets: 3,
    repetitions: 10,
    seconds: null,
  };
}

export function applyPresetItemTypeDefaults(type, currentItem = {}) {

  if (type === EXERCISE_TYPE_TIME) {
    return {
      ...currentItem,
      type,
      repetitions: null,
      seconds: currentItem.seconds ?? 60,
    };
  }

  return {
    ...currentItem,
    type,
    repetitions: currentItem.repetitions ?? 10,
    seconds: null,
  };
}

export function createWorkoutResult(step, startedAt, finishedAt, actualRepetitions) {
    return {
        presetExerciseId: step.presetExerciseId,
        exerciseName: step.exerciseName,
        type: step.type,
        setNumber: step.setNumber,
        plannedRepetitions: step.repetitions,
        plannedSeconds: step.seconds,
        actualRepetitions: step.type === EXERCISE_TYPE_REPETITIONS ? actualRepetitions : null,
        actualSeconds: Math.max(1, Math.round((finishedAt - startedAt) / 1000)),
    };
}

export function getDateInputValue(date = new Date()) {
  const timezoneOffset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

export function getDefaultHistoryFilters() {
  const today = getDateInputValue();

  return {
    from: today,
    to: today,
    search: '',
  };
}


export function formatApproaches(count) {
  return `${count} ${pluralizeRussian(count, 'подход', 'подхода', 'подходов')}`;
}


export function formatRepetitions(count) {
  return `${count} ${pluralizeRussian(count, 'повторение', 'повторения', 'повторений')}`;
}


export function formatSeconds(count) {
  return `${count} ${pluralizeRussian(count, 'секунда', 'секунды', 'секунд')}`;
}


export function formatMinutes(count) {
  return `${count} ${pluralizeRussian(count, 'минута', 'минуты', 'минут')}`;
}


export function formatDuration(seconds) {
  const safeSeconds = Math.max(0, Number(seconds || 0));

  if (safeSeconds < 60) {
    return formatSeconds(safeSeconds);
  }

  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  if (remainingSeconds === 0) {
    return formatMinutes(minutes);
  }

  return `${formatMinutes(minutes)} ${formatSeconds(remainingSeconds)}`;
}


export function formatExerciseDisplay(item) {
  const setText = formatApproaches(item.sets);

  if (item.type === EXERCISE_TYPE_REPETITIONS) {
    const repsText = formatRepetitions(item.repetitions);
    return `${setText} по ${repsText}`;
  }


  const timeText = formatSeconds(item.seconds);
  return `${setText} по ${timeText}`;
}