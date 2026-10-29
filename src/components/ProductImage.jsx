import { useEffect, useRef, useState } from 'react'
import placeholder from '../assets/produto-sem-imagem.svg'

// Imagem de produto que cai num placeholder genérico quando não há URL ou quando
// ela não carrega (arquivo apagado, link quebrado).
export default function ProductImage({ src, alt = '', ...props }) {
  const [failed, setFailed] = useState(false)
  const ref = useRef(null)

  useEffect(() => setFailed(false), [src])
  // No HTML pré-renderizado a imagem pode falhar antes do React hidratar, e aí o onError não dispara.
  useEffect(() => {
    const image = ref.current
    if (src && image?.complete && image.naturalWidth === 0) setFailed(true)
  }, [src])

  const showPlaceholder = !src || failed
  return (
    <img
      ref={ref}
      src={showPlaceholder ? placeholder : src}
      alt={alt}
      onError={showPlaceholder ? undefined : () => setFailed(true)}
      {...props}
    />
  )
}
