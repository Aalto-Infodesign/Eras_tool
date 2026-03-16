import { motion } from "motion/react"
export function TitleAnimation() {
  const titleVariants = {
    hidden: { opacity: 0, y: 0, filter: "blur(4px)" },
    visible: (index) => ({
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.8, ease: "easeInOut", delay: index * 0.8 },
    }),
  }
  return (
    <motion.div
      variants={titleVariants}
      initial="hidden"
      animate="visible"
      exit={"hidden"}
      className="app-title"
    >
      {/* <SilhouettePathSvg  */}
      <motion.p variants={titleVariants} custom={0}>
        FinnGen's
      </motion.p>
      <motion.h1 variants={titleVariants} custom={1}>
        The Eras Tool
      </motion.h1>
      <motion.p variants={titleVariants} custom={2}>
        Trajectoies of evolution
      </motion.p>
    </motion.div>
  )
}
