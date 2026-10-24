import { forwardRef, type ForwardRefExoticComponent, type RefAttributes, type SVGProps } from 'react'
import { ICONSAX } from './iconsaxData.generated'

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  size?: number | string
  color?: string
  /** Espessura do traço; o padrão do Iconsax é 1,5. */
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
  name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()

export function makeIcon(name: string): IconComponent {
  const entry = ICONSAX[name]
  if (!entry) throw new Error(`Ícone Iconsax não mapeado: ${name}`)
  const baseClass = `lucide lucide-${kebab(name)}`
  const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
    { size = 24, color, strokeWidth = 1.5, absoluteStrokeWidth: _absolute, className, ...rest },
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
        stroke={color ?? 'currentColor'}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className ? `${baseClass} ${className}` : baseClass}
        {...rest}
        dangerouslySetInnerHTML={{ __html: entry.body }}
      />
    )
  })
  Icon.displayName = name
  return Icon
}
