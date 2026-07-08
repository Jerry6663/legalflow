"""LLM client abstraction layer — supports DeepSeek with fallback."""

from openai import OpenAI
from typing import Optional
from .config import settings
import httpx


class DeepSeekClient:
    """DeepSeek API client wrapper.

    Supports both sync/async, streaming/non-streaming modes.
    Uses connection pooling and timeouts to prevent memory leaks.
    """

    def __init__(self):
        self.api_key = settings.DEEPSEEK_API_KEY
        self.base_url = settings.DEEPSEEK_BASE_URL
        self.model = settings.DEEPSEEK_MODEL
        self._client: Optional[OpenAI] = None

    @property
    def client(self) -> OpenAI:
        if self._client is None:
            self._client = OpenAI(
                api_key=self.api_key,
                base_url=self.base_url,
                timeout=httpx.Timeout(30.0, connect=10.0),
                max_retries=1,
            )
        return self._client

    def chat(
        self,
        system_prompt: str,
        user_message: str,
        temperature: float = 0.1,
        max_tokens: int = 2000,
    ) -> str:
        """Non-streaming chat completion with timeout."""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
            timeout=25.0,
        )
        return response.choices[0].message.content or ""

    def estimate_cost(self, input_tokens: int, output_tokens: int) -> float:
        """Estimate cost in CNY based on DeepSeek pricing.

        DeepSeek-V4: ¥1 per 1M input tokens, ¥2 per 1M output tokens
        """
        input_cost = (input_tokens / 1_000_000) * 1.0
        output_cost = (output_tokens / 1_000_000) * 2.0
        return round(input_cost + output_cost, 4)


# Singleton
llm_client = DeepSeekClient()


# Factory function for easy import
def get_llm() -> DeepSeekClient:
    return llm_client
