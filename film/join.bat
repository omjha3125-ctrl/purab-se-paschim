@echo off
REM Joins the 15 parts into one file (needs ffmpeg: winget install ffmpeg)
ffmpeg -f concat -safe 0 -i parts.txt -c copy purab-se-paschim.mp4
