import { useMemo, useState } from "react";
import { formatPrice, getProductImageSources } from "../../utils/storefront";

function PosProductCard({ product, onAdd }) {
  const imageSources = useMemo(() => getProductImageSources(product), [product]);
  const [imageIndex, setImageIndex] = useState(0);
  const currentImage = imageSources[imageIndex];
  const imageFailed = imageIndex >= imageSources.length;

  return (
    <article className="pos-product-card">
      <div className="pos-product-media">
        {currentImage && !imageFailed ? (
          <img src={currentImage} alt={product.name} onError={() => setImageIndex((current) => current + 1)} />
        ) : (
          <div className="pos-product-fallback">{product.name.slice(0, 1)}</div>
        )}
        <span className={`status-pill${product.isOutOfStock ? "" : " muted"}`}>
          {product.isOutOfStock ? "Out of stock" : `${product.stock} in stock`}
        </span>
      </div>
      <div className="pos-product-copy">
        <small>{product.brand}</small>
        <strong>{product.name}</strong>
        <span>{product.categoryName}</span>
        <div className="pos-product-meta">
          <span>{product.sku}</span>
          <strong>{formatPrice(product.price)}</strong>
        </div>
      </div>
      <button
        type="button"
        className="primary-button"
        disabled={product.isOutOfStock}
        onClick={() => onAdd(product)}
      >
        {product.isOutOfStock ? "Out of stock" : "Add to POS"}
      </button>
    </article>
  );
}

function PosProductGrid({ products, onAdd }) {
  return (
    <div className="pos-product-grid">
      {products.map((product) => (
        <PosProductCard key={product.id} product={product} onAdd={onAdd} />
      ))}
    </div>
  );
}

export default PosProductGrid;