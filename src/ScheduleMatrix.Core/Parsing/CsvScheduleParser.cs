using System.IO;
namespace ScheduleMatrix.Core.Parsing;

public class CsvScheduleParser : IScheduleParser
{
public ParseResult Parse(string filePath)
{
    var result = new ParseResult();

    if (!File.Exists(filePath))
    {
        result.Errors.Add("File not found.");
        return result;
    }

    foreach (var line in File.ReadLines(filePath))
    {
        result.Rows.Add(line.Split(','));
    }

    result.Success = true;
    return result;
}
}