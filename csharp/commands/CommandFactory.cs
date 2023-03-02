using System;
using System.Text.Json;

namespace wormsem.commands
{
	public class CommandFactory
	{

		public Command Create(String json)
		{
            var serializedCommand = JsonSerializer.Deserialize<SerializedCommand>(json);
			var nullableId = serializedCommand?.id;
			if (nullableId == null)
				throw new Exception("Missing id in command");
			int id = (int)nullableId;
			switch (serializedCommand?.type)
			{
				case "print":
					if (serializedCommand.message == null)
						throw new Exception("Expecting string value");
					return new PrintCommand(id, serializedCommand.message);
				default:
					throw new Exception("Invalid command received: '" + serializedCommand?.type + "'");
			}
        }
    }
}
