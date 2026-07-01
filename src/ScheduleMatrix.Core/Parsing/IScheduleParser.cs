namespace ScheduleMatrix.Core.Parsing;

public interface IScheduleParser
{
    ParseResult Parse(string filePath);
}