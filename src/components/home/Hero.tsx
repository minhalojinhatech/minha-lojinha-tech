import Image from "next/image";

export function Hero() {
  return (
    <section className="relative h-[300px] overflow-hidden bg-ink sm:h-[390px] lg:h-[500px]" aria-label="Imagem principal da loja">
      <Image
        src="https://commons.wikimedia.org/wiki/Special:FilePath/Motorola%20phones%20store.jpg?width=1800"
        alt="Produtos de tecnologia expostos em loja"
        fill
        className="object-cover"
        priority
      />
    </section>
  );
}
