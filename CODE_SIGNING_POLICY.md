# Code Signing Policy

md2u uses [SignPath Foundation](https://signpath.org/) to sign Windows release artifacts.

## Signing Team

| Role | Member |
|------|--------|
| Author | Stan Wu |
| Reviewer | Stan Wu |
| Approver | Stan Wu |

## Signed Artifacts

Windows installers (`.exe`, `.msi`) are signed for each release. Linux packages (`.deb`, `.rpm`) and source code are not signed with a code signing certificate.

## Policy

- All signing requests require manual approval by the Approver before execution.
- Signing is performed only on artifacts produced by the official GitHub Actions release workflow.
- All team members have Multi-Factor Authentication (MFA) enabled on their GitHub accounts.
- The signing certificate is issued by [SignPath Foundation](https://signpath.org/) for open-source projects.

## Verification

Signed Windows binaries can be verified by right-clicking the file → Properties → Digital Signatures in Windows Explorer, or via PowerShell:

```powershell
Get-AuthenticodeSignature .\md2u_x64-setup.exe
```

## Build Transparency

All release builds are produced by GitHub Actions and logs are publicly visible at:
https://github.com/stanwu/md2u/actions
