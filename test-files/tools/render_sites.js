const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.setContent('<html><body style="margin:0"></body></html>');
  await p.addScriptTag({ path: require('path').join(__dirname, '../../three.min.js') });
  await p.addScriptTag({ path: require('path').join(__dirname, 'scene.js') });
  const jobs = [
    ['wall', 'blockwork', 'A', 'W1-wall-1-blockwork.jpg'], ['wall', 'plastered', 'A', 'W1-wall-2-plastered.jpg'], ['wall', 'painted', 'A', 'W1-wall-3-painted.jpg'],
    ['wall', 'blockwork', 'B', 'W2-wall-1-blockwork.jpg'], ['wall', 'plastered', 'B', 'W2-wall-2-plastered.jpg'],
    ['pipe', 'laid', '', 'P2-pipe-1-laid.jpg'], ['pipe', 'tested', '', 'P2-pipe-2-pressure-tested.jpg'], ['pipe', 'covered', '', 'P2-pipe-3-covered.jpg'],
    ['column', 'formwork', '', 'column-1-formwork-up.jpg'], ['column', 'poured', '', 'column-2-concrete-poured.jpg'], ['column', 'finished', '', 'column-3-finished.jpg']
  ];
  for (const [k, s, v, name] of (process.argv[2] ? jobs.filter((j) => j[3].includes(process.argv[2])) : jobs)) {
    const url = await p.evaluate(([k, s, v]) => window.renderSite(k, s, v), [k, s, v]);
    fs.writeFileSync(require('path').join(__dirname, '../site-photos', name), Buffer.from(url.split(',')[1], 'base64'));
    console.log('rendered', name);
  }
  console.log(errs.join(' ; ') || 'no errors');
  await b.close();
})();
