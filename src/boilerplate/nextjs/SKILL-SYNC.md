# Skill Synchronization

Keep every project skill identical across these agent-specific directories:

- Copilot: `.github/skills/<skill-name>/SKILL.md`
- Claude Code: `.claude/skills/<skill-name>/SKILL.md`
- Codex: `.codex/skills/<skill-name>/SKILL.md`
- OpenCode: `.omc/skills/<skill-name>/SKILL.md`

When any agent creates or changes a skill, make the same change in every directory in the same commit. Use the same folder name and `SKILL.md` content. Update the applicable agent instructions when adding or removing a skill, then verify that every copy has the same hash.
