using System;
using System.Reflection;

namespace wormsem.api
{
    public class TestSEMApi : SEMApi
    {
        public void Connect()
        {
            return;
        }

        public object GetParam(string param)
        {
            if (param.Equals("DP_FROZEN"))
                return 1;
            if (param.Equals("AP_WIDTH"))
                return 30;
            if (param.Equals("AP_HEIGHT"))
                return 30;
            if (param.Equals("AP_STAGE_LOW_X"))
                return 1;
            if (param.Equals("AP_STAGE_LOW_Y"))
                return 1;
            if (param.Equals("AP_STAGE_HIGH_X"))
                return 100;
            if (param.Equals("AP_STAGE_HIGH_Y"))
                return 100;
            return 42;
        }

        public void Grab(string name, string filename, short x, short y, short width, short height, Reduction reduction = Reduction.OVERLAY_PLANE)
        {
            var assembly = Assembly.GetExecutingAssembly();
            var stream = assembly.GetManifestResourceStream("wormsem.grab.png");
            if (stream == null) throw new Exception("Null stream");
            var fileStream = File.Create(filename);
            stream.Seek(0, SeekOrigin.Begin);
            stream.CopyTo(fileStream);
            fileStream.Close();
            return;
        }

        public void GrabFullFrame(string name, string filename, Reduction reduction = Reduction.OVERLAY_PLANE)
        {
            Grab("test", filename, 0, 0, 0, 0);
        }

        public void SetParam(string param, int value)
        {
            return;
        }

        public void SetParam(string param, double value)
        {
            return;
        }

        public void ExecuteCommand(string command)
        {
            return;
        }
    }
}
