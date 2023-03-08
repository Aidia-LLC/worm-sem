using System;
namespace wormsem.responses
{
	public enum ErrorCode
	{
		JSON_DECODE = 1,
		INVALID_REDUCTION_VALUE = 2,
		FAILED_TO_GRAB = 3
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
