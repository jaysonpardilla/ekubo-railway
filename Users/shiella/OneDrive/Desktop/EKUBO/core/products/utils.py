from PIL import Image
import io
from django.core.files.base import ContentFile
import numpy as np
import cv2


def remove_background_from_uploaded_file(uploaded_file, output_format='PNG'):
    """Attempt to remove background using rembg. If rembg or its native deps
    aren't available, return the original image bytes as a ContentFile.

    This function performs a lazy import of rembg to avoid importing heavy
    native libraries (onnxruntime) at Django startup.
    """
    # Attempt rembg first (lazy import)
    try:
        from rembg import remove
        try:
            uploaded_file.seek(0)
            input_image = Image.open(uploaded_file).convert("RGBA")
            result = remove(input_image)
            buffer = io.BytesIO()
            result.save(buffer, format=output_format)
            buffer.seek(0)
            return ContentFile(buffer.getvalue())
        except Exception:
            # fall through to OpenCV fallback
            pass
    except Exception:
        # rembg not available or failed to import — proceed to OpenCV fallback
        pass

    # OpenCV GrabCut fallback (works without onnxruntime)
    try:
        uploaded_file.seek(0)
        with Image.open(uploaded_file) as pil_img:
            pil_img = pil_img.convert("RGBA")
            img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGBA2BGR)

        # Prepare mask and models
        mask = np.zeros(img.shape[:2], np.uint8)
        bgdModel = np.zeros((1, 65), np.float64)
        fgdModel = np.zeros((1, 65), np.float64)

        h, w = img.shape[:2]
        # use a rect slightly inside the image to assume foreground center
        rect = (int(w * 0.05), int(h * 0.05), int(w * 0.9), int(h * 0.9))

        cv2.grabCut(img, mask, rect, bgdModel, fgdModel, 5, cv2.GC_INIT_WITH_RECT)
        # mask==2 or mask==0 are background; 1 or 3 are foreground
        mask2 = np.where((mask == 2) | (mask == 0), 0, 1).astype('uint8')
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGBA)
        img_rgb[:, :, 3] = mask2 * 255

        result_pil = Image.fromarray(img_rgb)
        buffer = io.BytesIO()
        result_pil.save(buffer, format=output_format)
        buffer.seek(0)
        return ContentFile(buffer.getvalue())
    except Exception:
        # final fallback: return original bytes
        try:
            uploaded_file.seek(0)
            return ContentFile(uploaded_file.read())
        except Exception:
            return None
