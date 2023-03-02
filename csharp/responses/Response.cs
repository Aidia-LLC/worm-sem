using System;
namespace wormsem.responses
{
	public abstract class Response
	{
		public int id { get; set; }
		public int? code { get; set; }
		public String? message { get; set; }
		public String? type { get; set; }
	}
}
