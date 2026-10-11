"""
AgriShield AI - Transfer Learning Model Architecture & Factory
Encapsulates MobileNetV3-Large, EfficientNet-B0, and ResNet-50 with configurable
classifier heads, 2-stage fine-tuning freezing/unfreezing, and penultimate feature taps.
"""

from typing import Optional, Tuple
import torch
import torch.nn as nn
import torchvision.models as tv_models

from ml.src.models.baseline_cnn import CustomBaselineCNN


class AgriShieldClassifier(nn.Module):
    """
    Unified classifier wrapping torchvision backbones or custom CNN with
    17-class agricultural pathology output and penultimate feature extraction.
    """

    def __init__(
        self,
        backbone_name: str = "mobilenet_v3_large",
        num_classes: int = 17,
        pretrained: bool = True,
        dropout_rate: float = 0.2,
    ):
        super().__init__()
        self.backbone_name = backbone_name.lower()
        self.num_classes = num_classes

        if self.backbone_name == "custom_cnn":
            self.model = CustomBaselineCNN(num_classes=num_classes, dropout_rate=dropout_rate)
            self.feature_dim = 256

        elif self.backbone_name == "mobilenet_v3_large":
            weights = tv_models.MobileNet_V3_Large_Weights.DEFAULT if pretrained else None
            base = tv_models.mobilenet_v3_large(weights=weights)
            in_features = base.classifier[0].in_features  # 960
            self.features = base.features
            self.avgpool = base.avgpool
            self.classifier = nn.Sequential(
                nn.Linear(in_features, 1024),
                nn.Hardswish(inplace=True),
                nn.Dropout(p=dropout_rate),
                nn.Linear(1024, num_classes),
            )
            self.feature_dim = in_features

        elif self.backbone_name == "efficientnet_b0":
            weights = tv_models.EfficientNet_B0_Weights.DEFAULT if pretrained else None
            base = tv_models.efficientnet_b0(weights=weights)
            in_features = base.classifier[1].in_features  # 1280
            self.features = base.features
            self.avgpool = base.avgpool
            self.classifier = nn.Sequential(
                nn.Dropout(p=dropout_rate),
                nn.Linear(in_features, num_classes),
            )
            self.feature_dim = in_features

        elif self.backbone_name == "resnet50":
            weights = tv_models.ResNet50_Weights.DEFAULT if pretrained else None
            base = tv_models.resnet50(weights=weights)
            in_features = base.fc.in_features  # 2048
            self.features = nn.Sequential(
                base.conv1,
                base.bn1,
                base.relu,
                base.maxpool,
                base.layer1,
                base.layer2,
                base.layer3,
                base.layer4,
            )
            self.avgpool = base.avgpool
            self.classifier = nn.Sequential(
                nn.Dropout(p=dropout_rate),
                nn.Linear(in_features, num_classes),
            )
            self.feature_dim = in_features

        else:
            raise ValueError(f"Unsupported backbone: {backbone_name}")

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        if self.backbone_name == "custom_cnn":
            return self.model(x)

        feat = self.features(x)
        pooled = self.avgpool(feat)
        flat = torch.flatten(pooled, 1)
        logits = self.classifier(flat)
        return logits

    def extract_features(self, x: torch.Tensor) -> torch.Tensor:
        """Extracts penultimate feature representation for OOD distance calculation."""
        if self.backbone_name == "custom_cnn":
            return self.model.get_penultimate_features(x)

        feat = self.features(x)
        pooled = self.avgpool(feat)
        return torch.flatten(pooled, 1)

    def freeze_backbone(self):
        """Freezes feature extractor layers during stage 1 of fine-tuning."""
        if self.backbone_name != "custom_cnn":
            for param in self.features.parameters():
                param.requires_grad = False
            print(f"[{self.backbone_name}] Backbone feature extractor frozen.")

    def unfreeze_backbone(self):
        """Unfreezes all layers for stage 2 end-to-end fine-tuning."""
        if self.backbone_name != "custom_cnn":
            for param in self.features.parameters():
                param.requires_grad = True
            print(f"[{self.backbone_name}] Backbone feature extractor unfrozen.")


def build_model(
    backbone_name: str = "mobilenet_v3_large",
    num_classes: int = 17,
    pretrained: bool = True,
    dropout_rate: float = 0.2,
) -> AgriShieldClassifier:
    """Factory method for instantiating AgriShield classifiers."""
    return AgriShieldClassifier(
        backbone_name=backbone_name,
        num_classes=num_classes,
        pretrained=pretrained,
        dropout_rate=dropout_rate,
    )
