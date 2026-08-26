# marcel533 // status

Statusseite für meine GitHub-Pages-Projekte — zeigt live, ob die Seiten erreichbar sind, inklusive Antwortzeit. Enthält außerdem Impressum und Nutzungsbedingungen mit DE/EN-Umschalter.

## Überwachte Projekte

- [web-shop](https://marcel533.github.io/web-shop/)
- [Protofolio](https://marcel533.github.io/Protofolio/)
- [ZIP-tar.gz-Archiver](https://marcel533.github.io/ZIP-tar.gz-Archiver/)
- [Open-Source-Empfehlungen](https://marcel533.github.io/-Open-Source-Empfehlungen/)
- [online-code-editor](https://marcel533.github.io/online-code-editor/)
- [Name-file-cleaner](https://marcel533.github.io/Name-file-cleaner/)

## Funktionen

- Automatischer Erreichbarkeits-Check aller Projekte beim Laden der Seite
- Anzeige von Status (online/offline) und Antwortzeit pro Projekt
- Manueller „Erneut prüfen"-Button
- Impressum & Nutzungsbedingungen direkt auf der Seite
- Sprachumschalter Deutsch / Englisch (oben rechts)

## Technik

Reine HTML/CSS/JS-Einzeldatei, kein Build-Prozess nötig. Die Erreichbarkeits-Checks laufen client-seitig per `fetch()` im `no-cors`-Modus — das erkennt, ob ein Host antwortet, aber nicht den genauen HTTP-Statuscode einzelner Unterseiten.

**Hinweis:** Läuft die Datei innerhalb einer Sandbox mit eingeschränkter Content-Security-Policy (z. B. manche Chat- oder Vorschau-Umgebungen), können die Checks blockiert werden und fälschlich „offline" anzeigen. Lokal im Browser geöffnet oder per GitHub Pages gehostet funktioniert es normal.

## Hinweis zur Erstellung

Diese Seite (Design, Code, Impressum- und AGB-Texte) wurde mit KI-Unterstützung (Claude von Anthropic) erstellt.
