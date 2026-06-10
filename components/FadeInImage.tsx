import { ImgHTMLAttributes, useEffect, useRef, useState } from "react";

type FadeInImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  visible?: boolean;
};

export function FadeInImage({ className = "", onLoad, src, visible = true, ...props }: FadeInImageProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const image = imageRef.current;

    if (image?.complete && image.naturalWidth > 0) {
      setLoaded(true);
      return;
    }

    setLoaded(false);
  }, [src]);

  return (
    <img
      {...props}
      ref={imageRef}
      className={`${className} ${loaded && visible ? "opacity-100" : "opacity-0"}`}
      onLoad={(event) => {
        setLoaded(true);
        onLoad?.(event);
      }}
      onError={() => setLoaded(true)}
      src={src}
    />
  );
}
