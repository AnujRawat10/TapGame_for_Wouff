"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "../components/ui/button"
import { Card } from "../components/ui/card"
import { Luckiest_Guy } from "next/font/google"

const luckiest = Luckiest_Guy({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
})

type GameState = "menu" | "character-select" | "countdown" | "playing" | "game-over"
type Character = "dog" | "cat" | "beagle" | "husky"

interface ScorePopup {
  id: number
  x: number
  y: number
  points: number
}

const BTN_PRIMARY =
  "border-[6px] sm:border-[8px] border-white bg-purple-700 hover:bg-purple-800 text-white font-extrabold rounded-full shadow-lg"

const MEGA_INTERVAL = 10
const MEGA_BONUS = 100
const LEVEL_POINTS = 1000 // every 1000 points = +1 level
const DOG_GIF_PATH = "/images/DogTap.gif" // <-- put your GIF here
const DOG_STATIC_PATH = "/images/Dog.png"

export default function PetTapGame() {
  const [gameState, setGameState] = useState<GameState>("menu")
  const [selectedCharacter, setSelectedCharacter] = useState<Character>("dog")
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [highScore, setHighScore] = useState(0)
  const [scorePopups, setScorePopups] = useState<ScorePopup[]>([])
  const [tapCount, setTapCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [showStartButton, setShowStartButton] = useState(false)

  const [level, setLevel] = useState(1)
  const [megaFlash, setMegaFlash] = useState<null | { x: number; y: number; bonus: number }>(null)

  // dog GIF control
  const [dogAnimating, setDogAnimating] = useState(false)

  // Countdown (Instruction → 3 → 2 → 1 → LET'S GO!!)
  const [countdownValue, setCountdownValue] = useState<string | number | null>(null)

  const characters: Character[] = ["dog", "cat", "beagle", "husky"]

  /* ------------ AUDIO ------------ */
  const bgmRef = useRef<HTMLAudioElement | null>(null)
  const clickRef = useRef<HTMLAudioElement | null>(null)
  const tapRef = useRef<HTMLAudioElement | null>(null)

  const [soundOn, setSoundOn] = useState<boolean>(() => {
    if (typeof window === "undefined") return true
    return localStorage.getItem("pet-tap-sound") !== "off"
  })
  const [sfxOn, setSfxOn] = useState<boolean>(() => {
    if (typeof window === "undefined") return true
    return localStorage.getItem("pet-tap-sfx") !== "off"
  })

  const playClick = useCallback(() => {
    if (!sfxOn) return
    const a = clickRef.current
    if (!a) return
    a.currentTime = 0
    a.play().catch(() => {})
  }, [sfxOn])

  const playTap = useCallback(() => {
    if (!sfxOn) return
    const a = tapRef.current
    if (!a) return
    a.currentTime = 0
    a.play().catch(() => {})
  }, [sfxOn])

  /* ------------ INIT / LOADER ------------ */
  useEffect(() => {
    const saved = localStorage.getItem("pet-tap-high-score")
    if (saved) setHighScore(Number.parseInt(saved))
  }, [])

  useEffect(() => {
    if (gameState === "menu" && isLoading) {
      const t = setTimeout(() => {
        setIsLoading(false)
        setShowStartButton(true)
      }, 4000)
      return () => clearTimeout(t)
    }
  }, [gameState, isLoading])

  // music on/off
  useEffect(() => {
    localStorage.setItem("pet-tap-sound", soundOn ? "on" : "off")
    const a = bgmRef.current
    if (!a) return
    a.volume = 0.5
    if (soundOn) a.play().catch(() => {})
    else a.pause()
  }, [soundOn])

  // sfx on/off
  useEffect(() => {
    localStorage.setItem("pet-tap-sfx", sfxOn ? "on" : "off")
  }, [sfxOn])

  /* ------------ GAME TIMER ------------ */
  useEffect(() => {
    if (gameState === "playing" && timeLeft > 0) {
      const t = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(t)
    } else if (timeLeft === 0 && gameState === "playing") {
      endGame()
    }
  }, [gameState, timeLeft])

  /* ------------ MARQUEE (smooth transform) ------------ */
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [marqueeDur, setMarqueeDur] = useState<number>(12)
  const MARQUEE_SPEED_PX = 140
  useEffect(() => {
    if (gameState !== "menu") return
    const calc = () => {
      const track = trackRef.current
      if (!track) return
      const halfWidth = track.scrollWidth / 2
      const dur = Math.max(halfWidth / MARQUEE_SPEED_PX, 6)
      setMarqueeDur(dur)
    }
    calc()
    window.addEventListener("resize", calc)
    return () => window.removeEventListener("resize", calc)
  }, [gameState, characters.length])

  /* ------------ START / COUNTDOWN ------------ */
  const startGame = () => {
    playClick()
    setScore(0)
    setTimeLeft(30)
    setTapCount(0)
    setScorePopups([])
    setLevel(1)
    if (soundOn) bgmRef.current?.play().catch(() => {})
    setGameState("countdown")
  }

  useEffect(() => {
    if (gameState !== "countdown") return
    setCountdownValue("Tap repeatedly to reach score of 7000")
    const t1 = setTimeout(() => setCountdownValue(3), 1300)
    const t2 = setTimeout(() => setCountdownValue(2), 2100)
    const t3 = setTimeout(() => setCountdownValue(1), 2900)
    const t4 = setTimeout(() => setCountdownValue("LET'S GO!!"), 3700)
    const t5 = setTimeout(() => {
      setCountdownValue(null)
      setGameState("playing")
    }, 4700)
    return () => [t1, t2, t3, t4, t5].forEach(clearTimeout)
  }, [gameState])

  const endGame = () => {
    if (score > highScore) {
      setHighScore(score)
      localStorage.setItem("pet-tap-high-score", score.toString())
    }
    setGameState("game-over")
  }

  const handlePlayAgain = () => {
    playClick()
    setScore(0)
    setTimeLeft(30)
    setTapCount(0)
    setScorePopups([])
    setLevel(1)
    setGameState("character-select")
  }

  const handleBackToMenu = () => {
    playClick()
    setIsLoading(true)
    setShowStartButton(false)
    setGameState("menu")
  }

  // level up as score changes
  useEffect(() => {
    const newLevel = Math.floor(score / LEVEL_POINTS) + 1
    if (newLevel !== level) setLevel(newLevel)
  }, [score, level])

  // precise +points at click; also play tap SFX
  const handleTap = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (gameState !== "playing") return
      const rect = event.currentTarget.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top

      playTap()

      // animate dog GIF only for 'dog'
      if (selectedCharacter === "dog") {
        setDogAnimating(true)
        setTimeout(() => setDogAnimating(false), 700) // adjust to your GIF length
      }

      const base = 10 + Math.floor(tapCount / 10) * 5
      const isMega = (tapCount + 1) % MEGA_INTERVAL === 0
      const add = base + (isMega ? MEGA_BONUS : 0)

      setScore((p) => p + add)
      setTapCount((p) => p + 1)

      // +points popup
      const popup: ScorePopup = { id: Date.now(), x, y, points: base }
      setScorePopups((p) => [...p, popup])
      setTimeout(() => setScorePopups((p) => p.filter((pp) => pp.id !== popup.id)), 800)

      // mega flash
      if (isMega) {
        setMegaFlash({ x, y, bonus: MEGA_BONUS })
        setTimeout(() => setMegaFlash(null), 750)
      }
    },
    [gameState, tapCount, playTap, selectedCharacter],
  )

  const getCharacterImage = (c: Character) =>
    c === "dog" ? DOG_STATIC_PATH : c === "cat" ? "/images/Cat.png" : c === "beagle" ? "/images/Beagle.png" : "/images/Husky.png"

  const getCharacterName = (c: Character) =>
    c === "dog" ? "Poodle" : c === "cat" ? "Cat" : c === "beagle" ? "Beagle" : "Husky"

  /* ------------ BACKGROUND FLOATERS (smooth infinite) ------------ */
  const FloatingElements = () => (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-16 left-[12%] text-white text-xl sm:text-2xl animate-drift-1">⭐</div>
      <div className="absolute top-40 right-[12%] text-white text-lg sm:text-xl animate-drift-2">✨</div>
      <div className="absolute bottom-24 left-[22%] text-white text-2xl sm:text-3xl animate-drift-3">⭐</div>

      <div className="absolute top-32 left-1/2 w-3 h-3 sm:w-4 sm:h-4 bg-white/30 rounded-full animate-drift-2" />
      <div className="absolute top-60 right-1/3 w-4 h-4 sm:w-6 sm:h-6 bg-red-400/40 rounded-full animate-drift-3" />
      <div className="absolute bottom-36 right-[18%] w-2.5 h-2.5 bg-white/50 rounded-full animate-drift-1" />
      <div className="absolute top-1/2 left-6 sm:left-16 w-4 h-4 bg-orange-200/60 rounded-full animate-drift-4" />

      <div className="absolute top-1/3 right-6 sm:right-20 text-white text-lg sm:text-2xl animate-drift-4">⚡</div>
      <div className="absolute bottom-1/3 left-[14%] text-white text-base sm:text-xl animate-drift-2">⚡</div>

      <style jsx>{`
        @keyframes drift1 {
          0% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(8px, -14px, 0) rotate(2deg); }
          100% { transform: translate3d(0, 0, 0) rotate(0deg); }
        }
        @keyframes drift2 {
          0% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(-10px, 10px, 0) rotate(-3deg); }
          100% { transform: translate3d(0, 0, 0) rotate(0deg); }
        }
        @keyframes drift3 {
          0% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(12px, 6px, 0) rotate(3deg); }
          100% { transform: translate3d(0, 0, 0) rotate(0deg); }
        }
        @keyframes drift4 {
          0% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(-6px, -12px, 0) rotate(-2deg); }
          100% { transform: translate3d(0, 0, 0) rotate(0deg); }
        }
        .animate-drift-1 { animation: drift1 7.5s ease-in-out infinite; will-change: transform; }
        .animate-drift-2 { animation: drift2 9s ease-in-out infinite; will-change: transform; }
        .animate-drift-3 { animation: drift3 10.5s ease-in-out infinite; will-change: transform; }
        .animate-drift-4 { animation: drift4 8.5s ease-in-out infinite; will-change: transform; }
      `}</style>
    </div>
  )

  /* ------------ TOP-RIGHT TOGGLES ------------ */
  const SoundToggles = () => (
    <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-30 flex gap-2 sm:gap-3">
      {/* Music */}
      <button
        onClick={() => {
          playClick()
          setSoundOn((s) => {
            const next = !s
            const a = bgmRef.current
            if (a) (next ? a.play() : a.pause())
            return next
          })
        }}
        aria-label={soundOn ? "Mute music" : "Unmute music"}
        className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-300 rounded-full grid place-items-center shadow focus:outline-none"
      >
        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white rounded-full grid place-items-center text-gray-600">
          <span className="text-base sm:text-lg">{soundOn ? "🔊" : "🔇"}</span>
        </div>
      </button>

      {/* SFX */}
      <button
        onClick={() => {
          playClick()
          setSfxOn((s) => !s)
        }}
        aria-label={sfxOn ? "Disable SFX" : "Enable SFX"}
        className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-300 rounded-full grid place-items-center shadow focus:outline-none"
      >
        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white rounded-full grid place-items-center text-gray-600">
          <span className="text-base sm:text-lg">{sfxOn ? "🎮" : "🚫"}</span>
        </div>
      </button>
    </div>
  )

  /* -------------------- MENU -------------------- */
  const MenuScreen = () => {
    const marqueeItems = [...characters, ...characters] as Character[]
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-orange-300 via-orange-400 to-amber-400 p-3 sm:p-4 relative overflow-hidden">
        <FloatingElements />
        <SoundToggles />

        <div className="text-center space-y-6 sm:space-y-8 bounce-in relative z-10">
          <div className="space-y-2 sm:space-y-4">
            <h1 className={`${luckiest.className} text-5xl sm:text-6xl md:text-7xl text-purple-800 tracking-wider drop-shadow-[0_4px_0_rgba(255,255,255,0.85)]`}>
              PET TAP
            </h1>
            <h2 className={`${luckiest.className} text-2xl sm:text-3xl md:text-4xl text-purple-700 drop-shadow-[0_3px_0_rgba(255,255,255,0.85)]`}>
              STRESS RELEASE
            </h2>
          </div>

          {/* Transparent bubble with transform-based marquee */}
          <div className="relative mx-auto w-[20rem] sm:w-[28rem] md:w-[34rem] h-36 sm:h-44 md:h-48 bg-gradient-to-br from-orange-200/60 to-amber-200/60 rounded-[2rem] sm:rounded-[3rem] border-4 border-orange-300/50 shadow-xl pulse-glow overflow-hidden">
            <div className="pointer-events-none absolute inset-0 rounded-[2rem] sm:rounded-[3rem] [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]" />
            <div
              ref={trackRef}
              className="h-full w-max flex items-center gap-6 sm:gap-10 animate-marquee will-change-transform px-6"
              style={{ animationDuration: `${marqueeDur}s` }}
              onMouseEnter={(e) => ((e.currentTarget.style.animationPlayState = "paused"))}
              onMouseLeave={(e) => ((e.currentTarget.style.animationPlayState = "running"))}
            >
              {marqueeItems.map((c, i) => (
                <button
                  key={`${c}-${i}`}
                  className="shrink-0 rounded-xl sm:rounded-2xl bg-white/30 backdrop-blur px-3 sm:px-4 py-2 sm:py-3 border-2 border-white/40 hover:bg-white/50 transition"
                  onClick={() => {
                    setSelectedCharacter(c)
                    playClick()
                  }}
                >
                  <img src={getCharacterImage(c)} alt={getCharacterName(c)} className="w-16 h-16 sm:w-24 sm:h-24 object-contain" />
                  <div className="text-xs sm:text-sm font-bold text-purple-800 mt-1">{getCharacterName(c)}</div>
                </button>
              ))}
            </div>

            <style jsx>{`
              @keyframes marquee {
                from { transform: translate3d(0, 0, 0); }
                to { transform: translate3d(-50%, 0, 0); }
              }
              .animate-marquee {
                animation-name: marquee;
                animation-timing-function: linear;
                animation-iteration-count: infinite;
              }
              @media (prefers-reduced-motion: reduce) {
                .animate-marquee { animation: none; }
              }
            `}</style>
          </div>

          {isLoading && (
            <div className="w-72 sm:w-80 mx-auto space-y-2">
              <div className="w-full h-2.5 bg-purple-800/30 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-600 to-purple-800 rounded-full loading-bar" />
              </div>
              <p className="text-purple-800 font-bold text-xs sm:text-sm tracking-widest flex items-center justify-center gap-2">
                <img src="/images/loader.svg" alt="Loading" className="w-4 h-4 custom-loader" />
                LOADING...
              </p>
            </div>
          )}

          {showStartButton && (
            <div className="space-y-3 sm:space-y-4 pt-1 sm:pt-2">
              <Button
                onClick={() => {
                  playClick()
                  setGameState("character-select")
                }}
                size="lg"
                className={`${BTN_PRIMARY} text-base sm:text-xl px-8 sm:px-12 py-3 sm:py-4`}
              >
                START GAME
              </Button>
              {highScore > 0 && (
                <p className="text-base sm:text-lg text-purple-800 font-bold bg-white/20 px-4 py-2 rounded-full">
                  High Score: {highScore}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  /* -------------------- CHARACTER SELECT -------------------- */
  const CharacterSelect = () => {
    const choices: { key: Character; label: string }[] = [
      { key: "dog", label: "Poodle" },
      { key: "cat", label: "Cat" },
      { key: "beagle", label: "Beagle" },
      { key: "husky", label: "Husky" },
    ]

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-orange-300 via-orange-400 to-amber-400 px-3 sm:px-4 py-6 relative overflow-hidden">
        <FloatingElements />
        <SoundToggles />

        <div className="text-center space-y-6 sm:space-y-8 bounce-in relative z-10 w-full max-w-3xl">
          <h2 className={`${luckiest.className} text-4xl sm:text-5xl text-purple-800 drop-shadow-[0_3px_0_rgba(255,255,255,0.85)]`}>Choose Your Pet</h2>

          <div className="grid grid-cols-2 gap-3 sm:gap-6 justify-center">
            {choices.map(({ key, label }) => (
              <Card
                key={key}
                onClick={() => {
                  setSelectedCharacter(key)
                  playClick()
                }}
                className={`p-4 sm:p-6 transition-all hover:scale-105 bg-white/20 border-2 cursor-pointer
                  ${selectedCharacter === key ? "ring-4 ring-purple-600 bg-white/40 border-purple-600" : "border-orange-300"}`}
              >
                <div className="text-center space-y-2 sm:space-3">
                  <img src={getCharacterImage(key)} alt={label} className="w-16 h-16 sm:w-20 sm:h-20 object-contain mx-auto" />
                  <h3 className="text-lg sm:text-xl font-bold text-purple-800">{label}</h3>
                </div>
              </Card>
            ))}
          </div>

          <Button
            onClick={startGame}
            size="lg"
            className={`${BTN_PRIMARY} mx-auto text-base sm:text-xl px-8 sm:px-12 py-3 sm:py-4 flex items-center gap-2`}
          >
            START PLAYING
            <span className="text-xl sm:text-2xl">➜</span>
          </Button>
        </div>
      </div>
    )
  }

  /* -------------------- GAME (for playing & countdown background) -------------------- */
  const GameScreen = ({ isCountdown }: { isCountdown: boolean }) => {
    const rightTop = String(Math.min(99, Math.floor(tapCount / 10) + 1)).padStart(2, "0")
    const rightMid = String(Math.min(99, Math.floor(tapCount / 25) + 1)).padStart(2, "0")

    const levelPadded = String(level).padStart(2, "0")
    const showDogGif = selectedCharacter === "dog" && dogAnimating

    return (
      <div
        className={`min-h-screen bg-gradient-to-br from-orange-300 via-orange-400 to-amber-400 relative overflow-hidden transition filter duration-300 ${
          isCountdown ? "blur-[4px] brightness-[0.95]" : ""
        }`}
      >
        <FloatingElements />
        <SoundToggles />

        {/* Top-left label */}
        <div className="fixed top-4 left-4 sm:top-6 sm:left-6 z-30">
          <h1 className={`${luckiest.className} text-2xl sm:text-3xl md:text-4xl text-purple-800 leading-none drop-shadow-[0_3px_0_rgba(255,255,255,0.85)]`}>
            STRESS RELEASE
          </h1>
          <p className="text-[10px] sm:text-xs text-purple-700 font-bold mt-1 leading-none">A GAME DESIGNED BY</p>
          <p className="text-[10px] sm:text-xs text-purple-700 font-bold">YOUR AGENCY</p>
        </div>

        {/* Timer pill */}
        <div className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-30">
          <div className="bg-white rounded-full px-6 sm:px-8 md:px-10 py-2 sm:py-3 border-[4px] sm:border-[6px] border-purple-700 shadow-xl">
            <div className={`${luckiest.className} text-2xl sm:text-3xl md:text-4xl text-purple-800 tracking-widest`}>
              {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}
            </div>
          </div>
        </div>

        {/* Central capsule */}
        <div className="absolute inset-0 flex items-center justify-center z-20 px-4">
          <div
            className={`relative w-64 h-72 sm:w-80 sm:h-96 md:w-[22rem] md:h-[26rem] bg-white rounded-[1.75rem] sm:rounded-[2.5rem] shadow-2xl flex items-center justify-center overflow-hidden cursor-pointer select-none ${
              megaFlash ? "ring-4 ring-purple-400" : ""
            }`}
            onClick={handleTap}
          >
            {/* Character media (dog can switch to GIF) */}
            <img
              src={
                showDogGif
                  ? DOG_GIF_PATH
                  : getCharacterImage(selectedCharacter) || "/images/placeholder.svg"
              }
              alt={getCharacterName(selectedCharacter)}
              className={`w-36 h-36 sm:w-48 sm:h-48 object-contain transition-transform duration-150 ${
                dogAnimating ? "scale-110" : ""
              }`}
            />

            {/* Score Popups at click location */}
            {scorePopups.map((popup) => (
              <div
                key={popup.id}
                className="pointer-events-none absolute text-2xl sm:text-3xl font-black text-red-500"
                style={{
                  left: popup.x,
                  top: popup.y,
                  transform: "translate(-50%, -50%)",
                  animation: "pt-float 800ms ease-out forwards",
                  whiteSpace: "nowrap",
                }}
              >
                +{popup.points}
              </div>
            ))}

            {/* MEGA SQUISH popup */}
            {megaFlash && (
              <div
                className="pointer-events-none absolute font-black text-purple-700 bg-white/90 border-4 border-purple-700 rounded-full px-4 py-2"
                style={{
                  left: megaFlash.x,
                  top: megaFlash.y - 40,
                  transform: "translate(-50%, -50%)",
                  animation: "mega-pop 700ms ease-out forwards",
                  whiteSpace: "nowrap",
                }}
              >
                MEGA SQUISH! +{megaFlash.bonus}
              </div>
            )}

            <div className="absolute bottom-6 sm:bottom-8 w-5 h-5 sm:w-6 sm:h-6 bg-red-500 rounded-full border-2 border-white shadow" />

            <style jsx>{`
              @keyframes pt-float {
                0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -90%) scale(1.1); }
              }
              @keyframes mega-pop {
                0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                50% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
                100% { transform: translate(-50%, -60%) scale(1); opacity: 0; }
              }
            `}</style>
          </div>
        </div>

        {/* RIGHT STACK on md+ */}
        <aside className="hidden md:block fixed right-6 top-24 z-30 w-[6.5rem] space-y-3">
          <div className="bg-white/80 backdrop-blur rounded-[1.25rem] border-4 border-white ring-2 ring-orange-200 shadow text-center py-2">
            <div className={`${luckiest.className} text-3xl text-purple-800`}>{rightTop}</div>
          </div>
          <div className="bg-white rounded-[1.25rem] border-4 border-orange-200 shadow text-center py-5">
            <div className={`${luckiest.className} text-5xl leading-none text-orange-400`}>{rightMid}</div>
          </div>
          <div className="bg-white rounded-full border-2 border-purple-200 shadow text-center py-2">
            <div className="text-xs font-black text-purple-800">{score} POINTS</div>
          </div>
          <div className="bg-white rounded-[1.25rem] border-4 border-purple-800 shadow text-center py-6">
            <div className={`${luckiest.className} text-5xl text-purple-800`}>{levelPadded}</div>
            <div className="text-xs font-bold text-purple-800">LEVEL</div>
          </div>
        </aside>

        {/* MOBILE BOTTOM BAR (stats) */}
        <div className="md:hidden fixed bottom-20 left-0 right-0 z-30 px-4">
          <div className="mx-auto max-w-md grid grid-cols-3 gap-3">
            <div className="bg-white/90 rounded-xl border-2 border-white text-center py-2 shadow">
              <div className={`${luckiest.className} text-xl text-purple-800`}>{rightTop}</div>
            </div>
            <div className="bg-white rounded-xl border-2 border-orange-200 text-center py-2 shadow">
              <div className={`${luckiest.className} text-2xl text-orange-400`}>{rightMid}</div>
            </div>
            <div className="bg-white rounded-xl border-2 border-purple-800 text-center py-2 shadow">
              <div className="text-xs font-black text-purple-800">{score} POINTS</div>
            </div>
          </div>
        </div>

        {/* COPYRIGHT & SOCIAL (responsive) */}
        <div className="fixed bottom-[env(safe-area-inset-bottom)] left-4 sm:left-6 z-30">
          <p className="text-[10px] sm:text-xs text-purple-800 font-bold">©2025 YOUR AGENCY All Rights Reserved</p>
        </div>
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-30">
          <div className="bg-white rounded-full px-4 sm:px-6 py-1.5 sm:py-2 flex items-center space-x-3 sm:space-x-4 shadow-lg">
            <span className="text-xs sm:text-sm font-bold text-purple-800">YOUR AGENCY</span>
            <div className="w-px h-4 bg-gray-300" />
            <img src="/images/Instagram.png" alt="Instagram" className="w-4 h-4 sm:w-5 sm:h-5 rounded" />
            <div className="w-px h-4 bg-gray-300" />
            <img src="/images/linkedin.webp" alt="LinkedIn" className="w-4 h-4 sm:w-5 sm:h-5 rounded" />
          </div>
        </div>
      </div>
    )
  }

  /* -------------------- GAME OVER (Results) -------------------- */
  const GameOverScreen = () => {
    const levelPadded = String(level).padStart(2, "0")
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-300 via-orange-400 to-amber-400 relative overflow-hidden">
        <FloatingElements />
        <SoundToggles />

        <div className="flex justify-between items-start p-4 sm:p-6 relative z-10">
          <div className="text-left">
            <h1 className={`${luckiest.className} text-2xl sm:text-3xl text-purple-800 leading-tight drop-shadow-[0_3px_0_rgba(255,255,255,0.85)]`}>
              STRESS RELEASE PET EDITION
            </h1>
            <p className="text-[10px] sm:text-xs text-purple-700 font-bold mt-1">A GAME DESIGNED BY Anuj Rawat</p>
            <p className="text-[10px] sm:text-xs text-purple-700 font-bold">Delhi Digital Company</p>
          </div>
        </div>

        <div className="flex-1 px-4 sm:px-6 pb-24 sm:pb-20 pt-4 sm:pt-8 relative z-10">
          <div className="grid grid-cols-12 gap-6 items-start">
            {/* LEFT: Share + Actions */}
            <div className="col-span-12 md:col-span-5 space-y-6 order-1">
              <h3
                className={`${luckiest.className} text-purple-800 text-4xl sm:text-5xl md:text-6xl leading-none`}
                style={{
                  WebkitTextStroke: "6px #ffffff",
                  color: "rgb(91 33 182)",
                  paintOrder: "stroke fill",
                }}
              >
                SHARE WITH FRIENDS!
              </h3>

              {/* Social buttons row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <a
                  href="#"
                  className={`block rounded-[2.5rem] ${BTN_PRIMARY} text-lg sm:text-xl px-6 py-4 sm:px-8 sm:py-6 text-center`}
                >
                  Instagram
                </a>
                <a
                  href="#"
                  className={`block rounded-[2.5rem] ${BTN_PRIMARY} text-lg sm:text-xl px-6 py-4 sm:px-8 sm:py-6 text-center`}
                >
                  LinkedIn
                </a>
              </div>

              {/* Action rows (icons instead of images) */}
              <div className="space-y-6 pt-2">
                {/* Play again */}
                <button
                  onClick={handlePlayAgain}
                  className="group flex items-center gap-4 sm:gap-6"
                >
                  <span className={`grid place-items-center rounded-full w-16 h-16 sm:w-20 sm:h-20 ${BTN_PRIMARY}`}>
                    <span className="text-2xl sm:text-3xl">🔁</span>
                  </span>
                  <span
                    className={`${luckiest.className} text-2xl sm:text-3xl text-purple-800`}
                    style={{ WebkitTextStroke: "4px #ffffff", paintOrder: "stroke fill" }}
                  >
                    Play again
                  </span>
                </button>

                {/* Back to Toy Shelf */}
                <button
                  onClick={handleBackToMenu}
                  className="group flex items-center gap-4 sm:gap-6"
                >
                  <span className={`grid place-items-center rounded-full w-16 h-16 sm:w-20 sm:h-20 ${BTN_PRIMARY}`}>
                    <span className="text-2xl sm:text-3xl">🧸</span>
                  </span>
                  <span
                    className={`${luckiest.className} text-2xl sm:text-3xl text-purple-800`}
                    style={{ WebkitTextStroke: "4px #ffffff", paintOrder: "stroke fill" }}
                  >
                    Back to Toy Shelf
                  </span>
                </button>
              </div>
            </div>

            {/* CENTER: Score card */}
            <div className="col-span-12 md:col-span-4 order-3 md:order-2 flex justify-center">
              <div className="celebration-card rounded-3xl p-6 sm:p-8 w-full max-w-md relative text-center bg-white/20 backdrop-blur">
                <img
                  src={getCharacterImage(selectedCharacter) || "/images/placeholder.svg"}
                  alt={getCharacterName(selectedCharacter)}
                  className="w-24 h-24 sm:w-32 sm:h-32 object-contain mx-auto mb-4 sm:mb-6"
                />
                <div className="score-gradient rounded-2xl p-4 sm:p-6 text-center relative bg-purple-700/60">
                  <div className={`${luckiest.className} text-4xl sm:text-6xl text-white mb-2`}>{score}</div>
                  <div className="text-sm sm:text-lg font-bold text-white/90">
                    OUT OF {highScore > 0 ? Math.max(highScore, 7000) : 7000}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Level */}
            <div className="col-span-12 md:col-span-3 order-2 md:order-3 space-y-4">
              <div className="bg-white rounded-2xl px-4 py-4 border-2 border-purple-800 shadow-lg text-center">
                <div className={`${luckiest.className} text-2xl sm:text-3xl text-purple-800`}>{levelPadded}</div>
                <div className="text-xs font-bold text-purple-800">LEVEL</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="fixed bottom-[env(safe-area-inset-bottom)] left-4 sm:left-6 z-30">
          <p className="text-[10px] sm:text-xs text-purple-800 font-bold">©2025 Delhi Digital Company All Rights Reserved</p>
        </div>
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-30">
          <div className="bg-white rounded-full px-4 sm:px-6 py-1.5 sm:py-2 flex items-center space-x-3 sm:space-x-4 shadow-lg">
            <span className="text-xs sm:text-sm font-bold text-purple-800">Delhi Digital Company</span>
            <div className="w-px h-4 bg-gray-300" />
            <img src="/images/Instagram.png" alt="Instagram" className="w-4 h-4 sm:w-5 sm:h-5 rounded" />
            <div className="w-px h-4 bg-gray-300" />
            <img src="/images/linkedin.webp" alt="LinkedIn" className="w-4 h-4 sm:w-5 sm:h-5 rounded" />
          </div>
        </div>
      </div>
    )
  }

  /* -------------------- ROOT -------------------- */
  return (
    <div className={luckiest.className}>
      {/* Audio files in /public/audio */}
      <audio ref={bgmRef} src="/audio/bgm.mp3" loop preload="auto" className="hidden" />
      <audio ref={clickRef} src="/audio/click.mp3" preload="auto" className="hidden" />
      <audio ref={tapRef} src="/audio/tap.mp3" preload="auto" className="hidden" />

      {gameState === "menu" && <MenuScreen />}
      {gameState === "character-select" && <CharacterSelect />}

      {(gameState === "countdown" || gameState === "playing") && (
        <>
          <GameScreen isCountdown={gameState === "countdown"} />

          {/* Countdown Overlay */}
          {gameState === "countdown" && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center">
              {/* blur layer */}
              <div className="absolute inset-0 bg-black/10 backdrop-blur-[6px]" />

              {/* animated text */}
              <div
                key={String(countdownValue)}
                className={`relative z-10 text-white font-extrabold drop-shadow-[0_10px_25px_rgba(0,0,0,0.35)]
                 ${typeof countdownValue === "string" && countdownValue.includes("Tap repeatedly")
                   ? "text-[24px] sm:text-[36px] md:text-[46px] lg:text-[54px]"
                   : "text-[44px] sm:text-[80px] md:text-[120px] lg:text-[160px]"}
                 tracking-tight animate-pt-pop text-center px-6`}
              >
                {countdownValue}
              </div>

              <style jsx>{`
                @keyframes pt-pop {
                  0% { transform: scale(0.6); opacity: 0; }
                  50% { transform: scale(1.05); opacity: 1; }
                  100% { transform: scale(1); opacity: 0.98; }
                }
                .animate-pt-pop { animation: pt-pop 700ms ease-out; }
              `}</style>
            </div>
          )}
        </>
      )}

      {gameState === "game-over" && <GameOverScreen />}
    </div>
  )
}
