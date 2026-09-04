# Bitácora de un Observador — Dirección de arte

## Registro
Editorial-maximalista. Manifiesto largo que se lee (tipografía protagonista) con un
"artefacto" 3D o interactivo por capítulo, colocado como instrumento de a bordo, no como
decoración. Mundo visual único: bitácora nocturna, tema oscuro comprometido (sin toggle).

## Primitivas
- Tipografía: Instrument Serif (display, italic con carácter) · IBM Plex Sans (cuerpo) ·
  IBM Plex Mono (etiquetas, datos, bitácora). Escala 1.25: 14/16/20/25/31/39/49/61/76.
- Espacio: 4/8/12/16/24/32/48/64/96/128.
- Color por rol: --bg #0B0D12 · --ink #E9E4D8 · --line rgba(233,228,216,.12)
  --cold #5EC1D9 = lo construido (Matrix) · --warm #E2A85A = lo real (biología, universo)
  --alert #D97A6C = muerte / alertas del sistema.
- Movimiento: 150 ms / 420 ms, curva cubic-bezier(.16,1,.3,1). prefers-reduced-motion
  congela escenas 3D en un frame estático.
- Radio único: 6 px. Sin sombras suaves genéricas; separación por líneas.

## Técnica
Tier 0 CSS para todo lo textual. Tier 3 (Three.js r128 desde cdnjs) solo para los
artefactos de capítulo; una escena activa a la vez, las demás pausadas.
