using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkoutDiary.Api.Data;
using WorkoutDiary.Api.Dto;
using WorkoutDiary.Api.Models;

namespace WorkoutDiary.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PresetsController : ControllerBase
{
    private readonly AppDbContext _db;

    public PresetsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<PresetDto>>> GetAll()
    {
        // В приложении показываем только активные пресеты; мягко удалённые остаются только в истории.
        var presets = await _db.Presets
            .Where(x => !x.IsDeleted)
            .Include(x => x.Items)
            .ThenInclude(x => x.Exercise)
            .OrderBy(x => x.Name)
            .ToListAsync();

        return Ok(presets.Select(ToDto).ToList());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PresetDto>> GetById(int id)
    {
        var preset = await _db.Presets
            .Include(x => x.Items)
            .ThenInclude(x => x.Exercise)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);

        return preset is null ? NotFound() : Ok(ToDto(preset));
    }

    [HttpPost]
    public async Task<ActionResult<PresetDto>> Create(UpsertPresetDto dto)
    {
        var validation = Validate(dto);
        if (validation is not null) return BadRequest(validation);

        var preset = new Preset
        {
            Name = dto.Name.Trim(),
            Items = MapItems(dto.Items)
        };

        _db.Presets.Add(preset);
        await _db.SaveChangesAsync();

        var saved = await _db.Presets
            .Include(x => x.Items)
            .ThenInclude(x => x.Exercise)
            .FirstAsync(x => x.Id == preset.Id);

        return CreatedAtAction(nameof(GetById), new { id = preset.Id }, ToDto(saved));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpsertPresetDto dto)
    {
        var preset = await _db.Presets
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted);

        if (preset is null) return NotFound();

        var validation = Validate(dto);
        if (validation is not null) return BadRequest(validation);

        preset.Name = dto.Name.Trim();
        ApplyItems(preset, dto.Items);

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var preset = await _db.Presets.FindAsync(id);
        if (preset is null) return NotFound();

        if (preset.IsDeleted) return NoContent();

        // Удаление сделано мягким, чтобы старые тренировки не теряли ссылку на использованный пресет.
        preset.IsDeleted = true;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    private static List<PresetExercise> MapItems(List<UpsertPresetItemDto> items) =>
        items.OrderBy(x => x.Order).Select(MapItem).ToList();

    private static PresetExercise MapItem(UpsertPresetItemDto item)
    {
        var presetExercise = new PresetExercise();
        ApplyItemValues(presetExercise, item);
        return presetExercise;
    }

    private static void ApplyItems(Preset preset, List<UpsertPresetItemDto> items)
    {
        var orderedItems = items.OrderBy(x => x.Order).ToList();
        var existingById = preset.Items.ToDictionary(x => x.Id);
        var incomingIds = orderedItems.Where(x => x.Id.HasValue).Select(x => x.Id!.Value).ToHashSet();

        foreach (var removedItem in preset.Items.Where(x => !incomingIds.Contains(x.Id)).ToList())
        {
            preset.Items.Remove(removedItem);
        }

        foreach (var item in orderedItems)
        {
            if (item.Id.HasValue && existingById.TryGetValue(item.Id.Value, out var existingItem))
            {
                ApplyItemValues(existingItem, item);
            }
            else
            {
                preset.Items.Add(MapItem(item));
            }
        }
    }

    private static void ApplyItemValues(PresetExercise presetExercise, UpsertPresetItemDto item)
    {
        // Нормализуем порядок и очищаем поля, не относящиеся к выбранному типу упражнения.
        presetExercise.ExerciseId = item.ExerciseId;
        presetExercise.Order = item.Order;
        presetExercise.Type = item.Type;
        presetExercise.Sets = item.Sets;
        presetExercise.Repetitions = item.Type == ExerciseType.Repetitions ? item.Repetitions : null;
        presetExercise.Seconds = item.Type == ExerciseType.Time ? item.Seconds : null;
    }

    private static string? Validate(UpsertPresetDto dto)
    {
        // Одна валидация используется и для создания, и для редактирования пресета.
        if (string.IsNullOrWhiteSpace(dto.Name)) return "Название пресета обязательно.";
        if (dto.Items.Count == 0) return "В пресете должно быть хотя бы одно упражнение.";

        foreach (var item in dto.Items)
        {
            if (item.ExerciseId <= 0) return "Выберите упражнение.";
            if (item.Order <= 0) return "Порядок должен быть больше нуля.";
            if (item.Sets <= 0) return "Количество подходов должно быть больше нуля.";
            if (item.Type == ExerciseType.Repetitions && (!item.Repetitions.HasValue || item.Repetitions <= 0))
                return "Укажите количество повторений.";
            if (item.Type == ExerciseType.Time && (!item.Seconds.HasValue || item.Seconds <= 0))
                return "Укажите длительность в секундах.";
        }

        return null;
    }

    private static PresetDto ToDto(Preset preset) => new(
        preset.Id,
        preset.Name,
        preset.IsDeleted,
        // Фронту отдаём уже отсортированный список элементов, чтобы не дублировать сортировку в UI.
        preset.Items.OrderBy(x => x.Order).Select(x => new PresetItemDto(
            x.Id,
            x.ExerciseId,
            x.Exercise?.Name ?? string.Empty,
            x.Exercise?.Description ?? string.Empty,
            x.Order,
            x.Type,
            x.Sets,
            x.Repetitions,
            x.Seconds)).ToList());
}
