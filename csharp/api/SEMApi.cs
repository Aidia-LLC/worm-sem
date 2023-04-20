namespace wormsem.api
{
    public interface SEMApi
    {
        public void Connect();
        public void Grab(string name, string filename, short x, short y, short width, short height, Reduction reduction = Reduction.OVERLAY_PLANE);
        public void GrabFullFrame(string name, string filename, Reduction reduction = Reduction.OVERLAY_PLANE);
        public void SetParam(string param, object value);
        public object GetParam(string param);
        public void ExecuteCommand(string command);
    }
}
