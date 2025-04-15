import os
import torch
import torchvision.transforms as transforms
import torch.nn as nn
from torchvision import models
from PIL import Image
import io
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import logging

# Setup logging
logger = logging.getLogger(__name__)

router = APIRouter()

# Configuration
MODEL_PATH = "Super_model.pth"  # Update path if needed
NUM_CLASSES = 17  # Number of classes in the model
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Class names - update these with your actual class names
CLASS_NAMES = [
    "Asian",
    "Boho",
    "Contemporary",
    "Country",
    "Eclectic",
    "Ecostyle",
    "English Style",
    "Futurism",
    "Loft",
    "Mediterranean (Coastal)",
    "Minimalism",
    "Modern",
    "Neoclassicism",
    "Provence",
    "Rustic",
    "Scandinavian",
    "Victorian",
]

# Define transform for inference
inference_transform = transforms.Compose(
    [
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ]
)


# Function to load model (using ResNet18 instead of ResNet50)
def load_model(model_path, num_classes, device):
    try:
        model = models.resnet18(weights=None)
        # Replace fc with a Sequential module to match the saved model structure
        in_features = model.fc.in_features
        model.fc = nn.Sequential(
            nn.Dropout(0.5),  # Common in fine-tuned models
            nn.Linear(in_features, num_classes),
        )

        if os.path.exists(model_path):
            # Load model with strict=False to allow for minor differences
            state_dict = torch.load(model_path, map_location=device, weights_only=True)
            model.load_state_dict(state_dict, strict=False)
            logger.info(f"Loaded model weights from {model_path}")
        else:
            logger.warning(
                f"Model file not found: {model_path}. Using untrained model."
            )

        model.to(device)
        model.eval()
        return model
    except Exception as e:
        logger.error(f"Error loading model: {str(e)}")
        return None


# Load the model at module initialization
model = None


@router.on_event("startup")
async def startup_model_load():
    global model
    try:
        model = load_model(MODEL_PATH, NUM_CLASSES, DEVICE)
        if model is None:
            logger.warning(
                "Model failed to load during startup. Will attempt to load on first request."
            )
    except Exception as e:
        logger.error(f"Error during startup model loading: {str(e)}")
        # Don't raise the exception - let the app start anyway


@router.post("/predict", response_class=JSONResponse)
async def predict_image(file: UploadFile = File(...)):
    """
    Receive an image file, process it with the ResNet18 model, and return the predicted class.
    """
    # Check if model is loaded
    global model
    if model is None:
        try:
            model = load_model(MODEL_PATH, NUM_CLASSES, DEVICE)
            if model is None:
                return JSONResponse(
                    status_code=503,
                    content={"success": False, "error": "Model could not be loaded"},
                )
        except Exception as e:
            return JSONResponse(
                status_code=503,
                content={"success": False, "error": f"Error loading model: {str(e)}"},
            )

    # Validate file is an image
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        # Read image file
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes))

        # Convert to RGB if needed
        if image.mode != "RGB":
            image = image.convert("RGB")

        # Apply transformations
        image_tensor = inference_transform(image).unsqueeze(0).to(DEVICE)

        # Run inference
        with torch.no_grad():
            outputs = model(image_tensor)
            _, predicted_idx = torch.max(outputs, 1)
            predicted_class_idx = predicted_idx.item()
            predicted_class_name = CLASS_NAMES[predicted_class_idx]

        # Return prediction
        return {
            "success": True,
            "predicted_class": {
                "id": predicted_class_idx,
                "name": predicted_class_name,
            },
        }

    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": f"Error processing image: {str(e)}"},
        )
