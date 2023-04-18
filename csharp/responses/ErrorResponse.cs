using System;
namespace wormsem.responses
{
	public enum ErrorCode
	{
		JSON_DECODE = 1,
		INVALID_REDUCTION_VALUE = 2,
		FAILED_TO_GRAB = 3,
		FAILED_TO_CONNECT = 4,
		FAILED_TO_SET_PARAM = 5,
		FAILED_TO_GET_PARAM = 6
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
