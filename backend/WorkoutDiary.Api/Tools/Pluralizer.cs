namespace WorkoutDiary.Api.Tools;

public static class Pluralizer
{


    public static string GetApproachForm(int count)
    {
        if (count < 0) count = Math.Abs(count);

        int lastDigit = count % 10;
        int lastTwoDigits = count % 100;


        if (lastTwoDigits >= 11 && lastTwoDigits <= 14)
            return "подходов";

        return lastDigit switch
        {
            1 => "подход",
            2 or 3 or 4 => "подхода",
            _ => "подходов"
        };
    }


    public static string FormatApproaches(int count)
    {
        return $"{count} {GetApproachForm(count)}";
    }
}