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
            long response = api.InitialiseRemoting();
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

        //public void Run()
        //{
        /*
       // -- TEST -- Grab image from SmartSEM API (grab) method
       if (apiInitialised)
       {
           Console.WriteLine("Testing -- Image (grab) Method\n");

           // User input section:
           Console.WriteLine("To grab EM image, please enter the following parameters.");

           Console.WriteLine("The x-offset of the image to grab (integer value. e.g.: 0): ");
           string str_ix = Console.ReadLine();
           short ix = Convert.ToInt16(str_ix);

           Console.WriteLine("The y-offset of the image to grab (integer value. e.g.: 0): ");
           string str_iy = Console.ReadLine();
           short iy = Convert.ToInt16(str_iy);

           Console.WriteLine("The width of the image to grab (integer between 0-1024): ");
           string str_il = Console.ReadLine();
           short il = Convert.ToInt16(str_il);

           Console.WriteLine("The height of the image to grab (integer between 0-768): ");
           string str_ih = Console.ReadLine();
           short ih = Convert.ToInt16(str_ih);

           Console.WriteLine("The subsampling factor for the image to grab (integer between -1-3): ");
           string str_ir = Console.ReadLine();
           short ir = Convert.ToInt16(str_ir);

           Console.WriteLine("The filename (address) where the .tiff image will be saved: ");
           Console.WriteLine("(e.g.: C:\\ProgramData\\Carl Zeiss\\SmartSEM\\Images\\Capture.tiff , but put two backslashes between folders)");
           string filename = Console.ReadLine();

           Console.WriteLine("Name the image he EM will grab: ");
           Console.WriteLine("(e.g.: Picture)");
           string value = Console.ReadLine();


           // Uncomment below values to use hard-coded values iinstead of user input v
               short ix = 0;
               short iy = 0;
               short il = 1024;
               short ih = 768;
               short ir = -1;
               //string filename = "C:\\Capture.tiff";
               //string filename = "U:\\My Documents\\SmartSEM_API\\Capture.tiff";
               string filename = "C:\\Users\\jessi\\Desktop\\SmartSEM(ECE 3970)\\Pics for ECE 3970\\Saved Grab Pics\\Capture.tiff";

               // Set image user text
               string value = "Picture";


           // Initialise a VariantWrapper object to reference the parameter value
           object vValue = new VariantWrapper(value);
           //CZEMApi.Set("SV_USER_TEXT", ref vValue);
           CZEMApi.Set("SV_SAMPLE_ID", ref vValue);

           // Get the stage position values
           long lStgValues = CZEMApi.Grab(ix, iy, il, ih, ir, filename);

           // Show success message, or an error message in case of an error
           switch ((ZeissErrorCode)lStgValues)
           {
               case ZeissErrorCode.API_E_NO_ERROR:
                   Console.WriteLine("Image grabbed and saved.");
                   break;
               case ZeissErrorCode.API_E_GRAB_FAIL:
                   Console.WriteLine("Grab command failed.");
                   break;
               case ZeissErrorCode.API_E_NOT_INITIALISED:
                   Console.WriteLine("API not initialised.");
                   break;
           }
       } 
       */




        // -- TEST -- Get image from file, edge/shape detection, ...
        // if (apiInitialised)
        // {
        //     // User input section:
        //     Console.WriteLine("Enter the filename (address) where the image is: ");
        //     Console.WriteLine("(e.g.: C:\\ProgramData\\Carl Zeiss\\SmartSEM\\Images\\Capture.tiff , but put two backslashes between folders)");
        //     // **For testing use:     C:\\Users\\jessi\\Desktop\\SmartSEM (ECE 3970)\\Pics for ECE 3970\\low_res_1.tif
        //     // **For testing use:     C:\\Users\\jessi\\Desktop\\SmartSEM (ECE 3970)\\Pics for ECE 3970\\grab_1.tif
        //     string FileName = Console.ReadLine();


        //     // Variables for gray-scaling/edge detection/shape detection/etc
        //     Image<Bgr, byte> m_SourceImage    = new Image<Bgr,  byte>(FileName);               // Stores user inputted image in original color
        //     Image<Gray, byte> m_SourceImageGray = new Image<Gray, byte>(m_SourceImage.Size);   // Makes original source image grayscale
        //     Image<Gray, byte> m_InvertedImage  = new Image<Gray, byte>(m_SourceImage.Size);    // Makes source image inverted (light slides/dark backgnd)
        //     Image<Gray, byte> m_ThresholdImage = new Image<Gray, byte>(m_SourceImage.Size);    // Gets inverted thresholded corners
        //     Image<Gray, byte> m_EdgesImage     = new Image<Gray, byte>(m_SourceImage.Size);    // Gets image edges using Canny
        //     Image<Gray, byte> m_ContoursImage  = new Image<Gray, byte>(m_SourceImage.Size);    // Gets image contours                
        //     Image<Gray, byte> m_AlteredInputImage = new Image<Gray, byte>(m_SourceImage.Size); // Image to be used for image dictionary
        //     Image<Gray, byte> m_ShapeMatchedImage = new Image<Gray, byte>(m_SourceImage.Size); // Image that's gone through edge detection + shape contour matching

        //     // Convert source image to grayscale instead of Bgr
        //     m_SourceImageGray = m_SourceImage.Convert<Gray, byte>();

        //     // Sharpen image to try and better differentiate it from background
        //     Image<Gray, byte> m_SharpenedImage = new Image<Gray, byte>(m_SourceImage.Size);
        //     m_SharpenedImage = Sharpen(m_SourceImageGray, 100, 10, 10);                         

        //     // Inverts original user inputted m_InvertedImageimage so slides are lighter in color than the background
        //     //CvInvoke.Invert(m_SourceImage, m_InvertedImage, DecompMethod.LU); //LU = gaussian elimination //NOT WORKING!!
        //     //m_InvertedImage = m_SourceImage.Convert<Gray, Byte>().Not(); // Inverts source image after it's been converted to grayscale

        //     // Creates edges from image using Canny method
        //     CvInvoke.Canny(m_SharpenedImage, m_EdgesImage, 100, 100);

        //     // Applies active thresholding, which decides whether edges are present or not at an image point
        //     CvInvoke.AdaptiveThreshold(m_EdgesImage, m_ThresholdImage, 255, AdaptiveThresholdType.GaussianC, ThresholdType.BinaryInv, 301, 0.0);

        //     /* // Detect corners from image using Harris corners mthod
        //     Image<Gray, float> m_CornerImage = null;
        //     m_CornerImage = new Image<Gray, float>(m_SourceImage.Size);
        //     CvInvoke.CornerHarris(m_ContoursImage, m_CornerImage, 2, 3, 0.04);
        //     //CvInvoke.Normalize(m_CornerImage, m_CornerImage, 255, 0, Emgu.CV.CvEnum.NormType.MinMax); //Currently trash! */


        //     // Check all shapes and detect trapezoids
        //     // Copies initial image that's been altered by other image processing methods & runs trapezoid shape detection on it
        //     IMGDictionary = new Dictionary<string, Image<Gray, byte>>(); // initialize image dictionary
        //     m_AlteredInputImage = m_ThresholdImage; // copied image from canny/thresholding
        //     //check if image dictinary contains input key already 
        //     if (IMGDictionary.ContainsKey("input"))
        //     {
        //         IMGDictionary.Remove("input");
        //     }
        //     IMGDictionary.Add("input", m_AlteredInputImage);

        //     // apply shape matching method
        //     m_ShapeMatchedImage = ApplyShapeMatching();


        //     //**TODO -- after detecting all trapezoids, get corners and store corners with respective trapezoid


        //     // Displays altered image
        //     Image<Gray, byte> m_OutputImage = m_ShapeMatchedImage;
        //     String win1 = "Test Window"; //The name of the window
        //     CvInvoke.NamedWindow(win1); //Create the window using the specific name
        //     CvInvoke.Imshow(win1, m_OutputImage); //Show the image
        //     //CvInvoke.Resize(m_ContoursImage, m_OutputImage, new Size(1024, 768));
        //     CvInvoke.WaitKey(0);  //Wait for the key pressing event
        //     CvInvoke.DestroyWindow(win1); //Destroy the window if key is pressed


        // }//End of If(apiInitialized)


        //}
    }

}