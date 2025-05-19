from abc import ABC, abstractmethod
from typing import Dict, List
from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM
import torch

class ModelConfig:
    CORPORATE_MODELS = {
        "gpt-4": {
            "name": "GPT-4",
            "description": "Most advanced model, highest accuracy",
            "max_tokens": 8192,
            "cost_per_1k": 0.03
        },
        "llama-3": {
            "name": "LLaMA 3",
            "description": "High-performance open model",
            "max_tokens": 4096,
            "cost_per_1k": 0.02
        },
        "mistral-large": {
            "name": "Mistral Large",
            "description": "Advanced reasoning capabilities",
            "max_tokens": 4096,
            "cost_per_1k": 0.015
        }
    }

    PERSONAL_MODELS = {
        "distilbart": {
            "name": "DistilBART",
            "description": "Efficient summarization model",
            "max_tokens": 1024,
            "cost_per_1k": 0.001
        },
        "mistral-small": {
            "name": "Mistral 0.7B",
            "description": "Lightweight but capable model",
            "max_tokens": 2048,
            "cost_per_1k": 0.002
        },
        "bart-base": {
            "name": "BART Base",
            "description": "Balanced performance model",
            "max_tokens": 1024,
            "cost_per_1k": 0.001
        }
    }

class BaseModel(ABC):
    @abstractmethod
    def generate(self, prompt: str, **kwargs) -> str:
        pass

    @abstractmethod
    def get_model_info(self) -> Dict:
        pass

class GPT4Model(BaseModel):
    def __init__(self):
        self.model_name = "gpt-4"
        self.config = ModelConfig.CORPORATE_MODELS[self.model_name]

    def generate(self, prompt: str, **kwargs) -> str:
        # Implement actual GPT-4 API call here
        pass

    def get_model_info(self) -> Dict:
        return self.config

class LLaMAModel(BaseModel):
    def __init__(self):
        self.model_name = "llama-3"
        self.config = ModelConfig.CORPORATE_MODELS[self.model_name]
        self.model = None
        self.tokenizer = None

    def generate(self, prompt: str, **kwargs) -> str:
        if not self.model:
            self.model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-3")
            self.tokenizer = AutoTokenizer.from_pretrained("meta-llama/Llama-3")
        
        inputs = self.tokenizer(prompt, return_tensors="pt")
        outputs = self.model.generate(**inputs, **kwargs)
        return self.tokenizer.decode(outputs[0])

    def get_model_info(self) -> Dict:
        return self.config

class DistilBARTModel(BaseModel):
    def __init__(self):
        self.model_name = "distilbart"
        self.config = ModelConfig.PERSONAL_MODELS[self.model_name]
        self.model = None
        self.tokenizer = None

    def generate(self, prompt: str, **kwargs) -> str:
        if not self.model:
            self.model = pipeline("summarization", model="sshleifer/distilbart-cnn-6-6")
        
        return self.model(prompt, **kwargs)[0]['summary_text']

    def get_model_info(self) -> Dict:
        return self.config

class ModelFactory:
    _instances = {}

    @classmethod
    def get_model(cls, model_id: str, subscription_tier: str) -> BaseModel:
        if model_id not in cls._instances:
            if subscription_tier == "corporate":
                if model_id not in ModelConfig.CORPORATE_MODELS:
                    raise ValueError(f"Model {model_id} not available for corporate tier")
                if model_id == "gpt-4":
                    cls._instances[model_id] = GPT4Model()
                elif model_id == "llama-3":
                    cls._instances[model_id] = LLaMAModel()
                # Add other corporate models here
            else:
                if model_id not in ModelConfig.PERSONAL_MODELS:
                    raise ValueError(f"Model {model_id} not available for personal tier")
                if model_id == "distilbart":
                    cls._instances[model_id] = DistilBARTModel()
                # Add other personal models here

        return cls._instances[model_id]

    @classmethod
    def get_available_models(cls, subscription_tier: str) -> List[Dict]:
        if subscription_tier == "corporate":
            return [
                {"id": model_id, **config}
                for model_id, config in ModelConfig.CORPORATE_MODELS.items()
            ]
        return [
            {"id": model_id, **config}
            for model_id, config in ModelConfig.PERSONAL_MODELS.items()
        ] 