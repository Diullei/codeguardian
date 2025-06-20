# Publish New Version Command

This command helps you prepare and publish a new version of Code Guardian to npm.

## Prerequisites

- You must be logged into npm: `npm login`
- All changes should be committed
- You should be on the main branch

## Steps to Execute

### 1. Determine Version Type

First, decide what type of release:
- **Patch** (0.1.0 → 0.1.1): Bug fixes only
- **Minor** (0.1.0 → 0.2.0): New features, backward compatible
- **Major** (0.1.0 → 1.0.0): Breaking changes
- **Beta** (0.1.0 → 0.1.0-beta.1): Pre-release versions

### 2. Update Version

Update the version in package.json:

```bash
# For beta versions
npm version 0.1.0-beta.3

# For regular versions
npm version patch  # or minor, major
```

### 3. Update CHANGELOG.md

Add a new section at the top with your changes:

```markdown
## [VERSION] - YYYY-MM-DD

### Added
- New features that were added

### Changed
- Changes in existing functionality

### Fixed
- Bug fixes

### Breaking Changes (if any)
- List any breaking changes
```

### 4. Commit Version Changes

```bash
git add package.json CHANGELOG.md
git commit -m "chore: Bump version to VERSION

- Brief summary of main changes
"
```

### 5. Create and Push Git Tag

```bash
# Create tag
git tag vVERSION  # e.g., v0.1.0-beta.3

# Push commits and tag
git push origin main
git push origin vVERSION
```

### 6. Publish to npm

For beta versions:
```bash
npm run publish:beta
```

For production versions:
```bash
npm publish --access=public
```

### 7. Update npm Tags

**For beta versions**, make it the latest:
```bash
npm dist-tag add @diullei/codeguardian@VERSION latest
```

**For production versions**, this happens automatically.

### 8. Verify Publication

Check that everything published correctly:
```bash
# Check npm tags
npm view @diullei/codeguardian dist-tags

# Test installation
npm install -g @diullei/codeguardian@latest
codeguardian --version
```

## Complete Example for Next Beta Release

```bash
# 1. Update version
npm version 0.1.0-beta.3

# 2. Edit CHANGELOG.md (manually add your changes)

# 3. Commit
git add package.json CHANGELOG.md
git commit -m "chore: Bump version to 0.1.0-beta.3

- Add your main changes here
"

# 4. Tag
git tag v0.1.0-beta.3

# 5. Push
git push origin main
git push origin v0.1.0-beta.3

# 6. Publish
npm run publish:beta

# 7. Update latest tag
npm dist-tag add @diullei/codeguardian@0.1.0-beta.3 latest

# 8. Verify
npm view @diullei/codeguardian dist-tags
```

## Quick Checklist

- [ ] Determine version number
- [ ] Update package.json version
- [ ] Update CHANGELOG.md
- [ ] Commit changes
- [ ] Create git tag
- [ ] Push to GitHub
- [ ] Publish to npm
- [ ] Update npm latest tag (for beta)
- [ ] Verify publication

## Troubleshooting

### If npm publish fails:
- Check you're logged in: `npm whoami`
- Check version doesn't exist: `npm view @diullei/codeguardian versions`
- Run with debug: `npm publish --verbose`

### If tag update fails:
- Check package name is correct
- Ensure version was published successfully first
- Use full command: `npm dist-tag add @diullei/codeguardian@VERSION TAG`