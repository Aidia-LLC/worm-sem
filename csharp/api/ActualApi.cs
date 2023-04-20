using APILib;
using System.Runtime.InteropServices;
using System.Runtime.Intrinsics.X86;

namespace wormsem.api
{
    public class ActualApi : SEMApi
    {
        private Api api;
        private Boolean initialized = false;

        private const short FRAME_WIDTH = 1024;
        private const short FRAME_HEIGHT = 768;

        public ActualApi()
        {
            api = new Api();
        }

        public void Connect()
        {  
            if (initialized) return;
            long response = api.InitialiseRemoting(); // maybe Initialise()
            if (response != 0)
                throw new Exception("Unable to connect");
            initialized = true;
        }

        private void VerifyInitialized()
        {
            Connect();
        }

        public void Grab(string name, string filename, short x, short y, short width, short height, Reduction reduction = Reduction.OVERLAY_PLANE)
        {
            VerifyInitialized();

            object nameWrapper = new VariantWrapper(name);
            api.Set("SV_SAMPLE_ID", ref nameWrapper);

            long response = api.Grab(x, y, width, height, (short)reduction, filename);

            switch ((ZeissErrorCode)response)
            {
                case ZeissErrorCode.NO_ERROR:
                    // Hooray! Success.
                    break;
                case ZeissErrorCode.FAILED_TO_GRAB:
                    throw new Exception("Grab command failed.");
                case ZeissErrorCode.NOT_INITIALIZED:
                    throw new Exception("API not initialised.");
                default:
                    throw new Exception("Unknown error " + response);
            }
        }

        public void GrabFullFrame(string name, string filename, Reduction reduction = Reduction.OVERLAY_PLANE)
        {
            Grab(name, filename, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
        }

        public void SetParam(string param, object value)
        {
            object wrapper = new VariantWrapper(value);
            int response = api.Set(param, ref wrapper);

            switch ((ZeissErrorCode)response)
            {
                case ZeissErrorCode.NO_ERROR:
                    break;
                case ZeissErrorCode.NOT_INITIALIZED:
                    throw new Exception("API not initialized.");
                case ZeissErrorCode.SET_TRANSLATE_FAIL:
                    throw new Exception("Translate fail");
                case ZeissErrorCode.SET_STATE_FAIL:
                    throw new Exception("Set state fail");
                case ZeissErrorCode.SET_FLOAT_FAIL:
                    throw new Exception("set float fail");
                case ZeissErrorCode.SET_BAD_VALUE:
                    throw new Exception("Set bad value");
                case ZeissErrorCode.PARAMETER_IS_DISABLED:
                    throw new Exception("Parameter is diabled");
                default:
                    throw new Exception("Unknown error " + response);
            }
        }

        public object GetParam(string param)
        {
            object wrapper = new VariantWrapper(null);
            int response = api.Get(param, ref wrapper);

            if ((ZeissErrorCode)response != ZeissErrorCode.NO_ERROR)
                throw new Exception("Unable to get param. Code " + response);

            return wrapper;
        }

        public void ExecuteCommand(string command)
        {
            long response = api.Execute(command);
            if ((ZeissErrorCode)response != ZeissErrorCode.NO_ERROR)
                throw new Exception("Unable to execute command. Code " + response);
        }


    }

}