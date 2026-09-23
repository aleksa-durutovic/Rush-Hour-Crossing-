# GAME_SPEC — Rush Hour Crossing

> Sesija 003. Ovaj dokument je autoritativan za pravila igre.
> Izmena scope-a ili pravila radi se samo uz dogovor para i upisuje u `AI_USAGE_LOG.md`.

## Naziv projekta

**Rush Hour Crossing** (Frogger-inspired: preuzeta je samo osnovna mehanika prelaska preko saobraćaja; naziv, izgled i assets su originalni).

## Opis igre

Rush Hour Crossing je turn-based igra u kojoj igrač prelazi preko pet traka saobraćaja do cilja na drugoj strani. Svet napreduje samo kada igrač odigra potez: svaki potez, uključujući čekanje, pomera saobraćaj tačno jedan korak. Saobraćaj se kreće po fiksnim ciklusima bez slučajnosti, pa se igra planira unapred: čekaš, prolaziš ili se vraćaš. Sudar sa vozilom oduzima život i vraća igrača na početak. Igra se završava pobedom posle dovoljno uspešnih prelazaka ili porazom kada ponestane života.

## Cilj igrača i kontrole

**Cilj:** ostvariti `crossingsToWin` uspešnih prelazaka pre nego što se izgube svi životi.

| Taster | Akcija |
|---|---|
| Strelice ili W/A/S/D | pomeranje za jedno polje (up / down / left / right) |
| Space | `wait` (preskoči potez) |
| R | restart igre |

- Jedan `keydown` = jedan potez. Događaji sa `event.repeat === true` se ignorišu.
- Samo tastatura.

## Grid i pojmovi

- Grid je **9 kolona × 7 redova**; `x` ide 0..8 (levo → desno), `y` ide 0..6 (gore → dole).
- `y = 0`: **cilj** (bez vozila). `y = 1..5`: **trake saobraćaja**. `y = 6`: **start red** (bez vozila).
- Start pozicija igrača je `(4, 6)`.
- **tick** je brojač poteza i počinje od 0. Pozicija svakog vozila u tick-u `t` zavisi isključivo od konfiguracije trake i broja `t`.

## Osnovni game loop

Jedan potez (u tick-u `t`):

1. Igrač bira akciju (move ili `wait`).
2. Akcija se primenjuje (pokušaj izlaska van grida = `wait`).
3. **Provera sudara A:** igrač naspram vozila u tick-u `t`.
4. Saobraćaj napreduje: `t → t + 1`.
5. **Provera sudara B:** igrač naspram vozila u tick-u `t + 1`.
6. Ishod poteza: sudar → −1 život i reset na start; inače, ako je `y = 0` → +1 prelazak, +100 poena i reset na start.
7. Provera kraja igre (pobeda / poraz).
8. Render.

## Win / lose uslov

- **Pobeda:** broj prelazaka ≥ `crossingsToWin`.
- **Poraz:** `lives === 0`.
- Posle pobede ili poraza svi inputi osim `R` se ignorišu.

## Ključna pravila

| ID | Pravilo |
|---|---|
| **R1** | Igrač se pomera za tačno jedno polje po potezu. Pokušaj pomeranja van grida ne menja poziciju i tretira se kao `wait` (potez se troši). |
| **R2** | Svaki potez, uključujući `wait` i pokušaj izlaska van grida, pomera saobraćaj za tačno jedan tick. |
| **R3** | Saobraćaj je potpuno deterministički (bez RNG-a). Svaka traka ima smer, brzinu (pomera se jednom na `N` tickova, najviše 1 polje po pomeranju) i vozila jedne dužine. Vozilo koje izađe sa jedne ivice ulazi sa suprotne (wrap-around). Nijedna traka ni u jednom tick-u nije potpuno blokirana. |
| **R4** | Sudar znači da igrač i vozilo dele isto polje. Proverava se dvaput u potezu (A i B iz game loop-a). Sudar u bilo kojoj proveri oduzima najviše jedan život po potezu i vraća igrača na `(4, 6)`. Tick svejedno napreduje. |
| **R5** | Redovi `y = 0` i `y = 6` nemaju vozila. Dolazak u `y = 0` bez sudara daje +1 prelazak i +100 poena, a igrač se vraća na start. |
| **R6** | `difficulty` bira preset saobraćaja (gustina i brzina traka) iz posebnog constants fajla; brojevi ne žive u logici. Konfiguracija se validira (vidi ispod). |
| **R7** | Posle kraja igre input se ignoriše osim `R`, koji resetuje stanje (tick 0, životi iz konfiguracije, 0 prelazaka, 0 poena). |

**Invarijante:** isti config + isti niz akcija daje identičan ishod; `lives` nikad ne pada ispod 0; broj prelazaka nikad ne opada.

## Strukturisan deo: konfiguracija igre

```ts
type GameConfig = {
  lives: number;            // ceo broj 1..5
  crossingsToWin: number;   // ceo broj 1..10
  difficulty: "easy" | "normal" | "hard";
};
```

TypeScript tip sam po sebi nije dokaz: obavezna je **runtime validacija** ulaza.

| Polje | Ograničenje | Default |
|---|---|---|
| `lives` | ceo broj, 1..5 | 3 |
| `crossingsToWin` | ceo broj, 1..10 | 3 |
| `difficulty` | `"easy"`, `"normal"` ili `"hard"` | `"normal"` |

**Izvor:** URL query parametri, npr. `?lives=2&crossingsToWin=3&difficulty=hard`. Numerički parametri se parsiraju u brojeve pre validacije; ono što se ne može parsirati je nevalidno.

**Ponašanje:**
- Nedostajući parametar: default za to polje. Nepoznati parametri se ignorišu.
- Bilo koji prisutan, a nevalidan parametar: **cela konfiguracija se odbacuje**, igra koristi default vrednosti svih polja i prikazuje vidljivu poruku sa imenima nevalidnih polja. Igra se ne ruši.

**Validan primer:** `?lives=2&crossingsToWin=3&difficulty=hard`

**Nevalidni primeri:** `?lives=0`, `?lives=2.5`, `?lives=abc`, `?crossingsToWin=11`, `?difficulty=insane`

## Minimalni vizuelni zahtev

- Canvas sa gridom 9×7, fiksna veličina polja (responsive nije obavezan).
- Vizuelno različiti: cilj red, start red, trake saobraćaja, igrač i vozila (obojeni pravougaonici, različite dužine).
- Smer kretanja svake trake mora biti prepoznatljiv (npr. mala strelica ili nijansa).
- HUD tekst: životi, prelasci `X/N`, poeni, poruka o pobedi ili porazu (uz "R za restart"), poruka o pogrešnoj konfiguraciji kada se koristi fallback.
- Bez sprite-ova, zvuka i animacija (trenutno iscrtavanje posle svakog poteza).

## Tehnička granica

TypeScript/JavaScript browser aplikacija na postojećem starteru, HTML/CSS/Canvas prikaz. Logika poteza je odvojena od renderovanja (čista funkcija nad stanjem), da evali mogu da rade bez Canvasa. Konkretan izbor alata bira se u planu; nova infrastruktura se ne dodaje.

## OUT OF SCOPE

- AI Hint, tool calling, live AI provider (Sesija 004)
- real-time režim (timer, animacije kretanja)
- reka, balvani i druge nove mehanike
- power-upovi, više nivoa, čuvanje napretka
- zvuk i custom audio, sprite assets
- multiplayer
- login i korisnički nalozi
- online leaderboard
- procedural generation i RNG saobraćaj
- AI-controlled vozila ili neprijatelji
- touch / mobilne kontrole
- backend, baza, deployment i druga nova infrastruktura

## Definition of Done

- [x] **D1** Igra se pokreće komandom iz README-a startera, bez grešaka u konzoli pri startu (komanda i stvarni output idu u `EVIDENCE_003.md`).
  - Dokaz: `EVIDENCE_003.md` → *Functional baseline / Automated commands* (`npm run dev`, typecheck, test, build).
- [x] **D2** Pravila R1–R7 su pokrivena automatizovanim testovima nad logikom poteza (bez Canvasa).
  - Dokaz: `tests/turn.test.ts` (R1, R2, R4, R5, R7), `tests/traffic.test.ts` (R3), `tests/presets.test.ts` i `tests/config.test.ts` (R6).
- [x] **D3** Determinizam: isti config i isti niz akcija daje identično stanje (test).
  - Dokaz: `tests/turn.test.ts` → *is deterministic for the same config and action sequence*; eval E1 u `EVALS.md`.
- [x] **D4** Za sva tri difficulty preseta nijedna traka nije potpuno blokirana ni u jednom tick-u 0..199 (test).
  - Dokaz: `tests/presets.test.ts` → *never-blocked traffic lanes through tick 199* za `easy`, `normal` i `hard`.
- [x] **D5** Validacija konfiguracije prihvata validne primere i odbija svih 5 nevalidnih primera iznad uz listu grešaka; pri nevalidnom ulazu igra koristi default i prikazuje poruku (test + screenshot).
  - Dokaz: `tests/config.test.ts` (validan primer, svih 5 nevalidnih primera, kombinovani nevalidan upit); prikaz poruke u browseru zabeležen u `EVIDENCE_003.md` → *Browser evidence* i *Final runtime checks*. Screenshot je napravljen tokom QA, ali nije sačuvan u repou; zapis stanja je u evidence-u.
- [x] **D6** Pobeda i poraz su dostižni odigravanjem (screenshot ili zapis).
  - Dokaz (zapis): `EVIDENCE_003.md` → *Final runtime checks* — šest `W` poteza daje `won`, a `W, W, D, W, W, W` daje `lost` (`crossingsToWin=1&difficulty=easy`); u testovima `tests/turn.test.ts` i `tests/reachability.test.ts`.
- [x] **D7** `EVALS.md` ima najmanje 4 slučaja sa očekivanjem upisanim pre pokretanja.
  - Dokaz: `EVALS.md` E1–E4 (tipičan, granični, nevalidan, regresioni); E1–E3 upisani pre implementacije u commitu `3221951`.
- [x] **D8** Ništa iz OUT OF SCOPE nije dodato i u repou nema tajni.
  - Dokaz: nema AI/tool/mreže/backenda; nema `.env` fajlova ni kredencijala u praćenim fajlovima. Vizuelni izuzetak (bitmap pozadina, diskretna animacija) odobren je i zabeležen u `AI_USAGE_LOG.md` i ne menja gameplay.
