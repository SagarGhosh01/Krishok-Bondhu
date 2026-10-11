"""
AgriShield AI - Grad-CAM Visual Attribution & Explainability Engine
Generates gradient-weighted class activation maps (Grad-CAM) to visualize
the salient foliar regions influencing the neural network's decision.
"""

from typing import Optional, Tuple
import numpy as np
import torch
import torch.nn as nn
from PIL import Image


class GradCAM:
    """
    Computes Grad-CAM for a given model and target layer.
    """

    def __init__(self, model: nn.Module, target_layer: nn.Module):
        self.model = model
        self.target_layer = target_layer
        self.gradients: Optional[torch.Tensor] = None
        self.activations: Optional[torch.Tensor] = None

        # Register forward and backward hooks
        self.target_layer.register_forward_hook(self._forward_hook)
        self.target_layer.register_full_backward_hook(self._backward_hook)

    def _forward_hook(self, module, input, output):
        self.activations = output.detach()

    def _backward_hook(self, module, grad_input, grad_output):
        self.gradients = grad_output[0].detach()

    def generate_heatmap(
        self,
        input_tensor: torch.Tensor,
        target_class_idx: Optional[int] = None,
    ) -> np.ndarray:
        """
        Computes 2D normalized Grad-CAM heatmap for the input tensor.
        """
        self.model.eval()
        self.model.zero_grad()

        output = self.model(input_tensor)
        if target_class_idx is None:
            target_class_idx = int(torch.argmax(output, dim=1).item())

        score = output[0, target_class_idx]
        score.backward(retain_graph=True)

        gradients = self.gradients[0]      # Shape: (C, H, W)
        activations = self.activations[0]  # Shape: (C, H, W)

        # Global average pooling of gradients
        weights = torch.mean(gradients, dim=(1, 2), keepdim=True)  # Shape: (C, 1, 1)

        # Linear combination of activations weighted by gradients
        cam = torch.sum(weights * activations, dim=0).cpu().numpy()

        # Apply ReLU to retain only features with positive attribution
        cam = np.maximum(cam, 0)

        # Normalize to [0, 1]
        if np.max(cam) > 0:
            cam = (cam - np.min(cam)) / (np.max(cam) - np.min(cam) + 1e-8)
        else:
            cam = np.zeros_like(cam)

        return cam

    def create_overlay(
        self,
        original_image: Image.Image,
        heatmap: np.ndarray,
        alpha: float = 0.45,
    ) -> Tuple[Image.Image, str]:
        """
        Upsamples heatmap to original image resolution, applies custom thermal colormap,
        and alpha-blends onto original image. Returns blended PIL Image and mandatory disclaimer.
        """
        orig_w, orig_h = original_image.size
        # Resize heatmap using bilinear interpolation
        heat_img = Image.fromarray((heatmap * 255).astype(np.uint8)).resize((orig_w, orig_h), Image.Resampling.BILINEAR)
        heat_np = np.array(heat_img, dtype=np.float32) / 255.0

        # Simple high-contrast thermal color map:
        # High activation -> Red (255, 0, 0), Mid -> Yellow (255, 255, 0), Low -> Cyan/Blue (0, 150, 255)
        color_map = np.zeros((orig_h, orig_w, 3), dtype=np.uint8)
        color_map[:, :, 0] = np.clip(heat_np * 2.0 * 255, 0, 255).astype(np.uint8)              # Red
        color_map[:, :, 1] = np.clip((1.0 - np.abs(heat_np - 0.5) * 2.0) * 255, 0, 255).astype(np.uint8) # Green
        color_map[:, :, 2] = np.clip((1.0 - heat_np) * 200, 0, 255).astype(np.uint8)            # Blue

        color_overlay = Image.fromarray(color_map).convert("RGB")
        blended = Image.blend(original_image.convert("RGB"), color_overlay, alpha=alpha)

        disclaimer = "Highlighted regions show where the model looked. This is a visual screening aid, not proof the prediction is correct."
        return blended, disclaimer
