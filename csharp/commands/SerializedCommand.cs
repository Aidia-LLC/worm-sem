using System;

namespace wormsem.commands
{
	public class SerializedCommand
	{
		public int? id { get; set; }
		public String? type { get; set; }
		public String? message { get; set; }
		public double[]? data { get; set; }
	}
}
