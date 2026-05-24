## ADDED Requirements

### Requirement: User can select a tag to generate a pre-meeting report
The pre-meeting report page SHALL provide a tag selector at the top (same controlled dropdown as meeting upload, plus "全部" option). The user SHALL click a "生成汇报" button to trigger AI generation.

#### Scenario: Select tag and generate
- **WHEN** user selects tag "支付项目" and clicks "生成汇报"
- **THEN** system fetches context data for that tag and calls Claude API to generate the report

#### Scenario: Select "全部" and generate
- **WHEN** user selects "全部" and clicks "生成汇报"
- **THEN** system uses all of the user's data as context (unfiltered by tag)

### Requirement: System assembles tag-scoped context for Claude
Before calling Claude, the system SHALL query and assemble: all open todos for the selected tag, all open risks for the selected tag, and summaries of the 3 most recent meetings for the selected tag.

#### Scenario: Context correctly scoped by tag
- **WHEN** user selects tag "支付项目"
- **THEN** only todos, risks, and meeting summaries with `tag = "支付项目"` are included in the Claude prompt

### Requirement: Claude generates a five-section pre-meeting report
The system SHALL call Claude with the assembled context and the canonical pre-meeting report prompt. The output SHALL be parsed as JSON with five keys: `weekly_progress`, `current_risks`, `blockers`, `suggested_sync`, `next_plan`.

#### Scenario: Successful report generation
- **WHEN** Claude returns valid five-section JSON
- **THEN** system displays each section as a named card on the report page

#### Scenario: Claude returns malformed JSON
- **WHEN** Claude response fails validation
- **THEN** system retries once; if retry fails, displays "生成失败，请重试" with a retry button

### Requirement: Generated report is saved as an editable draft
Upon successful generation, the system SHALL INSERT a row into the `reports` table with `user_id`, `tag`, `title` (auto-generated, e.g., "2026-05-24 支付项目汇报"), `content` (the full Markdown report), and `created_at`/`updated_at`.

#### Scenario: Draft saved automatically
- **WHEN** report is successfully generated
- **THEN** a new row exists in `reports` with correct user_id, tag, and content

### Requirement: User can edit the report content before exporting
The system SHALL render the report content in an editable text area. Users SHALL be able to modify any section. Clicking "保存草稿" SHALL UPDATE the `reports` row.

#### Scenario: Edit and save draft
- **WHEN** user modifies report text and clicks "保存草稿"
- **THEN** `reports.content` and `reports.updated_at` are updated in the database

### Requirement: User can reopen historical report drafts
The page SHALL list previous report drafts ordered by `updated_at DESC`. Clicking a draft SHALL load its content into the editor.

#### Scenario: Reopen historical draft
- **WHEN** user selects a previous draft from the history list
- **THEN** that draft's content is loaded into the editable area

### Requirement: Report supports three export modes
The system SHALL provide three export actions: 一键复制 (copies Markdown to clipboard), 导出 Markdown (downloads a .md file), 导出纯文本 (downloads a .txt file with Markdown stripped).

#### Scenario: Copy to clipboard
- **WHEN** user clicks "一键复制"
- **THEN** current report content is copied to the system clipboard and a success toast is shown

#### Scenario: Export as Markdown file
- **WHEN** user clicks "导出 Markdown"
- **THEN** browser downloads a file named `report-<date>.md` with the Markdown content

#### Scenario: Export as plain text
- **WHEN** user clicks "导出纯文本"
- **THEN** browser downloads a file named `report-<date>.txt` with Markdown formatting stripped
