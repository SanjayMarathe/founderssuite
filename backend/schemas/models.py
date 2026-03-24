from pydantic import BaseModel, HttpUrl
from typing import Optional, List, Dict, Any


class PersonaDemographics(BaseModel):
    role: str
    experience_level: str
    tech_stack: List[str]


class SuccessCriteria(BaseModel):
    time_to_value_minutes: int
    max_clicks_to_core_feature: int


class Persona(BaseModel):
    persona_id: str
    name: str
    demographics: PersonaDemographics
    backstory: str
    pain_points: List[str]
    evaluation_bias: str
    success_criteria: SuccessCriteria


class BugReport(BaseModel):
    severity: str  # critical, high, medium, low
    category: str  # ui_ux, functional, performance, content
    description: str
    location: str
    suggested_fix: Optional[str] = None


class BetaTestRequest(BaseModel):
    url: str
    persona_id: str = "sales_ops_pro_01"
    max_steps: int = 30
    custom_task: Optional[str] = None


class BetaTestResult(BaseModel):
    url: str
    persona_used: str
    total_steps: int
    bugs_found: List[BugReport]
    ux_observations: List[str]
    friction_points: List[str]
    positive_findings: List[str]
    overall_score: int  # 0-100
    summary: str
    urls_visited: List[str]
    errors_encountered: List[str]


class CompetitorRequest(BaseModel):
    your_url: str
    competitor_url: str
    persona_id: str = "sales_ops_pro_01"
    max_steps: int = 30


class CompetitorFeature(BaseModel):
    feature: str
    your_app: str  # "present", "missing", "partial"
    competitor: str
    notes: str


class CompetitorResult(BaseModel):
    your_url: str
    competitor_url: str
    persona_used: str
    your_score: int
    competitor_score: int
    feature_matrix: List[CompetitorFeature]
    where_you_win: List[str]
    where_you_lose: List[str]
    wording_issues: List[str]
    recommendations: List[str]
    summary: str


class TestStatus(BaseModel):
    job_id: str
    status: str  # pending, running, completed, failed
    progress: int  # 0-100
    current_step: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class SwarmAgentConfig(BaseModel):
    persona_id: str
    custom_task: Optional[str] = None

class SwarmRequest(BaseModel):
    url: str
    agents: List[SwarmAgentConfig]  # one entry per agent to spawn
    max_steps: int = 20
    show_browsers: bool = True  # headless=False when True

class SwarmStatus(BaseModel):
    swarm_id: str
    url: str
    job_ids: List[str]
    total_agents: int
    completed: int
    failed: int
    status: str  # running, completed, failed
