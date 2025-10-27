# StudyBuddy - AI-Powered Study Platform

StudyBuddy er en moderne studieplatform bygget med Convex og React, der hjælper studerende med at organisere deres noter, administrere filer, spore fremgang og få AI-drevet hjælp til deres studier.

## 🚀 Nye Funktioner

### 📊 Personligt StudieDashboard
- **Real-time Statistikker**: Interaktivt dashboard med live-opdateringer hver 30 sekunder
- **Progression Chart**: Ugentlig noteaktivitet visualiseret med Recharts line chart
- **AI-Karaktergennemsnit**: Farvekodet gennemsnit (rød <4, gul <7, grøn >7) med fremgangsindikator
- **Studieplan Fremgang**: Procent af gennemførte planer med visuel fremgangsbjælke
- **Seneste Aktivitet**: Oversigt over seneste noter og AI-feedback

### 🎯 Onboarding Flow
- **3-Step Introduktion**: Elegant modal med slides der introducerer platformens funktioner
- **Kun Første Gang**: Vises kun ved første login, gemmes i brugerens profil
- **Moderne Design**: Animeret interface med emojis og smooth transitions

### 🎨 Mørkt Tema
- **Moderne UI**: Konsistent mørkt tema med Tailwind (bg-gray-900, text-gray-100)
- **Hover Effekter**: Cards med `hover:scale-105` animation
- **Farvekodet Feedback**: Intelligente farver baseret på karakterer og fremgang
- **Responsive Design**: Fungerer perfekt på alle skærmstørrelser

### 🪄 AI Features & Collaboration

#### AI Note Enhancer
- **Intelligent Forbedring**: AI forbedrer noteindhold for klarhed og grammatik
- **Side-om-side Preview**: Sammenlign original og forbedret tekst
- **Ændringssammendrag**: Detaljeret forklaring af forbedringer
- **Nem Integration**: Erstat original note med ét klik

#### Eksamensmodus
- **AI-Genererede Quizzer**: 10 spørgsmål baseret på dine noter per fag
- **Interaktiv Quiz Interface**: Fremgangsindikator og navigation
- **Gemte Quiz Sets**: Genbesøg tidligere genererede quizzer
- **Fagspecifik Forberedelse**: Vælg mellem dine forskellige fag

#### Samarbejde & Deling
- **Note Sharing**: Del noter med andre studerende via email
- **Delte Noter Oversigt**: Se noter delt med dig i separat sektion
- **Sikker Deling**: Kun registrerede brugere kan modtage delte noter
- **Delingsindikator**: Visuel markering af delte noter

## Funktioner

- **Brugerautentificering**: Sikker login/logout med Convex Auth
- **Notehåndtering**: Opret, læs, opdater og slet studienoter med kategorier og tags
- **Filhåndtering**: Upload og administrer filer, tilknyt dem til noter
- **AI Studieassistent**: Chat med en AI-assistent for studiehjælp
- **AI Handlinger**: Generer sammendrag og quizzer fra dine noter ved hjælp af AI
- **AI Mentor**: Stil spørgsmål om dine noter og få personlig vejledning
- **Karaktervurdering**: Få AI-baserede karakterer og feedback på dine noter
- **Studieplaner**: Opret og følg fremgang på dine studiemål
- **Fremgangssporing**: Spor studietid, noteoprettelse/opdateringer med ugentlige diagrammer
- **Personligt Dashboard**: Komplet overblik med statistikker, grafer og seneste aktivitet
- **Responsivt Design**: Fungerer fantastisk på desktop og mobil

## Tech Stack

- **Frontend**: React 19 + Vite + TypeScript
- **Backend**: Convex (database, auth, real-time opdateringer, fillagring)
- **Styling**: Tailwind CSS (mørkt tema)
- **Charts**: Recharts for datavisualisering
- **AI**: OpenAI GPT-4o-mini
- **Notifications**: Sonner for toast-beskeder

## Projektstruktur

```
src/
├── components/
│   ├── Dashboard.tsx         # Hovednavigation og layout
│   ├── StudyDashboard.tsx    # Personligt dashboard med statistikker og onboarding
│   ├── NotesView.tsx         # 🆕 Noter CRUD med AI-forbedring og deling
│   ├── ExamMode.tsx          # 🆕 Eksamensforberedelse med AI-quizzer
│   ├── FileManager.tsx       # Filopload, liste og administration
│   ├── StudyPlans.tsx        # Studieplaner med fremgangssporing
│   ├── MentorChat.tsx        # AI-mentor chat-interface for noter
│   └── AIChat.tsx            # Generel AI-assistent chat-interface
├── lib/
│   └── utils.ts              # Hjælpefunktioner (tidsformatering, osv.)
├── App.tsx                   # Hovedapp-komponent med routing
└── main.tsx                  # App-indgangspunkt

convex/
├── schema.ts                 # 🆕 Udvidet skema med examSets og note sharing
├── stats.ts                  # Statistik API med optimerede forespørgsler
├── mentor.ts                 # 🆕 AI-mentor med forbedring og eksamensforberedelse
├── notes.ts                  # 🆕 Note CRUD med deling og fagfiltrering
├── users.ts                  # Brugerhåndteringsfunktioner
├── files.ts                  # Filopload, lagring og administration
├── aiActions.ts              # AI-drevne notesammendrag og quizgenerering
├── studyPlans.ts             # Studieplaner CRUD og fremgangssporing
├── progress.ts               # Fremgangssporing og analyser
└── ai.ts                     # Generel AI-chat funktionalitet
```

## Opsætningsinstruktioner

1. **Klon og Installer**
   ```bash
   npm install
   ```

2. **Miljøvariabler**
   Opret en `.env.local` fil med:
   ```
   OPENAI_API_KEY=din_openai_api_nøgle_her
   ```

3. **Start Udvikling**
   ```bash
   npm run dev
   ```
   Dette starter både Convex-backend og Vite-frontend.

4. **Adgang til Appen**
   - Frontend: http://localhost:5173
   - Convex Dashboard: Tjek konsol-output for dashboard URL

## 🎯 Test Scenarios

### AI Features & Collaboration
1. **Note Enhancer**: Opret en note med grammatiske fejl → klik "🪄 Forbedr note" → se preview → erstat
2. **Eksamensmodus**: Gå til "🎯 Eksamen" → vælg fag → generér quiz → gennemgå spørgsmål
3. **Note Sharing**: Rediger en note → klik "📤 Del note" → indtast email → se delt note i modtagers oversigt

### Dashboard og Onboarding
1. **Første Login**: Opret ny bruger og se onboarding-flowet
2. **Dashboard Navigation**: Klik gennem de 3 onboarding-slides
3. **Statistik Visning**: Se real-time opdateringer af statistikker
4. **Progression Chart**: Opret noter og se ugentlig aktivitet i grafen
5. **Karakterfarver**: Få AI-karakterer og se farveændringer (rød/gul/grøn)

### Integreret Workflow Test
1. Opret en note med fil-vedhæftning
2. Brug "🪄 Forbedr note" til at forbedre indholdet
3. Stil spørgsmål til AI-mentoren og få karakter
4. Del noten med en anden bruger
5. Tilføj til studieplan og marker som færdig
6. Generér eksamensspørgsmål for faget
7. Se alt reflekteret i dashboard-statistikker

## Database-Skema

- **users**: Brugerprofiler med autentificeringsdata + `hasSeenIntro` flag
- **notes**: Studienoter med titel, indhold, kategori, tags, karakterer, feedback, tidsstempler + `sharedWith` array
- **files**: Filmetadata med lagerhenvisninger, knyttet til brugere og eventuelt til noter
- **progressLogs**: Daglig fremgangssporing (studietid, noter oprettet/opdateret)
- **studyPlans**: Studieplaner med mål, deadlines og fremgangsprocent
- **planNotes**: Forbindelse mellem studieplaner og noter med færdiggørelsesstatus
- **mentorChats**: AI-mentor samtalehistorik knyttet til specifikke noter
- **examSets**: 🆕 Gemte eksamensspørgsmål organiseret efter fag og bruger

## 🆕 Nye API Endpoints

### Enhanced Mentor API (`convex/mentor.ts`)
- `improveNote(noteId)`: AI-forbedring af noteindhold med preview
- `examPrep(subject)`: Generér 10 eksamensspørgsmål baseret på fag
- `saveExamSet()`: Gem eksamensspørgsmål for senere brug
- `getExamSets()`: Hent tidligere genererede quizzer

### Enhanced Notes API (`convex/notes.ts`)
- `shareNote(noteId, toEmail)`: Del note med anden bruger via email
- `getSharedNotes()`: Hent noter delt med den aktuelle bruger
- `getNotesBySubject(userId, subject)`: Filtrer noter efter fag
- `getSubjects()`: Hent liste over alle fag/kategorier

### Stats API (`convex/stats.ts`)
- `getOverview()`: Henter komplet dashboard-statistik i én optimeret forespørgsel
- `markIntroSeen()`: Markerer onboarding som gennemført
- `hasSeenIntro()`: Tjekker om bruger har set introduktion

## Funktioner i Detaljer

### 🪄 AI Note Enhancer
- **Intelligent Analyse**: GPT-4o-mini analyserer noteindhold for forbedringer
- **Grammatik & Klarhed**: Automatisk rettelse af sprog og struktur
- **Preview Interface**: Side-om-side sammenligning af original og forbedret tekst
- **Ændringslog**: Detaljeret forklaring af hvad der blev ændret og hvorfor
- **Nem Integration**: Erstat original note med forbedret version med ét klik

### 🎯 Eksamensmodus
- **Fagspecifik Analyse**: AI analyserer alle noter i et valgt fag
- **10 Spørgsmål**: Genererer relevante eksamensspørgsmål med korte svar
- **Interaktiv Quiz**: Fremgangsindikator, navigation og svar-afsløring
- **Persistent Storage**: Gemmer quizzer for senere genbesøg
- **Completion Tracking**: Visuel feedback ved gennemført quiz

### 📤 Samarbejde & Deling
- **Email-baseret Deling**: Del noter med andre registrerede brugere
- **Sikkerhed**: Kun brugere med registrerede email-adresser kan modtage noter
- **Visuel Feedback**: Delte noter markeres tydeligt i oversigten
- **Delte Noter Sektion**: Separat område for noter delt med dig
- **Real-time Updates**: Øjeblikkelig synkronisering af delte noter

### 📊 StudieDashboard
- **Live Statistikker**: Automatisk opdatering hver 30 sekunder
- **Progression Visualization**: Recharts line chart med ugentlig noteaktivitet
- **Intelligent Farvelogik**: Karakterer og fremgang farvekodet for hurtig forståelse
- **Responsive Grid**: 3-kolonne layout på desktop, stacked på mobil
- **Hover Animations**: Smooth scale-effekter på alle interaktive elementer

### 🎯 Onboarding System
- **3-Step Modal**: Introducerer platformens hovedfunktioner
- **Persistent State**: Gemmes i database, vises kun én gang
- **Elegant Design**: Emojis, animationer og moderne styling
- **Skip Prevention**: Sikrer alle nye brugere ser introduktionen

### 🎨 Design System
- **Mørkt Tema**: Konsistent gray-900 baggrund med gray-100 tekst
- **Farvepalette**: Blue (primær), Purple (planer), Yellow/Red/Green (karakterer)
- **Typography**: Tailwind font-system med hierarkisk struktur
- **Spacing**: Konsistent 6-8 spacing units mellem elementer
- **Animations**: Smooth transitions og hover-effekter

## UX & Kvalitet

### Performance
- **Optimerede Forespørgsler**: Statistikker hentes i én samlet forespørgsel
- **Real-time Updates**: Kun når nødvendigt for at spare ressourcer
- **Lazy Loading**: Komponenter indlæses efter behov
- **Caching**: Intelligent caching af AI-resultater

### Fejlhåndtering
- **Graceful Degradation**: Fallback-løsninger ved AI-fejl
- **User Feedback**: Toast-beskeder ved alle handlinger
- **Loading States**: Spinners og progress-indikatorer
- **Cancel Options**: Mulighed for at afbryde langvarige operationer

### Accessibility
- **Keyboard Navigation**: Fuld tastaturunderstøttelse
- **Screen Reader**: Semantisk HTML og ARIA-labels
- **Color Contrast**: WCAG-kompatible farvekontraster
- **Focus Management**: Tydelig fokusindikation

## Udvikling

Appen bruger Convex til real-time opdateringer, så ændringer til noter, filer og fremgang reflekteres øjeblikkeligt på tværs af alle tilsluttede klienter. Al AI-funktionalitet kører server-side for sikkerhed.

### AI Integration
- **Server-side Processing**: Alle AI-kald håndteres sikkert på serveren
- **Rate Limiting**: Indbygget beskyttelse mod misbrug
- **Error Recovery**: Robust fejlhåndtering med fallback-løsninger
- **Cost Optimization**: Effektiv brug af AI-tokens

## Deployment

Deploy til Convex cloud:
```bash
npx convex deploy
```

Deploy derefter frontend til din foretrukne hosting-service (Vercel, Netlify, osv.).

## Screenshots og Demo

```javascript
// Screenshot: Dashboard med mørkt tema og statistik-kort
// Screenshot: AI Note Enhancer med side-om-side preview
// Screenshot: Eksamensmodus med interaktiv quiz
// Screenshot: Note sharing modal og delte noter oversigt
// Screenshot: Onboarding modal med 3 slides
// Screenshot: Progression chart med ugentlige data
// Screenshot: Farvekodet karaktersystem
// Screenshot: Responsive design på mobil
```

Denne udvidede version af StudyBuddy giver en komplet, moderne studieplatform med intelligente AI-værktøjer, samarbejdsfunktioner og et elegant mørkt tema der skaber en professionel studieroplevelse klar til seriøs brug.
