# ASSIGNMENT — Retro AI Engineering Challenge (Sesija 003)

> Izvor: SITA AI Bootcamp 2026, Endava/SITA, "Retro AI Engineering Challenge" (Sesije 003 i 004).
> Ovaj dokument sadrži samo procesne zahteve za **Sesiju 003**. Sesija 004 (AI Hint, tool
> calling, live provider) je van scope-a ovog dokumenta i trenutnog rada.

## Kontekst

Domaći zadatak se radi u paru kroz dve nedelje: mala retro-inspired igra plus jedna
kontrolisana AI funkcionalnost. Fokus ocenjivanja nije na igri samoj po sebi, nego na tome
kako se AI-assisted funkcionalnost gradi uz jasan scope, odabran kontekst, strukturisane
ugovore i konkretan dokaz.

Rad u paru: jedna osoba je vozač (menja kod ili prompt), druga je posmatrač (proverava
očekivanje, diff i rezultat). Uloge se menjaju na sredini svakog većeg bloka rada.

Narativna linija celog projekta (Sesija 003 pokriva do "EVAL + DOKAZ"):

```
IDEJA -> SPECIFIKACIJA -> PROMPT + KONTEKST -> BASELINE -> EVAL + DOKAZ
      -> KONTROLISANA IZMENA -> [Sesija 004: TOOL CONTRACT -> ... ]
```

## Izbor igre i granica

- Igra mora biti jednostavna retro ili retro-inspired (Pong, Breakout, Snake, Asteroids,
  Frogger, Space Invaders, mali maze/chase, jednostavan platformer sa jednom mehanikom); uz
  odobrenje predavača ako je domen neobičan.
- Ne kopirati originalne assete, muziku, naziv, logo ili kompletan vizuelni identitet
  postojeće igre — samo osnovna gameplay mehanika.
- Scope se zaključava u `GAME_SPEC.md` **pre** prvog većeg AI poziva.
- Preporučena tehnička granica: TypeScript/JavaScript browser aplikacija na postojećem
  starteru, HTML/CSS/Canvas prikaz. Bez baze, deploymenta, multiplayera ili nove
  infrastrukture samo zato da bi projekat delovao veći.

## Šta treba da bude gotovo posle Sesije 003, pre review sesije

1. `GAME_SPEC.md` sa scope-om i Definition of Done.
2. `BUILD_PROMPT_V1.md`.
3. `CONTEXT_MANIFEST.md`.
4. Baseline verzija ili precizno dokumentovan bloker.
5. Strukturisan deo igre sa runtime proverom.
6. Najmanje četiri eval slučaja.
7. Jedna hipoteza i jedna kontrolisana promena.
8. `EVIDENCE_003.md` i početni `AI_USAGE_LOG.md`.

Na review sesiji se pokazuje isti scenario pre i posle promene. **Baseline se ne briše** kad
nastane bolja verzija.

## Detaljni zahtevi za Sesiju 003

### 1. Prvi prompt je specifikacija

`BUILD_PROMPT_V1.md` treba da sadrži:

1. ulogu coding agenta;
2. cilj i očekivani rezultat;
3. granice i stvari koje agent ne sme da dodaje;
4. tehnički kontekst i relevantne fajlove;
5. gameplay pravila;
6. Definition of Done;
7. dozvoljene fajlove ili područja izmene;
8. provere koje agent treba da izvrši;
9. zahtev da agent prvo sažme razumevanje i napiše plan;
10. zahtev da navede nejasnoće i ne proširuje scope bez odobrenja.

Obavezan početak prompta:

```
Pre implementacije:
1. Sažmi razumevanje zadatka.
2. Navedi plan u nekoliko koraka.
3. Navedi nejasnoće ili pretpostavke.
4. Ne proširuj scope bez eksplicitnog razloga.
```

### 2. Context Manifest

U `CONTEXT_MANIFEST.md`, za svaki važan izvor: da li je uključen, zašto, koji mu je
prioritet i koji rizik nosi. Mora da se ume odgovoriti:

- Šta je model stvarno dobio?
- Šta je namerno izostavljeno?
- Koji izvor ima prioritet kada se informacije razlikuju?

### 3. Baseline

Pre prve izmene sačuvati: prvi prompt, korišćeni kontekst, rezultat ili screenshot,
komandu za pokretanje i stvarni output, prvi vidljiv problem, status početnih testova.

Ako početna provera pada pre prve izmene, projekat se ne širi — zapisati očekivani i
stvarni rezultat i otvoriti precizan bloker.

### 4. Strukturisan deo igre

Najmanje jedan deo sistema mora imati strukturisan ugovor (npr. `GameConfig` tip). Za taj
deo pokazati: očekivani oblik, validan primer, nevalidan primer, runtime validaciju (ili
ekvivalentnu proveru), i jasno ponašanje kada ulaz nije validan. **TypeScript tip sam po
sebi nije dokaz runtime validacije.**

### 5. Mini eval skup

Najmanje četiri slučaja u `EVALS.md`, sa očekivanjem zapisanim **pre** pokretanja:

1. tipičan scenario;
2. boundary scenario;
3. nepotpun ili nevalidan scenario;
4. raniji propust.

Najmanje jedan eval treba da pokaže stvaran problem baseline verzije.

### 6. Jedna hipoteza, jedna promena

Format zapisa:

```
Tvrdnja:
Signal:
Hipoteza:
Najmanja promena:
Provera:
Rezultat:
Ograničenje:
```

Ne menjati istovremeno prompt, kontekst, šemu i kriterijume ako se ne može objasniti
doprinos svakog sloja.

## Evidence i AI Usage Log (za Sesiju 003)

**`EVIDENCE_003.md`** treba da sadrži: početnu tvrdnju i baseline; izabrani problem i
hipotezu; jednu kontrolisanu promenu; iste eval primere pre i posle; stvarne rezultate i
komande; poznato ograničenje; doprinos oba člana para.

**`AI_USAGE_LOG.md`** — kratka evidencija važnih AI poziva (bez privatnog
chain-of-thought), tabela: Faza | Zašto je AI pozvan | Šta se očekivalo | Rezultat |
Sledeća odluka.

Pre većeg poziva treba umeti da se odgovori: *"Šta očekujem da se promeni i kojim
signalom ću proveriti da li se to dogodilo?"* Ako odgovor nije jasan, sledeći korak je
analiza ili lokalni test, a ne novi prompt.

## Struktura repozitorijuma (relevantno za Sesiju 003)

```
/
├── README.md
├── docs/
│   ├── GAME_SPEC.md
│   ├── BUILD_PROMPT_V1.md
│   ├── CONTEXT_MANIFEST.md
│   ├── EVALS.md
│   ├── EVIDENCE_003.md
│   └── AI_USAGE_LOG.md
├── src/
├── tests/
└── package.json
```

Nazivi mogu da se prilagode starteru, ali sadržaj mora biti lako pronaći.

## AI budžet i bezbednost (važi za ceo projekat)

Koristiti AI štedljivo i namerno. Operativni cilj za ceo dvonedeljni projekat, ako
predavač ne zada drugačije:

- najviše 10–15 značajnih coding-agent iteracija ukupno (obe sesije);
- najviše 20–30 live AI poziva tokom razvoja;
- najviše 5 live poziva tokom završne demonstracije;
- testovi prvenstveno sa fake/mock klijentom;
- bez paralelnih agenata za Core zadatak.

Brojevi su guardrail, ne cilj potrošnje. Manja potrošnja uz isti ili bolji dokaz je dobar
inženjerski ishod.

Nikada ne stavljati u prompt, repo, screenshot ili evidence: API ključ ili credential,
privatan payload koji nije potreban za demonstraciju, tajne iz environment-a, raw stack
trace sa osetljivim podacima, privatan URL ili token.

## Ako zapnete

Ako isti problem traje oko 20 minuta, zaustaviti širenje scope-a i zapisati:

```
Pokušavam da <cilj>.
Očekujem <očekivano ponašanje>.
Dobijam <stvarni rezultat>.
Proverio/la sam <komande, fajlove i pokušaje>.
Dokaz je <test, rezultat ili snimak bez tajni>.
Moje pitanje je <precizno pitanje>.
```

Vratiti se na poslednje zeleno stanje. Prvo proveriti komandu, okruženje, ulaz, prompt i
šemu, pa tek onda tražiti novu AI sugestiju.

## Kriterijumi prihvatanja relevantni za Sesiju 003

- [ ] Scope i Definition of Done su jasni i mali.
- [ ] Prompt postoji pre prve velike implementacije.
- [ ] Context Manifest navodi uključene i izostavljene izvore.
- [ ] Baseline je sačuvan i nije zamenjen finalnom verzijom.
- [ ] Strukturisan izlaz ima runtime proveru.
- [ ] Eval skup ima najmanje četiri slučaja i isti je ponovljen posle promene.
- [ ] Promena ima hipotezu, signal i ograničenje.
- [ ] Evidence sadrži stvarne rezultate, komande i doprinos oba člana.
- [ ] AI Usage Log objašnjava veće pozive i odluke.
- [ ] Nema tajni u kodu ili predaji.

> Preostale stavke iz punog kriterijuma prihvatanja (Tool Contract, read-only granica,
> validacija tool outputa, fake/mock putanja za AI Hint) pripadaju Sesiji 004 i ovde nisu
> navedene.
