using System.Data;
using System.Reflection;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using WorkoutDiary.Api.Data;


var builder = WebApplication.CreateBuilder(args);
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string DefaultConnection is missing.");

builder.WebHost.UseUrls(builder.Configuration["Urls"] ?? "http://localhost:5090");
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Workout Diary API",
        Version = "v1",
        Description = "API для управления упражнениями, пресетами и историей тренировок."
    });

    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod());
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

var app = builder.Build();


await EnsureDatabaseSchemaAsync(app.Services);

app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.DocumentTitle = "Workout Diary Swagger";
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "Workout Diary API v1");
});

app.UseCors("Frontend");
app.UseAuthorization();
app.MapControllers();
app.Run();

static async Task EnsureDatabaseSchemaAsync(IServiceProvider services)
{
    using var scope = services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();


    await db.Database.EnsureCreatedAsync();

    var requiredColumns = new (string TableName, string ColumnName, string Definition)[]
    {
        ("Presets", "IsDeleted", "tinyint(1) NOT NULL DEFAULT 0"),
        ("WorkoutSessions", "FinishedAt", "datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)"),
        ("WorkoutSetResults", "PresetExerciseId", "int NOT NULL DEFAULT 0"),
        ("WorkoutSetResults", "ExerciseName", "varchar(120) NOT NULL DEFAULT ''"),
        ("WorkoutSetResults", "Type", "varchar(20) NOT NULL DEFAULT 'Repetitions'"),
        ("WorkoutSetResults", "SetNumber", "int NOT NULL DEFAULT 1"),
        ("WorkoutSetResults", "PlannedRepetitions", "int NULL"),
        ("WorkoutSetResults", "PlannedSeconds", "int NULL"),
        ("WorkoutSetResults", "ActualRepetitions", "int NULL"),
        ("WorkoutSetResults", "ActualSeconds", "int NOT NULL DEFAULT 1"),
        ("WorkoutSetResults", "StartedAt", "datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)"),
        ("WorkoutSetResults", "FinishedAt", "datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)")
    };

    foreach (var (tableName, columnName, definition) in requiredColumns)
    {
        await AddColumnIfMissingAsync(db, tableName, columnName, definition);
    }
}

static async Task AddColumnIfMissingAsync(AppDbContext db, string tableName, string columnName, string definition)
{
    var connection = db.Database.GetDbConnection();
    var shouldCloseConnection = connection.State == ConnectionState.Closed;

    if (shouldCloseConnection)
    {
        await connection.OpenAsync();
    }

    try
    {
        using var checkCommand = connection.CreateCommand();
        checkCommand.CommandText = @"
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = @tableName
              AND COLUMN_NAME = @columnName";

        var tableParameter = checkCommand.CreateParameter();
        tableParameter.ParameterName = "@tableName";
        tableParameter.Value = tableName;
        checkCommand.Parameters.Add(tableParameter);

        var columnParameter = checkCommand.CreateParameter();
        columnParameter.ParameterName = "@columnName";
        columnParameter.Value = columnName;
        checkCommand.Parameters.Add(columnParameter);

        var exists = Convert.ToInt32(await checkCommand.ExecuteScalarAsync()) > 0;
        if (exists) return;

        using var alterCommand = connection.CreateCommand();
        alterCommand.CommandText = $"ALTER TABLE `{tableName}` ADD COLUMN `{columnName}` {definition}";
        await alterCommand.ExecuteNonQueryAsync();
    }
    finally
    {
        if (shouldCloseConnection)
        {
            await connection.CloseAsync();
        }
    }
}
