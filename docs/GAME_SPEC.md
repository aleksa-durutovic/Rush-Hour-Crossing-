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
| Klik mišem na `EASY` / `NORMAL` / `HARD` (HUD, desno od `TICK`) | izbor težine; nova igra na izabranom presetu |

- Jedan `keydown` = jedan potez. Događaji sa `event.repeat === true` se ignorišu.
- Potezi igre se igraju samo tastaturom. Težina se bira i mišem (vidi *Izbor težine*).

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
- Posle pobede ili poraza svi inputi osim `R` i izbora težine se ignorišu.

## Ključna pravila

| ID | Pravilo |
|---|---|
| **R1** | Igrač se pomera za tačno jedno polje po potezu. Pokušaj pomeranja van grida ne menja poziciju i tretira se kao `wait` (potez se troši). |
| **R2** | Svaki potez, uključujući `wait` i pokušaj izlaska van grida, pomera saobraćaj za tačno jedan tick. |
| **R3** | Saobraćaj je potpuno deterministički (bez RNG-a). Svaka traka ima smer, brzinu (pomera se jednom na `N` tickova, najviše 1 polje po pomeranju) i vozila jedne dužine. Vozilo koje izađe sa jedne ivice ulazi sa suprotne (wrap-around). Nijedna traka ni u jednom tick-u nije potpuno blokirana. Dva vozila iste trake nikada ne dele isto polje. |
| **R4** | Sudar znači da igrač i vozilo dele isto polje. Proverava se dvaput u potezu (A i B iz game loop-a). Sudar u bilo kojoj proveri oduzima najviše jedan život po potezu i vraća igrača na `(4, 6)`. Tick svejedno napreduje. |
| **R5** | Redovi `y = 0` i `y = 6` nemaju vozila. Dolazak u `y = 0` bez sudara daje +1 prelazak i +100 poena, a igrač se vraća na start. |
| **R6** | `difficulty` bira preset saobraćaja (gustina i brzina traka) iz posebnog constants fajla; brojevi ne žive u logici. Konfiguracija se validira (vidi ispod). |
| **R7** | Posle kraja igre input se ignoriše osim `R`, koji resetuje stanje (tick 0, životi iz konfiguracije, 0 prelazaka, 0 poena), i izbora težine, koji resetuje stanje isto kao `R`, ali na izabranom presetu. |

**Invarijante:** isti config + isti niz akcija daje identičan ishod; `lives` nikad ne pada ispod 0; broj prelazaka nikad ne opada; u svakom difficulty presetu pobeda je dostižna bez gubitka života, a poraz je dostižan.

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

## Izbor težine (feature 004)

- HUD ima tri dugmeta, `EASY`, `NORMAL` i `HARD`, desno od brojača `TICK`. Aktivna težina je istaknuta (`aria-pressed="true"`).
- Klik (ili Enter/Space dok je dugme fokusirano) na neaktivnu težinu počinje novu igru kao `R` (tick 0, životi iz konfiguracije, 0 prelazaka, 0 poena), ali sa izabranim presetom; `lives` i `crossingsToWin` ostaju. Fokus se vraća na tablu.
- Klik na već aktivnu težinu ne menja igru.
- URL se menja bez ponovnog učitavanja (`history.replaceState`): postavlja se `difficulty`, ostali parametri ostaju. Ako je igra radila na fallback konfiguraciji, `lives` i `crossingsToWin` se uklanjaju iz URL-a i poruka o pogrešnoj konfiguraciji se sakriva, pa reload daje istu konfiguraciju koja se igra.
- Pravila R1–R6, preseti i determinizam se ne menjaju.
- Dokaz: `tests/difficulty-query.test.ts`, `e2e/smoke.pw.ts` → *difficulty selector*, screenshot `docs/evidence/difficulty-switch.png`.

## Lokalni API server (feature 005)

- Igra se i dalje igra u browseru; pravila R1–R7, preseti i determinizam se ne menjaju.
- `server/` je lokalni Node.js server (`node:http`, pokreće ga `tsx`). Sluša samo na `127.0.0.1` i odbija svaki zahtev čiji `Host` nije `127.0.0.1:<port>` ili `localhost:<port>`.
- Jedan origin: `npm start` servira izgrađenu igru (`dist/`) i `/api`; u razvoju (`npm run dev`) Vite prosleđuje `/api` serveru. CORS nije potreban i ne šalje se.
- Jedina ruta je `GET /api/health` → `{"status":"ok","service":"rush-hour-crossing-api"}`. Server nema stanje igre, AI poziv, bazu ni tajne.
- Dokaz: `tests/server/*.test.ts`, `e2e/smoke.pw.ts` → *same-origin API*, `docs/EVIDENCE_004.md` → *Part 0*.

## Odloženi AI savet (feature 006 — Option C implementacija odobrena)

- Par je 2026-09-29 odobrio jedan odloženi Gemini savet posle završene igre koristeći Option C sumu; detalji i granice su u `specs/006-ai-feature/spec.md`.
- Par je 2026-09-29 odobrio scope Option C feature-a, a korisnik je 2026-09-29 zatražio završetak W04 zadatka, uključujući testove i potrebne artefakte; taj zahtev je zabeležen kao odobrenje za implementaciju. Live provider poziv ostaje van automatizovanih provera i zahteva posebno izričito odobrenje.
- Ovaj savet se nikad ne prikazuje tokom igre, ne menja pravila R1–R7, a ključ ostaje server-side. Feature 006 sam ne koristi tool calling; jedini odobreni izuzetak za in-game Hint/tool calling opisan je zasebno u feature 007. Druga AI mehanika ostaje van scope-a.

## Ograničeni Hint za sigurnu putanju (feature 007)

- Student-pair je 2026-10-06 odobrio uski izuzetak za jedan igračem pokrenut Hint tokom aktivne igre. Predlog modela može da zatraži samo allowlist alat `find_safe_path` sa praznim argumentima; backend validira predlog i izvršava determinističku pretragu nad trenutnim validiranim stanjem.
- Uspešan tok ima najviše dva logička koraka modela i jedno izvršenje alata. Odgovor crta samo putanju i trag stanja koje je vratio i backend proverio; model ne bira koordinate, ne pomera igrača i ne menja stanje igre.
- Hint prikazuje najkraću sigurnu putanju do sledećeg prelaska: prvi bezbedan ulazak u bilo koju kolonu ciljnog reda `y = 0`. Putanja se tu završava i kada `crossingsToWin` zahteva još prelazaka; pravilo pobede ostaje nepromenjeno.
- Zahtev sadrži samo status, težinu, tick, poziciju igrača, živote, broj prelazaka i cilj prelazaka. Istorija poteza, identifikatori, sačuvani podaci i lični podaci se ne šalju.
- Dozvoljen je jedan pokušaj Hint-a za svaki preostali broj života u partiji, uključujući grešku ili zastareo rezultat. Gubitak života briše prethodni Hint i omogućava jedan novi pokušaj. Učitavanje i prikazan Hint pauziraju tastaturne poteze; sakrivanje nastavlja igru. Restart ili promena težine resetuju sva iskorišćena prava i keš.
- Timeout-i, ukupni deadline, broj pokušaja providera i granice solvera definisani su u `specs/007-ai-bounded-feature/spec.md`. Automatizovani testovi koriste fake provider. Odobrenje scope-a ne odobrava live Gemini zahtev.
- Feature ne menja pravila R1–R7, saobraćaj, poene, živote ili kontrole poteza. Feature 006 ostaje nepromenjen.

## Minimalni vizuelni zahtev

- Canvas sa gridom 9×7, fiksna veličina polja (responsive nije obavezan).
- Vizuelno različiti: cilj red, start red, trake saobraćaja, igrač i vozila (obojeni pravougaonici, različite dužine).
- Smer kretanja svake trake mora biti prepoznatljiv (npr. mala strelica ili nijansa).
- HUD tekst: životi, prelasci `X/N`, poeni, poruka o pobedi ili porazu (uz "R za restart"), poruka o pogrešnoj konfiguraciji kada se koristi fallback.
- Bez sprite-ova, zvuka i animacija (trenutno iscrtavanje posle svakog poteza).

## Tehnička granica

TypeScript/JavaScript browser aplikacija na postojećem starteru, HTML/CSS/Canvas prikaz. Logika poteza je odvojena od renderovanja (čista funkcija nad stanjem), da evali mogu da rade bez Canvasa. Konkretan izbor alata bira se u planu; nova infrastruktura se ne dodaje, osim lokalnog API servera iz feature 005 (vidi *Lokalni API server*) i usko odobrenih AI feature-a 006 i 007 (vidi `AI_USAGE_LOG.md` i njihove specifikacije), koji ne menjaju pravila R1–R7. AI pozivi pripadaju isključivo serveru.

## OUT OF SCOPE

- AI Hint tokom igre i tool/function calling ostaju van scope-a osim usko definisanog, odobrenog feature 007 `find_safe_path` toka. AI-controlled traffic i svi drugi AI hintovi, alati i autonomni agenti ostaju van scope-a. Live Gemini pozivi za feature 006/007 i dalje zahtevaju zasebno izričito odobrenje; automatizovani testovi ne zovu providera.
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
- baza, deployment i druga nova infrastruktura (izuzetak: lokalni API server u `server/`, feature 005 — samo `127.0.0.1`, bez baze, bez naloga, bez deploy-a; feature-i 006 i 007 dodaju samo svoje odobrene rute na taj server)

## Definition of Done

- [x] **D1** Igra se pokreće komandom iz README-a startera, bez grešaka u konzoli pri startu (komanda i stvarni output idu u `EVIDENCE_003.md`).
  - Dokaz: `EVIDENCE_003.md` → *Part 1 — Current state* → *Automated checks* (`npm ci`, typecheck, test, build, audit) i *Browser checks* → *Startup* (bez grešaka i upozorenja u konzoli).
- [x] **D2** Pravila R1–R7 su pokrivena automatizovanim testovima nad logikom poteza (bez Canvasa).
  - Dokaz: `tests/turn.test.ts` (R1, R2, R4, R5, R7), `tests/traffic.test.ts` (R3), `tests/presets.test.ts` i `tests/config.test.ts` (R6), `tests/end-message.test.ts` (poruka za R7 odgovara statusu).
- [x] **D3** Determinizam: isti config i isti niz akcija daje identično stanje (test).
  - Dokaz: `tests/turn.test.ts` → *is deterministic for the same config and action sequence*; eval E1 u `EVALS.md` → *Current result*.
- [x] **D4** Za sva tri difficulty preseta nijedna traka nije potpuno blokirana i nijedna dva vozila iste trake ne dele polje ni u jednom tick-u 0..199 (test).
  - Dokaz: `tests/presets.test.ts` → *never-blocked traffic lanes through tick 199* i *never places two vehicles of one lane on the same cell through tick 199* za `easy`, `normal` i `hard`.
- [x] **D5** Validacija konfiguracije prihvata validne primere i odbija svih 5 nevalidnih primera iznad uz listu grešaka; pri nevalidnom ulazu igra koristi default i prikazuje poruku (test + screenshot).
  - Dokaz: `tests/config.test.ts` (validan primer, svih 5 nevalidnih primera, kombinovani nevalidan upit); screenshot `docs/evidence/d5-invalid-config.png`, opisan u `EVIDENCE_003.md` → *Part 1 — Current state* → *Browser checks*.
- [x] **D6** Pobeda i poraz su dostižni odigravanjem u sva tri difficulty preseta (test, automatizovani browser test i screenshot).
  - Dokaz: `tests/reachability.test.ts` (pretraga nalazi pobedu bez gubitka života — najkraće 6 / 11 / 15 poteza za `easy` / `normal` / `hard` — i poraz; snimljene putanje iz `tests/fixtures/golden-paths.ts` pobeđuju i gube), `e2e/smoke.pw.ts` (iste putanje u pravom browseru, zaključan input posle kraja i restart sa `R`; `npm run test:e2e`), `tests/end-message.test.ts` (tekst poruke odgovara statusu); screenshotovi `docs/evidence/d6-win.png`, `docs/evidence/d6-win-normal.png`, `docs/evidence/d6-win-hard.png` i `docs/evidence/d6-loss.png`; zapis u `EVIDENCE_003.md` → *Part 1 — Current state* → *Browser checks*.
- [x] **D7** `EVALS.md` ima najmanje 4 slučaja sa očekivanjem upisanim pre pokretanja.
  - Dokaz: `EVALS.md` E1–E4 (tipičan, granični, nevalidan, regresioni); E1–E3 upisani pre implementacije u commitu `3221951`; svi imaju *Current result*.
- [x] **D8** Nijedna neodobrena stavka iz OUT OF SCOPE nije dodata i u repou nema tajni.
  - Dokaz: prvobitna provera 2026-09-23 i odobreni izuzeci feature-a 006 (2026-09-29) i 007 (2026-10-06) zabeleženi su u `AI_USAGE_LOG.md`; feature 007 je ograničen na solver-verifikovani Hint, bez promene pravila R1–R7. Live AI zahtevi ostaju posebno odobrenje. Nema `.env` fajla ili kredencijala u praćenim fajlovima na datum provere. Vizuelni izuzetak (bitmap pozadina, diskretna animacija) odobren je i ne menja gameplay.
