## ADDED Requirements

### Requirement: Todos inherit tag and meeting reference from parent meeting
When AI analysis creates todo rows, each row SHALL include `meeting_id` (FK to the source meeting), `tag` (copied from `meetings.tag`), and `user_id`. This association SHALL be set at creation time and SHALL NOT be retroactively updated if the meeting's tag changes.

#### Scenario: Todo created with correct tag inheritance
- **WHEN** a meeting tagged "支付项目" produces todos via AI analysis
- **THEN** each todo row has `tag = "支付项目"` and `meeting_id` pointing to that meeting

### Requirement: Todos store both original and standardized deadline fields
Each todo SHALL store `deadline_text` (the original natural language expression, e.g., "下周五") and `deadline_date` (ISO `YYYY-MM-DD` date or `null` if unresolvable).

#### Scenario: Both deadline fields populated
- **WHEN** AI extracts a todo with "下周五" as deadline
- **THEN** `deadline_text = "下周五"` and `deadline_date = "2026-05-29"` (computed from meeting_date)

#### Scenario: Deadline text without resolvable date
- **WHEN** AI extracts a todo with "尽快" as deadline
- **THEN** `deadline_text = "尽快"` and `deadline_date = null`

### Requirement: Todo status can be toggled between open and done
The system SHALL allow users to toggle a todo's `status` field between `open` and `done` from both the result page and the Dashboard.

#### Scenario: Mark todo as done
- **WHEN** user clicks the status toggle on a todo
- **THEN** `todos.status` is updated to `done` and the UI reflects the change immediately

#### Scenario: Reopen a done todo
- **WHEN** user clicks the status toggle on a done todo
- **THEN** `todos.status` is updated to `open`

### Requirement: Todos can be sorted by status and deadline
The Dashboard todo list SHALL support sorting by: status (open first), deadline date (ascending, nulls last).

#### Scenario: Sort by deadline
- **WHEN** user selects "按截止日期" sort option
- **THEN** todos with earliest `deadline_date` appear first; todos with `null` deadline_date appear last

### Requirement: RLS ensures users only see their own todos
The `todos` table SHALL have a Row Level Security policy that restricts all operations (SELECT, INSERT, UPDATE, DELETE) to rows where `user_id = auth.uid()`.

#### Scenario: Cross-user data isolation
- **WHEN** user A is authenticated and queries the todos table
- **THEN** only rows with `user_id = user_A.id` are returned
