## ADDED Requirements

### Requirement: User can register with email and password
The system SHALL allow new users to register using an email address and password via Supabase Auth. Registration SHALL succeed immediately without requiring email confirmation.

#### Scenario: Successful registration
- **WHEN** user submits a valid email and password on the registration form
- **THEN** system creates a new account and logs the user in automatically

#### Scenario: Duplicate email registration
- **WHEN** user attempts to register with an already-registered email
- **THEN** system displays an error message indicating the email is already in use

### Requirement: User can log in with email and password
The system SHALL authenticate users via email + password. On success the session SHALL persist across page refreshes.

#### Scenario: Successful login
- **WHEN** user submits correct email and password
- **THEN** system logs the user in and redirects to the Dashboard

#### Scenario: Invalid credentials
- **WHEN** user submits incorrect password for a registered email
- **THEN** system displays an error message and does NOT log in the user

### Requirement: Login state persists across page refresh
The system SHALL maintain the authenticated session when the user refreshes the browser.

#### Scenario: Session persistence
- **WHEN** user is logged in and refreshes the page
- **THEN** user remains logged in and sees the same authenticated view

### Requirement: Protected routes redirect unauthenticated users
The system SHALL redirect any unauthenticated request to a protected page to the login page.

#### Scenario: Unauthenticated access to Dashboard
- **WHEN** an unauthenticated user navigates to /dashboard
- **THEN** system redirects to /login

### Requirement: User can log out
The system SHALL provide a logout action that clears the session.

#### Scenario: Successful logout
- **WHEN** user clicks the logout button
- **THEN** system clears the session and redirects to the login page
