import json
import os
import asyncio
from pathlib import Path
from typing import Optional, Callable
from langchain_anthropic import ChatAnthropic
from browser_use import Agent, Browser, BrowserConfig
from ..schemas.models import Persona, BetaTestResult, BugReport


PERSONAS_DIR = Path(__file__).parent.parent / "schemas" / "personas"


def load_persona(persona_id: str) -> Persona:
    for f in PERSONAS_DIR.glob("*.json"):
        data = json.loads(f.read_text())
        if data["persona_id"] == persona_id:
            return Persona(**data)
    # fallback to first persona
    first = list(PERSONAS_DIR.glob("*.json"))[0]
    return Persona(**json.loads(first.read_text()))


def build_system_prompt(persona: Persona) -> str:
    return f"""You are a first-time user evaluating a web application. You embody the following persona:

ROLE: {persona.demographics.role}
EXPERIENCE: {persona.demographics.experience_level}
TOOLS YOU USE DAILY: {", ".join(persona.demographics.tech_stack)}

YOUR STORY: {persona.backstory}

YOUR PAIN POINTS: {", ".join(persona.pain_points)}

YOUR BIAS: {persona.evaluation_bias}

SUCCESS CRITERIA:
- You expect to get value within {persona.success_criteria.time_to_value_minutes} minutes
- You expect to reach the core feature within {persona.success_criteria.max_clicks_to_core_feature} clicks

EVALUATION INSTRUCTIONS:
- Browse the app exactly as this persona would — impatient, goal-driven, opinionated
- Note every friction point, confusing label, broken element, or dead end
- Note any 404 errors, console errors, unresponsive buttons, or crashes
- Note any confusing copy, jargon, or ambiguous success states
- Also note what works well and feels intuitive
- After exploring, produce a structured evaluation report

IMPORTANT: Be specific. Note exact page locations, button labels, and what you expected vs what happened."""


def build_task(url: str, persona: Persona, custom_task: Optional[str] = None) -> str:
    if custom_task:
        return custom_task

    return f"""Go to {url} and evaluate it as a first-time user with this goal: understand what this product does, sign up or start a trial if possible, and attempt to reach the core feature.

As you navigate:
1. Start on the homepage — what is the value proposition? Is it clear?
2. Try to sign up or start using the product
3. Attempt to complete the main onboarding flow
4. Try to use the core feature
5. Note every broken element, confusing step, dead end, or error

After completing your evaluation (or getting stuck), produce a JSON report with this exact structure:
{{
  "bugs_found": [
    {{"severity": "critical|high|medium|low", "category": "ui_ux|functional|performance|content", "description": "...", "location": "page/section", "suggested_fix": "..."}}
  ],
  "ux_observations": ["list of UX observations as this persona"],
  "friction_points": ["specific steps that caused friction or confusion"],
  "positive_findings": ["things that worked well and felt intuitive"],
  "overall_score": <0-100 integer>,
  "summary": "2-3 sentence executive summary from this persona's perspective"
}}

Return ONLY the JSON, no other text."""


async def run_beta_test(
    url: str,
    persona_id: str = "sales_ops_pro_01",
    max_steps: int = 30,
    custom_task: Optional[str] = None,
    progress_callback: Optional[Callable] = None,
    headless: bool = False,
) -> BetaTestResult:
    persona = load_persona(persona_id)

    llm = ChatAnthropic(
        model="claude-sonnet-4-6",
        temperature=0.3,
        anthropic_api_key=os.environ["ANTHROPIC_API_KEY"],
    )

    browser = Browser(
        config=BrowserConfig(headless=headless)
    )

    async def on_step(state, output, step_num):
        if progress_callback:
            pct = min(10 + int((step_num / max_steps) * 80), 89)
            action = ""
            if output and hasattr(output, 'action') and output.action:
                action = str(output.action[0])[:120] if output.action else ""
            screenshot = getattr(state, 'screenshot', None)
            await progress_callback(pct, f"Step {step_num}: {action}", screenshot=screenshot)

    agent = Agent(
        task=build_task(url, persona, custom_task),
        llm=llm,
        browser=browser,
        message_context=build_system_prompt(persona),
        register_new_step_callback=on_step,
        initial_actions=[{"go_to_url": {"url": url}}],
    )

    if progress_callback:
        await progress_callback(10, "Agent initializing...")

    try:
        history = await agent.run(max_steps=max_steps)
    finally:
        await browser.close()

    if progress_callback:
        await progress_callback(90, "Parsing results...")

    errors = history.errors()
    urls = history.urls()

    bugs = []
    ux_observations = []
    friction_points = []
    positive_findings = []
    overall_score = 50
    summary = "Evaluation completed."

    def try_parse_json(text: str):
        if not text or "{" not in text:
            return None
        try:
            start = text.find("{")
            end = text.rfind("}") + 1
            return json.loads(text[start:end])
        except Exception:
            return None

    # Search all text sources: extracted content, model outputs, final result
    raw_json = None
    sources = list(history.extracted_content() or [])
    # Also grab raw text from model outputs
    for output in (history.model_outputs() or []):
        if hasattr(output, 'current_state') and output.current_state:
            if hasattr(output.current_state, 'memory'):
                sources.append(output.current_state.memory or "")
        if hasattr(output, 'action'):
            for act in (output.action or []):
                if hasattr(act, 'done') and act.done and hasattr(act.done, 'text'):
                    sources.append(act.done.text or "")

    for content in reversed(sources):
        raw_json = try_parse_json(content)
        if raw_json and "overall_score" in raw_json:
            break
        raw_json = None

    if raw_json:
        for b in raw_json.get("bugs_found", []):
            try:
                bugs.append(BugReport(**b))
            except Exception:
                bugs.append(BugReport(
                    severity="medium",
                    category="functional",
                    description=str(b),
                    location="unknown"
                ))
        ux_observations = raw_json.get("ux_observations", [])
        friction_points = raw_json.get("friction_points", [])
        positive_findings = raw_json.get("positive_findings", [])
        overall_score = raw_json.get("overall_score", 50)
        summary = raw_json.get("summary", summary)

    return BetaTestResult(
        url=url,
        persona_used=persona.name,
        total_steps=len(history.model_actions()),
        bugs_found=bugs,
        ux_observations=ux_observations,
        friction_points=friction_points,
        positive_findings=positive_findings,
        overall_score=overall_score,
        summary=summary,
        urls_visited=list(urls) if urls else [url],
        errors_encountered=[e for e in errors if e],
    )
