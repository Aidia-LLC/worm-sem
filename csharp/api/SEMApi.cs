namespace wormsem.api
{
    public interface SEMApi
    {
        public void Connect();
        public void Grab(String name, String filename, short x, short y, short width, short height, Reduction reduction = Reduction.OVERLAY_PLANE);
        public void GrabFullFrame(String name, String filename, Reduction reduction = Reduction.OVERLAY_PLANE);
        public void SetParam(String param, int value);
        public object GetParam(String param);
    }
}
