"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "../components/ui/button"
import { Card } from "../components/ui/card"

type GameState = "menu" | "character-select" | "countdown" | "playing" | "game-over"
type Character = "dog" | "cat" | "beagle" | "husky"

interface ScorePopup {
  id: number
  x: number
  y: number
  points: number
}

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

  // countdown overlay text/value
  const [countdownValue, setCountdownValue] = useState<string | number | null>(null)

  // characters shown in UI
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
    if (soundOn) bgmRef.current?.play().catch(() => {})
    setGameState("countdown")
  }

  // Instruction → 3 → 2 → 1 → LET'S GO!!
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

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
      clearTimeout(t5)
    }
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
    setGameState("character-select")
  }

  const handleBackToMenu = () => {
    playClick()
    setIsLoading(true)
    setShowStartButton(false)
    setGameState("menu")
  }

  // precise +points at click; also play tap SFX
  const handleTap = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (gameState !== "playing") return
      const rect = event.currentTarget.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top

      playTap()

      const points = 10 + Math.floor(tapCount / 10) * 5
      setScore((p) => p + points)
      setTapCount((p) => p + 1)

      const popup: ScorePopup = { id: Date.now(), x, y, points }
      setScorePopups((p) => [...p, popup])
      setTimeout(() => setScorePopups((p) => p.filter((pp) => pp.id !== popup.id)), 800)
    },
    [gameState, tapCount, playTap],
  )

  const getCharacterImage = (c: Character) =>
    c === "dog" ? "/images/Dog.png" : c === "cat" ? "/images/Cat.png" : c === "beagle" ? "/images/Beagle.png" : "/images/Husky.png"

  const getCharacterName = (c: Character) =>
    c === "dog" ? "Poodle" : c === "cat" ? "Cat" : c === "beagle" ? "Beagle" : "Husky"

  /* ------------ BACKGROUND FLOATERS (smooth infinite) ------------ */
  const FloatingElements = () => (
    <div className="absolute inset-0 pointer-events-none">
      {/* Stars / Sparkles / Shapes — all get drift animations */}
      <div className="absolute top-20 left-1/4 text-white text-2xl animate-drift-1">⭐</div>
      <div className="absolute top-40 right-1/4 text-white text-xl animate-drift-2">✨</div>
      <div className="absolute bottom-32 left-1/3 text-white text-3xl animate-drift-3">⭐</div>

      <div className="absolute top-32 left-1/2 w-4 h-4 bg-white/30 rounded-full animate-drift-2" />
      <div className="absolute top-60 right-1/3 w-6 h-6 bg-red-400/40 rounded-full animate-drift-3" />
      <div className="absolute bottom-40 right-1/4 w-3 h-3 bg-white/50 rounded-full animate-drift-1" />
      <div className="absolute top-1/2 left-20 w-5 h-5 bg-orange-200/60 rounded-full animate-drift-4" />

      <div className="absolute top-1/3 right-20 text-white text-2xl animate-drift-4">⚡</div>
      <div className="absolute bottom-1/3 left-1/5 text-white text-xl animate-drift-2">⚡</div>

      <style jsx>{`
        /* Smooth, alternating drifts with slightly different paths/durations */
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

  /* ------------ TOP-RIGHT TOGGLES (music + sfx) ------------ */
  const SoundToggles = () => (
    <div className="fixed top-6 right-6 z-30 flex gap-3">
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
        className="w-12 h-12 bg-gray-300 rounded-full grid place-items-center shadow focus:outline-none"
      >
        <div className="w-8 h-8 bg-white rounded-full grid place-items-center text-gray-600">
          <span className="text-lg">{soundOn ? "🔊" : "🔇"}</span>
        </div>
      </button>

      {/* SFX */}
      <button
        onClick={() => {
          playClick()
          setSfxOn((s) => !s)
        }}
        aria-label={sfxOn ? "Disable SFX" : "Enable SFX"}
        className="w-12 h-12 bg-gray-300 rounded-full grid place-items-center shadow focus:outline-none"
      >
        <div className="w-8 h-8 bg-white rounded-full grid place-items-center text-gray-600">
          <span className="text-lg">{sfxOn ? "🎮" : "🚫"}</span>
        </div>
      </button>
    </div>
  )

  /* -------------------- MENU -------------------- */
  const MenuScreen = () => {
    const marqueeItems = [...characters, ...characters] as Character[]
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-orange-300 via-orange-400 to-amber-400 p-4 relative overflow-hidden">
        <FloatingElements />
        <SoundToggles />

        <div className="text-center space-y-8 bounce-in relative z-10">
          <div className="space-y-4">
            <h1 className="text-7xl font-black text-purple-800 chunky-title tracking-wider">PET TAP</h1>
            <h2 className="text-4xl font-bold text-purple-700 chunky-title">STRESS RELEASE</h2>
          </div>

          {/* Transparent bubble with transform-based marquee */}
          <div className="relative mx-auto w-[34rem] max-w-[90vw] h-48 bg-gradient-to-br from-orange-200/60 to-amber-200/60 rounded-[3rem] border-4 border-orange-300/50 shadow-xl pulse-glow overflow-hidden">
            <div className="pointer-events-none absolute inset-0 rounded-[3rem] [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]" />
            <div
              ref={trackRef}
              className="h-full w-max flex items-center gap-10 animate-marquee will-change-transform px-8"
              style={{ animationDuration: `${marqueeDur}s` }}
              onMouseEnter={(e) => ((e.currentTarget.style.animationPlayState = "paused"))}
              onMouseLeave={(e) => ((e.currentTarget.style.animationPlayState = "running"))}
            >
              {marqueeItems.map((c, i) => (
                <button
                  key={`${c}-${i}`}
                  className="shrink-0 rounded-2xl bg-white/30 backdrop-blur px-4 py-3 border-2 border-white/40 hover:bg-white/50 transition"
                  onClick={() => {
                    setSelectedCharacter(c)
                    playClick()
                  }}
                >
                  <img src={getCharacterImage(c)} alt={getCharacterName(c)} className="w-24 h-24 object-contain" />
                  <div className="text-sm font-bold text-purple-800 mt-1">{getCharacterName(c)}</div>
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
            <div className="w-80 mx-auto space-y-2">
              <div className="w-full h-3 bg-purple-800/30 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-600 to-purple-800 rounded-full loading-bar" />
              </div>
              <p className="text-purple-800 font-bold text-sm tracking-widest flex items-center justify-center gap-2">
                <img src="/images/loader.svg" alt="Loading" className="w-4 h-4 custom-loader" />
                LOADING...
              </p>
            </div>
          )}

          {showStartButton && (
            <div className="space-y-4 pt-2">
              <Button
                onClick={() => {
                  playClick()
                  setGameState("character-select")
                }}
                size="lg"
                className="text-xl px-12 py-4 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-full shadow-lg"
              >
                START GAME
              </Button>
              {highScore > 0 && (
                <p className="text-lg text-purple-800 font-bold bg-white/20 px-4 py-2 rounded-full">
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
  const CharacterSelect = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-orange-300 via-orange-400 to-amber-400 p-4 relative overflow-hidden">
      <FloatingElements />
      <SoundToggles />
      <div className="text-center space-y-8 bounce-in relative z-10">
        <h2 className="text-5xl font-black text-purple-800 chunky-title">Choose Your Pet</h2>
        <div className="grid grid-cols-2 gap-6 justify-center max-w-md">
          <Card
            className={`p-6 transition-all hover:scale-105 bg-white/20 border-2 ${
              selectedCharacter === "dog" ? "ring-4 ring-purple-600 bg-white/40 border-purple-600" : "border-orange-300"
            }`}
            onClick={() => {
              setSelectedCharacter("dog")
              playClick()
            }}
          >
            <div className="text-center space-y-3">
              <img src="/images/dog.png" alt="Poodle" className="w-20 h-20 object-contain mx-auto" />
              <h3 className="text-xl font-bold text-purple-800">Poodle</h3>
            </div>
          </Card>

          <Card
            className={`p-6 transition-all hover:scale-105 bg-white/20 border-2 ${
              selectedCharacter === "cat" ? "ring-4 ring-purple-600 bg-white/40 border-purple-600" : "border-orange-300"
            }`}
            onClick={() => {
              setSelectedCharacter("cat")
              playClick()
            }}
          >
            <div className="text-center space-y-3">
              <img src="/images/cat.png" alt="Cat" className="w-20 h-20 object-contain mx-auto" />
              <h3 className="text-xl font-bold text-purple-800">Cat</h3>
            </div>
          </Card>

          <Card
            className={`p-6 transition-all hover:scale-105 bg-white/20 border-2 ${
              selectedCharacter === "beagle"
                ? "ring-4 ring-purple-600 bg-white/40 border-purple-600"
                : "border-orange-300"
            }`}
            onClick={() => {
              setSelectedCharacter("beagle")
              playClick()
            }}
          >
            <div className="text-center space-y-3">
              <img src="/images/beagle.png" alt="Beagle" className="w-20 h-20 object-contain mx-auto" />
              <h3 className="text-xl font-bold text-purple-800">Beagle</h3>
            </div>
          </Card>

          <Card
            className={`p-6 transition-all hover:scale-105 bg-white/20 border-2 ${
              selectedCharacter === "husky"
                ? "ring-4 ring-purple-600 bg-white/40 border-purple-600"
                : "border-orange-300"
            }`}
            onClick={() => {
              setSelectedCharacter("husky")
              playClick()
            }}
          >
            <div className="text-center space-y-3">
              <img src="/images/husky.png" alt="Husky" className="w-20 h-20 object-contain mx-auto" />
              <h3 className="text-xl font-bold text-purple-800">Husky</h3>
            </div>
          </Card>
        </div>

        <Button
          onClick={startGame}
          size="lg"
          className="text-xl px-12 py-4 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-full shadow-lg"
        >
          START PLAYING
          <img src="/images/right_arrow.svg" alt="Start" className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  )

  /* -------------------- GAME (used for playing & countdown background) -------------------- */
  const GameScreen = ({ isCountdown }: { isCountdown: boolean }) => {
    const rightTop = String(Math.min(99, Math.floor(tapCount / 10) + 1)).padStart(2, "0")
    const rightMid = String(Math.min(99, Math.floor(tapCount / 25) + 1)).padStart(2, "0")

    return (
      <div
        className={`min-h-screen bg-gradient-to-br from-orange-300 via-orange-400 to-amber-400 relative overflow-hidden transition filter duration-300 ${
          isCountdown ? "blur-[4px] brightness-[0.95]" : ""
        }`}
      >
        <FloatingElements />
        <SoundToggles />

        <div className="fixed top-6 left-6 z-30">
          <h1 className="text-4xl font-black text-purple-800 leading-none">STRESS RELEASE</h1>
          <p className="text-xs text-purple-700 font-bold mt-1 leading-none">A GAME DESIGNED BY</p>
          <p className="text-xs text-purple-700 font-bold">YOUR AGENCY</p>
        </div>

        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-30">
          <div className="bg-white rounded-full px-10 py-3 border-[6px] border-purple-700 shadow-xl">
            <div className="text-4xl font-black text-purple-800 tracking-widest">
              {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}
            </div>
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div
            className="relative w-[22rem] h-[26rem] bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center overflow-hidden cursor-pointer select-none"
            onClick={handleTap}
          >
            <img
              src={getCharacterImage(selectedCharacter) || "/placeholder.svg"}
              alt={getCharacterName(selectedCharacter)}
              className="w-52 h-52 object-contain transition-transform duration-150 active:scale-110"
            />
            <div className="absolute bottom-8 w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow" />

            {/* Score Popups at click location */}
            {scorePopups.map((popup) => (
              <div
                key={popup.id}
                className="pointer-events-none absolute text-3xl font-black text-red-500"
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

            <style jsx>{`
              @keyframes pt-float {
                0% {
                  opacity: 1;
                  transform: translate(-50%, -50%) scale(1);
                }
                100% {
                  opacity: 0;
                  transform: translate(-50%, -90%) scale(1.1);
                }
              }
            `}</style>
          </div>
        </div>

        <aside className="fixed right-6 top-28 z-30 w-[6.5rem] space-y-3">
          <div className="bg-white/80 backdrop-blur rounded-[1.5rem] border-4 border-white ring-2 ring-orange-200 shadow text-center py-2">
            <div className="text-3xl font-black text-purple-800">{rightTop}</div>
          </div>
          <div className="bg-white rounded-[1.5rem] border-4 border-orange-200 shadow text-center py-5">
            <div className="text-5xl leading-none font-black text-orange-400">{rightMid}</div>
          </div>
          <div className="bg-white rounded-full border-2 border-purple-200 shadow text-center py-2">
            <div className="text-xs font-black text-purple-800">{score} POINTS</div>
          </div>
          <div className="bg-white rounded-[1.5rem] border-4 border-purple-800 shadow text-center py-6">
            <div className="text-5xl font-black text-purple-800">01</div>
            <div className="text-xs font-bold text-purple-800">LEVEL</div>
          </div>
        </aside>

        <div className="fixed bottom-6 left-6 z-30">
          <p className="text-xs text-purple-800 font-bold">©2025 YOUR AGENCY All Rights Reserved</p>
        </div>
        <div className="fixed bottom-6 right-6 z-30">
          <div className="bg-white rounded-full px-6 py-2 flex items-center space-x-4 shadow-lg">
            <span className="text-sm font-bold text-purple-800">YOUR AGENCY</span>
            <div className="w-px h-4 bg-gray-300" />
            <img src="/images/Instagram.png" alt="Instagram" className="w-5 h-5 rounded" />
            <div className="w-px h-4 bg-gray-300" />
            <img src="/images/linkedin.webp" alt="LinkedIn" className="w-5 h-5 rounded" />
          </div>
        </div>
      </div>
    )
  }

  /* -------------------- GAME OVER -------------------- */
  const GameOverScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-orange-300 via-orange-400 to-amber-400 relative overflow-hidden">
      <FloatingElements />
      <SoundToggles />

      <div className="flex justify-between items-start p-6 relative z-10">
        <div className="text-left">
          <h1 className="text-3xl font-black text-purple-800 leading-tight">STRESS RELEASE PET EDITION</h1>
          <p className="text-xs text-purple-700 font-bold mt-1">A GAME DESIGNED BY </p>
          <p className="text-xs text-purple-700 font-bold">Delhi Digital Company</p>
        </div>
      </div>

      <div className="flex-1 px-6 pb-20 pt-8 relative z-10">
        <div className="grid grid-cols-12 gap-6 h-full items-center">
          <div className="col-span-3 space-y-3 pt-4">
            <Button
              onClick={handlePlayAgain}
              className="relative w-48 h-16 bg-white hover:bg-gray-50 border-4 border-purple-800 rounded-full shadow-lg transition-all hover:scale-105 hover:shadow-xl flex items-center justify-center"
            >
              <img src="/images/circle-button-hover.svg" alt="Play again" className="w-8 h-8 mr-3" />
              <span className="text-purple-800 font-bold">Play again</span>
            </Button>

            <Button
              onClick={handleBackToMenu}
              className="relative w-48 h-16 bg-white hover:bg-gray-50 border-4 border-purple-800 rounded-full shadow-lg transition-all hover:scale-105 hover:shadow-xl flex items-center justify-center"
            >
              <img src="/images/back.svg" alt="Back" className="w-8 h-8 mr-3" />
              <span className="text-purple-800 font-bold">Back to Toy Shelf</span>
            </Button>
          </div>

          <div className="col-span-6 flex justify-center">
            <div className="celebration-card rounded-3xl p-8 w-96 relative text-center">
              <img
                src={getCharacterImage(selectedCharacter) || "/placeholder.svg"}
                alt={getCharacterName(selectedCharacter)}
                className="w-32 h-32 object-contain mx-auto mb-6"
              />
              <div className="score-gradient rounded-2xl p-6 text-center relative">
                <div className="text-6xl font-black text-white mb-2">{score}</div>
                <div className="text-lg font-bold text-white/90">
                  OUT OF {highScore > 0 ? Math.max(highScore, 7000) : 7000}
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-3 space-y-4">
            <div className="bg-white rounded-2xl px-4 py-4 border-2 border-purple-800 shadow-lg text-center">
              <div className="text-3xl font-black text-purple-800">01</div>
              <div className="text-xs font-bold text-purple-800">LEVEL</div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-6 left-6 z-30">
        <p className="text-xs text-purple-800 font-bold">©2025 DDC All Rights Reserved</p>
      </div>
      <div className="fixed bottom-6 right-6 z-30">
        <div className="bg-white rounded-full px-6 py-2 flex items-center space-x-4 shadow-lg">
          <span className="text-sm font-bold text-purple-800">DELHI DIGITAL COMPANY</span>
          <div className="w-px h-4 bg-gray-300" />
          <img src="/images/Instagram.png" alt="Instagram" className="w-5 h-5 rounded" />
          <div className="w-px h-4 bg-gray-300" />
          <img src="/images/linkedin.webp" alt="LinkedIn" className="w-5 h-5 rounded" />
        </div>
      </div>
    </div>
  )

  /* -------------------- ROOT -------------------- */
  return (
    <div className="font-sans">
      {/* Put audio files in /public/audio */}
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
                 ${typeof countdownValue === "string" && countdownValue.includes("Tap repeatedly") ? "text-[32px] md:text-[46px] lg:text-[54px]" : "text-[64px] md:text-[120px] lg:text-[160px]"}
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
