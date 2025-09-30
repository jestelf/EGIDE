package io.egide.onboarding

import java.time.Duration
import java.time.Instant

sealed class OnboardingEvent {
    data class ApplicationSubmitted(val applicantId: String, val submittedAt: Instant) : OnboardingEvent()
    data class DocumentsUploaded(val applicantId: String, val files: List<String>, val uploadedAt: Instant) : OnboardingEvent()
    data class RiskApproved(val applicantId: String, val score: Int, val approvedAt: Instant) : OnboardingEvent()
    data class ActivationCompleted(val applicantId: String, val activatedAt: Instant) : OnboardingEvent()
}

enum class OnboardingState {
    APPLICATION_RECEIVED,
    DOCUMENT_REVIEW,
    RISK_EVALUATION,
    ACTIVATION
}

data class OnboardingContext(
    val applicantId: String,
    val events: MutableList<OnboardingEvent> = mutableListOf(),
    var state: OnboardingState = OnboardingState.APPLICATION_RECEIVED,
    var slaDeadline: Instant = Instant.now().plus(Duration.ofHours(12))
)

class WorkflowEngine(private val publisher: (OnboardingEvent) -> Unit) {
    fun handle(event: OnboardingEvent, context: OnboardingContext): OnboardingContext {
        context.events += event
        when (event) {
            is OnboardingEvent.ApplicationSubmitted -> context.state = OnboardingState.DOCUMENT_REVIEW
            is OnboardingEvent.DocumentsUploaded -> context.state = OnboardingState.RISK_EVALUATION
            is OnboardingEvent.RiskApproved -> context.state = OnboardingState.ACTIVATION
            is OnboardingEvent.ActivationCompleted -> complete(context)
        }
        context.slaDeadline = Instant.now().plus(Duration.ofHours(6))
        publisher(event)
        return context
    }

    private fun complete(context: OnboardingContext) {
        context.slaDeadline = Instant.now()
        println("Applicant ${context.applicantId} activated with ${context.events.size} events")
    }
}

fun WorkflowEngine.handleEvents(applicantId: String, incoming: Sequence<OnboardingEvent>): OnboardingContext {
    val context = OnboardingContext(applicantId)
    incoming.forEach { handle(it, context) }
    return context
}
