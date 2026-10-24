import { forwardRef, type ForwardRefExoticComponent, type RefAttributes, type SVGProps } from 'react'
import { ICONSAX } from './iconsaxData.generated'

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  size?: number | string
  color?: string
  /** Mantido por compatibilidade com o código antigo; o traço do Iconsax é fixo (1,5). */
  strokeWidth?: number | string
  absoluteStrokeWidth?: boolean
}

export type IconComponent = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>

/**
 * Cria um componente de ícone Iconsax (estilo linear) com a mesma interface de props do
 * lucide-react (`size`, `color`, `className`, `style`), para trocar a biblioteca sem mexer nas telas.
 * O SVG vem de `iconsaxData.generated.ts` (conteúdo estático gerado no build, nunca de entrada do usuário).
 */
const kebab = (name: string) =>
  name.replace(/([a-z])([A-Z0-9])/g, '$1-$2').replace(/([0-9])([A-Z])/g, '$1-$2').toLowerCase()

export function makeIcon(name: string): IconComponent {
  const entry = ICONSAX[name]
  if (!entry) throw new Error(`Ícone Iconsax não mapeado: ${name}`)
  const baseClass = `lucide lucide-${kebab(name)}`
  const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
    { size = 24, color, strokeWidth: _strokeWidth, absoluteStrokeWidth: _absolute, className, ...rest },
    ref,
  ) {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden={rest['aria-label'] ? undefined : true}
        color={color}
        className={className ? `${baseClass} ${className}` : baseClass}
        {...rest}
        dangerouslySetInnerHTML={{ __html: entry.body }}
      />
    )
  })
  Icon.displayName = name
  return Icon
}
