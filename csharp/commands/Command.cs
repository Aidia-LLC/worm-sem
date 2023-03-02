using System;
using wormsem.responses;

namespace wormsem.commands
{
	public abstract class Command
	{
		public int id { get; }

		public Command(int id)
		{
			this.id = id;
		}

		public abstract Response Execute();
	}
}
