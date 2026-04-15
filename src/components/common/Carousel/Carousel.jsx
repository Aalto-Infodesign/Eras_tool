import { AnimatePresence, motion, usePresenceData, wrap } from "motion/react"
import { forwardRef, useState } from "react"
import { ArrowLeft, ArrowRight } from "lucide-react"

import "./Carousel.css"
import Button from "../Button/Button"
export function CarouselWrapper({ children, hasPagination = true }) {
  const cleanChildren = children.filter((c) => c !== false)
  const slides = Array.isArray(cleanChildren) ? cleanChildren : [cleanChildren]
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [direction, setDirection] = useState(1)

  function setSlide(newDirection) {
    const nextIndex = wrap(0, slides.length, selectedIndex + newDirection)
    setSelectedIndex(nextIndex)
    setDirection(newDirection)
  }

  function handleDragEnd(event, info) {
    const swipeThreshold = 50
    const swipeVelocityThreshold = 500

    const shouldSwipe =
      Math.abs(info.offset.x) > swipeThreshold || Math.abs(info.velocity.x) > swipeVelocityThreshold

    if (shouldSwipe) {
      if (info.offset.x > 0) {
        setSlide(-1)
      } else {
        setSlide(1)
      }
    }
  }

  return (
    <div className="carousel-wrapper">
      <div className="carousel-slides">
        <AnimatePresence custom={direction} initial={false} mode="popLayout">
          <motion.h3
            key={`title-${selectedIndex}`}
            initial={{ opacity: 0, y: -direction * 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: direction * 10 }}
          >
            {cleanChildren[selectedIndex].props["data-title"]}
          </motion.h3>
          <CarouselItem key={selectedIndex} onDragEnd={handleDragEnd}>
            {slides[selectedIndex]}
          </CarouselItem>
        </AnimatePresence>
      </div>

      <div className="carousel-controls">
        <ArrowNavigation direction="left" setSlide={setSlide} keystroke="" />
        {hasPagination && (
          <Pagination
            numSlides={slides.length}
            selectedIndex={selectedIndex}
            setSelectedIndex={setSelectedIndex}
            setDirection={setDirection}
          />
        )}
        <ArrowNavigation direction="right" setSlide={setSlide} keystroke=" " />
      </div>
    </div>
  )
}

export const CarouselItem = forwardRef(function CarouselItem({ children, onDragEnd }, ref) {
  const direction = usePresenceData()
  return (
    <motion.div
      layout
      ref={ref}
      initial={{ opacity: 0, x: direction * 100 }}
      animate={{
        opacity: 1,
        x: 0,
      }}
      exit={{ opacity: 0, x: direction * -100 }}
      whileDrag={{ scale: 0.9, cursor: "grabbing" }}
      whileHover={{ cursor: "grab" }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={onDragEnd}
    >
      {children}
    </motion.div>
  )
})

function Pagination({ numSlides, selectedIndex, setSelectedIndex, setDirection }) {
  return (
    <div className="carousel-pagination">
      {Array.from({ length: numSlides }, (_, i) => (
        <motion.div
          key={i}
          className={`dot`}
          animate={{
            scale: i === selectedIndex ? 1.5 : 1,
            opacity: i === selectedIndex ? 1 : 0.5,
          }}
          whileHover={{ scale: 1.1, opacity: 0.7, cursor: "pointer" }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setDirection(i > selectedIndex ? 1 : -1)
            setSelectedIndex(i)
          }}
          aria-label={`Go to slide ${i + 1}`}
        />
      ))}
    </div>
  )
}

function ArrowNavigation({ direction, setSlide, keystroke = "" }) {
  const isPrevious = direction === "left"
  return (
    <Button
      size="small"
      variant="transparent"
      className={`carousel-arrow ${direction}`}
      aria-label={isPrevious ? "Previous" : "Next"}
      whileTap={{ scale: 0.95 }}
      onClick={() => {
        setSlide(isPrevious ? -1 : 1)
      }}
      keystroke={keystroke}
    >
      {isPrevious ? <ArrowLeft size={20} /> : <ArrowRight size={20} />}
    </Button>
  )
}
