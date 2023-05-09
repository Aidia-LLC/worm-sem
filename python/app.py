import json
from flask import Flask, request
from flask_cors import CORS
from segment_anything import sam_model_registry, SamPredictor
import cv2
import numpy as np

app = Flask(__name__)
CORS(app)
cache = False

predictor: SamPredictor = None
cachedResponse = None


@app.route("/")
def hello_world():
    return "<p>Hello, World!</p>"


@app.get('/init')
def init():
    global predictor
    if predictor is not None:
        return {
            'success': True,
            'alreadyInitialized': True,
        }
    sam_checkpoint = "sam_vit_h_4b8939.pth"
    model_type = "default"
    device = "cpu"
    sam = sam_model_registry[model_type](checkpoint=sam_checkpoint)
    sam.to(device=device)
    predictor = SamPredictor(sam)
    return {
        'success': True,
        'alreadyInitialized': False,
    }


@app.post("/segment")
def segment():
    global predictor
    global cachedResponse
    global cache

    if predictor is None:
        return {
            'success': False,
            'error': 'predictor is not initialized',
        }
    
    if cache and cachedResponse is not None:
        return cachedResponse

    filename = request.json['filename']
    image = cv2.imread(filename)
    predictor.set_image(image)
    points = request.json['points']
    input_point = np.array(points)
    input_label = np.array([1 for _ in points])
    masks, scores, _ = predictor.predict(
        point_coords=input_point,
        point_labels=input_label,
        multimask_output=True,
    )

    # high_score = 0
    # high_score_index = 0
    # for i in range(len(scores)):
    #     if scores[i] > high_score:
    #         high_score = scores[i]
    #         high_score_index = i

    # data = json.dumps({
    #     'mask': masks[high_score_index],
    #     'success': True,
    # }, cls=NumpyEncoder)

    data = json.dumps({
        'masks': masks,
        'scores': scores,
        'success': True,
    }, cls=NumpyEncoder)

    if cache:
        cachedResponse = data

    return data


class NumpyEncoder(json.JSONEncoder):
    """ Special json encoder for numpy types """

    def default(self, obj):
        if isinstance(obj, (np.int_, np.intc, np.intp, np.int8,
                            np.int16, np.int32, np.int64, np.uint8,
                            np.uint16, np.uint32, np.uint64)):
            return int(obj)
        elif isinstance(obj, (np.float_, np.float16, np.float32,
                              np.float64)):
            return float(obj)
        elif isinstance(obj, (np.ndarray,)):
            return obj.tolist()
        return json.JSONEncoder.default(self, obj)
