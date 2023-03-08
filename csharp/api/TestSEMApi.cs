using System;

namespace wormsem.api
{
    public class TestSEMApi : SEMApi
    {
        public void Connect()
        {
            return;
        }

        public void Grab(string name, string filename, short x, short y, short width, short height, Reduction reduction = Reduction.OVERLAY_PLANE)
        {
            return;
        }

        public void GrabFullFrame(string name, string filename, Reduction reduction = Reduction.OVERLAY_PLANE)
        {
            return;
        }
    }
}
