# Set up python

echo "0 / X: INSTALLATION CONFIRMATION"
echo "•"
echo "•"
echo "•"
echo "•"
echo "•"

while true; do
    read -p "Have you installed python version 3.9?" yn
    case $yn in
        [Yy]* ) break;;
        [Nn]* ) echo "Please install python v3.9." exit;;
        * ) echo "Please answer yes or no.";;
    esac
done

while true; do
    read -p "Have you installed dotnet already?" yn
    case $yn in
        [Yy]* ) break;;
        [Nn]* ) echo "Please install dotnet before proceeding." exit;;
        * ) echo "Please answer yes or no.";;
    esac
done

while true; do
    read -p "Is the Zeiss Remote API software available (usb is plugged in)?" yn
    case $yn in
        [Yy]* ) break;;
        [Nn]* ) echo "Please install dotnet before proceeding." exit;;
        * ) echo "Please answer yes or no.";;
    esac
done

# Set up python

echo "1 / X: PYTHON SETUP"
echo "•"
echo "•"
echo "•"
echo "•"
echo "•"

python -m pip install flask flask-cors opencv-python pycocotools matplotlib onnxruntime onnx torch torchvision
python -m pip install git+https://github.com/facebookresearch/segment-anything.git
curl -o ./mask-server/sam_vit_h_4b8939.pth https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth

echo "2 / X: DOT NET SET UP" 
echo "•"
echo "•"
echo "•"
echo "•"
echo "•"

echo "3 / X: NODE SET UP" 
echo "•"
echo "•"
echo "•"
echo "•"
echo "•"

cd app && npm install && cd ..


echo "•"
echo "•"
echo "•"
echo "•"
echo "•"

echo "SETUP COMPLETE"