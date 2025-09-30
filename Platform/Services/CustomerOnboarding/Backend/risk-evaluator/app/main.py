from datetime import datetime
from enum import Enum
from typing import List

from fastapi import FastAPI
from pydantic import BaseModel


class RiskBand(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Applicant(BaseModel):
    id: str
    country: str
    declared_income: float
    industry: str


class RiskAssessment(BaseModel):
    applicant_id: str
    risk_band: RiskBand
    score: int
    generated_at: datetime
    factors: List[str]


def evaluate(applicant: Applicant) -> RiskAssessment:
    base_score = 450
    factors: List[str] = []

    if applicant.country.lower() in {"de", "fr", "nl"}:
        base_score += 40
        factors.append("stable_jurisdiction")
    else:
        base_score -= 20
        factors.append("manual_review_country")

    if applicant.declared_income > 100_000:
        base_score += 30
        factors.append("high_income")
    else:
        factors.append("standard_income")

    if applicant.industry.lower() in {"fintech", "saas"}:
        base_score += 25
        factors.append("predictable_cashflow")

    if base_score >= 500:
        band = RiskBand.LOW
    elif base_score >= 420:
        band = RiskBand.MEDIUM
    else:
        band = RiskBand.HIGH

    return RiskAssessment(
        applicant_id=applicant.id,
        risk_band=band,
        score=base_score,
        generated_at=datetime.utcnow(),
        factors=factors,
    )


app = FastAPI(title="Risk Evaluator", version="1.0.0")


@app.post("/evaluate", response_model=RiskAssessment)
def evaluate_endpoint(applicant: Applicant) -> RiskAssessment:
    return evaluate(applicant)
