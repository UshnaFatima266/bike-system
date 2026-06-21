import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useShop } from "../store/ShopContext";
import { formatPrice, getProductImageSources } from "../utils/storefront";

function ProductCard({ product }) {
  const { addToCart, currentUser } = useShop();
  const imageSources = useMemo(() => getProductImageSources(product), [product]);
  const [imageIndex, setImageIndex] = useState(0);
  const currentImage = imageSources[imageIndex];
  const imageFailed = imageIndex >= imageSources.length;

  return (
    <article className="product-card">
      <div className={`product-visual ${product.accent}`}>
        <span className="product-badge">{product.isOutOfStock ? "Out of stock" : product.badge}</span>
        {currentImage && !imageFailed ? (
          <img
            src={currentImage}
            alt={product.name}
            className="product-image"
            onError={() => setImageIndex((current) => current + 1)}
          />
        ) : (
          <>
            <div className="product-shape" />
            <p className="product-caption">{product.imageLabel}</p>
          </>
        )}
      </div>

      <div className="product-meta">
        <small>{product.brand}</small>
        <Link to={`/shop/${product.slug}`} className="product-title">{product.name}</Link>
        <p>{product.description}</p>
        <div className="price-row">
          <div>
            <strong>{formatPrice(product.price)}</strong>
            <span>{formatPrice(product.oldPrice)}</span>
          </div>
          {product.isDealActive ? <span className="status-pill muted">-{product.discountPercent}%</span> : null}
        </div>
        <div className="card-actions">
          <Link to={`/shop/${product.slug}`} className="secondary-button">View</Link>
          {currentUser?.role === "admin" ? (
            <Link to={`/admin?editProduct=${product.id}`} className="primary-button">Manage</Link>
          ) : currentUser?.role === "cashier" ? (
            <Link to="/pos" className="primary-button">Sell in POS</Link>
          ) : product.isOutOfStock ? (
            <button type="button" className="primary-button disabled-button" disabled>Out of stock</button>
          ) : (
            <button type="button" className="primary-button" onClick={() => addToCart(product.id)}>Add to cart</button>
          )}
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
