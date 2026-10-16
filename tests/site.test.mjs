import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const testDirectory = dirname(fileURLToPath(import.meta.url));
const siteDirectory = resolve(testDirectory, '..');
const html = readFileSync(resolve(siteDirectory, 'index.html'), 'utf8');
const css = readFileSync(resolve(siteDirectory, 'css/styles.css'), 'utf8');
const script = readFileSync(resolve(siteDirectory, 'js/script.js'), 'utf8');

function attributes(markup) {
  return Object.fromEntries(
    [...markup.matchAll(/([\w-]+)=(?:"([^"]*)"|'([^']*)')/g)].map((match) => [
      match[1],
      match[2] ?? match[3],
    ]),
  );
}

test('la landing conserva todos sus recursos locales', () => {
  const requiredFiles = [
    'index.html',
    'css/styles.css',
    'js/script.js',
    'assets/logo-aquatrack.png',
    'assets/favicon.png',
    'apk/README.txt',
  ];

  for (const path of requiredFiles) {
    assert.equal(existsSync(resolve(siteDirectory, path)), true, `Falta ${path}`);
  }

  const localReferences = [...html.matchAll(/(?:href|src)="(?!#|https?:|mailto:)([^"]+)"/g)]
    .map((match) => match[1]);

  for (const path of localReferences) {
    assert.equal(existsSync(resolve(siteDirectory, path)), true, `Referencia local rota: ${path}`);
  }
});

test('los identificadores son únicos y cada ancla interna tiene destino', () => {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'Hay identificadores HTML duplicados');

  const targets = [...html.matchAll(/<a\b[^>]*href="#([^"]+)"[^>]*>/g)].map((match) => match[1]);
  for (const target of targets) {
    assert.ok(ids.includes(target), `No existe el destino #${target}`);
  }
});

test('los enlaces en pestaña nueva impiden acceso a window.opener', () => {
  const externalLinks = [...html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)].map((match) => match[0]);
  assert.ok(externalLinks.length >= 3, 'Se esperaban enlaces externos del proyecto');

  for (const link of externalLinks) {
    const linkAttributes = attributes(link);
    const relations = new Set((linkAttributes.rel || '').split(/\s+/));
    assert.ok(relations.has('noopener'), `Falta noopener en ${link}`);
    assert.ok(relations.has('noreferrer'), `Falta noreferrer en ${link}`);
  }
});

test('la página tiene contenido semántico y describe el alcance real', () => {
  for (const landmark of ['<header', '<nav', '<main', '<footer']) {
    assert.ok(html.includes(landmark), `Falta el landmark ${landmark}`);
  }

  for (const section of ['inicio', 'funciones', 'como-funciona', 'demo', 'descarga']) {
    assert.ok(html.includes(`id="${section}"`), `Falta la sección ${section}`);
  }

  for (const content of ['Trabajo offline', 'Evidencias vinculadas', 'Ubicación flexible', 'Excel individual y combinado']) {
    assert.ok(html.includes(content), `Falta el contenido funcional: ${content}`);
  }

  assert.match(html, /unidades encontradas, no estimaciones/i);
  assert.doesNotMatch(html, /kilogramos de residuos|reducción de CO₂|residuos retirados/i);
});

test('la APK está habilitada y usa una ruta estable', () => {
  const downloadMarkup = html.match(/<a\s+class="button download-button[\s\S]*?<\/a>/)?.[0];
  assert.ok(downloadMarkup, 'Falta el control de descarga APK');
  const downloadAttributes = attributes(downloadMarkup);

  assert.equal(downloadAttributes['data-apk-path'], 'apk/aquatrack.apk');
  assert.equal(downloadAttributes.href, 'apk/aquatrack.apk');
  assert.equal(downloadAttributes.download, 'aquatrack.apk');
  assert.equal(downloadAttributes['aria-disabled'], undefined);
  assert.match(downloadMarkup, /Descargar APK/);
});

test('el vídeo y los metadatos tienen nombres accesibles', () => {
  assert.match(html, /<title>[^<]+<\/title>/);
  assert.match(html, /<meta\s+name="description"\s+content="[^"]+"/);
  assert.match(html, /<iframe[\s\S]*?title="[^"]+"[\s\S]*?loading="lazy"/);
  assert.match(html, /<a class="skip-link" href="#main-content">/);
});

test('CSS y JavaScript superan comprobaciones sintácticas básicas', () => {
  const openingBraces = (css.match(/{/g) || []).length;
  const closingBraces = (css.match(/}/g) || []).length;
  assert.equal(openingBraces, closingBraces, 'Las llaves CSS no están equilibradas');
  assert.doesNotMatch(css, /@import\s/i, 'La landing no debe cargar estilos remotos');
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /min-height:\s*2\.75rem/);
  assert.match(script, /'use strict'/);
});
