from abc import ABC, abstractmethod
from typing import Dict, List
from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM
import torch
from langchain.chat_models import ChatOpenAI, ChatAnthropic
from langchain.schema import HumanMessage, SystemMessage
import os
from enum import Enum
from pydantic import BaseModel

class ModelTier(str, Enum):
    PERSONAL = "personal"
    CORPORATE = "corporate"

class ModelConfig:
    CORPORATE_MODELS = {
        "gpt-4": {
            "name": "GPT-4",
            "description": "Most advanced model, highest accuracy",
            "max_tokens": 8192,
            "cost_per_1k": 0.03,
            "provider": "openai"
        },
        "claude-3": {
            "name": "Claude 3",
            "description": "Advanced reasoning and analysis",
            "max_tokens": 100000,
            "cost_per_1k": 0.025,
            "provider": "anthropic"
        },
        "llama-3": {
            "name": "Meta LLaMA 3.3",
            "description": "Advanced large language model for summarization",
            "max_tokens": 4096,
            "model_path": "meta-llama/Llama-3-3b",
            "provider": "huggingface"
        },
        "mistral-large": {
            "name": "Mistral Large",
            "description": "Advanced reasoning capabilities",
            "max_tokens": 4096,
            "cost_per_1k": 0.015,
            "provider": "mistral"
        },
        "gpt-neox": {
            "name": "GPT-NeoX-20B",
            "description": "High-capacity neural summarizer",
            "max_tokens": 2048,
            "model_path": "EleutherAI/gpt-neox-20b",
            "provider": "huggingface"
        },
        "bart-large": {
            "name": "BART Large CNN",
            "description": "Professional summarization model",
            "max_tokens": 1024,
            "model_path": "facebook/bart-large-cnn",
            "provider": "huggingface"
        }
    }

    PERSONAL_MODELS = {
        "distilbart": {
            "name": "DistilBART CNN",
            "description": "Efficient summarization model",
            "max_tokens": 512,
            "model_path": "sshleifer/distilbart-cnn-12-6",
            "provider": "huggingface"
        },
        "mistral-small": {
            "name": "Mistral 0.7B",
            "description": "Lightweight but capable model",
            "max_tokens": 2048,
            "cost_per_1k": 0.002,
            "provider": "mistral"
        },
        "bart-base": {
            "name": "BART Base",
            "description": "Balanced performance model",
            "max_tokens": 1024,
            "cost_per_1k": 0.001,
            "provider": "huggingface"
        },
        "sumy": {
            "name": "Sumy",
            "description": "Lightweight extractive summarizer",
            "max_tokens": 1024,
            "provider": "local"
        },
        "tiny-llama": {
            "name": "TinyLlama 1.1B",
            "description": "Compact language model",
            "max_tokens": 2048,
            "model_path": "TinyLlama/TinyLlama-1.1B",
            "provider": "huggingface"
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
        self.model = ChatOpenAI(
            model_name="gpt-4",
            temperature=0.7,
            max_tokens=self.config["max_tokens"],
            openai_api_key=os.getenv("OPENAI_API_KEY")
        )

    def generate(self, prompt: str, **kwargs) -> str:
        messages = [
            SystemMessage(content="You are a helpful AI assistant."),
            HumanMessage(content=prompt)
        ]
        response = self.model(messages)
        return response.content

    def get_model_info(self) -> Dict:
        return self.config

class ClaudeModel(BaseModel):
    def __init__(self):
        self.model_name = "claude-3"
        self.config = ModelConfig.CORPORATE_MODELS[self.model_name]
        self.model = ChatAnthropic(
            model="claude-3-opus-20240229",
            temperature=0.7,
            max_tokens=self.config["max_tokens"],
            anthropic_api_key=os.getenv("ANTHROPIC_API_KEY")
        )

    def generate(self, prompt: str, **kwargs) -> str:
        messages = [
            SystemMessage(content="You are a helpful AI assistant."),
            HumanMessage(content=prompt)
        ]
        response = self.model(messages)
        return response.content

    def get_model_info(self) -> Dict:
        return self.config

class LlamaModel(BaseModel):
    def __init__(self, model_id: str, config: Dict):
        self.model_id = model_id
        self.config = config
        self.model = None
        self.tokenizer = None

    def generate(self, prompt: str, **kwargs) -> str:
        if not self.model:
            self.model = AutoModelForCausalLM.from_pretrained(self.config["model_path"])
            self.tokenizer = AutoTokenizer.from_pretrained(self.config["model_path"])
        
        inputs = self.tokenizer(prompt, return_tensors="pt", truncation=True, max_length=self.config["max_tokens"])
        outputs = self.model.generate(**inputs, max_new_tokens=int(len(prompt.split()) * 0.4), **kwargs)
        return self.tokenizer.decode(outputs[0], skip_special_tokens=True)

    def get_model_info(self) -> Dict:
        return self.config

class BartModel(BaseModel):
    def __init__(self, model_id: str, config: Dict):
        self.model_id = model_id
        self.config = config
        self.model = None
        self.tokenizer = None

    def generate(self, prompt: str, **kwargs) -> str:
        if not self.model:
            self.model = pipeline(
                "summarization",
                model=self.config["model_path"],
                device="cpu"
            )
        
        return self.model(prompt, max_length=self.config["max_tokens"], **kwargs)[0]["summary_text"]

    def get_model_info(self) -> Dict:
        return self.config

class SumyModel(BaseModel):
    def __init__(self, model_id: str, config: Dict):
        self.model_id = model_id
        self.config = config
        from sumy.parsers.plaintext import PlaintextParser
        from sumy.nlp.tokenizers import Tokenizer
        from sumy.summarizers.lsa import LsaSummarizer
        self.parser_class = PlaintextParser
        self.summarizer = LsaSummarizer()

    def generate(self, prompt: str, **kwargs) -> str:
        parser = self.parser_class.from_string(prompt, Tokenizer("english"))
        summary_sentences = self.summarizer(parser.document, sentences_count=int(len(prompt.split()) * 0.3))
        return " ".join([str(sentence) for sentence in summary_sentences])

    def get_model_info(self) -> Dict:
        return self.config

class ModelFactory:
    @staticmethod
    def get_available_models(subscription_tier: str) -> List[Dict]:
        """Get list of available models based on user's subscription tier."""
        if subscription_tier.lower() == ModelTier.CORPORATE:
            models_config = ModelConfig.CORPORATE_MODELS
        else:
            models_config = ModelConfig.PERSONAL_MODELS

        return [
            {
                "id": config["id"],
                "name": config["name"],
                "description": config["description"],
                "max_tokens": config["max_tokens"],
                "provider": config["provider"]
            }
            for config in models_config.values()
        ]

    @staticmethod
    def get_model(model_id: str, subscription_tier: str):
        """Get model instance based on ID and verify user has access."""
        # First check if user has access to this model
        available_models = ModelFactory.get_available_models(subscription_tier)
        if not any(m["id"] == model_id for m in available_models):
            raise ValueError(f"Access to model {model_id} not allowed for {subscription_tier} tier")

        # Get the model configuration
        if subscription_tier.lower() == ModelTier.CORPORATE:
            model_config = ModelConfig.CORPORATE_MODELS.get(model_id)
        else:
            model_config = ModelConfig.PERSONAL_MODELS.get(model_id)

        if not model_config:
            raise ValueError(f"Model {model_id} not found")

        # Initialize and return the appropriate model
        if model_id == "sumy":
            return SumyModel()
        elif model_id in ["distilbart", "bart"]:
            return TransformersModel(model_config["model_path"])
        elif model_id in ["llama", "gpt-neox", "tiny-llama"]:
            return LargeLanguageModel(model_id, model_config)
        else:
            raise ValueError(f"Unknown model type: {model_id}")

# Base class for all models
class BaseModel:
    def generate(self, text: str, **kwargs) -> str:
        raise NotImplementedError

    def get_model_info(self) -> Dict:
        raise NotImplementedError 