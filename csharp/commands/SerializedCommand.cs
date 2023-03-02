using System;

namespace wormsem.commands
{
	public class SerializedCommand
	{
		public int? id { get; set; }
		public String? type { get; set; }
		public String[]? strings { get; set; }
		public double[]? doubles { get; set; }
	}
}
