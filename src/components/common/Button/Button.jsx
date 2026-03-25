import PropTypes from "prop-types"
import styles from "./Button.module.css"
import { motion } from "framer-motion"
import { useState, useId } from "react"

/**
 * Componente bottone primario riutilizzabile per l'applicazione.
 */
const Button = ({
  children,
  type = "button",
  variant = "primary",
  size = "medium",
  disabled = false,
  className = "",
  tooltip,
  tooltipPosition = "bottom", // "top" | "bottom" | "left" | "right"
  ...rest
}) => {
  const [isTooltipVisible, setTooltipVisible] = useState(false)
  // useId garantisce un ID univoco anche con più istanze in pagina
  const tooltipId = useId()

  // Unisce le classi CSS: base, varianti, dimensione, e classi custom.
  const buttonClassName = [
    styles.btn,
    styles[variant], // es. styles.primary
    styles[size], // es. styles.medium
    className, // Qualsiasi classe passata dall'esterno
  ]
    .join(" ")
    .trim()

  if (!tooltip) {
    return (
      <motion.button className={buttonClassName} type={type} disabled={disabled} {...rest}>
        {children}
      </motion.button>
    )
  }

  return (
    <div
      className={styles.tooltipWrapper}
      onMouseEnter={() => setTooltipVisible(true)}
      onMouseLeave={() => setTooltipVisible(false)}
      // onFocus/onBlur gestiscono la navigazione da tastiera (Tab)
      onFocus={() => setTooltipVisible(true)}
      onBlur={() => setTooltipVisible(false)}
    >
      <motion.button
        className={buttonClassName}
        type={type}
        disabled={disabled}
        // Collega il bottone al tooltip: gli screen reader leggeranno
        // il testo del tooltip come descrizione aggiuntiva
        aria-describedby={isTooltipVisible ? tooltipId : undefined}
        {...rest}
      >
        {children}
      </motion.button>

      {/* role="tooltip" + aria-hidden impedisce la doppia lettura:
          il contenuto è già letto via aria-describedby */}
      <span
        id={tooltipId}
        role="tooltip"
        aria-hidden={!isTooltipVisible}
        className={[
          styles.tooltip,
          styles[`tooltip--${tooltipPosition}`],
          isTooltipVisible ? styles["tooltip--visible"] : "",
        ]
          .join(" ")
          .trim()}
      >
        {tooltip}
      </span>
    </div>
  )
}

// Definizione dei tipi di prop per validazione e autocompletamento
Button.propTypes = {
  /**
   * Il contenuto del bottone (testo, icona, etc.).
   */
  children: PropTypes.node.isRequired,
  /**
   * La funzione da eseguire al click.
   */
  onClick: PropTypes.func,
  /**
   * Il tipo HTML del bottone.
   */
  type: PropTypes.oneOf(["button", "submit", "reset"]),
  /**
   * Lo stile visivo del bottone.
   */
  variant: PropTypes.oneOf(["primary", "secondary", "tertiary", "transparent"]),
  /**
   * La dimensione del bottone.
   */
  size: PropTypes.oneOf(["xs", "small", "medium", "large"]),
  /**
   * Se il bottone è disabilitato.
   */
  disabled: PropTypes.bool,
  /**
   * Classi CSS aggiuntive da applicare.
   */
  className: PropTypes.string,
}

export default Button
