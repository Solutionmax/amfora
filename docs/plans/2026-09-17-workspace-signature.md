# Amfora: één visuele familie

Goedgekeurde richting: publieke transferpagina’s blijven de referentie. Homepage en authenticatie gebruiken hetzelfde inktblauwe canvas, glazen amfora, kobaltaccent en displaytypografie. Beheer krijgt donkere navigatie en heldere compacte werkpanelen; geen grote decoratie tussen dagelijks werk.

## Uitvoering
- [ ] Homepage, login en herstel/uitnodigingsschermen harmoniseren.
- [ ] Gedeelde beheershell, dashboard, tabs en werkpanelen harmoniseren.
- [ ] Kopiëren op HTTP en QR-weergave/export controleren en herstellen.
- [ ] Desktop/mobiel/donker, navigatie, formulieren en kernacties testen op geïsoleerde data.
- [ ] Productiebuild, consistente backup, deployment en live rooktest.
- [ ] Bevindingen en resterende verbeterpunten documenteren.

## Testmatrix
Publiek: homepage/login, upload/download, beschermde en verlopen links. Beheer: dashboard, bestanden, uitgaande/inkomende shares, instellingen, personalisatie, profiel, gebruikers. Functies: login, upload/download met inhoudscontrole, links kopiëren met fallback, QR decoderen/export, CRUD op staging, thema/taal en mobiele navigatie. Externe e-mail/OAuth-integraties alleen testen indien geconfigureerd; beperkingen expliciet melden.
