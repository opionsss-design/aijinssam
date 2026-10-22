"""Create an offline single-file HTML and a source ZIP, without changing game code."""
from pathlib import Path
import zipfile
import base64

root = Path(__file__).resolve().parents[1]
out = root.parent
html = (root / 'index.html').read_text()
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + (root / 'style.css').read_text() + '\n</style>')
for filename in ['vendor/three.min.js', 'missions.js', 'story-data.js', 'scene3d.js', 'game.js']:
    source = (root / filename).read_text().replace('</script', '<\\/script')
    html = html.replace(f'<script src="{filename}"></script>', '<script>\n' + source + '\n</script>')
for asset in ['sailor-cast.png', 'harbor-storybook.png']:
    encoded=base64.b64encode((root/'assets'/asset).read_bytes()).decode()
    html=html.replace('assets/'+asset,'data:image/png;base64,'+encoded)
for font in ['Jua-Regular.woff2','GowunDodum-Regular.woff2']:
    encoded=base64.b64encode((root/'assets/fonts'/font).read_bytes()).decode()
    html=html.replace('assets/fonts/'+font,'data:font/woff2;base64,'+encoded)
license_text = (root / 'vendor/THREE-LICENSE.txt').read_text()
for name in ['jua-OFL.txt','gowundodum-OFL.txt']:
    license_text+='\n'+(root/'assets/fonts'/name).read_text()
html = html.replace('<head>', '<head>\n<!-- Bundled Three.js license:\n' + license_text + '\n-->')
for name in ['무역왕의_항해_동화풍_바로실행.html', '무역왕의_항해_3D_바로실행.html', '무역왕의_항해_바로실행.html']:
    (out / name).write_text(html)
(root/'play.html').write_text(html)
with zipfile.ZipFile(out / '무역왕의_항해.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
    for filename in ['index.html', 'play.html', '.nojekyll', 'assets/fonts/Jua-Regular.woff2', 'assets/fonts/GowunDodum-Regular.woff2', 'assets/fonts/jua-OFL.txt', 'assets/fonts/gowundodum-OFL.txt', 'style.css', 'missions.js', 'story-data.js', 'scene3d.js', 'game.js', 'README.md', 'vendor/three.min.js', 'vendor/THREE-LICENSE.txt', 'assets/sailor-cast.png', 'assets/harbor-storybook.png', 'tests/game.spec.cjs', 'tests/story.spec.cjs', 'tests/resilience.spec.cjs', 'tests/bundle.spec.cjs', 'tests/size-and-text.spec.cjs', 'tools/package.py']:
        archive.write(root / filename, '무역왕의_항해/' + filename)
print('Created offline 3D HTML and complete source ZIP.')
