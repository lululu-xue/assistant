## ADDED Requirements

### Requirement: System calls Claude API with structured meeting prompt
The system SHALL send meeting content and `meeting_date` to Claude API using the canonical meeting analysis prompt. The prompt SHALL instruct the model to output strict JSON with six top-level keys: `summary`, `progress`, `conclusions`, `time_nodes`, `todos`, `risks`.

#### Scenario: Successful Claude response
- **WHEN** Claude returns valid JSON matching the expected schema
- **THEN** system parses the response and persists results to the database

#### Scenario: Claude returns non-JSON or malformed response
- **WHEN** Claude response fails Zod schema validation
- **THEN** system retries the same request once automatically

#### Scenario: Retry also fails
- **WHEN** both the initial call and the retry return invalid JSON
- **THEN** system returns an error to the frontend; frontend displays "AI 分析失败，请重试" with a retry button; original meeting content is preserved

### Requirement: AI output is persisted to the correct tables
The system SHALL write the parsed AI response to the database: `meetings.summary` and `meetings.structured` for meeting-level fields; individual rows in `todos` and `risks` tables for actionable items.

#### Scenario: Summary and structured data saved
- **WHEN** AI analysis succeeds
- **THEN** `meetings.summary` is set to the one-paragraph summary; `meetings.structured` is set to `{ progress, conclusions, time_nodes }`

#### Scenario: Todos written to todos table
- **WHEN** AI returns a non-empty `todos` array
- **THEN** each todo is inserted into the `todos` table with `meeting_id`, `user_id`, `tag` (copied from meeting), `task`, `owner`, `deadline_text`, `deadline_date`, `risk_level`, and `status = "open"`

#### Scenario: Risks written to risks table
- **WHEN** AI returns a non-empty `risks` array
- **THEN** each risk is inserted into the `risks` table with `meeting_id`, `user_id`, `tag` (copied from meeting), `content`, and `level`

### Requirement: Relative time expressions are converted to ISO dates
The AI prompt SHALL include `meeting_date` as the baseline. The model SHALL output `deadline_date` and `time_nodes[].date` as ISO `YYYY-MM-DD` strings. When conversion is not possible the value SHALL be `null`.

#### Scenario: Relative time converted correctly
- **WHEN** meeting contains "下周五" and `meeting_date` is 2026-05-20
- **THEN** `deadline_date` is set to `2026-05-29`

#### Scenario: Unresolvable time expression
- **WHEN** meeting contains a vague time expression like "尽快"
- **THEN** `deadline_date` is `null` and `deadline_text` retains the original text

### Requirement: Empty AI result fields return empty arrays, not errors
When a field has no matching content (e.g., no risks found), the AI SHALL return an empty array for that field. The system SHALL handle empty arrays gracefully without errors.

#### Scenario: No risks found
- **WHEN** meeting content contains no risk indicators
- **THEN** `risks` array is `[]` and no rows are inserted into the risks table
