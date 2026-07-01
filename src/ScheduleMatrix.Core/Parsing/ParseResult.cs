namespace ScheduleMatrix.Core.Parsing;

public class ParseResult
{
    public bool Success { get; set; }

    public List<string> Errors { get; } = new();

    public List<string[]> Rows { get; } = new();
}