using System;
using OpenCvSharp;

class Program
{
    static void Main(string[] args)
    {
        var image = Cv2.ImRead("input.jpg", ImreadModes.GrayScale);
        var gxKernel = new Mat(new float[,]
        {
            {-1, 0, 1},
            {-2, 0, 2},
            {-1, 0, 1}
        });
        var gyKernel = new Mat(new float[,]
        {
            {-1, -2, -1},
            {0, 0, 0},
            {1, 2, 1}
        });
        var gxData = new Mat();
        var gyData = new Mat();
        Cv2.Filter2D(image, gxData, -1, gxKernel);
        Cv2.Filter2D(image, gyData, -1, gyKernel);
        var gradientMagnitudeData = new Mat();
        var gradientOrientationData = new Mat();
        Cv2.CartToPolar(gxData, gyData, gradientMagnitudeData, gradientOrientationData, true);
        var gradientProfileData = new Mat(image.Height, image.Width, MatType.CV_8UC8);
        for (int y = 1; y < image.Height - 1; y++)
        {
            for (int x = 1; x < image.Width - 1; x++)
            {
                var index = y * image.Width + x;
                var orientation = (int)(Math.Round((gradientOrientationData.At<float>(y, x) * 4) / Math.PI) % 8);
                for (int k = 0; k < 8; k++)
                {
                    var gradient = gradientMagnitudeData.At<float>(y + (int)Math.Floor((float)k / 3) - 1, x + (k % 3) - 1);
                    gradientProfileData.Set<byte>(y, x * 8 + k, (byte)(orientation == k ? gradient : 0));
                }
            }
        }
        var edgeData = new Mat(image.Height, image.Width, MatType.CV_8UC1);
        for (int y = 0; y < image.Height; y++)
        {
            for (int x = 0; x < image.Width; x++)
            {
                var profile = new byte[8];
                for (int k = 0; k < 8; k++)
                {
                    profile[k] = gradientProfileData.Get<byte>(y, x * 8 + k);
                }
                var maxGradient = profile.Max();
                edgeData.Set<byte>(y, x, (byte)(maxGradient > 100 ? 255 : 0));
            }
        }
        Cv2.ImWrite("output.jpg", edgeData);
    }
}
