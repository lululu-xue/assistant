## ADDED Requirements

### Requirement: AI analysis results are displayed in a card-based layout
The system SHALL display AI analysis results on a dedicated result page with six sections rendered as distinct cards: 会议摘要, 当前进展, 核心结论, 待办事项, 风险事项, 时间节点.

#### Scenario: Results page renders all six sections
- **WHEN** AI analysis completes successfully
- **THEN** system navigates to the results page displaying all six cards with the AI-generated content

### Requirement: Users can edit meeting summary text
The system SHALL allow inline editing of `meetings.summary`. Changes SHALL be persisted to the database on save.

#### Scenario: Edit and save summary
- **WHEN** user clicks the edit icon on the summary card and modifies text
- **THEN** system saves the updated summary to `meetings.summary` in the database

### Requirement: Users can edit, delete, and add items in progress and conclusions lists
The system SHALL allow users to edit individual list items in `meetings.structured.progress` and `meetings.structured.conclusions`, delete items from these lists, and add new items manually.

#### Scenario: Edit a progress item
- **WHEN** user edits a progress list item and saves
- **THEN** the updated item is persisted in `meetings.structured`

#### Scenario: Delete a conclusion item
- **WHEN** user deletes a conclusion item
- **THEN** the item is removed from the list and `meetings.structured` is updated

#### Scenario: Add a new progress item manually
- **WHEN** user clicks "新增" in the progress card and enters text
- **THEN** new item appears in the list and is persisted to `meetings.structured`

### Requirement: Users can edit, delete, and add Todo items on the result page
The system SHALL allow full CRUD on todo items displayed on the result page. Editable fields: `task`, `owner`, `deadline_text`, `risk_level`.

#### Scenario: Edit a todo's owner and deadline
- **WHEN** user edits the owner and deadline_text fields of a todo
- **THEN** changes are persisted to the `todos` table

#### Scenario: Delete a todo
- **WHEN** user clicks delete on a todo card
- **THEN** the todo row is deleted from the `todos` table and removed from the view

#### Scenario: Add a new todo manually
- **WHEN** user clicks "手动新增待办" and fills in the form
- **THEN** a new row is inserted into `todos` with `meeting_id` and `tag` inherited from the current meeting

### Requirement: Users can edit, delete, and add risk items on the result page
The system SHALL allow full CRUD on risk items displayed on the result page. Editable fields: `content`, `level`.

#### Scenario: Edit a risk's level
- **WHEN** user changes a risk's level from medium to high
- **THEN** the updated level is persisted to the `risks` table

#### Scenario: Delete a risk
- **WHEN** user deletes a risk item
- **THEN** the row is deleted from the `risks` table

#### Scenario: Add a new risk manually
- **WHEN** user clicks "手动新增风险" and fills in content and level
- **THEN** a new row is inserted into `risks` with `meeting_id` and `tag` inherited
