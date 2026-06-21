import { useMemo, useState } from "react";
import { getProductImageSources } from "../utils/storefront";

function ProductThumb({ product, className = "mini-visual" }) {
  const imageSources = useMemo(() => getProductImageSources(product), [product]);
  const [imageIndex, setImageIndex] = useState(0);
  const currentImage = imageSources[imageIndex];
  const imageFailed = imageIndex >= imageSources.length;

  return (
    <div className={`${className} ${product.accent}`}>
      {currentImage && !imageFailed ? (
        <img
          src={currentImage}
          alt={product.name}
          className="mini-product-image"
          onError={() => setImageIndex((current) => current + 1)}
        />
      ) : (
        product.imageLabel
      )}
    </div>
  );
}

export default ProductThumb;
