import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { useShop } from "../store/ShopContext";
import { formatPrice, getProductImageSources } from "../utils/storefront";

function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { products, addToCart, beginDirectCheckout, currentUser } = useShop();
  const [quantity, setQuantity] = useState(1);
  const [quantityInput, setQuantityInput] = useState("1");
  const product = products.find((item) => item.slug === slug);
  const imageSources = useMemo(() => (product ? getProductImageSources(product) : []), [product]);
  const [imageIndex, setImageIndex] = useState(0);

  if (!product) {
    return (
      <section className="container page-pad">
        <h1>Product not found</h1>
      </section>
    );
  }

  const currentImage = imageSources[imageIndex];
  const imageFailed = imageIndex >= imageSources.length;
  const relatedProducts = products.filter((item) => item.id !== product.id && item.category === product.category).slice(0, 3);

  const handleBuyNow = () => {
    beginDirectCheckout(product.id, quantity);
    navigate("/checkout");
  };

  const commitQuantity = () => {
    const rawValue = quantityInput.trim();

    if (!rawValue) {
      setQuantityInput(String(quantity));
      return;
    }

    const nextQuantity = Number(rawValue);

    if (!Number.isFinite(nextQuantity) || nextQuantity < 1) {
      setQuantityInput(String(quantity));
      return;
    }

    setQuantity(nextQuantity);
    setQuantityInput(String(nextQuantity));
  };

  return (
    <section className="container page-stack page-pad product-page">
      <div className="product-hero-banner">
        <div>
          <span className="eyebrow">{product.brand}</span>
          <h1>{product.name}</h1>
          <p>{product.description}</p>
        </div>
        <div className="product-banner-meta">
          <div><strong>{product.brand}</strong><span>Brand</span></div>
          <div><strong>{product.categoryName}</strong><span>Category</span></div>
          <div><strong>{product.isOutOfStock ? "Out of stock" : product.stock}</strong><span>Available now</span></div>
        </div>
      </div>

      <div className="product-hero">
        <div className={`product-showcase ${product.accent}`}>
          <span className="product-badge">{product.badge}</span>
          {currentImage && !imageFailed ? (
            <img
              src={currentImage}
              alt={product.name}
              className="product-detail-image"
              onError={() => setImageIndex((current) => current + 1)}
            />
          ) : (
            <>
              <div className="product-shape large" />
              <span className="product-caption">{product.imageLabel}</span>
            </>
          )}
        </div>

        <div className="product-details product-details-card">
          <span className="eyebrow">Ready to order</span>
          <h2>Fitment and buying summary</h2>
          <p>{product.description}</p>
          <div className="product-price-line">
            <strong>{formatPrice(product.price)}</strong>
            <span>{formatPrice(product.oldPrice)}</span>
            {product.isDealActive && product.dealEndsAt ? <small>Deal ends {new Date(product.dealEndsAt).toLocaleDateString()}</small> : null}
          </div>

          <div className="product-info-grid">
            <article className="product-info-card"><strong>{product.brand}</strong><span>Brand</span></article>
            <article className="product-info-card"><strong>{product.categoryName}</strong><span>Category</span></article>
            <article className="product-info-card"><strong>{product.isOutOfStock ? "Out of stock" : product.stock}</strong><span>Available stock</span></article>
          </div>

          <div className="quantity-row">
            <label htmlFor="qty">Qty</label>
            <input
              id="qty"
              type="number"
              min="1"
              value={quantityInput}
              onChange={(event) => setQuantityInput(event.target.value)}
              onBlur={commitQuantity}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitQuantity();
                }
              }}
            />
          </div>

          {currentUser?.role === "admin" ? (
            <div className="empty-inline-state">
              <Link to={`/admin?editProduct=${product.id}`} className="primary-button">Manage this product</Link>
            </div>
          ) : currentUser?.role === "cashier" ? (
            <div className="empty-inline-state">
              <p>Cashier accounts complete in-store sales through the POS workspace.</p>
              <Link to="/pos" className="primary-button">Open POS</Link>
            </div>
          ) : product.isOutOfStock ? (
            <div className="empty-inline-state">
              <p>This item is currently out of stock and cannot be added to cart right now.</p>
              <button type="button" className="primary-button disabled-button" disabled>Out of stock</button>
            </div>
          ) : (
            <div className="card-actions">
              <button type="button" className="primary-button" onClick={() => addToCart(product.id, quantity)}>
                Add {quantity} to cart
              </button>
              <button type="button" className="secondary-button" onClick={handleBuyNow}>Buy now</button>
            </div>
          )}
        </div>
      </div>

      <section className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Related parts</span>
            <h2>More from this category</h2>
          </div>
        </div>
        <div className="product-grid">
          {relatedProducts.map((item) => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>
      </section>
    </section>
  );
}

export default ProductPage;
