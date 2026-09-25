#!/usr/bin/env pwsh
# Run lab track against MOCK docker (CI smoke). Does NOT fill authenticity scorecard.
param(
  [switch]$Real
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$mockDir = Join-Path $PSScriptRoot 'mock'

if ($Real) {
  Write-Host '=== REAL docker labs ==='
  $env:PATH = $env:PATH
} else {
  Write-Host '=== MOCK docker labs (CI only) ==='
  $env:PATH = "$mockDir;$env:PATH"
  $env:LEARNDOCKER_MOCK = '1'
  $env:LEARNDOCKER_MOCK_STATE = Join-Path ([System.IO.Path]::GetTempPath()) ('ld-mock-' + [guid]::NewGuid().ToString('n'))
}

& (Join-Path $PSScriptRoot 'run-all.ps1')

if (-not $Real) {
  Write-Host ''
  Write-Host 'MOCK run complete.'
  Write-Host 'This does NOT count toward labs/SCORECARD.md authenticity (needs live daemon).'
}
