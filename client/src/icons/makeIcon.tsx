import {
  createElement,
  forwardRef,
  type ForwardRefExoticComponent,
  type ReactElement,
  type RefAttributes,
  type SVGProps,
} from 'react';
import { ICONSAX } from './iconsaxData.generated';
import { LUCIDE_CLASS_ALIASES } from './lucideClassAliases';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  size?: number | string;
  color?: string;
  /** Espessura do traço; o padrão do Iconsax é 1,5. */
  strokeWidth?: number | string;
  absoluteStrokeWidth?: boolean;
}

export type IconComponent = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;

/**
 * Cria um componente de ícone Iconsax (estilo linear) com a mesma interface de props do
 * lucide-react (`size`, `color`, `className`, `style`), para trocar a biblioteca sem mexer nas telas.
 * O SVG vem de `iconsaxData.generated.ts` (conteúdo estático gerado no build, nunca de entrada do usuário).
 */
const kebab = (name: string) => LUCIDE_CLASS_ALIASES[name] ?? name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

export function makeIcon(name: string): IconComponent {
  const entry = ICONSAX[name];
  if (!entry) throw new Error(`Ícone Iconsax não mapeado: ${name}`);
  const baseClass = `lucide lucide-${kebab(name)}`;
  const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
    { size = 24, color, strokeWidth = 1.5, absoluteStrokeWidth: _absolute, className, ...rest },
    ref
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
    );
  });
  Icon.displayName = name;
  return Icon;
}

/** One drawing instruction of a hand-drawn icon: the SVG tag and its attributes, as lucide's factory takes them. */
export type IconNode = [tag: string, attrs: Record<string, string>][];

/**
 * Cria um ícone próprio a partir de formas SVG (o que o lucide chama de `createLucideIcon`), para os
 * símbolos que nem o Lucide nem o Iconsax têm (ferradura, snowboard...). Mesma interface de props dos
 * demais ícones, então vai a qualquer lugar onde um ícone vai.
 */
export function createLucideIcon(name: string, nodes: IconNode): IconComponent {
  const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
    { size = 24, color, strokeWidth = 1.5, absoluteStrokeWidth: _absolute, className, children, ...rest },
    ref
  ) {
    const baseClass = `lucide lucide-${kebab(name)}`;
    const shapes: ReactElement[] = nodes.map(([tag, attrs]) => createElement(tag, attrs));
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
      >
        {shapes}
        {children}
      </svg>
    );
  });
  Icon.displayName = name;
  return Icon;
}
