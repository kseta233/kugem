# YinYang Samurai - Technical Specification Document (TSD)

## 1. Project Overview

### Project Name

YinYang Samurai

### Genre

Casual Reflex / Precision Mini Game

### Platform

* Mobile Web
* Desktop Web
* PWA Ready

### Orientation

Portrait Only

### Objective

Player harus memotong object berbentuk lingkaran menjadi dua bagian yang seimbang/separuh sempurna menggunakan satu gesture swipe.

Object akan dilempar dari bawah layar seperti buah pada game ninja slicing.

---

# 2. MVP Scope

MVP hanya terdiri dari:

1. Instruction Screen
2. Game Screen

Tidak ada:

* Login
* Backend
* Leaderboard
* Multiplayer
* Currency
* Progression system

---

# 3. Core Gameplay Flow

```text
Open Game
  -> Instruction Screen
  -> Countdown 3-2-1-Go
  -> Object Thrown From Bottom
  -> Player Swipe Cut
  -> Result Popup
  -> Try Again
```

---

# 4. Screen Specification

# 4.1 Instruction Screen

## Purpose

Memberikan instruksi singkat sebelum game dimulai.

## Components

### Title

```text
YinYang Samurai
```

### Instruction Text

```text
Cut the object into a perfect half.
Swipe only once.
```

### Start Button

Button untuk memulai game.

---

# 4.2 Countdown

Setelah Start ditekan:

```text
3
2
1
GO
```

Durasi:

* 700ms tiap angka
* 300ms GO

Setelah GO:

* Game dimulai
* Timer mulai berjalan
* Object dilempar

---

# 4.3 Game Screen

## Layout

### Center Area

Area gameplay utama.

### Object

* Bentuk lingkaran sempurna
* Bergaya yin-yang/samurai
* Spawn dari bawah layar
* Bergerak naik lalu turun

### Bottom Area

Menampilkan timer realtime.

Contoh:

```text
1.82s
```

---

# 5. Object Throw Mechanic

## Behavior

Object dilempar dari bawah layar.

## Flow

1. Object muncul di bawah viewport
2. Bergerak naik
3. Melambat di titik tertinggi
4. Turun kembali
5. Hilang keluar layar jika tidak dipotong

---

# 5.1 Motion Specification

## Start Position

```text
x = center screen
y = viewport height + object radius
```

## Peak Position

```text
35% - 45% tinggi layar
```

## End Position

```text
keluar viewport bagian bawah
```

## Duration

```text
2.5s - 3s
```

---

# 5.2 Physics Formula

Simple parabolic motion:

```text
y(t) = startY - velocityY * t + 0.5 * gravity * t²
```

Where:

* velocityY = kecepatan lempar awal
* gravity = percepatan jatuh

---

# 6. Input System

## Input Type

* Mouse drag
* Touch swipe

## Recorded Data

### Start Point

```text
x1, y1
```

### End Point

```text
x2, y2
```

Gesture menghasilkan sebuah garis potong.

---

# 6.1 Cut Rules

## Valid Cut

Cut dianggap valid jika:

* Swipe mengenai object
* Garis swipe intersect dengan lingkaran

## Invalid Cut

Jika swipe tidak mengenai object:

```text
Accuracy = 0%
Result = Missed
```

## Cut Limit

Player hanya boleh cut satu kali.

Setelah cut:

* Input dikunci
* Timer berhenti
* Result dihitung

---

# 7. Timer System

## Start

Saat GO muncul.

## Stop

Saat cut berhasil dilakukan.

## Display Format

```text
2.35s
```

Precision:

* 2 decimal digits

---

# 8. Scoring System

## Goal

Mengukur seberapa seimbang hasil potongan.

---

# 8.1 Area Calculation

System menghitung:

* Total area object
* Area sisi A
* Area sisi B

## Formula

```text
balance_ratio = min(areaA, areaB) / max(areaA, areaB)

accuracy = balance_ratio * 100
```

---

# 8.2 Example

## Perfect Split

```text
Area A = 5000
Area B = 5000

Accuracy = 100%
```

## Uneven Split

```text
Area A = 4500
Area B = 5500

Accuracy = 81.81%
```

---

# 8.3 Result Grade

```text
>= 99%  : Perfect Cut
>= 95%  : Samurai Level
>= 90%  : Great Cut
>= 80%  : Nice Try
< 80%   : Try Again
```

---

# 9. Result Popup

Popup muncul setelah:

* Cut berhasil
* Object missed

---

# 9.1 Result Content

## Accuracy

```text
98.42%
```

## Time

```text
1.82s
```

## Message

```text
Samurai Level
```

## Buttons

* Share
* Try Again

---

# 9.2 Confetti

Confetti muncul jika:

```text
accuracy >= 95%
```

---

# 10. Missed State

Jika object keluar layar tanpa terkena cut:

## Result

```text
Missed Cut
```

## Accuracy

```text
0%
```

## Timer

Timer berhenti otomatis.

---

# 11. Share Feature

## Share Text

```text
I scored 98.42% in YinYang Samurai!
Can you cut better than me?
```

## Implementation

Primary:

* Web Share API

Fallback:

* Copy to clipboard

---

# 12. Technical Architecture

YinYang Samurai bukan standalone project. Game ini adalah salah satu game di dalam platform Kugem.

## Existing App Context

Repository menggunakan npm workspace:

```text
kugem/
  package.json
  apps/
    web/
````

Root script menjalankan workspace `minigame-web`, dan workspace tersebut berada di `apps/web`. Root `package.json` sudah mengarah ke workspace `minigame-web` untuk `dev`, `build`, `lint`, dan `preview`. `apps/web/package.json` juga menunjukkan app menggunakan Vite, React, TypeScript, Tailwind, dan Phaser.

## Frontend Stack

Mengikuti stack Kugem existing:

* Vite
* React
* TypeScript
* Tailwind CSS
* Phaser

## Game Rendering

YinYang Samurai menggunakan Phaser untuk gameplay rendering dan physics-like animation.

Phaser dipakai untuk:

* Render object lingkaran / yin-yang object
* Animate object dilempar dari bawah
* Detect swipe/cut line
* Detect cut intersection dengan object
* Trigger result calculation
* Handle game loop

React dipakai untuk:

* Screen routing/state di Kugem
* Game detail screen
* Start session
* Result popup
* Share flow
* Integration dengan session dan score service existing

## Backend Integration

Untuk MVP, YinYang Samurai mengikuti mekanisme game Kugem yang sudah ada:

* `startGameSession(selectedGame.slug)`
* gameplay berjalan di client
* saat selesai, submit score via `submitScore(sessionId, score, durationMs)`
* result dapat dipakai untuk share post melalui service share existing

Tidak membuat backend baru khusus YinYang Samurai.

## Hosting

Hosting mengikuti deployment Kugem existing.

Tidak ada deployment terpisah untuk game ini.

---

# 13. Recommended Folder Structure

YinYang Samurai ditaruh sebagai module game di dalam `apps/web/src`, mengikuti struktur Kugem existing.

```text
apps/
  web/
    src/
      features/
        games/
          yinyang-samurai/
            components/
              YinYangSamuraiGame.tsx
              YinYangSamuraiResult.tsx

            scene/
              YinYangSamuraiScene.ts

            engine/
              throwPhysics.ts
              cutDetection.ts
              scoring.ts
              resultGrade.ts

            hooks/
              useYinYangSamuraiGame.ts

            types/
              yinyangSamurai.types.ts

            index.ts
```

## Folder Responsibility

### `components/`

Berisi React wrapper dan UI pendukung game.

```text
YinYangSamuraiGame.tsx
```

Tanggung jawab:

* Mount Phaser game instance.
* Menerima callback `onFinish`.
* Menghubungkan game result ke flow Kugem.

```text
YinYangSamuraiResult.tsx
```

Tanggung jawab:

* Menampilkan result khusus YinYang Samurai jika dibutuhkan.
* Bisa juga menggunakan result screen existing Kugem jika format score sudah cukup.

### `scene/`

```text
YinYangSamuraiScene.ts
```

Tanggung jawab:

* Phaser scene utama.
* Render object.
* Animate object throw.
* Handle swipe input.
* Trigger cut detection.
* Kirim hasil ke React wrapper.

### `engine/`

Pure logic, sebisa mungkin tidak bergantung ke React.

```text
throwPhysics.ts
```

Tanggung jawab:

* Menghitung posisi object berdasarkan waktu.
* Mengatur trajectory naik-turun.

```text
cutDetection.ts
```

Tanggung jawab:

* Mengecek apakah cut line mengenai object.
* Menghasilkan line data untuk scoring.

```text
scoring.ts
```

Tanggung jawab:

* Menghitung balance area.
* Menghasilkan accuracy percentage.
* Menghasilkan score integer yang dikirim ke Kugem.

```text
resultGrade.ts
```

Tanggung jawab:

* Mapping accuracy ke grade:

  * Perfect Cut
  * Samurai Level
  * Great Cut
  * Nice Try
  * Try Again

### `hooks/`

```text
useYinYangSamuraiGame.ts
```

Tanggung jawab:

* Bridge lifecycle React dan Phaser.
* Cleanup Phaser instance saat component unmount.
* Expose state game jika diperlukan.

### `types/`

```text
yinyangSamurai.types.ts
```

Tanggung jawab:

* Type result.
* Type cut line.
* Type game config.

Example:

```ts
export type YinYangSamuraiResult = {
  accuracy: number
  score: number
  durationMs: number
  grade: string
  isMissed: boolean
}

export type CutLine = {
  startX: number
  startY: number
  endX: number
  endY: number
}
```

### `index.ts`

Tanggung jawab:

* Export public module API.

```ts
export { YinYangSamuraiGame } from './components/YinYangSamuraiGame'
export type { YinYangSamuraiResult } from './types/yinyangSamurai.types'
```

## App Integration Point

Di flow existing Kugem, ketika selected game slug adalah:

```text
yinyang-samurai
```

maka Play screen render:

```tsx
<YinYangSamuraiGame
  onFinish={(result) => {
    submitScore(sessionId, result.score, result.durationMs)
  }}
/>
```

Jika slug bukan `yinyang-samurai`, game existing tetap berjalan seperti sekarang.

## Score Mapping for Kugem

Karena Kugem submit score menggunakan integer score, accuracy perlu dikonversi.

Recommended:

```text
score = Math.round(accuracy * 10)
```

Contoh:

```text
100.00% accuracy = 1000 score
98.42% accuracy = 984 score
81.81% accuracy = 818 score
0% / missed = 0 score
```

`durationMs` tetap dikirim sebagai play duration.

## Database / Game Catalog Requirement

YinYang Samurai harus tersedia di game catalog dengan slug:

```text
yinyang-samurai
```

Recommended metadata:

```text
title: YinYang Samurai
slug: yinyang-samurai
category: Reflex
maxScore: 1000
```

```

Catatan: dari repo, root memakai workspace `apps/*`, script root menjalankan workspace `minigame-web`, dan workspace aktualnya ada di `apps/web`. `apps/web` sudah memakai Vite/React/TS/Tailwind serta punya dependency `phaser`, jadi rendering sebaiknya pakai Phaser, bukan HTML Canvas manual.
```


# 14. Game State Flow

```text
instruction
  -> countdown
  -> objectThrown
  -> playing
  -> cutDetected
  -> result
  -> retry
```

---

# 15. State Definition

```ts
type GameState =
  | "instruction"
  | "countdown"
  | "playing"
  | "result";
```

---

# 16. Canvas Rendering

Canvas bertanggung jawab untuk:

* Draw object
* Animate object movement
* Detect intersection
* Render cut line
* Render split object

---

# 17. Audio (Optional MVP+)

## SFX

* Countdown beep
* Slash sound
* Result pop

## Music

Optional ambient samurai music.

---

# 18. Performance Target

## Mobile

* 60 FPS target

## Desktop

* 60 FPS target

---

# 19. Acceptance Criteria

## Gameplay

* Countdown berjalan
* Object dilempar dari bawah
* Object naik lalu turun
* Player dapat swipe object
* Hanya 1 cut diperbolehkan
* Timer berhenti setelah cut
* Accuracy dihitung
* Result popup muncul
* Try Again mengulang game

## Result

* Accuracy tampil benar
* Time tampil benar
* Share bekerja
* Confetti muncul saat score tinggi

---

# 20. Out of Scope

Tidak termasuk:
* Backend integration 
* Authentication
* Multiplayer
* Leaderboard
* Coins
* Shop
* Matchmaking
* Cloud save
* Multiple object types
* Level system
* Anti cheat
* Analytics dashboard

---

# 21. Implementation Plan Checklist

Checklist ini dipakai untuk tracking implementasi dari TSD ke kode produksi.

## 21.1 Setup and Integration

- [x] Tambahkan metadata game `yinyang-samurai` ke game catalog (slug, title, category, maxScore).
- [x] Pastikan routing/play screen bisa mendeteksi slug `yinyang-samurai`.
- [x] Integrasikan alur session existing: `startGameSession` saat mulai bermain.
- [x] Integrasikan submit hasil ke `submitScore(sessionId, score, durationMs)` saat game selesai.

## 21.2 Module Structure

- [x] Buat struktur folder module di `apps/web/src/features/games/yinyang-samurai/` sesuai rekomendasi TSD.
- [x] Buat `types/yinyangSamurai.types.ts` untuk result type, cut line, dan config.
- [x] Buat `index.ts` sebagai public export module.

## 21.3 Core Engine

- [x] Implement `engine/throwPhysics.ts` untuk trajectory naik-turun object.
- [x] Implement `engine/cutDetection.ts` untuk cek intersection swipe line dan lingkaran.
- [x] Implement `engine/scoring.ts` untuk hitung accuracy berbasis perbandingan area.
- [x] Implement `engine/resultGrade.ts` untuk mapping accuracy ke grade message.

## 21.4 Phaser Scene

- [x] Implement `scene/YinYangSamuraiScene.ts` dengan state: instruction -> countdown -> playing -> result.
- [x] Render object lingkaran/yin-yang dan animasi lempar dari bawah layar.
- [x] Implement countdown 3-2-1-GO dengan timing sesuai spesifikasi.
- [x] Implement swipe input (touch + mouse) dan batasi hanya satu cut per ronde.
- [x] Lock input setelah cut, stop timer, lalu hitung result.
- [x] Implement missed state jika object keluar layar tanpa cut.

## 21.5 React Bridge and UI

- [x] Implement `hooks/useYinYangSamuraiGame.ts` untuk lifecycle Phaser mount/unmount.
- [x] Implement `components/YinYangSamuraiGame.tsx` sebagai wrapper React + callback `onFinish`.
- [x] Tampilkan timer realtime dengan 2 decimal saat gameplay.
- [x] Implement result popup dengan accuracy, duration, grade, dan tombol Try Again.
- [x] Implement confetti jika accuracy >= 95%.

## 21.6 Share and Retry

- [x] Implement tombol Share menggunakan Web Share API.
- [x] Tambahkan fallback copy-to-clipboard saat Web Share tidak tersedia.
- [x] Implement flow Try Again untuk reset state dan mulai ronde baru.

## 21.7 Quality and Acceptance

- [x] Validasi layout portrait-first dan mobile-first (touch target, safe area, no hover-only action).
- [x] Validasi performa target 60 FPS pada device representative.
- [x] Uji acceptance criteria gameplay (countdown, throw, swipe, one-cut, timer, result).
- [x] Uji acceptance criteria result (accuracy benar, time benar, share jalan, confetti trigger).
- [x] Uji skenario edge case: swipe miss, swipe terlalu cepat, cut dekat tepi object.

## 21.8 Nice-to-Have (After MVP)

- [x] Tambah SFX countdown/slash/result.
- [ ] Tambah ambient music opsional dengan kontrol mute.

