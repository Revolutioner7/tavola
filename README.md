# Tavola

App para practicar italiano hablado con cuatro personajes de una familia inventada de Leverano.

## Versión 0.5.2 (actualización por el aire)

- Fin de turno por silencio más fiable y más rápido: se da por terminado cuando no aparecen palabras nuevas en 1,5 s y el micrófono no oye voz desde hace 1 s (antes 2,2 s y se reiniciaba aunque no hubiera palabras nuevas).
- El personaje empieza a hablar antes: la respuesta se parte en frases, la primera se genera y suena enseguida mientras se preparan las siguientes.

## Versión 0.5.1 (actualización por el aire)

- Al abrir la app, si hay una versión nueva, se descarga y se aplica en ese momento (pantalla «Actualizando Tavola…»), sin tener que abrirla dos veces.

## Versión 0.5.0 (app nueva: incluye el reproductor de audio)

- Voz natural de Google (Chirp 3 HD) para los cuatro personajes, a través del intermediario (`GET /v1/tts`, con caché por frase). Si no está disponible, se usa la voz del iPhone.
- Sin traducciones: cada palabra del personaje se puede tocar y aparece explicada en italiano sencillo, con emoji, un ejemplo, el contrario y, si existe, un gesto italiano para mostrarla. Las palabras consultadas se guardan para repasarlas.
- «Aiuto» ya no da pistas en castellano: el personaje reformula más fácil, da un ejemplo o dos opciones.
- «¿Cómo se dice?» ya no muestra la frase en castellano, solo la versión italiana para repetirla.

## Versión 0.4 (actualización por el aire)

- Corregido: respuestas vacías de los personajes y fallo del repaso. El modelo activaba su razonamiento interno por defecto y se comía el límite de respuesta; ahora va desactivado y, si llega vacía, se reintenta.
- Conversación sin botones: cuando el personaje termina, la app empieza a escucharte sola y, cuando haces una pausa de unos 2 segundos, envía tu respuesta. «Contestar ya» para interrumpir y «He terminado» para no esperar la pausa.
- Debajo de cada frase del personaje: Repetir, Más despacio y Traducir. Si usas cualquiera de las dos últimas, el personaje simplifica su italiano.
- «¿Cómo se dice?»: lo dices en castellano, la app te propone la frase en italiano, la oyes y la repites tú.
- Voz: la app elige la mejor voz italiana instalada (Premium > Mejorada) y del género del personaje. En «Mi nivel» se explica cómo descargarla gratis.
- Nivel inicial por defecto A1.

## Versión 0.3.2

- Corregido el cierre al abrir: Expo publicó hoy una pieza nueva (sistema de archivos) que necesitaba una base más reciente que la que teníamos. Ahora todas las piezas están alineadas con Expo 58.0.20.

## Versión 0.3.1

- Logo de Tavola como icono de la app y en la pantalla de carga, con fondo color mantel.

## Versión 0.3.0

- Actualizaciones por el aire: los cambios que no tocan piezas nativas llegan al abrir la app, sin reinstalar.
- Despliegue automático: cada subida a GitHub (rama main) envía una actualización o, si hace falta, compila una app nueva (`.eas/workflows/desplegar.yml`).

## Versión 0.2.1

- Corregido: la app se cerraba al abrirse por un módulo incompatible que no se usaba (sistema de archivos). Se han quitado los módulos sobrantes.
- Si algo falla, la app muestra el error en pantalla en vez de cerrarse.

## Versión 0.2

- Nuevo: «Cuéntaselo a Nonna». Cuentas lo mismo tres veces (2 min, 90 s, 60 s), con tres arreglos tras la primera ronda, y ves cómo cambian tus sílabas por minuto, las sílabas seguidas entre pausas y las pausas por minuto.

## Versión 0.1

- Cuatro personajes (Nonna Lucia, Zio Tonio, Chiara, Marco) con memoria de lo que les cuentas.
- Conversación por voz: pulsas "Hablar", hablas en italiano, revisas lo que ha entendido el iPhone y envías. El personaje responde en voz alta.
- A los 10 minutos el personaje empieza a cerrar la conversación.
- Repaso al terminar: hasta tres errores con "cómo se diría", una cosa bien hecha y frases para quedarte, más minutos hablados y sílabas por minuto.
- Libro de errores: marcar como dudoso o retirar cuando ya lo dominas. Si un error se repite tres veces, aparece la regla rápida en castellano.
- Ajuste manual de nivel (escuchar y hablar) hasta que exista la prueba de nivel.

Todos los datos se guardan en el propio iPhone.

## Piezas

- `App.tsx` y `src/`: la app (Expo, SDK 58).
- `src/brain/`: personajes, interferencias del portugués y castellano, instrucciones para la IA.
- `src/config.ts`: dirección del intermediario y clave de la app (rellenar antes de compilar).
- `worker/`: intermediario en Cloudflare Workers que guarda la clave de Claude.

## Secretos del intermediario (en Cloudflare, nunca en el código)

- `ANTHROPIC_API_KEY`: clave de la consola de Claude.
- `TAVOLA_APP_KEY`: una clave inventada, la misma que se pone en `src/config.ts`.

## Cómo llegan los cambios al iPhone

Se suben a GitHub (rama main) y Expo hace el resto con el flujo `.eas/workflows/desplegar.yml`.
Compilación manual, solo si hiciera falta:

```
npx eas-cli@latest build --profile preview --platform ios
```

## Repositorio

Código en GitHub: Revolutioner7/tavola, conectado al proyecto @harmat/tavola de Expo.
