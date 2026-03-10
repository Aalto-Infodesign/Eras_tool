import PropTypes from "prop-types"
import styles from "./Button.module.css"
import { motion } from "framer-motion"

/**
 * Componente bottone primario riutilizzabile per l'applicazione.
 */
const Button = ({
  children,
  onClick,
  type = "button",
  variant = "primary",
  size = "medium",
  disabled = false,
  className = "",
  ...rest
}) => {
  // Unisce le classi CSS: base, varianti, dimensione, e classi custom.
  const buttonClassName = [
    styles.btn,
    styles[variant], // es. styles.primary
    styles[size], // es. styles.medium
    className, // Qualsiasi classe passata dall'esterno
  ]
    .join(" ")
    .trim()

  return (
    <motion.button
      className={buttonClassName}
      onClick={onClick}
      type={type}
      disabled={disabled}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      {...rest} // Applica qualsiasi altra prop (es. aria-label)
    >
      {children}
    </motion.button>
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
  variant: PropTypes.oneOf(["primary", "secondary", "tertiary"]),
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
