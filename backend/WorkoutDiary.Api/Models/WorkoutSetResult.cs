namespace WorkoutDiary.Api.Models;

public class WorkoutSetResult
{
    public int Id { get; set; }
    public int WorkoutSessionId { get; set; }
    public WorkoutSession? WorkoutSession { get; set; }


    public int PresetExerciseId { get; set; }
    public PresetExercise? PresetExercise { get; set; }

    public string ExerciseName { get; set; } = string.Empty;
    public ExerciseType Type { get; set; }
    public int SetNumber { get; set; }


    public int? PlannedRepetitions { get; set; }
    public int? PlannedSeconds { get; set; }


    public int? ActualRepetitions { get; set; }
    public int ActualSeconds { get; set; }


    public DateTime StartedAt { get; set; }
    public DateTime FinishedAt { get; set; }
}