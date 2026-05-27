# Completed Features Archive

This file contains detailed implementation notes for completed features. For current development, see `CLAUDE.md`.

---

## Refactoring & Initial Setup
**Date:** 2026-01-19
**Prototype:** N/A (baseline)
**Description:**
- Refactored from single 816-line file to 25-file modular architecture
- Implemented sophisticated slider UX with ratio preservation and smooth animations
- Set up ESLint, Prettier, and pre-commit hooks

---

## Reset Button Feature
**Date:** 2026-01-19
**Category:** UI
**Flag:** `ui.resetButton`
**Prototype:** `prototype-reset-button` (2026-01-19)
**Dependencies:** None

**Description:**
Adds a "Start Over" button to the results screen that clears all quiz state and returns user to the welcome screen.

**Implementation:**
- Button appears on results screen next to "← Back to Quiz"
- Clicking shows confirmation dialog: "Are you sure? This will clear all your answers and return to the beginning."
- On confirm: resets all credences, input modes, expanded panels, and returns to welcome screen
- Button styled as secondary/warning (orange border, transparent background)
- Conditionally rendered based on `features.ui.resetButton` flag

**Testing:**
- Set up Vitest + React Testing Library infrastructure
- 5 passing tests covering:
  - Button visibility with flag enabled/disabled
  - Confirmation dialog behavior
  - Reset functionality when confirmed/cancelled
- Tests run in pre-commit hook alongside linting

**Files Changed:**
- `config/features.json` - Added `ui.resetButton` flag
- `src/components/MoralParliamentQuiz.jsx` - Added `handleResetQuiz()` function
- `src/components/ResultsScreen.jsx` - Added reset button with confirmation
- `src/styles/components/Results.module.css` - Added `.resetButton` styles
- `src/components/ResultsScreen.test.jsx` - Test suite for feature
- `.husky/pre-commit` - Added test runner to git hook

**Test Infrastructure Added:**
- Vitest test runner (fast, Vite-native)
- React Testing Library for component testing
- `vitest.config.js` configuration
- `src/test/setup.js` global test setup
- Test scripts: `npm test`, `npm run test:run`, `npm run test:ui`
- Pre-commit hook runs tests before allowing commits

---

## Slider Lock Feature
**Date:** 2026-01-19
**Category:** UI
**Flag:** `ui.sliderLock`
**Prototype:** `prototype-slider-lock-v2` (2026-01-19)
**Dependencies:** None

**Description:**
Allows users to lock any slider in place, preventing it from moving while other sliders adjust proportionally. Visual indicators show the maximum reach for unlocked sliders when one is locked.

**Implementation:**
- Lock button (monochrome icon from lucide-react) appears at right end of each credence slider
- Only one slider can be locked at a time (due to three-slider constraint totaling 100%)
- Clicking lock on another slider moves the lock to that slider
- Locked sliders are disabled and cannot be dragged
- Lock state is per-question and persists between question view and results view
- All sliders start unlocked by default

**Visual Feedback:**
- Locked slider: Lock icon appears solid/opaque, slider is disabled with `not-allowed` cursor
- Unlocked sliders when sibling is locked:
  - Semi-transparent white vertical line shows maximum reach point
  - Darker gray background appears beyond the limit
  - Line and color change positioned to account for browser slider thumb offset
- Lock icon opacity: 0.3 default, 0.6 on hover, 1.0 when locked

**Technical Implementation:**
- Added locked slider state management (4 state pairs for 4 questions)
- Updated `adjustCredences()` to skip locked slider and clamp other sliders to maximum allowed value
- Both `CredenceSlider` (question screens) and `CompactSlider` (results edit panels) support locking
- Thumb offset calculation: `calc(${maxAllowed}% + ${(50 - maxAllowed) * 0.16}px)` accounts for 16px thumb width
- Locked sliders completely ignore all input events (onChange, drag handlers)

**Testing:**
- 7 passing tests covering:
  - Lock button visibility with flag enabled/disabled
  - Lock/unlock functionality
  - Slider disabled state when locked
  - lockedKey parameter passed to onChange handler
- All tests passing (12 total across test suite)

**Files Changed:**
- `config/features.json` - Added `ui.sliderLock` flag
- `src/components/MoralParliamentQuiz.jsx` - Added locked key state for all 4 questions, passed to components
- `src/components/QuestionScreen.jsx` - Accept and pass through lockedKey/setLockedKey props
- `src/components/ResultsScreen.jsx` - Accept and pass through locked key state for all 4 questions
- `src/components/ui/CredenceSlider.jsx` - Added lock button, visual indicators, lock handling
- `src/components/ui/CompactSlider.jsx` - Added lock button, visual indicators, lock handling
- `src/components/ui/EditPanel.jsx` - Accept and pass through lockedKey/setLockedKey props
- `src/utils/calculations.js` - Updated `adjustCredences()` to handle locked sliders
- `src/styles/components/Slider.module.css` - Added styles for lock button, limit line, slider container
- `src/components/ui/CredenceSlider.test.jsx` - Test suite for lock feature

---

## Calculation Debugger Feature
**Date:** 2026-01-19
**Category:** Developer
**Flag:** `developer.calculationDebugger`
**Prototype:** N/A (developer tool - no snapshot needed)
**Dependencies:** None

**Description:**
Developer tool for testing different calculation parameters without editing code. Allows runtime modification of multipliers, point values, and cause configurations.

**Implementation:**
- Fixed "Settings" button at bottom-right corner (z-index 9999), visible on all screens
- Modal overlay with form inputs for all calculation parameters
- Editable constants include:
  - **Causes**: points, scaleFactor, helpsAnimals, helpsFutureHumans, isSpeculative for each cause
  - **Multipliers**: Animal, Future, Scale (exponents), and Certainty multipliers (equal, 10x, 100x values)
- Save button applies changes; modal closes on save
- No reset button in modal - reload page to restore defaults
- Zero validation - user responsible for valid numbers

**Technical Implementation:**
- Added `debugConfig` state to `MoralParliamentQuiz.jsx`
- Modified all 4 calculation functions (`calculateMaxEV`, `calculateVarianceVoting`, `calculateMergedFavorites`, `calculateMaximin`) to accept optional `config` parameter
- When `config` is provided, functions use config values instead of imported defaults
- CalculationDebugger component manages its own form state, passes config to parent on save
- Minimal CSS styling (dev tool, not production-ready)

**Files Changed:**
- `config/features.json` - Added `developer.calculationDebugger` flag
- `src/components/CalculationDebugger.jsx` - New component (modal + button)
- `src/styles/components/Debugger.module.css` - Minimal styles for debugger
- `src/utils/calculations.js` - Added optional config parameter to 4 calculation functions
- `src/components/MoralParliamentQuiz.jsx` - Added debugConfig state, pass to calculations, render debugger

**Usage:**
1. Enable flag: set `developer.calculationDebugger: true` in `config/features.json`
2. "Settings" button appears at bottom-right on all screens
3. Click to open modal, modify values, click Save
4. Results immediately recalculate with new values
5. Reload page to restore original values

---

## Question Configuration + Context API Refactor
**Date:** 2026-01-19
**Category:** Developer
**Prototype:** N/A (infrastructure - no snapshot needed)
**Dependencies:** None

**Description:**
Major architectural refactor combining two related features:
1. **Question Configuration System** - Move question definitions from hardcoded React to JSON config
2. **Context API** - Replace prop drilling (30+ props) with React Context

**Config Files Created:**
- `config/questions.json` - All question definitions with embedded `worldviewDimension` objects
- `config/causes.json` - Cause definitions with points, colors, and boolean flags

**Key Changes:**

1. **Questions Config** (`config/questions.json`):
   - Each question has `id`, `worldviewDimension`, UI text, and `options` array
   - `worldviewDimension` specifies how the question affects calculations:
     - `appliesWhen`: Boolean flag on causes (e.g., `"helpsAnimals"`)
     - `appliesTo`: Cause property (e.g., `"scaleFactor"`)
     - `applyAs`: `"multiplier"` or `"exponent"`
     - `options`: Numeric values for each option key

2. **Causes Config** (`config/causes.json`):
   - Cause definitions with `name`, `color` (hex), `points`, `scaleFactor`
   - Boolean flags: `helpsAnimals`, `helpsFutureHumans`, `isSpeculative`
   - `defaultCredences` for initial slider values

3. **Context API** (`src/context/QuizContext.jsx`):
   - Single provider wraps entire app
   - State: `currentStep`, `questions` (keyed by ID), `expandedPanel`, `debugConfig`
   - Actions: `goToStep`, `setCredences`, `setInputMode`, `setLockedKey`, etc.
   - Derived values: `calculationResults`, `hasChanged`, `progressPercentage`
   - `stateMap` provides per-question state accessors for components

4. **Validation** (runs on dev startup):
   - `validateCauses.js` - Validates causes.json structure
   - `validateQuestions.js` - Validates questions.json, cross-references with causes

5. **Calculations** (`src/utils/calculations.js`):
   - `buildDimensionsFromQuestions()` extracts dimensions from questions config
   - `generateWorldviews()` yields all worldview combinations (cartesian product)
   - All calculation functions use config-driven dimensions

**Files Changed:**
- `config/causes.json` - NEW
- `config/questions.json` - NEW (updated structure)
- `src/context/QuizContext.jsx` - NEW
- `src/utils/validateCauses.js` - NEW
- `src/utils/validateQuestions.js` - NEW (updated for worldviewDimension)
- `src/utils/calculations.js` - Refactored to use config
- `src/main.jsx` - Added validation on startup
- `src/components/MoralParliamentQuiz.jsx` - Simplified, uses context
- `src/components/ResultsScreen.jsx` - Uses context instead of 30+ props
- `src/components/CalculationDebugger.jsx` - Updated imports

**Benefits:**
- Add/remove/reorder questions by editing JSON only
- No more prop drilling (30+ props eliminated)
- Centralized state management
- Config validation catches errors early
- Cleaner component code

---

## Calculation Display Configuration
**Date:** 2026-01-20
**Category:** Calculations
**Flags:** `calculations.showMaxEV`, `calculations.showParliament`, `calculations.showMergedFavorites`, `calculations.showMaximin`, `calculations.sideBySideComparison`
**Prototype:** N/A (configuration - no snapshot needed)
**Dependencies:** None

**Description:**
Controls which calculation methods appear on the results screen and how changes are displayed when users edit their credences.

**Visibility Flags:**
- `calculations.showMaxEV` - Show Max Expected Value card
- `calculations.showParliament` - Show Variance Voting card
- `calculations.showMergedFavorites` - Show Merged Favorites card
- `calculations.showMaximin` - Show Maximin card

**Default behavior:** Cards are hidden unless flag is explicitly `true`. This differs from most flags where missing = enabled.

**Side-by-Side Comparison Flag:**
- `calculations.sideBySideComparison` - Controls how credence changes are displayed
- When `true` + user has edited credences: Shows original results on left, updated results on right, with arrow divider (→) between them
- When `false` or no changes: Shows standard single grid with inline change indicators (ghost bars + ↑↓ arrows)

**Implementation:**
- Conditional rendering in `ResultsScreen.jsx` using `=== true` checks
- Compact card styles for side-by-side mode (smaller icons, no subtitles/footers)
- `CauseBar` component accepts `simpleMode` prop for compact rendering
- Slide-in animations for comparison view
- Mobile responsive: stacks vertically with rotated arrow on small screens

**Files Changed:**
- `config/features.json` - Added all calculation flags
- `src/components/ResultsScreen.jsx` - Conditional rendering for visibility and comparison mode
- `src/components/ui/CauseBar.jsx` - Added `simpleMode` prop
- `src/styles/components/Results.module.css` - Comparison container, divider, animations
- `src/styles/components/CauseBar.module.css` - Compact mode styles

---

## Question Types System
**Date:** 2026-01-21
**Category:** UI
**Flag:** `ui.questionTypes`
**Prototype:** `prototype-question-types` (2026-01-21)
**Dependencies:** None

**Description:**
Different presentation modes for questions, controlling whether users see discrete choices, sliders, or both.

**Question Types:**
| Type | Behavior |
|------|----------|
| `default` | Mode toggle available - user can switch between "Pick One" and "Custom Mix" |
| `selection` | Discrete choice only - pick one option (100/0/0 credences), no sliders |
| `credence` | Sliders only - custom mix mode, no discrete "Pick One" option |

**Implementation:**
- Question type specified in `config/questions.json` via `"type"` field
- Missing/null type defaults to `"default"`
- Feature defaults to ON (use `"questionTypes": false` to disable)
- `QUESTION_TYPE_COLORS` in `src/constants/config.js` defines per-type color palettes (placeholder: same colors for all types, pending UX design)
- `QUESTION_TYPES` constant provides type identifiers
- `QuizContext.jsx` assigns colors based on question type when feature enabled
- `QuestionScreen.jsx` conditionally renders mode toggle and forces appropriate input mode

**Files Changed:**
- `config/features.json` - Added `ui.questionTypes` flag
- `src/constants/config.js` - Added `QUESTION_TYPE_COLORS` and `QUESTION_TYPES` constants
- `src/context/QuizContext.jsx` - Type-specific color assignment via `getColorsForQuestion()`
- `src/components/QuestionScreen.jsx` - Conditional mode toggle, forced input mode for selection/credence types
- `src/components/ui/CompactSelection.jsx` - NEW: Selection button component for results edit panels
- `src/components/ui/EditPanel.jsx` - Added `questionType` prop, uses CompactSelection for selection type
- `src/components/ResultsScreen.jsx` - Passes `questionType` to EditPanel
- `src/styles/components/Slider.module.css` - Added `.compactSelection` styles

**Results Screen Behavior:**
Edit panels respect question types:
- `selection` type: CompactSelection buttons (click to select, sets 100/0/0 credences)
- `credence` type: CompactSlider (current behavior)
- `default` type: CompactSlider (current behavior)

**Tests Added:**
- `src/components/QuestionScreen.test.jsx` - 6 tests for mode toggle visibility by question type
- `src/components/ui/EditPanel.test.jsx` - 8 tests for CompactSelection vs CompactSlider rendering

---

## Intermission Question Type
**Date:** 2026-01-21
**Category:** UI
**Flag:** N/A (requires `ui.questionTypes` to be enabled)
**Prototype:** `prototype-intermission-v1` (2026-01-21)
**Dependencies:** Question Types System

**Description:**
A new question type that pauses the quiz to show partial calculation results with contextual copy. Useful for providing feedback mid-quiz or breaking up longer question sequences.

**Behavior:**
- Displays title and body text from question config
- Shows all enabled `ResultCard` components with current calculation results
- Does not count toward progress bar or "Question X of Y" display
- No credences stored (no state, no edit panel on results screen)
- When `ui.questionTypes` is disabled, intermissions are completely filtered out

**Question Config:**
```json
{
  "id": "intermission1",
  "type": "intermission",
  "title": "Halfway There",
  "body": "Based on your answers so far..."
}
```

**Implementation:**

1. **Constants** (`src/constants/config.js`):
   - Added `INTERMISSION: 'intermission'` to `QUESTION_TYPES`

2. **IntermissionScreen** (`src/components/IntermissionScreen.jsx`):
   - New component displaying Header, ProgressBar, title/body, ResultCards, and navigation
   - Uses shared `ResultCard` component for calculation display
   - Respects `calculations.showMaxEV` and `calculations.showMergedFavorites` feature flags

3. **ResultCard** (`src/components/ui/ResultCard.jsx`):
   - NEW: Extracted shared component from ResultsScreen
   - Used by both ResultsScreen and IntermissionScreen
   - Props: `methodKey`, `results`, `evs`, `originalResults`, `causeEntries`, `hasChanged`, `simpleMode`

4. **QuizContext** (`src/context/QuizContext.jsx`):
   - Filters intermissions from `questions` array when `ui.questionTypes` is disabled
   - Excludes intermissions from `totalQuestions` count
   - Excludes intermissions from `progressPercentage` calculation
   - Excludes intermissions from `questionNumber` display
   - Excludes intermissions from `createInitialQuestionsState()` (no credence state)
   - Excludes intermissions from `extractCredences()` and `stateMap`

5. **Router** (`src/components/MoralParliamentQuiz.jsx`):
   - Routes to `IntermissionScreen` when `currentQuestion.type === QUESTION_TYPES.INTERMISSION`

6. **Calculations** (`src/utils/calculations.js`):
   - `buildDimensionsFromQuestions()` filters out intermissions (no `worldviewDimension`)

7. **Validation** (`src/utils/validateQuestions.js`):
   - Special validation for intermission questions: only requires `id`, `title`, `body`

8. **Filtering** (multiple components):
   - `WelcomeScreen.jsx` - Filters intermissions from question preview
   - `ResultsScreen.jsx` - Filters intermissions from edit panel list

**Files Changed:**
- `src/constants/config.js` - Added `INTERMISSION` to `QUESTION_TYPES`
- `src/components/IntermissionScreen.jsx` - NEW
- `src/components/ui/ResultCard.jsx` - NEW (extracted from ResultsScreen)
- `src/styles/components/Intermission.module.css` - NEW
- `src/context/QuizContext.jsx` - Progress exclusion, state filtering
- `src/components/MoralParliamentQuiz.jsx` - Router for intermission type
- `src/components/ResultsScreen.jsx` - Uses ResultCard, filters intermissions
- `src/components/WelcomeScreen.jsx` - Filters intermissions from preview
- `src/utils/calculations.js` - Filters intermissions from dimensions
- `src/utils/validateQuestions.js` - Special validation rules
- `config/questions.json` - Added example intermission after question 2

**Tests Added:**
- `src/context/QuizContext.intermission.test.jsx` - 8 tests covering:
  - Progress calculation excludes intermissions (5 tests)
  - Feature flag filtering behavior (3 tests)

**Future Enhancement (deferred):**
Conditional copy variants based on user answers:
```json
{
  "copyVariants": [
    {
      "condition": { "questionId": "animal", "optionKey": "equal", "operator": "greater_than", "value": 50 },
      "title": "You lean toward animal welfare",
      "body": "Based on your answers..."
    },
    { "title": "Default title", "body": "Default body (no condition = fallback)" }
  ]
}
```

---

## Share Results Feature (Layer 1)
**Date:** 2026-01-21
**Category:** UI
**Flag:** `ui.shareResults`
**Prototype:** `prototype-share-results-v1` (2026-01-21)
**Dependencies:** lz-string

**Description:**
Share quiz results via URL. Clicking "Share Results" copies a link that restores the user's credences when opened.

**Behavior:**
- Results screen shows "Share Results" button (when flag enabled)
- Click copies URL to clipboard with "Link copied!" feedback (2 second duration)
- URL format: `https://.../#results=compressed_data`
- Opening a share URL restores credences and goes directly to results
- Invalid/stale URLs show error toast and start fresh quiz

**Data Format (Compact Encoding):**
- Questions separated by `|`
- 100% picks: `questionId:optionKey` (e.g., `animal:equal`)
- Custom mixes: `questionId:key=val,key=val` (e.g., `animal:equal=33,10x=34,100x=33`)
- Only non-zero values stored for custom mixes
- Compressed with lz-string for obfuscation and tamper-resistance

**URL Length:**
- Best case (all 100% picks): ~64 characters
- Worst case (all custom mixes): ~121 characters
- URLs are obfuscated (not human-readable)

**Validation:**
- Decompresses and parses compact format
- Validates all question IDs exist in current config
- Validates all option keys exist for each question
- Validates credences sum to 100 (±1 tolerance for rounding)
- On any mismatch: shows error, starts fresh quiz

**Implementation:**

1. **shareUrl.js** (`src/utils/shareUrl.js`):
   - `encodeCredences(credences)` - Compact format + lz-string compression
   - `decodeCredences(compressed)` - Decompress + parse compact format
   - `validateCredences(credences)` - Check against current quiz config
   - `generateShareUrl(credences)` - Build full URL with hash
   - `parseShareUrl()` - Extract and validate from current URL
   - `clearShareHash()` - Remove hash without navigation

2. **QuizContext.jsx**:
   - Added `RESTORE_FROM_URL` action to reducer
   - useEffect on mount checks for `#results=` hash
   - Valid URL: dispatches restore action, clears hash
   - Invalid URL: sets error state, clears hash after 5 seconds

3. **ResultsScreen.jsx**:
   - Share button with Share2/Check icons from lucide-react
   - `handleShareClick()` builds credences, generates URL, copies to clipboard
   - Fallback for older browsers (textarea + execCommand)
   - "copied" state for visual feedback

4. **MoralParliamentQuiz.jsx**:
   - Error toast for share URL errors (fixed position, auto-dismiss)

**Files Changed:**
- `package.json` - Added lz-string dependency
- `config/features.json` - Added `ui.shareResults` flag
- `config/copy.json` - Added share button copy text
- `src/utils/shareUrl.js` - NEW: Encode/decode utilities
- `src/context/QuizContext.jsx` - URL detection on mount, restore action
- `src/components/ResultsScreen.jsx` - Share button with clipboard copy
- `src/components/MoralParliamentQuiz.jsx` - Error toast display
- `src/styles/components/Results.module.css` - Share button styles

**Prototype-Specific URLs:**
URLs include the full pathname, so prototypes generate links back to themselves:
- Main app: `https://donorcompass.rethinkpriorities.org/#results=...`
- Prototype: `https://...github.io/donor-compass/prototypes/share-results/#results=...`

**Future Enhancement (Layer 2):**
Graceful handling of stale URLs where quiz config has changed. See CLAUDE.md Planned Features.

---

## Diminishing Returns for Calculations
**Date:** 2026-01-24
**Category:** Calculations
**Config:** `causes.json` → `diminishingReturns`
**Prototype:** N/A (calculation behavior - no snapshot needed)
**Dependencies:** None

**Description:**
Models the economic principle that the first dollar spent on a cause does more good than the hundredth. Without diminishing returns, allocation methods degenerate to winner-take-all. With diminishing returns, allocations spread across causes proportionally.

**Modes:**
| Mode | Power | Effect |
|------|-------|--------|
| `none` | 1.0 | Linear utility, winner-take-all |
| `sqrt` | 0.5 | Moderate spreading (default) |
| `extreme` | 0.1 | Near-equal distribution |

**Mathematical Foundation:**
For power utility `U = Σ(c_i × x_i^p)` where `0 < p < 1`, the analytical solution is:
```
x_i = c_i^(1/(1-p)) / Σ(c_j^(1/(1-p))) × Budget
```

This closed-form solution eliminates the need for numerical optimization (no scipy dependency).

**Example (sqrt mode):**
```
Coefficients: [0.8, 0.6, 0.3]
Budget: 100

Squared: [0.64, 0.36, 0.09]
Sum: 1.09

Allocations:
  x₁ = 0.64/1.09 × 100 = 58.7%
  x₂ = 0.36/1.09 × 100 = 33.0%
  x₃ = 0.09/1.09 × 100 = 8.3%
```

**Which Calculations Are Affected:**
- `calculateMaxEV` - Spreads allocation based on expected values
- `calculateMergedFavorites` - Each worldview spreads its budget share
- `calculateVarianceVoting` - NOT affected (voting mechanism, not utility-based)
- `calculateMaximin` - NOT affected (enumeration-based)

**Implementation:**

1. **Configuration** (`config/causes.json`):
   - Added `diminishingReturns: "sqrt"` at top level
   - Default when missing: `"sqrt"`

2. **Calculations** (`src/utils/calculations.js`):
   - Added `DIMINISHING_RETURNS_POWER` constant mapping modes to power values
   - Added `getDiminishingReturnsPower(config)` helper
   - Added `optimalAllocationAnalytical(coefficients, budget, power)` function
   - Updated `calculateMaxEV` to use analytical allocation
   - Updated `calculateMergedFavorites` to use analytical allocation per worldview

3. **Debugger** (`src/components/CalculationDebugger.jsx`):
   - Added dropdown to select diminishing returns mode
   - Shows power value for each mode
   - Setting passed through `debugConfig` to calculation functions

**Files Changed:**
- `config/causes.json` - Added `diminishingReturns` setting
- `src/utils/calculations.js` - Added analytical allocation, updated MaxEV and MergedFavorites
- `src/components/CalculationDebugger.jsx` - Added mode selector
- `src/utils/calculations.test.js` - NEW: 12 tests for diminishing returns

**Additional Fixes During Implementation:**

1. **Dynamic Calculation Display:**
   - `ResultsScreen.jsx` and `IntermissionScreen.jsx` now dynamically render all enabled calculation methods based on feature flags
   - Previously hardcoded to only show MaxEV and MergedFavorites

2. **Disabled Question Types:**
   - Questions can be disabled by prefixing type with `_` (e.g., `"type": "_intermission"`)
   - Disabled questions are filtered from quiz, progress count, and validation
   - Useful for temporarily removing questions without deleting them

---

## Appearance Revamp (Donor Compass Branding)
**Date:** 2026-01-24
**Category:** UI/Branding
**Flag:** N/A (core styling change)
**Prototype:** N/A (visual update)
**Dependencies:** None

**Description:**
Complete visual overhaul to align with Rethink Priorities branding. Renamed quiz to "Donor Compass" and updated typography, colors, backgrounds, and component styling.

**Branding Changes:**
- **Name**: Quiz renamed to "Donor Compass"
- **Header**: RP logo + "Donor Compass" text in bold Raleway
- **Background**: Teal gradient image (`bg-dark.png`) with brighter spots instead of smooth dark gradient
- **Primary Font**: Raleway (replaces Cormorant Garamond + Source Sans Pro)
- **Accent Font**: Cormorant Garamond italic retained for "Giving Go?" emphasis

**Color Palette Updates:**
- Background gradient: `#0C435F` → `#1E7D95` (dark teal to bright teal)
- Primary button: White background with dark teal uppercase text
- Button hover: Bright cyan (`#5fbcd3`) background with white text
- Secondary buttons: Transparent with white border, hover fills with white overlay
- Borders: Brightened to `0.25/0.3/0.5` opacity for better contrast against bright background
- Text: Brightened secondary/muted text for readability

**Button Styling:**
- Primary (CTA): White background, dark teal text, uppercase, bold
- Secondary: Transparent, white border, uppercase, bold
- Hover effects: Background fill, border brighten, subtle lift (`translateY(-2px)`)
- Consistent `gap` for icon + text alignment

**Component Updates:**
1. **Cards**: 2px borders, `rgba(255,255,255,0.08)` subtle background
2. **Option Buttons**: Fixed layout shift bug (border was changing 1px→2px on select)
3. **Results Cards**: Matched question card styling
4. **Edit Panels**: Subtle white overlay backgrounds
5. **Cause Bars**: Light track background (`rgba(255,255,255,0.1)`)
6. **Sliders**: Updated CompactSlider to use light rgba backgrounds (was hardcoded dark)
7. **Mode Toggle**: Updated active state to teal accent

**Header Changes:**
- Added RP logo (`NewLogoSVG.svg`) to header
- Added "Donor Compass" title in bold Raleway
- Header now appears on Results screen
- Progress bar visible on Results screen (acts as horizontal rule)

**Bug Fixes:**
- Fixed option button layout shift when selecting (consistent 2px border)
- Fixed "Giving Go?" text clipping (increased line-height to `--leading-snug`)
- Fixed share button icon spacing (added flex gap to `.btn` class)

**Files Changed:**
- `src/styles/variables.css` - New color palette, Raleway font, teal gradients
- `src/styles/global.css` - Raleway import, button styles, header styles
- `src/styles/components/WelcomeScreen.module.css` - Heading line-height fix
- `src/styles/components/OptionButton.module.css` - 2px border fix, hover styles
- `src/styles/components/Results.module.css` - Card styling, removed duplicate button styles
- `src/styles/components/EditPanel.module.css` - Light overlay backgrounds
- `src/styles/components/CauseBar.module.css` - Light track background
- `src/styles/components/ModeToggle.module.css` - Teal active state
- `src/styles/components/Slider.module.css` - (no changes, inline styles in component)
- `src/components/layout/Header.jsx` - Added logo and "Donor Compass" title
- `src/components/ui/CompactSlider.jsx` - Light rgba slider backgrounds
- `src/components/ResultsScreen.jsx` - Added Header and ProgressBar
- `public/NewLogoSVG.svg` - RP logo asset
- `public/NewLogoPNG.png` - RP logo asset (alternate)
- `public/bg-dark.png` - Teal gradient background image

**Assets Added:**
- `public/NewLogoSVG.svg` - White RP wordmark logo
- `public/NewLogoPNG.png` - White RP wordmark logo (PNG)
- `public/bg-dark.png` - Teal gradient background with bright spots

---

## Session Persistence & Short Share URLs
**Date:** 2026-01-26
**Category:** Infrastructure / UI
**Flags:** `ui.shareResults` (note: `ui.shortShareUrls` was removed in simplification on 2026-01-28)
**Prototype:** N/A (infrastructure - share shouldn't work in prototypes)
**Dependencies:** Turso database, Netlify functions (note: lz-string dependency was removed in simplification)

> **Simplification Note (2026-01-28):** The `shortShareUrls` flag and legacy client-side URL encoding were removed. Share functionality now only uses the backend API approach. The lz-string dependency was also removed.

**Description:**
Two related features implemented together:
1. **Session Persistence** - Quiz progress survives page reloads via sessionStorage
2. **Short Share URLs** - Database-backed short URLs replace long client-side encoded URLs

**Session Persistence Behavior:**
- Quiz state (currentStep, credences, inputMode, lockedKey) saved to sessionStorage
- Debounced saves (300ms) to avoid excessive writes
- Session ID generated via `crypto.randomUUID()` for analytics correlation
- Conflict modal when user has progress AND opens a share URL
- Three options: "Keep my progress", "Load shared results", "Open in new tab"
- `hashchange` listener detects share URLs pasted while already on page

**Short Share URLs Behavior:**
- Share button calls `POST /api/share` with full question state
- Returns short ID, generates URL like `#s=abc1234`
- Opening URL calls `GET /api/share?id=abc1234` to fetch data
- Backwards compatible: still supports legacy `#results=compressed` URLs
- Safari clipboard fix using `ClipboardItem` with Promise

**Data Stored in Share:**
```js
{
  sessionId: "uuid",
  quizVersion: 1,
  questions: {
    "questionId": {
      credences: { opt1: 50, opt2: 30, opt3: 20 },
      inputMode: "sliders",
      lockedKey: "opt1"
    }
  }
}
```

**Session Storage Keys:**
| Key | Purpose |
|-----|---------|
| `quiz_session_id` | UUID for analytics |
| `quiz_state` | Versioned state object |
| `quiz_skip_conflict` | Flag to skip conflict modal (for "Open in new tab") |

**Conflict Resolution Flow:**
```
Page load
    ↓
Check for share URL (#s= or #results=)
    ↓
Check for saved session
    ↓
Both exist? → Show conflict modal
    ↓
User chooses → Hydrate from chosen source
```

**Implementation:**

1. **session.js** (`src/utils/session.js`):
   - `getOrCreateSessionId()` - Get/create UUID
   - `saveQuizState(state)` / `loadQuizState()` - Persist/restore
   - `hasSavedState()` / `clearQuizState()` - Detection and cleanup
   - `setSkipConflict()` / `checkAndClearSkipConflict()` - New tab handling

2. **shareUrl.js** (`src/utils/shareUrl.js`):
   - `generateShareUrlAsync(questionStates)` - Call backend API
   - `fetchShareData(shortId)` - Fetch from backend
   - `detectShareUrl()` - Detect `#s=` vs `#results=` format
   - `parseShareUrlAsync()` - Handle both formats
   - `isShortShareEnabled()` - Check feature flag

3. **QuizContext.jsx**:
   - Added `sessionId` state (lazy initialized)
   - Added `isHydrating` state to prevent flash of welcome screen
   - Hydration effect checks both share URL and sessionStorage
   - Conflict modal state and handlers
   - Persistence effect with 300ms debounce
   - `hashchange` listener for mid-session URL changes
   - New actions: `RESTORE_FROM_URL` (updated), `RESTORE_FROM_SESSION`

4. **SessionConflictModal.jsx** (`src/components/ui/SessionConflictModal.jsx`):
   - Three-button modal for conflict resolution
   - "Open in new tab" sets skip flag before opening

5. **ResultsScreen.jsx**:
   - Async share handler with loading state
   - Safari `ClipboardItem` fix for async clipboard writes
   - Error handling with toast display

6. **MoralParliamentQuiz.jsx**:
   - Returns null while `isHydrating` to prevent welcome screen flash

7. **share.js** (`netlify/functions/share.js`):
   - Updated to accept `questions` (new) or `credences` (legacy)
   - Returns appropriate format based on stored data

8. **OptionButton.jsx**:
   - Clears slider lock when option selected (bug fix)

**Files Changed:**
- `src/utils/session.js` - NEW
- `src/utils/shareUrl.js` - Added async functions, format detection
- `src/context/QuizContext.jsx` - Session management, hydration, conflict handling
- `src/components/ui/SessionConflictModal.jsx` - NEW
- `src/styles/components/SessionConflictModal.module.css` - NEW
- `src/components/ResultsScreen.jsx` - Async share, Safari clipboard fix
- `src/components/MoralParliamentQuiz.jsx` - Hydration guard
- `src/components/QuestionScreen.jsx` - Pass setLockedKey to OptionButton
- `src/components/ui/OptionButton.jsx` - Clear lock on option select
- `netlify/functions/share.js` - Support new data format
- `config/features.json` - Added `ui.shortShareUrls`
- `eslint.config.js` - Added browser globals
- `CLAUDE.md` - Updated dev server docs

**Bug Fixes Included:**
- Clear slider lock when selecting option in select view
- Safari clipboard API requires `ClipboardItem` with Promise for async operations

---

## Calculation Select Feature
**Date:** 2026-01-28
**Category:** UI
**Flag:** `calculations.sideBySideComparison`
**Prototype:** `prototype-calculation-select` (2026-01-28)
**Dependencies:** None

**Description:**
Display one calculation at a time on the results screen with a dropdown selector to switch between calculation types. In side-by-side comparison mode, each side has its own independent dropdown for comparing any two calculation types.

**Behavior:**
- Each result card shows a dropdown at the top with all enabled calculation types as options
- Selecting a different calculation type updates the card to show that calculation's results
- In side-by-side comparison mode (`calculations.sideBySideComparison`), each side has its own independent dropdown
- Users can compare any two calculation types by selecting different options on left vs right
- Selected calculation(s) persist when sharing results via URL

**UI:**
- Dropdown positioned at top of ResultCard component
- Shows currently selected calculation name
- Options list populated from enabled calculations in `config/features.json`
- Default selection: first enabled calculation type

**State:**
- `selectedCalculation` (single mode) or `selectedCalculations: { left, right }` (side-by-side mode)
- Stored in QuizContext for persistence
- Included in share URL encoding

**Share URL Integration:**
- Extends existing `ui.shareResults` data format
- Adds `selectedCalculation` or `selectedCalculations` to encoded payload
- When loading from URL, restore the selected calculation state
- Graceful fallback: if shared calculation type is now disabled, default to first enabled type

**Notes:**
- Works independently of `calculations.sideBySideComparison` setting
- Single mode: one dropdown, one calculation displayed
- Side-by-side mode: two independent dropdowns, one per card

**Files Changed:**
- `src/components/ui/ResultCard.jsx` - Added dropdown selector for calculation type
- `src/context/QuizContext.jsx` - Added selectedCalculations state and actions
- `src/components/ResultsScreen.jsx` - Pass selected calculations to ResultCard
- `src/utils/shareUrl.js` - Include selectedCalculations in share data
- `src/utils/session.js` - Persist selectedCalculations in session

---

## Moral Marketplace Feature
**Date:** 2026-01-28
**Category:** UI / Calculations
**Flag:** `ui.moralMarketplace`
**Prototype:** `prototype-moral-marketplace` (2026-01-28)
**Dependencies:** `ui.multipleWorldviews`

**Description:**
A calculation screen that combines multiple saved worldviews into a unified allocation recommendation. The Moral Marketplace treats each worldview as a "voter" with equal budget share. Each voter optimally allocates their share using diminishing returns, and results are merged into a final recommendation. This answers: "If I'm uncertain between these worldviews, how should I allocate?"

**Example:**
```
Worldview "Utilitarian": EVs = { globalHealth: 85, animalWelfare: 45, gcr: 25 }
Worldview "Animal-focused": EVs = { globalHealth: 40, animalWelfare: 95, gcr: 15 }

Moral Marketplace Result (sqrt diminishing returns):
  → { globalHealth: 44%, animalWelfare: 52%, gcr: 4% }
```

**Behavior:**
- Only visible when 2+ worldviews have progress
- Accessible from WorldviewSwitchModal via "Moral Marketplace" button
- Marketplace screen shows:
  1. Budget input ($10M default) with dollar amounts
  2. Combined allocation bar chart with percentages
  3. Diminishing returns toggle (none/sqrt/extreme)
  4. Per-worldview breakdown (how each worldview allocated its share)
- Dollar amounts rounded to nearest 0.5% of budget
- Budget, worldview names, and selections persist in session and share URLs

**Implementation:**

1. **Core Calculations** (`src/utils/calculations.js`):
   - `calculateWorldviewEVs(credences, config)` - Collapses micro-worldviews to EVs per cause
   - `calculateMoralMarketplace(worldviews, options)` - Combines multiple worldviews
     - Input: `[{ name, evs: {...}, weight? }, ...]`
     - Options: `{ diminishingReturns?, power?, budget? }`
     - Returns: `{ allocation, worldviewAllocations, config }`

2. **State Management** (`src/context/QuizContext.jsx`):
   - Added `worldviewNames` state with per-worldview custom names
   - Added `marketplaceBudget` state (default: $10M)
   - Actions: `SET_WORLDVIEW_NAME`, `SET_MARKETPLACE_BUDGET`
   - Persisted to sessionStorage and share URLs

3. **UI Components**:
   - `MoralMarketplaceScreen.jsx` - Main screen with combined allocation, budget input, settings dropdown
   - `WorldviewSwitchModal.jsx` - Added inline name editing and "Moral Marketplace" button
   - Custom allocation bars with larger text for cause names and dollar amounts

4. **Share URL Integration** (`src/utils/shareUrl.js`):
   - Extended `generateShareUrl` to accept `worldviewNames` and `marketplaceBudget` options
   - Extended `parseShareUrl` to return these fields

**Files Changed/Created:**
- `config/features.json` - Added `ui.moralMarketplace: true` flag
- `config/copy.json` - Added `marketplace.*` copy strings
- `src/utils/calculations.js` - Added `calculateWorldviewEVs`, `calculateMoralMarketplace`
- `src/utils/calculations.test.js` - 11 tests for marketplace calculations
- `src/context/QuizContext.jsx` - Added worldviewNames, marketplaceBudget state and persistence
- `src/components/MoralMarketplaceScreen.jsx` - NEW: Main marketplace screen
- `src/styles/components/Marketplace.module.css` - NEW: Marketplace styles
- `src/components/ui/WorldviewSwitchModal.jsx` - Added inline name editing, marketplace button
- `src/components/MoralParliamentQuiz.jsx` - Added routing for `currentStep === 'marketplace'`
- `src/components/ResultsScreen.jsx` - Passes worldviewNames/marketplaceBudget to modal and share URL
- `src/utils/shareUrl.js` - Extended to include worldviewNames and marketplaceBudget

**Reference Implementation:**
See `example/moral-marketplace-calculations.js` for standalone calculation module and `example/test-calculations.js` for test cases.

---

## Preset Credences Feature
**Date:** 2026-01-31
**Category:** UI
**Question Type:** `"type": "preset"`
**Prototype:** N/A
**Dependencies:** Question Types System

**Description:**
Two-card layout question type where users select from predefined credence distributions (presets) or customize manually. Designed for questions where common viewpoints can be pre-packaged.

**Behavior:**
- Left card shows preset options as buttons
- Right card shows sliders (read-only when preset selected)
- Clicking a preset animates sliders to those values (300ms easing)
- "Custom" option enables manual slider adjustment
- Dragging any slider auto-selects "Custom"
- Slider locks cleared when switching presets

**Question Config:**
```json
{
  "id": "timeframes",
  "type": "preset",
  "presets": [
    {
      "id": "next-decade",
      "name": "Focused on next decade (until 2035)",
      "description": "Prioritize effects visible in the near term",
      "credences": { "equalAll": 0, "prioritizeNearer": 0, "discountDistant": 25, "shortTermOnly": 75 }
    }
  ],
  "options": [...]
}
```

**Implementation:**
1. `PresetQuestion.jsx` - Main component with two-card layout
2. Routes via `QuestionScreen.jsx` when `type === QUESTION_TYPES.PRESET`
3. `QUESTION_TYPES.PRESET` added to `src/constants/config.js`
4. Credences stored in QuizContext like other question types
5. CSS animations for smooth slider transitions

**Files:**
- `src/components/PresetQuestion.jsx` - NEW
- `src/styles/components/PresetQuestion.module.css` - NEW
- `src/constants/config.js` - Added `PRESET` to `QUESTION_TYPES`
- `src/components/QuestionScreen.jsx` - Routes to PresetQuestion

---

## Multiple Worldviews Feature
**Date:** 2026-01-26 (initial), 2026-02-03 (advanced mode merge)
**Category:** UI / State Management
**Flag:** `ui.multipleWorldviews` (disabled by default)
**Prototype:** N/A
**Dependencies:** None

**Description:**
Save quiz completions as named "worldviews" and retake the quiz to create alternative perspectives. Enables comparison between different moral frameworks and powers the Moral Marketplace feature.

**Behavior:**
- When enabled, quiz flow includes WorldviewHub as landing page
- Users can create up to 4 worldview "slots"
- Each slot holds a complete quiz state with custom name
- Navigation between slots to compare or edit
- Feeds into Moral Marketplace for combined analysis

**State Management:**
```js
{
  worldviewIds: ['default', 'wv-2', ...],     // Ordered list of worldview IDs
  worldviewNames: { 'default': 'My Worldview', ... },
  completedMap: { 'default': true, ... },     // Which worldviews have results
  currentWorldviewId: 'default',
  worldviewCredences: { 'default': {...}, ... }
}
```

**Components:**
- `WorldviewHub.jsx` - Hub screen showing worldview slots, add button
- `WorldviewSlotModal.jsx` - Modal for editing/naming individual worldviews
- `WorldviewSwitchModal.jsx` - Modal for switching between worldviews (includes Marketplace button)

**Session/Share Integration:**
- Worldview state persists to sessionStorage
- Share URLs include full worldview data
- Conflict modal handles share URL + existing session

**Files:**
- `src/components/WorldviewHub.jsx` - NEW
- `src/components/ui/WorldviewSlotModal.jsx` - NEW
- `src/components/ui/WorldviewSwitchModal.jsx` - NEW
- `src/styles/components/WorldviewHub.module.css` - NEW
- `src/context/QuizContext.jsx` - Added worldview state management

---

## Disclaimer Page Feature
**Date:** 2026-01-27
**Category:** UI
**Flag:** `ui.disclaimerPage`
**Prototype:** N/A
**Dependencies:** None

**Description:**
Initial disclaimer screen shown before the welcome page. Informs users about the experimental nature of the quiz.

**Behavior:**
- When enabled, first screen is DisclaimerScreen
- User clicks to acknowledge and proceed to Welcome
- Skipped if flag is disabled

**Files:**
- `src/components/DisclaimerScreen.jsx` - NEW
- `src/styles/components/DisclaimerScreen.module.css` - NEW
- `config/copy.json` - Added `disclaimer.*` copy strings

---

## Info Tooltips Feature
**Date:** 2026-01-29
**Category:** UI
**Flags:** `ui.questionInfo`, `ui.answerInfo`
**Prototype:** N/A
**Dependencies:** None

**Description:**
Info icons (ⓘ) that show tooltips with additional context. Can be added to questions and answer options. Supports markdown links.

**Behavior:**
- `ui.questionInfo`: Shows info icon next to question heading
- `ui.answerInfo`: Shows info icons next to answer options
- Tooltip content comes from `info` field in question/option config
- Markdown links supported: `[link text](url)`

**Files:**
- `src/components/ui/InfoTooltip.jsx` - NEW
- `src/styles/components/InfoTooltip.module.css` - NEW

---

## Backlog: Code Quality & Enhancements

These items are deprioritized but may be addressed when development pace slows down.

### Code Quality Polish
- [x] **Context API Refactor** - Replaced prop drilling with React Context
- [ ] Ensure consistent prop naming across components
- [ ] Verify consistent error handling (if any)
- [ ] Consider React.memo for frequently re-rendering components
- [ ] Evaluate if useMemo/useCallback would help in MoralParliamentQuiz
- [ ] Profile rendering performance (if needed)

### Build Optimization
- [ ] Implement Vite env vars for build-time feature flag replacement (for prod next month)
- [ ] Dead code elimination for disabled features
- [ ] Bundle size optimization

### Accessibility Improvements
- [ ] Add ARIA labels to interactive elements
- [ ] Ensure keyboard navigation works for all interactions
- [ ] Test slider keyboard controls (arrow keys)
- [ ] Add focus indicators for keyboard users
- [ ] Test with screen reader (VoiceOver on Mac)
- [ ] Add skip navigation link
- [ ] Ensure color contrast meets WCAG AA standards
- [ ] Add aria-live regions for dynamic content updates

### Documentation
- [ ] Add inline code examples to README
- [ ] Create CONTRIBUTING.md if planning to open source
- [ ] Add JSDoc comments to any remaining uncommented functions
- [ ] Consider adding architecture diagram
- [ ] Add screenshots to README

### Testing Infrastructure
- [x] Set up Vitest for unit testing
- [ ] Write tests for calculation functions
- [x] Set up React Testing Library
- [x] Write component tests for UI elements
- [ ] Add test coverage reporting

### Visual Polish
- [ ] Add subtle animations with framer-motion
- [ ] Polish transitions between screens
- [ ] Add loading states (if ever needed)
- [ ] Consider dark mode support

### Feature Ideas
- [x] Add ability to save/share results
- [ ] Add more cause categories
- [ ] Add more moral dimensions to evaluate
- [ ] Export results as PDF or image
- [ ] Add explanations for each calculation method
- [x] Question type system (different presentation modes)
- [ ] Consider adding TypeScript (major undertaking)
