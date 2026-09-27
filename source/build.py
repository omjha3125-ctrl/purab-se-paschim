# Inlines the art sources into index.html between the ART markers (deliverable stays one file).
import re,sys,pathlib
here=pathlib.Path(__file__).parent
html=(here/'index.html').read_text()
parts=['art-engine.js','art-interior.js','art-ghats.js','art-views.js','art-transitions.js','art-score.js','art-program.js']
src='\n'.join((here/p).read_text() for p in parts if (here/p).exists())
a=html.index('// ART BEGIN'); b=html.index('// ART END')
html=html[:a]+'// ART BEGIN (built from art-*.js by build.py)\n'+src+'\n'+html[b:]
(here/'index.html').write_text(html)
print('built',len(html))
