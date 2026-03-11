import { useEffect, useRef, useState, useCallback } from "react";

const cards = [
  { id: 1, image: "/Image (3).png", phoneImage: "/Image (3).png" },
  { id: 2, image: "/Content.png", phoneImage: "/Content.png" },
  { id: 3, image: "/Image (4).png", phoneImage: "/Image (4).png" },
  { id: 4, image: "/Image (5).png", phoneImage: "/Image (5).png" },
];

const REPEAT_COUNT = 10;
const GAP = 24;
const SPEED = 0.6;

export default function PremiumRewardsAnimation() {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [maskGradient, setMaskGradient] = useState("none");

  const trackRef = useRef(null);
  const phoneRef = useRef(null);
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const currentIndexRef = useRef(0);

  const calculateMask = useCallback(() => {
    const phone = phoneRef.current;
    const container = containerRef.current;
    const track = trackRef.current;
    if (!phone || !container || !track || !track.children[0]) return;

    const phoneRect = phone.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const phoneLeft = phoneRect.left - containerRect.left;
    const phoneRight = phoneRect.right - containerRect.left;
    const cardStep = track.children[0].offsetWidth + GAP;

    // const leftVisible = phoneLeft - cardStep * 1;
    // const leftFadeStart = leftVisible - 70;

    // const rightVisible = phoneRight + cardStep * 3;
    // const rightFadeEnd = rightVisible + 70;

    const leftVisible = phoneLeft - cardStep * 1;
const leftFadeStart = Math.max(0, leftVisible - cardStep * 2);

const rightVisible = phoneRight + cardStep * 3;
const rightFadeEnd = rightVisible + cardStep * 2;

    const mask = `linear-gradient(to right,
      transparent 0px,
      transparent ${Math.max(0, leftFadeStart)}px,
      black ${Math.max(0, leftVisible)}px,
      black ${rightVisible}px,
      transparent ${rightFadeEnd}px,
      transparent 100%
    )`;

    setMaskGradient(mask);
  }, []);

  useEffect(() => {
    const timers = [
      setTimeout(calculateMask, 50),
      setTimeout(calculateMask, 200),
      setTimeout(calculateMask, 500),
    ];
    window.addEventListener("resize", calculateMask);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", calculateMask);
    };
  }, [calculateMask]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !track.children[0]) return;

    const cardW = track.children[0].offsetWidth;
    const cardStep = cardW + GAP;
    const oneSetWidth = cards.length * cardStep;

    let x = 0;

    const animate = () => {
      x -= SPEED;

      const newIndex = Math.floor(Math.abs(x) / cardStep) % cards.length;
      if (newIndex !== currentIndexRef.current) {
        currentIndexRef.current = newIndex;
        setCurrentCardIndex(newIndex);
      }

      if (Math.abs(x) >= oneSetWidth) {
        x += oneSetWidth;
      }

      track.style.transform = `translate3d(${x}px, 0, 0)`;
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const repeatedCards = Array.from(
    { length: REPEAT_COUNT },
    () => cards,
  ).flat();

  return (
    <div className="relative w-full h-[65rem] py-32">
      {/* Background Image replacing radial-gradient */}
      <img src="/aqua-blurBg.png" alt="" className="absolute w-full h-full" />

      <div className="absolute inset-0 flex flex-col">
        {/* Header */}

        <div className="relative z-20 px-8 py-12 text-center">
          <img
            src="/Light → Figure - Line Gradient → ZzXR4Xa701pprKwAZYChrznQWE.png.png"
            className="inline-block w-48 h-2 mb-6"
            alt=""
          />

          <h1 className="text-3xl font-sans md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
            A Little More Than Just
            <br />
            Matching
          </h1>

          <p className="text-gray-600 text-sm md:text-base max-w-md mx-auto">
            Every Premium member is included in a daily reward
            <br />
            draw, at no extra effort.
          </p>
        </div>
        {/* Main Content */}

        <div className="flex-1 flex items-center justify-center relative">
          {/* Cards Track */}

          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 z-0">
            <div
              ref={containerRef}
              className="mx-auto overflow-hidden"
              style={{
                width: "min(98vw, 1200px)",
                maskImage: maskGradient,
                WebkitMaskImage: maskGradient,
              }}
            >
              <div ref={trackRef} className="flex gap-6 will-change-transform">
                {repeatedCards.map((card, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 w-20 h-32 sm:w-24 sm:h-32 md:w-24 md:h-32 flex items-center justify-center"
                  >
                    <img
                      src={card.image}
                      alt=""
                      className="w-full h-full object-contain"
                      draggable={false}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Phone Mockup */}

          <div ref={phoneRef} className="relative z-10">
            <div className="relative">
              <img
                className="md:w-80 md:h-[580px] sm:w-36 sm:h-[260px] w-52 h-[400px]"
                src="/Phone → Phone (1).png"
                alt="Phone mockup"
                onLoad={calculateMask}
              />

              <div
                className="absolute flex items-center justify-center"
                style={{ top: "15%", left: "10%", width: "80%", height: "70%" }}
              >
                <img
                  key={currentCardIndex}
                  src={cards[currentCardIndex].phoneImage}
                  alt="Card image"
                  className="max-w-full h-32 ml-6 object-contain animate-fadeIn mb-[235px]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}