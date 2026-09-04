# Bitácora de un Observador

Sitio de una sola página con diez capítulos (tabs) que convierte la bitácora de Fabio Iván
Castañeda Fuentes en una web inmersiva: artefactos 3D (Three.js), simulaciones 2D y un
generador binaural real (Web Audio).

## Estructura
- `index.html` — contenido de los diez capítulos.
- `assets/css/styles.css` — tokens y componentes (ver `DESIGN.md`).
- `assets/js/scenes.js` — artefactos: lattice, jaula, neuronas, anillos, big bang, océano, ondas.
- `assets/js/app.js` — navegación, mapa del cerebro, reloj de ayuno, RAM, entropía, fase, fractal, binaural.
- `build/build.mjs` — genera `dist/index.html` (un solo archivo para hosting) y `dist/bitacora-artifact.html`.

## Uso
```
node build/build.mjs
```
Abre `dist/index.html` en el navegador, o sube esa carpeta a cualquier hosting estático.
Three.js se carga desde cdnjs; todo lo demás va inline.

## Añadir una entrada a la bitácora
Duplica un `<li>` dentro de `<ol class="log">` en el capítulo 09 y vuelve a compilar.
