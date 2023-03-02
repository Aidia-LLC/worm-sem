using System;
namespace wormsem.responses
{
	public enum ErrorCode
	{
		JSON_DECODE = 1
	}

	public class ErrorResponse: Response
	{

		public ErrorResponse(int id, ErrorCode code, String message)
		{
			this.id = id;
			this.code = (int)code;
			this.message = message;
			type = "error";
		}
	}
}
