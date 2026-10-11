"""
AgriShield AI - Custom Small CNN Baseline
A lightweight 4-stage convolutional baseline network trained from scratch.
Establishes the empirical performance floor to quantify the exact benefit of ImageNet transfer learning.
"""

import torch
import torch.nn as nn


class CustomBaselineCNN(nn.Module):
    """
    Compact 4-block ConvNet with BatchNorm, ReLU, Dropout, and Global Average Pooling.
    Total parameters: ~1.2 Million.
    """

    def __init__(self, num_classes: int = 17, dropout_rate: float = 0.3):
        super().__init__()

        self.features = nn.Sequential(
            # Block 1: 224x224x3 -> 112x112x32
            nn.Conv2d(3, 32, kernel_size=3, stride=1, padding=1, bias=False),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2),

            # Block 2: 112x112x32 -> 56x56x64
            nn.Conv2d(32, 64, kernel_size=3, stride=1, padding=1, bias=False),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2),

            # Block 3: 56x56x64 -> 28x28x128
            nn.Conv2d(64, 128, kernel_size=3, stride=1, padding=1, bias=False),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2),

            # Block 4: 28x28x128 -> 14x14x256
            nn.Conv2d(128, 256, kernel_size=3, stride=1, padding=1, bias=False),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
            nn.AdaptiveAvgPool2d((1, 1)),
        )

        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Dropout(p=dropout_rate),
            nn.Linear(256, 128),
            nn.ReLU(inplace=True),
            nn.Dropout(p=dropout_rate),
            nn.Linear(128, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        feat = self.features(x)
        logits = self.classifier(feat)
        return logits

    def get_penultimate_features(self, x: torch.Tensor) -> torch.Tensor:
        """Extracts penultimate 256-dim feature vectors for OOD feature-space distance."""
        feat = self.features(x)
        return torch.flatten(feat, 1)
