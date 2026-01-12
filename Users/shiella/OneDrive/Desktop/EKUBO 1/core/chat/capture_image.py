# capture_image.py

import cv2
import os

def capture_image(filename='intruder.jpg'):
    # Open the webcam
    cam = cv2.VideoCapture(0)
    ret, frame = cam.read()
    
    if ret:
        # Save the captured image
        if not os.path.exists('captured_images'):
            os.makedirs('captured_images')
        image_path = os.path.join('captured_images', filename)
        cv2.imwrite(image_path, frame)
    else:
        image_path = None
        
    cam.release()
    return image_path
