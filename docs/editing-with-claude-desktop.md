# Editing the Donor Compass with Claude Desktop

A guide for non-developers who want to tweak quiz text, copy, or config and
see the result live before it ships. Uses Claude Desktop's built-in
"Claude Code" mode.

---

## What this lets you do

- Change quiz question wording, answer labels, info-tooltip text
- Adjust welcome / donation / results page copy
- Tweak presets, default values, fund descriptions
- Flip feature flags on or off
- See every change live in a browser tab as you make it

Out of scope: big layout changes, new features, the calculation model,
anything that smells like "I think I broke something."

---

## One-time setup

### 1. Install Node.js

The dev server (the thing that renders the quiz locally) needs it.

- Go to <https://nodejs.org>, download the **LTS** version, run the installer.
- That's it — no configuration.

### 2. Get the repo onto your Mac

Open Terminal and run:

```
git clone https://github.com/rethinkpriorities/quiz-demo.git
```

You'll end up with a `quiz-demo` folder somewhere on your machine.

### 3. Open the project in Claude Code (inside Claude Desktop)

In Claude Desktop, switch to the **Claude Code** mode (look for the
folder/code icon in the sidebar). It will ask you for a working directory —
point it at the `quiz-demo` folder.

You only need to do this once; Claude Desktop remembers the folder.

---

## Daily workflow

### Start the dev server

Tell Claude:

> Start the dev server.

Claude will run `npm run dev` in the background. Wait until it tells you the
server is running at <http://localhost:5173>.

Open that URL in any browser (Chrome, Safari, whatever you like) and keep the
tab open. Every change you make will reload that page automatically.

### Start a feature branch

Before changing anything, ask:

> Make a new branch for this work called `<your-initials>/<short-description>`.

For example: `cv/donation-page-copy`, `cv/q3-defaults`. This keeps each
batch of work isolated and easy to review or roll back.

### Make a change

Describe what you want in plain English. A few examples that work well:

> Change "Where Should Your Giving Go?" to "Where Should Your Donations Go?"

> The welcome screen says "Answer 4 quick questions" but we now have 5.
> Update the count everywhere it appears.

> On the donation page, the "Total Budget" label should say "Donation
> Amount" instead.

> Lower the default credence on "All sentient beings matter equally" from
> 25% to 10%.

Claude will find the file, edit it, and the browser tab will reload. If it
doesn't auto-reload, just refresh.

### Commit when you're happy

> Commit these changes.

Claude writes a commit message and commits to your feature branch.

### Push to GitHub and open a PR

> Push this branch and open a pull request.

Claude will push the branch to GitHub and create a PR using the `gh` tool.
The PR is where a maintainer can review the change and merge it to `main` —
at which point GitHub Pages picks it up and deploys to production within a
few minutes.

**First-time auth:** the first push you make may fail with a credential
error. That's a one-time setup — ask a maintainer to walk you through it.
After that, every push just works.

---

## Known quirks

- **Approval prompts.** Claude Desktop will sometimes ask you to approve a
  file edit or command. Read it; click yes if it matches what you asked for.
- **The dev server stops when you close the chat.** Next session, just ask
  Claude to start it again — it's one line.

---

## Files you're most likely to edit

| File | What's in it |
|---|---|
| `config/copy.json` | Most user-facing text (welcome, results, buttons, footer) |
| `config/simpleQuizConfig.json` | The 4 simple quiz questions, their presets, and options |
| `config/donationPage.json` | Donation page form labels and copy |
| `config/features.json` | On/off switches for features (advanced mode, email capture, etc.) |
| `config/questions.json` | Legacy / advanced quiz questions |
| `config/causes.json` | Causes and funds — names, descriptions, default values |

You don't have to remember these — just describe what you want to change
and Claude will find the right file.

---

## Escape hatch

If a change goes sideways, ask Claude to revert it:

> Undo the last commit. I want to start over.
