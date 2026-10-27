#!/usr/bin/env python3
"""Bundle the Aahana game into ONE self-contained, double-clickable HTML file.
Usage: python3 build.py [out.html]      (default: aahana.html next to this script)
Any PNGs in assets/ are inlined as base64 data URIs into window.ASSETS (key = file name without .png),
so user-supplied Gemini sprites (e.g. devanshi_front.png) replace the procedural placeholders automatically.
"""
import base64, glob, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ORDER = ['cg.js', 'cg3d.js', 'art.js', 'chars.js', 'audio.js', 'engine.js', 'level1.js', 'level2.js', 'level3.js', 'scenes.js']

def main():
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'aahana.html')
    code = []
    for f in ORDER:
        with open(os.path.join(HERE, 'src', f), encoding='utf-8') as fh:
            code.append('/* ===== %s ===== */\n%s' % (f, fh.read()))
    assets = {}
    for p in sorted(glob.glob(os.path.join(HERE, 'assets', '*.png'))):
        key = os.path.splitext(os.path.basename(p))[0]
        with open(p, 'rb') as fh:
            assets[key] = 'data:image/png;base64,' + base64.b64encode(fh.read()).decode('ascii')
    mp = os.path.join(HERE, 'assets', 'title_music.mp3')
    music_js = ''
    if os.path.exists(mp):
        with open(mp, 'rb') as fh:
            music_js = 'window.MUSIC = "data:audio/mpeg;base64,%s";\n' % base64.b64encode(fh.read()).decode('ascii')
    assets_js = music_js + 'window.ASSETS = {%s};\n' % ','.join('"%s":"%s"' % (k, v) for k, v in assets.items())
    body = '\n'.join(code).replace('</script>', '<\\/script>')
    html = '''<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>Aahana - Computer Graphics Mini Project</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
html,body{margin:0;height:100%%;background:#000;overflow:hidden}
body{display:flex;align-items:center;justify-content:center}
canvas{width:min(100vw,calc(100vh*16/9));height:auto;aspect-ratio:16/9;image-rendering:auto;background:#000;outline:none}
</style></head>
<body><canvas id="c" width="960" height="540" tabindex="0"></canvas>
<noscript>Please enable JavaScript.</noscript>
<script>
%s%s
window.addEventListener('load', function () { Scenes.boot(document.getElementById('c')); });
</script></body></html>
''' % (assets_js, body)
    with open(out, 'w', encoding='utf-8') as fh:
        fh.write(html)
    print('wrote %s (%d KB, %d sprite assets)' % (out, len(html) // 1024, len(assets)))

if __name__ == '__main__':
    main()
