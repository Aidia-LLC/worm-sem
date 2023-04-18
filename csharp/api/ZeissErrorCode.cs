﻿using System;
namespace wormsem.api
{
    public enum ZeissErrorCode
    {
        NO_ERROR = 0,
        FAILED_TO_TRANSLATE_PARAMETER_TO_ID = 1000,
        SET_TRANSLATE_FAIL = 1004,
        SET_STATE_FAIL = 1005,
        SET_FLOAT_FAIL = 1006,
        SET_BAD_VALUE = 1009,
        FAILED_TO_TRANSLATE_COMMAND_TO_ID = 1011,
        FAILED_TO_EXECUTE_COMMAND = 1012,
        FAILED_TO_EXECUTE_FILE_MACRO = 1013,
        FAILED_TO_EXECUTE_LIBRARY_MACRO = 1014,
        COMMAND_NOT_IMPLEMENTED = 1015,
        FAILED_TO_GRAB = 1016,
        NOT_INITIALIZED = 1019,
        FAILED_TO_GET_LIMITS = 1022,
        PARAMETER_IS_DISABLED = 1032,
    }
}

