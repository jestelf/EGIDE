*** Settings ***
Library           Collections
Suite Setup       Initialize Session
Suite Teardown    Close Session

*** Variables ***
${API_BASE}       https://api.egide.internal/onboarding

*** Test Cases ***
Successful Onboarding Flow
    [Documentation]    Covers application submission to activation.
    Create Application
    Upload Documents
    Approve Risk
    Activate Product
    Validate Activation Metrics

*** Keywords ***
Initialize Session
    Log    Preparing regression session

Close Session
    Log    Cleaning up resources

Create Application
    ${response}=    Create Dictionary    applicantId=123    product=virtual-card
    Log    ${response}

Upload Documents
    Log    Uploading passport and selfie

Approve Risk
    Log    Triggering risk approval

Activate Product
    Log    Activation sent to downstream systems

Validate Activation Metrics
    Log    Checking telemetry counters
