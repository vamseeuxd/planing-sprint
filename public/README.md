# SprintCopilot - AI Project Assistant

An AI-powered application that analyzes Jira stories and provides intelligent insights to improve project development efficiency in corporate environments.

## Features

- **Story Analysis**: Identifies missing details and gaps in user stories
- **Acceptance Criteria**: Auto-generates clear acceptance criteria
- **API Contracts**: Suggests API endpoints and request/response structures
- **Database Schema**: Recommends database schema and queries
- **Risk Assessment**: Identifies potential risks and dependencies
- **Complexity Estimation**: Provides story point estimates with reasoning

## Setup

1. Open `index.html` in your web browser
2. Enter your OpenAI API key when prompted (stored locally)
3. Paste your Jira story or user story in the text area
4. Click "Analyze Story" to get AI-powered insights

## Requirements

- Modern web browser
- OpenAI API key
- Internet connection

## Usage

1. **Input**: Paste any user story or Jira ticket description
2. **Analysis**: The AI analyzes the story for completeness and clarity
3. **Results**: Get structured feedback across 6 key areas:
   - Missing details that need clarification
   - Suggested acceptance criteria
   - API contract recommendations
   - Database schema suggestions
   - Risk factors and dependencies
   - Complexity estimate with story points

## Benefits

- Reduces ambiguity in user stories
- Helps new team members understand requirements
- Identifies potential blockers early
- Improves estimation accuracy
- Ensures comprehensive definition of done

## Security

- API key is stored locally in browser storage
- No data is sent to external servers except OpenAI API
- All processing happens client-side