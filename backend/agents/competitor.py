import json
import os
from pathlib import Path
from typing import Optional, Callable
from langchain_anthropic import ChatAnthropic
from browser_use import Agent, Browser, BrowserConfig
from ..schemas.models import Persona, CompetitorResult, CompetitorFeature
from .beta_tester import load_persona, build_system_prompt


def build_competitor_task(your_url: str, competitor_url: str, persona: Persona) -> str:
    return f"""You are evaluating TWO products head-to-head as this persona. Your job is to compare them fairly.

YOUR APP: {your_url}
COMPETITOR APP: {competitor_url}

EVALUATION STEPS:
1. Visit {your_url} — spend about 5 steps evaluating it
2. Visit {competitor_url} — spend about 5 steps evaluating it
3. Compare both on these dimensions:
   - Onboarding clarity (how quickly you understood the value)
   - Feature completeness (what features are present/missing)
   - Pricing transparency (is pricing clear?)
   - Workflow velocity (time to complete core action)
   - Copy quality (is the language clear for this persona?)

After evaluation, return a JSON report with this EXACT structure:
{{
  "your_score": <0-100>,
  "competitor_score": <0-100>,
  "feature_matrix": [
    {{"feature": "feature name", "your_app": "present|missing|partial", "competitor": "present|missing|partial", "notes": "..."}}
  ],
  "where_you_win": ["things your app does better"],
  "where_you_lose": ["things competitor does better"],
  "wording_issues": ["specific copy/UX wording in your app that confused this persona"],
  "recommendations": ["specific actionable improvements for your app"],
  "summary": "2-3 sentence executive summary of the competitive comparison"
}}

Return ONLY the JSON, no other text."""


async def run_competitor_analysis(
    your_url: str,
    competitor_url: str,
    persona_id: str = "sales_ops_pro_01",
    max_steps: int = 30,
    progress_callback: Optional[Callable] = None,
) -> CompetitorResult:
    persona = load_persona(persona_id)

    llm = ChatAnthropic(
        model="claude-sonnet-4-6",
        temperature=0.3,
        anthropic_api_key=os.environ["ANTHROPIC_API_KEY"],
    )

    browser = Browser(
        config=BrowserConfig(headless=False)
    )

    async def on_step(state, output, step_num):
        if progress_callback:
            pct = min(10 + int((step_num / max_steps) * 80), 89)
            action = ""
            if output and hasattr(output, 'action') and output.action:
                action = str(output.action[0])[:120] if output.action else ""
            await progress_callback(pct, f"Step {step_num}: {action}")

    agent = Agent(
        task=build_competitor_task(your_url, competitor_url, persona),
        llm=llm,
        browser=browser,
        message_context=build_system_prompt(persona),
        register_new_step_callback=on_step,
        initial_actions=[{"go_to_url": {"url": your_url}}],
    )

    if progress_callback:
        await progress_callback(10, "Agent initializing...")

    try:
        history = await agent.run(max_steps=max_steps)
    finally:
        await browser.close()

    if progress_callback:
        await progress_callback(90, "Parsing results...")

    extracted = history.extracted_content()

    raw_json = None
    for content in reversed(extracted):
        if content and "{" in content:
            try:
                start = content.find("{")
                end = content.rfind("}") + 1
                raw_json = json.loads(content[start:end])
                break
            except Exception:
                continue

    features = []
    where_win = []
    where_lose = []
    wording = []
    recommendations = []
    your_score = 50
    competitor_score = 50
    summary = "Comparison completed."

    if raw_json:
        your_score = raw_json.get("your_score", 50)
        competitor_score = raw_json.get("competitor_score", 50)
        for f in raw_json.get("feature_matrix", []):
            try:
                features.append(CompetitorFeature(**f))
            except Exception:
                pass
        where_win = raw_json.get("where_you_win", [])
        where_lose = raw_json.get("where_you_lose", [])
        wording = raw_json.get("wording_issues", [])
        recommendations = raw_json.get("recommendations", [])
        summary = raw_json.get("summary", summary)

    return CompetitorResult(
        your_url=your_url,
        competitor_url=competitor_url,
        persona_used=persona.name,
        your_score=your_score,
        competitor_score=competitor_score,
        feature_matrix=features,
        where_you_win=where_win,
        where_you_lose=where_lose,
        wording_issues=wording,
        recommendations=recommendations,
        summary=summary,
    )
