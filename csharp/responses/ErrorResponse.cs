using System;
namespace wormsem.responses
{
	public class ErrorResponse: Response
	{
		public ErrorResponse(int id, int code, String message)
		{
			this.id = id;
			this.code = code;
			this.message = message;
			type = "error";
		}
	}
}
