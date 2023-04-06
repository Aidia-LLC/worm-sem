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
            }
        }

        public void GrabFullFrame(string name, string filename, Reduction reduction = Reduction.OVERLAY_PLANE)
        {
            Grab(name, filename, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
        }


    }

}