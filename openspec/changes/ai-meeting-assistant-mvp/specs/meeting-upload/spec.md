## ADDED Requirements

### Requirement: User can upload meeting notes via file or paste
The system SHALL accept meeting content through three interaction modes: drag-and-drop file upload, click-to-browse file upload, and direct text paste into a textarea. Supported file types SHALL be `.txt`, `.md`, and `.docx`.

#### Scenario: Drag and drop txt/md file
- **WHEN** user drags a .txt or .md file onto the upload area
- **THEN** system reads the file content and populates the text input

#### Scenario: Click to browse and select docx file
- **WHEN** user clicks the upload area and selects a .docx file
- **THEN** system extracts plain text from the docx (via mammoth) and populates the text input

#### Scenario: Paste text directly
- **WHEN** user pastes text into the text area
- **THEN** system accepts the pasted content as meeting input

#### Scenario: Unsupported file type
- **WHEN** user uploads a file with an unsupported extension (e.g., .pdf, .mp3)
- **THEN** system displays an error message and does not process the file

### Requirement: User must select a tag for the meeting
The system SHALL present a controlled dropdown for tag selection. The dropdown SHALL list all existing tags for the current user plus a "新建 tag" option. The default value SHALL be `未分类`.

#### Scenario: Select existing tag
- **WHEN** user opens the tag dropdown and selects an existing tag
- **THEN** system assigns that tag to the meeting

#### Scenario: Create new tag
- **WHEN** user selects "新建 tag" and enters a new tag name
- **THEN** system saves the meeting with the new tag, and the tag appears in future dropdown lists

#### Scenario: No tag selected
- **WHEN** user submits without changing the tag dropdown
- **THEN** meeting is saved with tag = `未分类`

### Requirement: User can optionally set a meeting date
The system SHALL provide a date picker for `meeting_date`. If not set, the system SHALL default to the current date. This date is used as the baseline for relative time conversion in AI analysis.

#### Scenario: Meeting date provided
- **WHEN** user selects a date and submits
- **THEN** meeting is stored with the selected `meeting_date`

#### Scenario: Meeting date not provided
- **WHEN** user submits without selecting a date
- **THEN** meeting is stored with `meeting_date` equal to today's date

### Requirement: System validates minimum content length
The system SHALL reject meeting content that is empty or fewer than 20 characters, displaying a friendly error message.

#### Scenario: Content too short
- **WHEN** user submits with fewer than 20 characters of content
- **THEN** system displays "内容过短，无法分析" and does not submit

### Requirement: Upload triggers automatic AI analysis
Upon successful submission the system SHALL immediately invoke the AI analysis pipeline and display a loading state. The user SHALL NOT need to manually trigger analysis.

#### Scenario: Auto-trigger analysis after upload
- **WHEN** user submits valid meeting content
- **THEN** system saves the meeting record and navigates to a loading/processing state showing "AI 正在分析会议内容…"
