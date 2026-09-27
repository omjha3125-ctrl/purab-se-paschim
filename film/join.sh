#!/bin/sh
# Joins the 15 parts into one file (needs ffmpeg)
cd "$(dirname "$0")" && ffmpeg -f concat -safe 0 -i parts.txt -c copy purab-se-paschim.mp4
