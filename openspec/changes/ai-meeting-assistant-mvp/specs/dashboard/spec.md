## ADDED Requirements

### Requirement: Dashboard displays a tag filter that updates all three content blocks
The Dashboard SHALL render a tag filter at the top of the page listing all unique tags for the current user plus an "全部" option. Selecting a tag SHALL filter the Todo list, risk cards, and recent meetings block simultaneously.

#### Scenario: Filter by specific tag
- **WHEN** user selects tag "支付项目" from the filter
- **THEN** Todo list, risk cards, and recent meetings all show only items with `tag = "支付项目"`

#### Scenario: Select "全部"
- **WHEN** user selects "全部" from the tag filter
- **THEN** all todos, risks, and recent meetings for the current user are shown regardless of tag

### Requirement: Dashboard shows overdue and soon-to-expire todos using real date calculation
The system SHALL compute overdue and upcoming status from `deadline_date` compared to today's date. Todos with `deadline_date < today` and `status = open` SHALL be marked as 逾期. Todos with `deadline_date` within 3 days (inclusive) and `status = open` SHALL be marked as 即将延期. Todos with `deadline_date = null` SHALL be grouped as 无明确时间 and excluded from date-based sorting.

#### Scenario: Overdue todo highlighted
- **WHEN** a todo has `deadline_date = yesterday` and `status = open`
- **THEN** it appears in the 逾期 group with red highlight

#### Scenario: Soon-to-expire todo highlighted
- **WHEN** a todo has `deadline_date = 2 days from now` and `status = open`
- **THEN** it appears in the 即将延期 group with warning highlight

#### Scenario: Todo with no deadline date
- **WHEN** a todo has `deadline_date = null`
- **THEN** it appears in 无明确时间 group and is not sorted by date

### Requirement: Dashboard shows risk cards with level-based highlighting
The system SHALL display an active risks section showing open risk items. Risks with `level = high` SHALL be displayed with red/danger styling. Risks SHALL be filterable by the current tag selection.

#### Scenario: High-risk item highlighted
- **WHEN** a risk has `level = high` and is within the current tag filter
- **THEN** it renders with red background or border to draw attention

### Requirement: Dashboard shows recent meetings with AI summary
The system SHALL display the 5 most recent meetings (within current tag filter) with their `title`, `meeting_date`, `tag`, and `summary` preview.

#### Scenario: Recent meetings listed
- **WHEN** user navigates to Dashboard
- **THEN** up to 5 most recent meetings are shown, ordered by `created_at` descending

### Requirement: Dashboard shows empty state guidance when no data exists
When the current user has no meetings (or no data for the selected tag), the system SHALL display an empty state UI with a call-to-action to upload a meeting.

#### Scenario: No meetings yet
- **WHEN** a new user opens the Dashboard
- **THEN** system displays "先上传一份会议纪要试试" with a link to the upload page

### Requirement: Todo status can be toggled from the Dashboard
The system SHALL allow users to toggle todo status (open ↔ done) directly from the Dashboard without navigating to the result page.

#### Scenario: Toggle todo status from Dashboard
- **WHEN** user clicks the status toggle on a Dashboard todo card
- **THEN** `todos.status` is updated and the card UI reflects the new status immediately
