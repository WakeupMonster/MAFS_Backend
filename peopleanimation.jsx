
import React, { useRef } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, useScroll, useTransform } from "framer-motion";
import peoples from "@/constants/peoples";
import person1 from "@/assets/peoplesimgs/person1.png";

export default function PeopleAnimation() {
  const sectionRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const totalItems = peoples.length;

  // Background circle scale - smooth
  const circleScale = useTransform(scrollYProgress, [0.1, 0.5], [0.95, 1.08], {
    clamp: true,
  });

  // Center text - appears smoothly
  const textOpacity = useTransform(scrollYProgress, [0.25, 0.45], [0, 1]);
  const textScale = useTransform(scrollYProgress, [0.25, 0.45], [0.7, 1]);
  const textY = useTransform(scrollYProgress, [0.25, 0.45], [30, 0]);

  return (
    <section className="w-full h-auto px-4 sm:px-6 md:px-10 lg:px-20 py-12 md:py-16">
      {/* Space above for scroll room - Reduced for better feel */}
      <div className="h-16 md:h-24 lg:h-32" />

      <main ref={sectionRef} className="mx-auto max-w-7xl h-auto">
        <div
          className="
            mx-auto relative flex items-center justify-center
            w-[320px] h-[320px]
            sm:w-[450px] sm:h-[450px]
            md:w-[580px] md:h-[580px]
            lg:w-[735px] lg:h-[735px]
          "
        >
          {/* Background */}
          <div className="absolute inset-0 bg-[url('/Background.svg')] bg-cover bg-center bg-no-repeat rounded-full" />

          <div className="relative flex items-center justify-center w-full h-full">
            {/* Scaling Circle */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ scale: circleScale }}
            />

            <div className="relative h-full w-full flex items-center justify-center">
              {/* Center Text */}
              <motion.div
                style={{
                  opacity: textOpacity,
                  scale: textScale,
                  y: textY,
                }}
                className="
                  w-[220px] sm:w-[300px] md:w-[360px] lg:w-[400px]
                  text-center z-10
                "
              >
                <div className="flex flex-col items-center text-center justify-center px-2 sm:px-4 md:px-6 lg:px-10">
                  <img
                    src="/image.png"
                    alt="Logo"
                    className="mx-auto w-20 h-12 sm:w-24 sm:h-14 md:w-32 md:h-[72px] lg:w-36 lg:h-[86px]"
                  />
                  <h2
                    className="
                      text-[22px] sm:text-[28px] md:text-[33px] lg:text-[38px]
                      leading-tight font-extrabold text-gray-900 tracking-tighter
                      flex flex-col items-center mb-2 sm:mb-3 md:mb-4
                    "
                  >
                    <span className="flex gap-1 sm:gap-2 items-center">
                      <img
                        src="/australiaIcon.png"
                        className="w-[22px] h-[22px] sm:w-[28px] sm:h-[28px] md:w-[32px] md:h-[32px] lg:w-[35px] lg:h-[35px]"
                      />
                      Built for
                    </span>
                    Australia
                  </h2>
                  <p
                    className="
                      text-gray-500
                      text-[11px] sm:text-[12px] md:text-[13px] lg:text-[14px]
                      max-w-[180px] sm:max-w-[220px] md:max-w-[250px] lg:max-w-[270px]
                      leading-relaxed
                    "
                  >
                    Designed exclusively for Australians, with a focused and
                    local dating experience.
                  </p>
                </div>
              </motion.div>

              {/* Cards */}
              {peoples.map((img, index) => {
                const isMainPerson = img === person1;
                const angle = (index / totalItems) * 2 * Math.PI;

                return (
                  <ScrollCard
                    key={index}
                    img={img}
                    index={index}
                    angle={angle}
                    totalItems={totalItems}
                    isMainPerson={isMainPerson}
                    scrollYProgress={scrollYProgress}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Space below - Reduced for better feel */}
      <div className="h-16 md:h-24 lg:h-32" />
    </section>
  );
}

function ScrollCard({
  img,
  index,
  angle,
  totalItems,
  isMainPerson,
  scrollYProgress,
}) {
  // Stagger logic - smoother and longer animation window
  const staggerWindow = 0.15;
  const perCardDelay = (index / totalItems) * staggerWindow;

  const cardStart = 0.05 + perCardDelay;
  const cardEnd = Math.min(cardStart + 0.25, 0.5);

  // Use CSS custom properties approach for responsive radius
  // We'll compute for the largest and use CSS clamp via multiple transforms
  const radiusSm = 130;
  const radiusMd = 200;
  const radiusLg = 260;
  const radiusXl = 300;

  // We need to pick radius based on window - since useTransform doesn't support CSS units,
  // we'll use a hook to get the current radius
  const [radius, setRadius] = React.useState(300);

  React.useEffect(() => {
    const updateRadius = () => {
      const w = window.innerWidth;
      if (w < 640) setRadius(radiusSm);
      else if (w < 768) setRadius(radiusMd);
      else if (w < 1024) setRadius(radiusLg);
      else setRadius(radiusXl);
    };
    updateRadius();
    window.addEventListener("resize", updateRadius);
    return () => window.removeEventListener("resize", updateRadius);
  }, []);

  const targetX = Math.cos(angle) * radius;
  const targetY = Math.sin(angle) * radius;

  const x = useTransform(
    scrollYProgress,
    [cardStart, cardEnd],
    [0, targetX]
  );

  const y = useTransform(
    scrollYProgress,
    [cardStart, cardEnd],
    [0, targetY]
  );

  // Smooth opacity - fade in gradually
  const opacity = useTransform(
    scrollYProgress,
    [cardStart, cardStart + 0.08, cardEnd],
    [0, 1, 1]
  );

  // Smooth scale with slight overshoot feel
  const scale = useTransform(
    scrollYProgress,
    [cardStart, cardEnd * 0.85, cardEnd],
    [0.3, 0.95, 1]
  );

  // Subtle rotation for organic feel
  const rotate = useTransform(
    scrollYProgress,
    [cardStart, cardEnd],
    [index % 2 === 0 ? -15 : 15, 0]
  );

  return (
    <motion.div
      className="
        absolute rounded-2xl shadow-xl bg-transparent border border-[#00000014]
        p-0.5 sm:p-1
        h-[72px] w-[80px]
        sm:h-[100px] sm:w-[112px]
        md:h-[120px] md:w-[135px]
        lg:h-36 lg:w-40
      "
      style={{
        x,
        y,
        opacity,
        scale,
        rotate,
        zIndex: isMainPerson ? 50 : index,
        willChange: "transform, opacity",
      }}
    >
      <div
        className="
          border-2 sm:border-[3px] border-white rounded-[10px] sm:rounded-[12px] md:rounded-[14px]
          object-cover h-full w-full overflow-hidden
        "
      >
        <img
          src={img}
          alt={`User ${index}`}
          className="h-full w-full rounded-[8px] sm:rounded-[10px] md:rounded-xl pointer-events-none object-cover"
          loading="lazy"
        />
      </div>
    </motion.div>
  );
}