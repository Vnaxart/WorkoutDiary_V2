using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkoutDiary.Api.Data;
using WorkoutDiary.Api.Dto;
using WorkoutDiary.Api.Models;

namespace WorkoutDiary.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ExercisesController : ControllerBase
{
    private readonly AppDbContext _db;
    public ExercisesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<ExerciseDto>>> GetAll() =>
        Ok(await _db.Exercises.OrderBy(x => x.Name).Select(x => new ExerciseDto(x.Id, x.Name, x.Description)).ToListAsync());

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ExerciseDto>> GetById(int id)
    {
        var x = await _db.Exercises.FindAsync(id);
        return x is null ? NotFound() : Ok(new ExerciseDto(x.Id, x.Name, x.Description));
    }

    [HttpPost]
    public async Task<ActionResult<ExerciseDto>> Create(UpsertExerciseDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Description))
            return BadRequest("Название и инструкция обязательны.");
        var x = new Exercise { Name = dto.Name.Trim(), Description = dto.Description.Trim() };
        _db.Exercises.Add(x);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = x.Id }, new ExerciseDto(x.Id, x.Name, x.Description));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpsertExerciseDto dto)
    {
        var x = await _db.Exercises.FindAsync(id);
        if (x is null) return NotFound();
        if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Description))
            return BadRequest("Название и инструкция обязательны.");
        x.Name = dto.Name.Trim();
        x.Description = dto.Description.Trim();
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var x = await _db.Exercises.FindAsync(id);
        if (x is null) return NotFound();

        var isUsedInActivePresets = await _db.PresetExercises
            .AnyAsync(item => item.ExerciseId == id && item.Preset != null && !item.Preset.IsDeleted);

        if (isUsedInActivePresets)
            return Conflict("Нельзя удалить упражнение, которое используется в активных пресетах.");

        // Если упражнение осталось только в мягко удалённых пресетах, такие связи больше не нужны
        // для новых тренировок и не должны блокировать удаление упражнения. История тренировок
        // уже хранит название упражнения и выполненные значения отдельно в WorkoutSetResults.
        var deletedPresetItems = await _db.PresetExercises
            .Where(item => item.ExerciseId == id && item.Preset != null && item.Preset.IsDeleted)
            .ToListAsync();

        _db.PresetExercises.RemoveRange(deletedPresetItems);
        _db.Exercises.Remove(x);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
