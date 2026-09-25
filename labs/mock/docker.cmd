@echo off
REM Mock docker shim for lab CI — see labs/README.md. Not for authenticity scoring.
node "%~dp0docker.mjs" %*
