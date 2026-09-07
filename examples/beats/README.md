# beats/

Four real frames from `examples/dogwatch-ci-fix.mp4`, used by the home page's
"four beats" strip. They are the shipped render's own pixels — not mockups of
it — so the strip cannot drift away from what the video actually shows.

Regenerate with:

```
for pair in "1.5:1-title" "14:2-commits" "23.5:3-numbers" "31:4-source"; do
  t="${pair%%:*}"; n="${pair##*:}"
  ffmpeg -v error -ss $t -i examples/dogwatch-ci-fix.mp4 \
    -frames:v 1 -vf scale=1120:-2 -quality 82 -y "examples/beats/beat-$n.webp"
done
```

The timestamps are the settle point of each of the render's four cards:
title, commit flow, the real numbers, and the closing source card.
