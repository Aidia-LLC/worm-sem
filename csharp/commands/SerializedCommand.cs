using System;

namespace wormsem.commands
{
	public class SerializedCommand
	{
		public int? id { get; set; }
		public String? type { get; set; }
		public String? message { get; set; }
		public short? x { get; set; }
		public short? y { get; set; }
		public short? width { get; set; }
		public short? height { get; set; }
		public short? reduction { get; set; }
		public String? name { get; set; }
		public String? filename { get; set; }
		public String? param { get; set; }
		public int? value { get; set; }
	}
}
